using compete_poco.Models;

namespace compete_poco.Dto
{
    public class MatchInformationDto
    {
        public long MatchId { get; set; }
        public long? LobbyId { get; set; }
        public Map? PlayedMap { get; set; }
        public long? WinnerTeamId { get; set; }
        public int? FirstTeamScore { get; set; }
        public int? SecondTeamScore { get; set; }
    }
}