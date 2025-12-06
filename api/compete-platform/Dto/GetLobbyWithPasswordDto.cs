using compete_poco.Dto;

public class GetLobbyWithPasswordDto : GetLobbyViewDto
{
    public bool Public { get; set; }
    public string? Password { get; set; }
}