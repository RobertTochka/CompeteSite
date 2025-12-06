import { useGetSiteStatsQuery } from "@/app/_fetures/lib/api/publicLobbiesApi";
import { useEffect } from "react";
import ToolTip from "./ToolTip";

const SiteStats = () => {
  const { data } = useGetSiteStatsQuery(undefined, {
    skip: !!localStorage.getItem("siteStats"),
  });

  useEffect(() => {
    if (data) {
      localStorage.setItem("siteStats", JSON.stringify(data));
    }
  }, [data]);

  const cached = JSON.parse(localStorage.getItem("siteStats") || "null");
  const stats = data || cached;

  return (
    <div className="flex justify-between bg-[#00000040] rounded-[20px] px-[22px] py-[15px] w-max gap-[40px]">
      <ToolTip content="Всего игроков">
        <div className="flex gap-[7px] items-center text-[24px] px-1">
          <div className="w-[8px] h-[8px] bg-red-700 rounded-full" />
          {stats?.totalPlayers.toLocaleString("ru-RU")}
        </div>
      </ToolTip>
      <ToolTip content="Игроков за сутки">
        <div className="flex gap-[7px] items-center text-[24px] px-1">
          <div className="w-[8px] h-[8px] bg-orange-400 rounded-full" />
          {stats?.playersPerDay.toLocaleString("ru-RU")}
        </div>
      </ToolTip>
      <ToolTip content="Всего матчей">
        <div className="flex gap-[7px] items-center text-[24px] px-1">
          <div className="w-[8px] h-[8px] bg-yellow-500 rounded-full" />
          {stats?.totalMatches.toLocaleString("ru-RU")}
        </div>
      </ToolTip>
      <ToolTip content="Активные матчи">
        <div className="flex gap-[7px] items-center text-[24px] px-1">
          <div className="w-[8px] h-[8px] bg-green-500 rounded-full" />
          {stats?.activeMatches.toLocaleString("ru-RU")}
        </div>
      </ToolTip>
      <ToolTip content="Призовые выплаты">
        <div className="flex gap-[7px] items-center text-[24px] px-1">
          <div className="w-[8px] h-[8px] bg-saturateBlue rounded-full" />
          {stats?.totalPrizeMoney.toLocaleString("ru-RU")}
        </div>
      </ToolTip>
    </div>
  );
};

export default SiteStats;
