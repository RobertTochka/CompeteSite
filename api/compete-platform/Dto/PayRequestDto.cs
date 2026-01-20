using Yandex.Checkout.V3;

namespace compete_platform.Dto
{
    public class PayRequestDto
    {
        public decimal Amount { get; set; }
        public long UserId { get; set; }
        public long LobbyId { get; set; }
        public Deal Deal { get; set; } = null!;
    }
}
