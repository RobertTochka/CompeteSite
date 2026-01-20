using compete_platform.Dto;
using compete_poco.Infrastructure.Services;
using compete_poco.Models;
using Compete_POCO_Models.Infrastrcuture.Data;
using Compete_POCO_Models.Models;

namespace compete_platform.Infrastructure.Services.PayRepository
{
    public abstract class CPayRepository : CRepository
    {
        public CPayRepository(ApplicationContext ctx) : base(ctx)
        {
        }
        public abstract Task<Pay> CreatePayAsync(Pay pay);
        public abstract Task CreatePayoutAsync(UserPayout payout);
        public abstract Task<List<UserPayout>> GetUserPayoutsAsync(long userId);
        public abstract Task<GetPayDto[]> GetUserPaysGroupByDateAsync(long userId,
            int page,
            int pageSize);
    }
}
