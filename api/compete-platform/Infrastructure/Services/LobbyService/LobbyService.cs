using AutoMapper;
using compete_platform.Dto;
using compete_platform.Dto.Common;
using compete_platform.Infrastructure.Services;
using compete_platform.Infrastructure.Services.LobbyService;
using compete_poco.Dto;
using compete_poco.Hubs;
using compete_poco.Infrastructure.Data;
using compete_poco.Infrastructure.Services.LobbyService.Models;
using compete_poco.Infrastructure.Services.TimeNotifiers;
using compete_poco.Infrastructure.Services.UserRepository;
using compete_poco.Models;
using Compete_POCO_Models.EventVisitors;
using Compete_POCO_Models.Infrastrcuture.Data;
using CompeteGameServerHandler.Infrastructure.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Transactions;
using CompeteGameServerHandler.Infrastructure.PropertyResolvers;
using compete_platform.Infrastructure.Services.PaymentService;
using Yandex.Checkout.V3;
using compete_platform.Infrastructure.Services.PayRepository;

namespace compete_poco.Infrastructure.Services.LobbyService;

public class LobbyService : ILobbyService
{
    private static readonly decimal _minimalBid = 50;
    private readonly CLobbyRepository _lobbySrc;
    private readonly IMapper _mapper;
    private readonly CUserRepository _userSrc;
    private readonly IServerService _serverService;
    private readonly IUserService _userProvider;
    private readonly IDistributedCache _cache;
    private readonly CServerRepository _serverRep;
    private readonly VetoTimeNotifier _vetoNotifier;
    private readonly ILogger<LobbyService> _logger;
    private readonly MatchPrepareNotifier _matchPrepareNotifier;
    private readonly IHubContext<EventHub> _hubCtx;
    private readonly IPaymentService _paymentSrc;
    private readonly CPayRepository _paySrc;
    private static readonly int availableSecondsToMapSinglePick = 17;
    private static readonly int _minimalAmountOfVeto = 7;
    private static readonly int availableSecondsToConnect = (int)AppConfig.MapInitialWarmupTimeGlobally.TotalSeconds;

    public LobbyService(
        IMapper mapper,
        IUserService userProvider,
        IDistributedCache cache,
        VetoTimeNotifier vetoNotifier,
        MatchPrepareNotifier matchPrepareNotifier,
        CLobbyRepository lobbySrc,
        CUserRepository userSrc,
        IServerService serverService,
        CServerRepository serverRep,
        ILogger<LobbyService> logger,
        IHubContext<EventHub> hubCtx,
        IPaymentService paymentSrc,
        CPayRepository paySrc)
    {
        _lobbySrc = lobbySrc;
        _mapper = mapper;
        _userSrc = userSrc;
        _serverService = serverService;
        _userProvider = userProvider;
        _cache = cache;
        _serverRep = serverRep;
        _vetoNotifier = vetoNotifier;
        _logger = logger;
        _matchPrepareNotifier = matchPrepareNotifier;
        _hubCtx = hubCtx;
        _paymentSrc = paymentSrc;
        _paySrc = paySrc;
    }
    private async Task LinkUserInLobbyToSteam(GetLobbyDto lobby)
    {
        var linksTasks = new List<IEnumerable<Task<ISteamUserBasedDto<GetUserDto>>>>();
        for (int i = 0; i < lobby.Teams.Count; i++)
        {
            var tasksForLink = lobby.Teams[i].Users
                .Select(u => _userProvider.LinkUserToSteam(u));
            linksTasks.Add(tasksForLink);
        }
        await Task.WhenAll(linksTasks.SelectMany(L => L));
        for (var i = 0; i < linksTasks.Count; i++)
            lobby.Teams[i].Users = linksTasks[i].Select(t => (GetUserDto)t.Result).ToList();
    }
    public async Task<GetLobbyDto> GetLobbyByUserIdAsync(long userId)
    {
        if (!(await _lobbySrc.UserAlreadyInLobby(userId)))
            throw new ApplicationException(AppDictionary.UserNotInLobby);

        var defaultLobby = await _lobbySrc.GetLobbyByUserIdAsync(userId);
        var lobby = _mapper.Map<GetLobbyDto>(defaultLobby);
        await LinkUserInLobbyToSteam(lobby);
        return lobby;
    }
    private async Task AddUserByInvite(JoinToLobbyInfo info, Lobby lobbyToJoin, User joiningUser)
    {
        var labelKey = GetInviteKey((long)info.TeamId!, (long)info.UserId!, (long)info.InviterId!);
        var label = await _cache.GetStringAsync(labelKey);
        if (label is null)
            throw new ApplicationException(AppDictionary.InviteHasExpired);
        var preferredTeam = lobbyToJoin.Teams.First(c => c.Id == info.TeamId);
        if ((int)lobbyToJoin.PlayersAmount == preferredTeam.Users.Count())
            throw new ApplicationException(AppDictionary.TeamAlreadyFull);
        var userBid = await _lobbySrc.GetUserBid(joiningUser.Id) ?? throw new ArgumentException();
        if (joiningUser.Balance < lobbyToJoin.LobbyBid) throw new ApplicationException("Недостаточно средств");
        userBid.Bid = lobbyToJoin.LobbyBid;
        preferredTeam.Users.Add(joiningUser);
    }
    private void DistributeUserForTeam(JoinToLobbyInfo info, Lobby lobbyToJoin, User joiningUser)
    {
        if (!lobbyToJoin.Public)
        {
            if (lobbyToJoin.CodeToConnect != info.Code && info.Password != lobbyToJoin.Password)
                throw new ApplicationException(AppDictionary.PermissionDenied);
        }
        if (lobbyToJoin.Teams.Count() == 1)
        {
            lobbyToJoin.Teams.Add(new()
            {
                Chat = new(),
                CreatorId = info.UserId,
                Name = "Team 2",
                Users = new List<User>() { joiningUser }
            });
        }
        else
        {
            var preferredTeam = lobbyToJoin.Teams.OrderBy(t => t.Users.Count()).First();
            if (preferredTeam.Users.Count() == (int)lobbyToJoin.PlayersAmount)
                throw new ApplicationException(AppDictionary.LobbyAlreadyFull);
            preferredTeam.Users.Add(joiningUser);
        }
    }
    public async Task<ActionInfo> JoinToLobby(JoinToLobbyInfo info)
    {
        if (_userSrc.UserIsBanned(info.UserId).Result)
            throw new ApplicationException(AppDictionary.UserIsBanned);

        if (_lobbySrc.UserAlreadyInLobby(info.UserId).Result)
        {
            var prevLobby = await _lobbySrc.GetLobbyByUserIdAsync(info.UserId);
            await LeaveFromLobby(info.UserId, prevLobby.Id);
        }

        var lobbyToJoin = await _lobbySrc.GetLobbyForAggregation(info.LobbyId, LobbyStatus.Configuring);
        if (lobbyToJoin is null)
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);

