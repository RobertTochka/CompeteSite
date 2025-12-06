namespace compete_platform.Dto;

public class CreateLobbyDto
{
    public bool isPublic { get; set; }
    public string? password { get; set; } = null;
    public decimal lobbyBid { get; set; }
}
