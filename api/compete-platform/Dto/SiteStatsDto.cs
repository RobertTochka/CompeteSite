using compete_poco.Models;

namespace compete_poco.Dto
{
    public class SiteStatsDto
    {
        public int TotalPlayers { get; set; }
        public int PlayersPerDay { get; set; }
        public int TotalMatches { get; set; }
        public int ActiveMatches { get; set; }
        public int TotalPrizeMoney { get; set; }
    }
}