        var joiningUser = await _userSrc.GetTrackingUserAsync(info.UserId) ??
            throw new ApplicationException(AppDictionary.UserNotFound);
            
        if (joiningUser.Balance < lobbyToJoin.LobbyBid) throw new ApplicationException("Недостаточно средств");

        if (info.TeamId != null && info.InviterId != null)
            await AddUserByInvite(info, lobbyToJoin, joiningUser);
        else
            DistributeUserForTeam(info, lobbyToJoin, joiningUser);
        lobbyToJoin.Bids.Add(new() { Bid = lobbyToJoin.LobbyBid, UserId = (long)info.UserId! });
        await _lobbySrc.SaveChangesAsync();
        var userBid = await _lobbySrc.GetUserBid(joiningUser.Id) ?? throw new ArgumentException();
        userBid.Bid = lobbyToJoin.LobbyBid;
        lobbyToJoin.Version = Guid.NewGuid();
        await _lobbySrc.SaveChangesAsync();
        return CreateActionInfo(await GetLobbyByIdAsync(lobbyToJoin.Id));
    }
    private bool RedefineLobbyStructure(Team currentTeam, User leavingUser)
    {
        var shouldDeleteLobby = false;
        if (currentTeam.CreatorId.Equals(leavingUser.Id))
        {
            if (currentTeam.Users.Count() > 1)
            {
                var newCreator = currentTeam.Users
                                                .Where(u => !u.Id
                                                    .Equals(leavingUser.Id)).First().Id;
                currentTeam.CreatorId = newCreator;
                currentTeam.Lobby!.CreatorId = newCreator;
                currentTeam.Users.Remove(leavingUser);
            }
            else
            {

                shouldDeleteLobby = currentTeam.Lobby!.Teams.Count() == 1;
                if (shouldDeleteLobby)
                    //Cascading delete behavior
                    _lobbySrc.Remove(currentTeam.Lobby);
                else
                {
                    var secondTeam = currentTeam.Lobby.Teams.First(t => t.Id != currentTeam.Id);
                    var newCreator = secondTeam.Users
                                                .Where(u => u.Id
                                                    .Equals(secondTeam.CreatorId)).First().Id;
                    currentTeam.Lobby.CreatorId = newCreator;
                    _lobbySrc.Remove(currentTeam);
                }
            }
        }
        else
            currentTeam.Users.Remove(leavingUser);
        return shouldDeleteLobby;
    }

    public async Task<ActionInfo?> LeaveFromLobby(long userId, long lobbyId)
    {
        if (!(await _lobbySrc.UserAlreadyInLobby(userId)))
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        
        var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Configuring) ??
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound); 
        var leavingUser = await _userSrc.GetTrackingUserAsync(userId) ??
            throw new ApplicationException(AppDictionary.UserNotFound);
        var currentTeam = lobby.Teams.First(t => t.Users.Select(u => u.Id).Contains(leavingUser.Id));
        var shouldDeleteLobby = RedefineLobbyStructure(currentTeam, leavingUser);
        currentTeam.Lobby!.Version = Guid.NewGuid();
        _lobbySrc.Remove(currentTeam.Lobby!.Bids.First(B => B.UserId.Equals(leavingUser.Id)));
        await _lobbySrc.SaveChangesAsync();
        return shouldDeleteLobby ? null : 
            CreateActionInfo(await GetLobbyByIdAsync(currentTeam.Lobby.Id));
    }
    

    private static void ValidateLobbyOnPlayerAmountChange(Lobby lobby, 
        compete_poco.Models.Type playersAmount)
    {
        if (lobby.Teams.OrderBy(t => t.Users.Count()).Last().Users.Count() > (int)playersAmount)
            throw new ApplicationException(AppDictionary.CannotDefinePlayersAmount);
    }
    public async Task<ActionInfo> SetNewLobbyConfiguration(LobbyAdminConfiguration lobby, long userId)
    {
        var userIsAdmin = await _lobbySrc.UserIsCreatorOfLobby(userId, lobby.Id);
        if (!userIsAdmin)
            throw new ApplicationException(AppDictionary.OnlyCreatorCanEdit);

        var lobbyForUpdate = await _lobbySrc.GetLobbyForAggregation(lobby.Id, LobbyStatus.Configuring) ??
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        if(lobbyForUpdate.PlayersAmount != lobby.PlayersAmount)
            ValidateLobbyOnPlayerAmountChange(lobbyForUpdate, lobby.PlayersAmount);
        lobbyForUpdate.Version = Guid.NewGuid();
        _mapper.Map(lobby, lobbyForUpdate);
        await _lobbySrc.SaveChangesAsync();
        return CreateActionInfo(await GetLobbyByIdAsync(lobbyForUpdate.Id));
    }

    public async Task<ActionInfo> ChangeUserBid(ChangeUserBidRequest request)
    {
        var bid = request.Bid;
        var userId = request.UserId;
        var lobbyDto = await GetLobbyByUserIdAsync(userId) ?? throw new ArgumentException();
        var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyDto.Id, LobbyStatus.Configuring) ?? throw new ArgumentException();
        var users = lobby.Teams.SelectMany(t => t.Users);

        if (userId != lobby.CreatorId)
            throw new ApplicationError("Только создатель может менять ставку");
        if (bid < _minimalBid)
            throw new ApplicationException($"Ставка не может быть меньше {_minimalBid}");

        foreach (var user in users)
        {
            var userBid = await _lobbySrc.GetUserBid(user.Id) ?? throw new ArgumentException();
            if (user.Balance < bid)
                throw new ApplicationException(AppDictionary.NotEnoughMoney);
            userBid.Bid = bid;
        }

        lobby.LobbyBid = bid;

        await _lobbySrc.SaveChangesAsync();

        return CreateActionInfo(await GetLobbyByUserIdAsync(lobby.CreatorId));       
    }
    public async Task<ActionInfo> ChangePassword(ChangePasswordRequest request)
    {
        var password = request.Password;
        var userId = request.UserId;
        var lobbyDto = await _lobbySrc.GetLobbyByUserIdAsync(userId) ??
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyDto.Id, LobbyStatus.Configuring) ??
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);

        if (password is not null && password.Length > 16)
            throw new ApplicationException(AppDictionary.PasswordIsNotValid);

        lobby.Password = password;
        
        await _lobbySrc.SaveChangesAsync();
        return CreateActionInfo(await GetLobbyByUserIdAsync(userId));
    }

    public async Task<ActionInfo> ChangeTeamName(ChangeTeamNameRequest req)
    {
        if (string.IsNullOrEmpty(req.NewName))
            throw new ApplicationException(AppDictionary.TeamNameIsNotValid);
        var team = await _lobbySrc.GetTeamForUpdating(req.UserId);
        if (team is null)
            throw new ApplicationException(AppDictionary.EmptyTeam);
        team.Name = req.NewName;
        await _lobbySrc.SaveChangesAsync();
        return CreateActionInfo(await GetLobbyByIdAsync(team.LobbyId));
    }
    private string GetInviteKey(long teamId, long userId, long inviterId) => $"invite-{inviterId}-{teamId}-{userId}";
    public async Task<JoinToLobbyInfo> CreateInviteForUser(SendInviteRequest req)
    {
        var team = await _lobbySrc.GetTeamForUpdating(req.InviterId) ?? 
            throw new ApplicationException(AppDictionary.NotTeamForInvite);
        var inviteKey = GetInviteKey(team.Id, req.UserId, req.InviterId);
        var options = new DistributedCacheEntryOptions() { AbsoluteExpiration = DateTime.Now.AddMinutes(5) };
        await _cache.SetStringAsync(inviteKey, DateTime.UtcNow.ToString(), options);
        var invite = _mapper.Map<JoinToLobbyInfo>(req);
        invite.TeamId = team.Id;
        invite.LobbyId = team.LobbyId;
        return invite;
    }

    private void ValidateLobbyBid(decimal firstTeamBid, decimal secondTeamBid, ICollection<UserBid> bids)
    {
        if (firstTeamBid != secondTeamBid)
            throw new ApplicationException(AppDictionary.TeamBidsBigDifference);
        foreach (var bid in bids)
        {
            if (bid.Bid.Equals(0)) 
                throw new ApplicationException($"Ставка не может быть меньше {_minimalBid}");
        }
    }
    private void ValidateLobbyParameters(Lobby lobby)
    {
        if (lobby.Teams.Count != 2)
            throw new ApplicationException(AppDictionary.EnemyIsEmpty);
        var currentCapacity = lobby.Teams.OrderBy(t => t.Users.Count).First().Users.Count;
        if (currentCapacity != (int)lobby.PlayersAmount)
            throw new ApplicationException(AppDictionary.TeamsNotFilled);
        var firstTeamUserIds = lobby.Teams.First().Users.Select(u => u.Id);
        var secondTeamUserIds = lobby.Teams.Last().Users.Select(u => u.Id);
        decimal firstTeamBid = 0;
        decimal secondTeamBid = 0;
        foreach(var bid in lobby.Bids)
        {
            if (firstTeamUserIds.Contains(bid.UserId))
                firstTeamBid += bid.Bid;
            else
                secondTeamBid += bid.Bid;
        }
        if (lobby.PickMaps.Count() != _minimalAmountOfVeto)
            throw new ApplicationException(AppDictionary.MapsForVetoDifferentAmount);
        ValidateLobbyBid(firstTeamBid, secondTeamBid, lobby.Bids);
    }
    public async Task<ActionInfo> StartMapPick(long lobbyId, long userId)
    {
        var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Configuring)
            ?? throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        if (lobby.CreatorId != userId)
            throw new ApplicationException(AppDictionary.OnlyCreatorCanEdit);
        ValidateLobbyParameters(lobby);

        lobby.Status = LobbyStatus.Veto;
        lobby.Version = Guid.NewGuid();
        await _lobbySrc.SaveChangesAsync();
        var newLobby = await GetLobbyByIdAsync(lobbyId);
        var actionResponse =  CreateActionInfo(newLobby);
        var rnd = new Random();
        var availableMaps = newLobby.PickMaps
            .Except(newLobby.MapActions
                .Select(a => a.Map))
            .ToList();
        var notifierInfo = new StartNotifierInfo()
        {
            Input = new MapPickRequest()
            {
                UserId = actionResponse.NextPickUserId,
                Map = availableMaps[rnd.Next(availableMaps.Count)],
                LobbyId = lobbyId
            },
            AvailableSeconds = availableSecondsToMapSinglePick,
            LobbyId = lobbyId,
            UserIds = newLobby.Teams.SelectMany(t => t.Users).Select(U => U.Id).ToList()
        };

        _ = _vetoNotifier.StartNotifyAboutTime(notifierInfo);
        return actionResponse;
    }
    public async Task<ActionInfo> ChangeTeam(long lobbyId, long UserId)
    {
        var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Configuring)
            ?? throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        var user = await _userSrc.GetTrackingUserAsync(UserId)
            ?? throw new ApplicationException(AppDictionary.UserNotFound);

        RedefineLobbyStructureOnTeamChange(lobby, user);

        lobby.Version = Guid.NewGuid();
        await _lobbySrc.SaveChangesAsync();
        return CreateActionInfo(await GetLobbyByIdAsync(lobbyId));
    }
    private void RedefineLobbyStructureOnTeamChange(Lobby lobby, User leavingUser)
    {
        var currentTeam = lobby.Teams.FirstOrDefault(t => t.Users.Select(u => u.Id).Contains(leavingUser.Id))
            ?? throw new ApplicationException("Пользователь не состоит ни в одной из команд.");
        var secondTeam = lobby.Teams.FirstOrDefault(t => !t.Users.Select(u => u.Id).Contains(leavingUser.Id));
        if (secondTeam is null)
        {
            secondTeam = new()
            {
                Chat = new(),
                CreatorId = leavingUser.Id,
                Name = "Team 2",
                Users = new List<User>() {}
            };
            lobby.Teams.Add(secondTeam);
        }

        if (secondTeam.Users.Count() == (int)lobby.PlayersAmount)
            throw new ApplicationException("Команда уже полная.");

        if (currentTeam.CreatorId.Equals(leavingUser.Id))
        {
            if (currentTeam.Users.Count() > 1)
            {
                currentTeam.CreatorId = currentTeam.Users
                                    .Where(u => !u.Id.Equals(leavingUser.Id))
                                    .First().Id;
                currentTeam.Users.Remove(leavingUser);
                secondTeam.Users.Add(leavingUser);
            }
            else
            {
                if (lobby.Teams.First().Equals(currentTeam))
                    throw new ApplicationException("Первая команда не может быть пустой.");
                currentTeam.Users.Remove(leavingUser);
                secondTeam.Users.Add(leavingUser);
                _lobbySrc.Remove(currentTeam);
            }
        }
        else
        {
            currentTeam.Users.Remove(leavingUser);
            secondTeam.Users.Add(leavingUser);
        }

    }
    private bool GetActionType(List<MapActionInfo> actions, Format matchFormat)
    {
        var currentActionType = !(actions.Count < 2);
        if (currentActionType)
        {
            if (matchFormat.Equals(Format.BO3))
            {
                var lastActions = actions.TakeLast(2);
                var firstPart = lastActions.First().IsPicked;
                var similar = lastActions.All(a => a.IsPicked.Equals(firstPart));
                if (similar)
                    currentActionType = !firstPart;
                else
                    currentActionType = lastActions.Last().IsPicked;
            }
            else if (matchFormat.Equals(Format.BO1))
                currentActionType = false;
        }
        return currentActionType;
    }
    private MapActionInfo DefineLastAction(Lobby lobby)
    {
        var alreadyUsedMaps = lobby.MapActions.Select(a => a.Map);
        var lastMap = lobby.PickMaps.First(m => !alreadyUsedMaps.Contains(m));
        var actionType = true;
        return new() { Map = lastMap, ActionTime = DateTime.UtcNow, IsPicked = actionType, TeamId = lobby.Teams.First().Id };
    }
    private long GetNextPickerId(GetLobbyDto lobby)
    {
        var creatorId = lobby.CreatorId;
        var enemyId = lobby.Teams.FirstOrDefault(t => !t.Users.Select(u => u.Id).Contains(creatorId))?.CreatorId;
        if (enemyId is null)
            enemyId = 0;
        return lobby.MapActions.Count % 2 == 0 ? creatorId : (long)enemyId;   
    }
    private bool MapPickCompeleted(List<MapActionInfo> MapActions, Format format)
    {
        if (MapActions.Count == 0) return false;
        return
        MapActions
        .Where(a => a.IsPicked)
        .Count()
        .Equals(format == Format.BO1 ? 1 : format == Format.BO3 ? 3 : 5);
    }
    private void InitializeMapMatchesInLobby(Lobby needLobby)
    {
        var playingMapsActions = needLobby.MapActions.Where(a => a.IsPicked);
        foreach(var action in playingMapsActions)
        {
            var match = new Match()
            {
                PlayedMap = action.Map,
                Stats = needLobby.Teams.SelectMany(t => t.Users).Select(u => new UserStat() { UserId = u.Id }).ToList()
            };
            needLobby.Matches.Add(match);
        }
    }
    private List<long> GetUserIdsInLobby(Lobby needLobby) => needLobby
        .Teams
        .SelectMany(t => t.Users)
        .Select(U => U.Id)
        .ToList();

    private async Task StartLobbyAsync(Lobby needLobby, List<long> userIds)
    {
        var vetoNotifierStopping = _vetoNotifier.StopNotifyingAboutTime(needLobby.Id);
        needLobby.Status = LobbyStatus.Warmup;
        needLobby.EdgeConnectTimeOnFirstMap = DateTime.UtcNow + needLobby.WaitToStartTime;
        needLobby.LastServerUpdate = DateTime.UtcNow;
        InitializeMapMatchesInLobby(needLobby);
        await _lobbySrc.SaveChangesAsync();
        var startMapName = GameServerResolvers.ConvertMapToString(needLobby.Matches.First().PlayedMap);
        var startMap = _serverRep.ConvertMapsToWorkshopLinks(startMapName);
        await _serverService.StartServerAsync(needLobby.ServerId, needLobby.Id, startMap);
        _ = vetoNotifierStopping.ContinueWith(t =>
        {
            _ = _matchPrepareNotifier.StartNotifyAboutTime(new()
            {
                AvailableSeconds = availableSecondsToConnect,
                LobbyId = needLobby.Id,
                UserIds = userIds
            });
        });
    }

    public async Task<string> PayLobby(long lobbyId, long userId)
    {
        var lobby = await _lobbySrc.GetLobbyByIdAsync(lobbyId) ?? 
            throw new LobbySmoothlyError(AppDictionary.JoinLobbyNotFound);
        
        if (lobby.PayedUserIds.Contains(userId))
            throw new LobbySmoothlyError("Матч уже оплачен");
        
        var deal = await _paymentSrc.CreateDealAsync(userId, lobbyId);

        var payRequest = new PayRequestDto()
        {
            Amount = lobby.LobbyBid,
            UserId = userId,
            LobbyId = lobbyId,
            Deal = deal
        };
        var confirmationUrl = await _paymentSrc.CreatePaymentAsync(payRequest);

        var dealInfo = new DealInfo()
        {
            DealId = deal.Id,
            UserId = userId,
            Amount = lobby.LobbyBid
        };
        lobby.Deals.Add(dealInfo);
        await _lobbySrc.SaveChangesAsync();

        return confirmationUrl;
    }

    public async Task SuccessLobbyPayment(long lobbyId, long userId)
    {
        var lobby = await _lobbySrc.GetLobbyByIdAsync(lobbyId) ??
            throw new LobbySmoothlyError(AppDictionary.JoinLobbyNotFound);
        var userIds = GetUserIdsInLobby(lobby);

        lobby.PayedUserIds.Add(userId);
        lobby.Deals.First(d => d.UserId == userId).Status = DealInfoStatus.Success;
        await _lobbySrc.SaveChangesAsync();

        await _hubCtx.Clients.User(userId.ToString()).SendAsync("SuccessPayment");

        if (lobby.PayedUserIds.Count == userIds.Count)
        {
            _logger.LogInformation("Все пользователи оплатили. Начинаю игру");
            await StartLobbyAsync(lobby, userIds);
            await _hubCtx.Clients.Users(lobby.Teams.SelectMany(t => t.Users).Select(u => u.Id.ToString())).SendAsync("AllUsersPayed");
        }
    }

    public async Task CancelLobbyPayment(long lobbyId, long userId)
    {
        var lobby = await _lobbySrc.GetLobbyByIdAsync(lobbyId) ??
            throw new LobbySmoothlyError(AppDictionary.JoinLobbyNotFound);
        
        lobby.Deals.First(d => d.UserId == userId).Status = DealInfoStatus.Failed;
        await _lobbySrc.SaveChangesAsync();
    }

    private async Task CreateLobbyPayouts(long lobbyId)
    {
        var lobby = await _lobbySrc.GetLobbyByIdAsync(lobbyId);
        var teamWinnerIds = lobby.Teams.First(t => t.Id == lobby.TeamWinner).Users.Select(u => u.Id).ToList();
        var teamLoserIds = lobby.Teams.First(t => t.Id != lobby.TeamWinner).Users.Select(u => u.Id).ToList();

        for (int i = 0; i < teamWinnerIds.Count; i++)
        {
            var winnerDeal = lobby.Deals.First(d => d.UserId == teamWinnerIds[i]);
            var loserDeal = lobby.Deals.First(d => d.UserId == teamLoserIds[i]);
            var siteComission = loserDeal.Amount * AppConfig.AmountOfComission * 2;
            var ymoneyComission = loserDeal.Amount * AppConfig.YMoneyComission + loserDeal.Amount * AppConfig.YMoneyComission * AppConfig.NDS;
            var fullComission = siteComission + ymoneyComission;

            var payout = new UserPayout()
            {
                FirstDealId = winnerDeal.DealId,
                SecondDealId = loserDeal.DealId,
                UserId = teamWinnerIds[i],
                Amount = winnerDeal.Amount + loserDeal.Amount - fullComission,
                CreatedAt = DateTime.UtcNow
            };

            await _paySrc.CreatePayoutAsync(payout);
        }

        await _paySrc.SaveChangesAsync();
    }

    public async Task<ActionInfo> DoAction(MapPickRequest req)
    {
        Lobby? needLobby = null;
        bool isCompleted = false;
        { 
            using var transaction = new TransactionScope(TransactionScopeOption.Required,
            new TransactionOptions { IsolationLevel = IsolationLevel.ReadCommitted },
            TransactionScopeAsyncFlowOption.Enabled);
            try
            {
                needLobby = await _lobbySrc.GetLobbyForAggregation(req.LobbyId, LobbyStatus.Veto) ??
                    throw new LobbySmoothlyError(AppDictionary.JoinLobbyNotFound);

                if (!needLobby.Teams.Select(t => t.CreatorId).Contains(req.UserId))
                    throw new LobbySmoothlyError(AppDictionary.PermissionDenied);

                if ((needLobby.CreatorId.Equals(req.UserId) && needLobby.MapActions.Count % 2 != 0) ||
                    (!needLobby.CreatorId.Equals(req.UserId) && needLobby.MapActions.Count % 2 != 1))
                    throw new LobbySmoothlyError(AppDictionary.NotYourStep);

                if (!needLobby.PickMaps.Contains(req.Map))
                    throw new LobbySmoothlyError(AppDictionary.DeniedMap);

                var actionType = GetActionType(needLobby.MapActions, needLobby.MatchFormat);
                needLobby.MapActions.Add(new()
                {
                    ActionTime = DateTime.UtcNow,
                    IsPicked = actionType,
                    Map = req.Map,
                    TeamId = needLobby.Teams
                    .First(t => t.Users
                    .Select(u => u.Id)
                    .Contains(req.UserId)).Id
                });
                var onlyOneMapAvailable = needLobby.PickMaps.Except(needLobby.MapActions.Select(a => a.Map)).Count().Equals(1);
                if (onlyOneMapAvailable)
                {
                    var lastAction = DefineLastAction(needLobby);
                    needLobby.MapActions.Add(lastAction);
                }
                isCompleted = MapPickCompeleted(needLobby.MapActions, needLobby.MatchFormat);
                needLobby.Version = Guid.NewGuid();
                if (isCompleted)
                {
                    needLobby.Status = LobbyStatus.WaitingForPay;
                }
                await _lobbySrc.SaveChangesAsync();
                transaction.Complete();
            }
            catch
            {
                throw;
            }
        }
        var mapped = await GetLobbyByIdAsync(needLobby.Id);
        var currentVetoState = new ActionInfo()
        {
            IsPickNow = GetActionType(needLobby.MapActions, needLobby.MatchFormat),
            NewLobby = mapped,
            NextPickUserId = GetNextPickerId(mapped),
            PickingComplete = isCompleted
        };
        if (!isCompleted)
        {
            var rnd = new Random();
            var availableMaps = mapped.PickMaps.Except(mapped.MapActions.Select(a => a.Map)).ToList();
            var newInput = new MapPickRequest()
            {
                Map = availableMaps[rnd.Next(availableMaps.Count)],
                UserId = currentVetoState.NextPickUserId,
                LobbyId = needLobby.Id
            };
            _vetoNotifier.RefreshNotifyingAboutTime(needLobby.Id, newInput);
        }
        return currentVetoState;
        
    }

    private ActionInfo CreateActionInfo(GetLobbyDto needLobby) => new ()
    {
        IsPickNow = GetActionType(needLobby.MapActions, needLobby.MatchFormat),
        NewLobby = needLobby,
        NextPickUserId = GetNextPickerId(needLobby),
        PickingComplete = MapPickCompeleted(needLobby.MapActions, needLobby.MatchFormat)
    };
    /// <summary>
    /// Является оберткой над репозиторием лобби для получения лобби из бд, 
    /// дополнительно линкует пользователей лобби к стиму
    /// </summary>
    /// <param name="lobbyId">Id для поиска</param>
    /// <returns></returns>
    /// <exception cref="ApplicationException"></exception>
    private async Task<GetLobbyDto> GetLobbyByIdAsync(long lobbyId)
    {
        var defaultLobby = await _lobbySrc.GetLobbyByIdAsync(lobbyId) ??
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        var lobby = _mapper.Map<GetLobbyDto>(defaultLobby);
        await LinkUserInLobbyToSteam(lobby);
        return lobby;
    }
   
    public async Task<ActionInfo> GetLobbyVetoStateAsyncById(long lobbyId, long userId)
    {
        var needLobbyTask = GetLobbyByIdAsync(lobbyId);
        var adminsTask = _userSrc.GetPlatformAdminsUserIds();
        await Task.WhenAll(adminsTask, needLobbyTask);
        var needLobby = needLobbyTask.Result;
        var admins = adminsTask.Result;
        if (!needLobby.Teams.SelectMany(t => t.Users.Select(u => u.Id)).Contains(userId)
            && !admins.Contains(userId))
            throw new ApplicationException(AppDictionary.PermissionDenied);
        return CreateActionInfo(needLobby);
    }

    public async Task<ActionInfo> GetLobbyVetoStateAsyncByUserId(long userId)
    {
        var needLobbyTask = GetLobbyByUserIdAsync(userId);
        var adminsTask = _userSrc.GetPlatformAdminsUserIds();
        await Task.WhenAll(needLobbyTask, adminsTask);
        var needLobby = needLobbyTask.Result;
        var admins = adminsTask.Result;
        if (!needLobby.Teams.SelectMany(t => t.Users.Select(u => u.Id)).Contains(userId)
            && !admins.Contains(userId))
            throw new ApplicationException(AppDictionary.PermissionDenied);
        return CreateActionInfo(needLobby);
    }

    public async Task<List<GetLobbyWithPasswordDto>> GetLobbiesAsync(GetLobbyRequest request)
    {
        var lobbies = await _lobbySrc.GetLobbiesAsync(request);
        await _userProvider.LinkUsersToSteam(lobbies.Select(l => (ISteamUserBasedDto<GetUserDto>)l.Creator).ToList(), false);
        return lobbies;
    }
    public async Task<List<GetLobbyViewDto>> GetAllLobbiesAsync()
    {
        var lobbies = await _lobbySrc.GetAllLobbiesAsync();
        await _userProvider.LinkUsersToSteam(lobbies.Select(l => (ISteamUserBasedDto<GetUserDto>)l.Creator).ToList(), false);
        return lobbies;
    }
    private async Task<bool> CanUserParticipateInLobby(long userId)
    {
        var userAlreadyInLobbyTask = _lobbySrc.UserAlreadyInLobby(userId);
        var userIsBannedTask = _userSrc.UserIsBanned(userId);
        await Task.WhenAll(userAlreadyInLobbyTask, userIsBannedTask);
        var result =  !userAlreadyInLobbyTask.Result && !userIsBannedTask.Result;
        return result;
    }
    public async Task<GetLobbyDto> CreateLobbyAsync(long creatorId, bool isPublic, string? password, decimal lobbyBid)
    {
        if(!(await CanUserParticipateInLobby(creatorId)))
            throw new ApplicationException(AppDictionary.CannotParticipateInLobby);

        if (password is not null && password.Length > 16)
            throw new ApplicationException(AppDictionary.PasswordIsNotValid);

        var serversAvailableTask = _serverRep.GetAvailableServersAsync();
        Lobby lobby = new()
        {
            Public = isPublic,
            Password = password,
            CreatorId = creatorId,
            Chat = new(),
            Bids = new List<UserBid>() { new() { Bid = lobbyBid, UserId = creatorId } },
            LobbyBid = lobbyBid,
            WaitToStartTime = AppConfig.MapInitialWarmupTimeGlobally,
            CodeToConnect = Guid.NewGuid(),
        };

        var creator = await _userSrc.GetTrackingUserAsync(creatorId);
      
        if (creator is null)
            throw new ApplicationException($"Пользователя с {creatorId} не существует");
        var creatorTeam = new Team()
        {
            Chat = new(),
            CreatorId = creatorId,
            Name = "Team 1"
        };
        creator.Teams.Add(creatorTeam);
        lobby.Teams.Add(creatorTeam);
        lobby.CreateTime = DateTime.UtcNow;
        await serversAvailableTask;
        var defaultServer = serversAvailableTask.Result.FirstOrDefault();
        if (defaultServer is null)
            throw new ApplicationException(AppDictionary.ServersAreNotAvailable);
        else
            lobby.ServerId = defaultServer.Id;
        await _lobbySrc.CreateLobbyAsync(lobby);
        await _lobbySrc.SaveChangesAsync();
        return _mapper.Map<GetLobbyDto>(lobby);
    }
    private static void SetupLobbyOnCancel(Lobby lobby)
    {
        lobby.LastServerUpdate = DateTime.UtcNow;
        lobby.Version = Guid.NewGuid();
        lobby.EventVisitor = new LobbyEndedEvent();
        lobby.Status = LobbyStatus.Canceled;
    }
    private async Task CancelCompletedLobby(Lobby lobby, long[]? offenders = null)
    {
        SetupLobbyOnCancel(lobby);
        var antiAwards = lobby.Awards.Select(a => new UserAward()
        {
            Award = a.Award * -1,
            AwardType = AwardType.MatchCanceled,
            UserId = a.UserId,
            PayTime = DateTime.MinValue
        }).ToList();
        antiAwards.AddRange(lobby.Awards);
        lobby.Awards = antiAwards;
        await _lobbySrc.SaveChangesAsync();
    }
    private  async Task CancelActiveLobby(Lobby lobby, long[]? offenders = null)
    {
        SetupLobbyOnCancel(lobby);
        try
        {
            await _matchPrepareNotifier.StopNotifyingAboutTime(lobby.Id);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning($"Лобби {lobby.Id} было отменено, но таймер подготовки остуствовал." +
                $" Это говорит о том, что на сервере не было игроков\n" +
                $"{ex.Message}");
        }
        var awards = lobby.Bids
            .Where(s => (!offenders?.Contains(s.UserId)) ?? true)
            .Select(b => new UserAward()
            {
                AwardType = AwardType.MatchCanceled,
                Award = 0,
                UserId = b.UserId,
                PayTime = DateTime.UtcNow
            }).ToList();
        awards.AddRange(lobby.Bids
            .Where(s => offenders?.Contains(s.UserId) ?? false)
            .Select(b => new UserAward()
            {
                AwardType = AwardType.Lose,
                Award = b.Bid * -1,
                UserId = b.UserId,
                PayTime = DateTime.MinValue
            }));
        lobby.Awards = awards;
        await _lobbySrc.SaveChangesAsync();
        await _serverService.StopServerAsync(lobby.ServerId, lobby.Id);
    }
    private async Task CancelAfkLobby(Lobby lobby)
    {
        var userIds = GetUserIdsInLobby(lobby);

        foreach (var userId in userIds)
        {
            await LeaveFromLobby(userId, lobby.Id);
            await _hubCtx.Clients.User(userId.ToString()).SendAsync("LobbyDisbanded");
        }

        SetupLobbyOnCancel(lobby);
    }
    public async Task<ActionInfo> Cancel_Lobby(long lobbyId, long[]? offenders = null)
    {
        using (var transaction = new TransactionScope(TransactionScopeOption.Required,
            new TransactionOptions { IsolationLevel = IsolationLevel.ReadCommitted },
            TransactionScopeAsyncFlowOption.Enabled))
        {
            var lobby = await _lobbySrc.GetLobbyForAggregation(
                lobbyId, LobbyStatus.Warmup, LobbyStatus.Playing, LobbyStatus.Over) ??
                throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
            if (lobby.Status != LobbyStatus.Over)
            {
                await CancelActiveLobby(lobby, offenders);
            }
            else
            {
                await CancelCompletedLobby(lobby, offenders);
            }
            transaction.Complete();
        }
        var action = CreateActionInfo(await GetLobbyByIdAsync(lobbyId));
        return action;
    }
    public async Task<ActionInfo> CancelVeto(long lobbyId)
    {
        using (var transaction = new TransactionScope(TransactionScopeOption.Required,
            new TransactionOptions { IsolationLevel = IsolationLevel.ReadCommitted },
            TransactionScopeAsyncFlowOption.Enabled))
        {
            var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Veto) ??
                throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
            SetupLobbyOnCancel(lobby);
            await _lobbySrc.SaveChangesAsync();
            transaction.Complete();
        }
        var action = CreateActionInfo(await GetLobbyByIdAsync(lobbyId));
        return action;
    }
    public async Task Cancel_Afk_Lobby(long lobbyId)
    {
        using (var transaction = new TransactionScope(TransactionScopeOption.Required,
            new TransactionOptions { IsolationLevel = IsolationLevel.ReadCommitted },
            TransactionScopeAsyncFlowOption.Enabled))
        {
            var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Configuring) ??
                throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
            await CancelAfkLobby(lobby);
            transaction.Complete();
        }
    }
    private static LobbyResult GetLobbyResult(Lobby lobby, long teamId)
    {
        Dictionary<long, int> winCounter = new();
        var teamWinner = teamId;
        
        if (teamWinner == 0)
        {
            foreach (var match in lobby.Matches)
            {
                if (match.TeamId == null)
                    continue;
                var teamWinnerId = (long)match.TeamId;
                if (!winCounter.ContainsKey(teamWinnerId))
                    winCounter[teamWinnerId] = 0;
                winCounter[teamWinnerId]++;
            }
            teamWinner = winCounter.MaxBy(p => p.Value).Key;
        }

        var teamLoser = lobby.Teams.First(t => !t.Id.Equals(teamWinner)).Id;
        var teamWinnerUserIds = lobby.Teams
            .First(t => t.Id.Equals(teamWinner)).Users.Select(U => U.Id)
            .ToArray();
        var teamLoserUserIds = lobby.Teams
            .First(t => t.Id.Equals(teamLoser)).Users.Select(u => u.Id)
            .ToArray();
        var userWinnerBids = lobby.Bids.Where(b => teamWinnerUserIds.Contains(b.UserId)).ToArray();
        var teamWinnerFund = userWinnerBids.Sum(b => b.Bid);
        if (teamWinnerFund.Equals(0))
            teamWinnerFund += 1;
        var lobbyFund = lobby.Bids.Sum(b => b.Bid);
        if (lobbyFund.Equals(0))
            lobbyFund += 1;
        var userWinnerIncomePercent = userWinnerBids
            .ToDictionary(b => b.UserId, b => b.Bid / teamWinnerFund);
        return new LobbyResult(
            teamWinner, teamLoser, teamWinnerUserIds,
            teamLoserUserIds, userWinnerBids, teamWinnerFund, lobbyFund, userWinnerIncomePercent);
    }
    private static void SetupLobbyOnEnd(Lobby lobby, long teamId)
    {
        lobby.Status = LobbyStatus.Over;
        lobby.EventVisitor = new LobbyEndedEvent();
        var lobbyResult = GetLobbyResult(lobby, teamId);
        var awards = lobbyResult.UserWinnerIncomePercent.Select(p => new UserAward()
        {
            UserId = p.Key,
            Award = Math.Round(
                ((lobbyResult.LobbyFund * (1 - AppConfig.AmountOfComission)) - lobbyResult.TeamWinnerFund) * p.Value,
                2, MidpointRounding.AwayFromZero),
            AwardType = AwardType.Win,
            PayTime = DateTime.MinValue
        }).ToList();
        awards.AddRange(lobbyResult.TeamLoserUserIds.Select(u => new UserAward()
        {
            UserId = u,
            Award = lobby.Bids.First(b => b.UserId == u).Bid * -1,
            AwardType = AwardType.Lose,
            PayTime = DateTime.MinValue
        }).ToList());
        lobby.Awards = awards;
        lobby.TeamWinner = lobbyResult.TeamWinner;
        if (lobby.TeamWinner.Equals(lobby.Teams.First().Id))
        {
            lobby.FirstTeamMapScore++;
        }
        else
        {
            lobby.SecondTeamMapScore++;
        }
    }
    private bool WasLastMap(Lobby lobby)
    {
        var mapWins = new Dictionary<long, int>();
        foreach (var team in lobby.Teams)
        {
            foreach(var match in lobby.Matches)
            {
                if(match.TeamId == team.Id)
                {
                    if(!mapWins.Keys.Contains(team.Id))
                        mapWins[team.Id] = 0;
                    mapWins[team.Id]++;
                }
            }
        }
        var mostWinsTeamValue = mapWins.MaxBy(p => p.Value).Value;
        if (mostWinsTeamValue.Equals(2) && lobby.MatchFormat == Format.BO3)
            return true;
        if(mostWinsTeamValue.Equals(1) && lobby.MatchFormat == Format.BO1)
            return true;
        if (mostWinsTeamValue.Equals(3) && lobby.MatchFormat == Format.BO5)
            return true;
        return lobby.Matches.Last().TeamId != null;
    }
    public async Task<MapEndInformation> LobbyMapEnded(long lobbyId)
    {
        var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Playing) ??
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        var mapEndedInformation = new MapEndInformation()
        {
            EndOfWarmup = DateTime.UtcNow + AppConfig.MapInitialWarmupTimeGlobally
        };
        lobby.LastServerUpdate = DateTime.UtcNow;
        lobby.Version = Guid.NewGuid();
        if (WasLastMap(lobby))
        {
            using var transaction = new TransactionScope(TransactionScopeOption.Required,
            new TransactionOptions { IsolationLevel = IsolationLevel.ReadCommitted },
            TransactionScopeAsyncFlowOption.Enabled);
            SetupLobbyOnEnd(lobby, 0);
            await _lobbySrc.SaveChangesAsync();
            await _serverService.StopServerAsync(lobby.ServerId, lobby.Id);

            await CreateLobbyPayouts(lobby.Id);

            transaction.Complete();
        }
        else
        {
            lobby.Status = LobbyStatus.Warmup;
            var userIds = GetUserIdsInLobby(lobby);
            _ = _matchPrepareNotifier.StartNotifyAboutTime(new()
            {
                AvailableSeconds = (int)AppConfig.MapInitialWarmupTimeGlobally.TotalSeconds,
                LobbyId = lobby.Id,
                UserIds = userIds
            });
            await _lobbySrc.SaveChangesAsync();
        }
        var finalLobby = await GetLobbyByIdAsync(lobbyId);
        mapEndedInformation.NewLobby = CreateActionInfo(finalLobby);
       
        return mapEndedInformation;
    }

    public async Task ForceWin(long lobbyId, long teamId)
    {
        var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Playing) ??
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);

        lobby.LastServerUpdate = DateTime.UtcNow;
        lobby.Version = Guid.NewGuid();

        using var transaction = new TransactionScope(TransactionScopeOption.Required,
        new TransactionOptions { IsolationLevel = IsolationLevel.ReadCommitted },
        TransactionScopeAsyncFlowOption.Enabled);
        if (teamId == 0) 
            throw new ApplicationException("Неверное ID команды для форсирования победы");
        SetupLobbyOnEnd(lobby, teamId);
        await _lobbySrc.SaveChangesAsync();
        await _serverService.StopServerAsync(lobby.ServerId, lobby.Id);
        transaction.Complete();

        _logger.LogInformation($"Лобби {lobbyId} было принудительно завершено победой команды {teamId}");
    }

    public async Task AllConnectedConfirmation(long lobbyId)
    {
        var lobby = await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Warmup) ??
            throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        lobby.Status = LobbyStatus.Playing;
        await _matchPrepareNotifier.StopNotifyingAboutTime(lobbyId);
        lobby.LastServerUpdate = DateTime.UtcNow;
        lobby.Version = Guid.NewGuid();
        await _lobbySrc.SaveChangesAsync();
    }

    public async Task<ActionInfo> ResetLobbyAfterFailedVeto(long lobbyId)
    {
        var lobby =  await _lobbySrc.GetLobbyForAggregation(lobbyId, LobbyStatus.Veto) ??
                    throw new ApplicationException(AppDictionary.JoinLobbyNotFound);
        int retryCount = 0;

        while (retryCount < AppDictionary.MaxRetryCount)
        {
            try
            {
                lobby.MapActions = new();
                lobby.Status = LobbyStatus.Configuring;
                lobby.Version = Guid.NewGuid();
                lobby.EventVisitor = new LobbyFailedEvent();
                await _lobbySrc.SaveChangesAsync();
                break;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                retryCount++;

                foreach (var entry in ex.Entries)
                {
                    var databaseEntry = await entry.GetDatabaseValuesAsync();
                    if (databaseEntry is null)
                        throw new InvalidOperationException(AppDictionary.NotExistingAlready);

                    entry.OriginalValues.SetValues(databaseEntry);

                }

                if (retryCount >= AppDictionary.MaxRetryCount)
                {
                    throw new Exception(AppDictionary.RetryExceeded);
                }
            }
        }
        var mapped = await GetLobbyByIdAsync(lobbyId);
        return CreateActionInfo(mapped);
    }
}
