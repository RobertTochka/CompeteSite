namespace compete_poco.Models;

public enum UserPayoutStatus
{
    WaitForPayout, Success
}

public class UserPayout
{
    public long Id { get; set; }
    public string FirstDealId { get; set; } = null!;
    public string SecondDealId { get; set; } = null!;
    public long UserId { get; set; }
    public decimal Amount { get; set; }
    public UserPayoutStatus Status { get; set; } = UserPayoutStatus.WaitForPayout;
    public DateTime CreatedAt { get; set; }
}