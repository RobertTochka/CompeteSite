using Microsoft.EntityFrameworkCore;

namespace compete_poco.Models
{
    public enum DealInfoStatus
    {
        Success, Failed, Pending
    }
    [Owned]
    public class DealInfo
    {
        public string DealId { get; set; } = null!;
        public long UserId { get; set; }
        public decimal Amount { get; set; }
        public DealInfoStatus Status { get; set; } = DealInfoStatus.Pending;
    }
}