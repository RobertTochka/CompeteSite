namespace compete_poco.Dto
{
    public class ChangePasswordRequest
    {
        public long UserId { get; set; }
        public string? Password { get; set; } = null;
    }
}
