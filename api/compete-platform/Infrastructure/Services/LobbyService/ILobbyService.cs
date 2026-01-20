using compete_platform.Dto;
using compete_poco.Dto;
using compete_poco.Infrastructure.Services.LobbyService.Models;

namespace compete_platform.Infrastructure.Services.LobbyService
{
    public interface ILobbyService
    {
        public Task SuccessLobbyPayment(long lobbyId, long userId);
        public Task CancelLobbyPayment(long lobbyId, long userId);
        public Task<string> PayLobby(long lobbyId, long userId);
        public Task<ActionInfo> JoinToLobby(JoinToLobbyInfo info);
        public Task<ActionInfo?> LeaveFromLobby(long userId, long lobbyId);
        public Task<ActionInfo> SetNewLobbyConfiguration(LobbyAdminConfiguration newCfg, long userId);
        public Task<ActionInfo> ChangeUserBid(ChangeUserBidRequest request);
        public Task<ActionInfo> ChangePassword(ChangePasswordRequest request);
        public Task<ActionInfo> ChangeTeamName(ChangeTeamNameRequest req);
        public Task<JoinToLobbyInfo> CreateInviteForUser(SendInviteRequest req);
        public Task<ActionInfo> StartMapPick(long lobbyId, long userId);
        public Task<ActionInfo> ChangeTeam(long lobbyId, long UserId);
        public Task<ActionInfo> DoAction(MapPickRequest req);
        public Task<ActionInfo> GetLobbyVetoStateAsyncById(long lobbyId, long userId);
        public Task<ActionInfo> GetLobbyVetoStateAsyncByUserId(long userId);
        public abstract Task<List<GetLobbyWithPasswordDto>> GetLobbiesAsync(GetLobbyRequest request);
        public abstract Task<List<GetLobbyViewDto>> GetAllLobbiesAsync();
        public abstract Task<GetLobbyDto> CreateLobbyAsync(long creatorId, bool isPublic, string? password, decimal lobbyBid);
        public abstract Task<ActionInfo> Cancel_Lobby(long lobbyId, long[]? offenders = null);
        public abstract Task Cancel_Afk_Lobby(long lobbyId);
        public abstract Task<ActionInfo> CancelVeto(long lobbyId);
        public abstract Task<MapEndInformation> LobbyMapEnded(long lobbyId);
        public abstract Task ForceWin(long lobbyId, long teamId);
        public abstract Task AllConnectedConfirmation(long lobbyId);
        public Task<ActionInfo> ResetLobbyAfterFailedVeto(long lobbyId);
    }
}
