import { PropsWithChildren } from "react";
import Checkbox from "../Checkbox/Checkbox";
import Link from "next/link";
import { Filters } from "@/app/(pages)/(guard-user)/lobbies/page";

const FilterBlock = ({
  children,
  title,
}: PropsWithChildren<{ title: string }>) => {
  return (
    <div className="bg-[#00000040] rounded-[10px] px-[17px] py-[13px]">
      <h3 className="text-white text-[16px] font-medium mb-[9px]">{title}</h3>
      <div className="flex flex-col gap-[3px]">{children}</div>
    </div>
  );
};

const maps = [
  "Mirage",
  "Inferno",
  "Anubis",
  "Overpass",
  "Ancient",
  "Vertigo",
  "Nuke",
  "Dust2",
  "Office",
  "Italy",
  "Duels",
  "Aim Centro",
  "Awp 1v1",
  "Redline",
  "Awp Lego 2",
  "Aim Map",
  "Aim Dust",
  "Carton",
  "Wmap",
  "Deagle Bench",
];

const types = ["5v5", "4v4", "3v3", "2v2", "1v1"];
const modes = ["bo1", "bo3", "bo5"];

interface IFilters {
  filters: Filters;
  onFiltersChange: (value: string, name: string, checked: boolean) => void;
}

const LobbyFilters = ({ filters, onFiltersChange }: IFilters) => {
  return (
    <div className="flex-1 overflow-auto custom-scrollbar pr-[5px] gap-[20px] flex flex-col">
      <FilterBlock title="Только публичные:">
        <Checkbox
          onChange={onFiltersChange}
          isChecked={filters.public === "true"}
          name="public"
          value="true"
        >
          Да
        </Checkbox>
        <Checkbox
          onChange={onFiltersChange}
          isChecked={filters.public === "false"}
          name="public"
          value="false"
        >
          Нет
        </Checkbox>
      </FilterBlock>
      <FilterBlock title="Статус:">
        <Checkbox
          onChange={onFiltersChange}
          isChecked={filters.status === "Configuring"}
          name="status"
          value="Configuring"
        >
          Набор игроков
        </Checkbox>
        <Checkbox
          onChange={onFiltersChange}
          isChecked={filters.status === "Playing"}
          name="status"
          value="Playing"
        >
          Идет матч
        </Checkbox>
      </FilterBlock>
      <FilterBlock title="Тип:">
        {types.map((type) => (
          <Checkbox
            key={type}
            isChecked={filters.type === type.slice(1)}
            name="type"
            value={type.slice(1)}
            onChange={onFiltersChange}
          >
            {type}
          </Checkbox>
        ))}
      </FilterBlock>
      <FilterBlock title="Режим:">
        {modes.map((mode) => (
          <Checkbox
            key={mode}
            isChecked={filters.mode === mode.toUpperCase()}
            name="mode"
            value={mode.toUpperCase()}
            onChange={onFiltersChange}
          >
            {mode}
          </Checkbox>
        ))}
      </FilterBlock>
      <FilterBlock title="Карта:">
        {maps.map((map) => (
          <Checkbox
            squared={true}
            key={map}
            isChecked={filters.maps.includes(map)}
            name="maps"
            value={map}
            onChange={onFiltersChange}
          >
            {map}
          </Checkbox>
        ))}
      </FilterBlock>
      <div className="bg-[#00000040] rounded-[10px] min-h-[130px] flex justify-center flex-col items-center">
        <h3 className="text-[#707070] text-[14px] mb-[15px]">Ваша реклама:</h3>
        <Link
          target="_blank"
          href="https://t.me/off_Hellboy"
          className="text-saturateBlue"
        >
          @off_Hellboy
        </Link>
        <Link
          target="_blank"
          href="https://t.me/unicheel"
          className="text-saturateBlue"
        >
          @unicheel
        </Link>
      </div>
      <div className="bg-[#00000040] rounded-[10px] min-h-[130px] h-[130px] flex justify-center flex-col items-center">
        <h3 className="text-[#707070] text-[14px] mb-[15px]">Ваша реклама:</h3>
        <Link
          target="_blank"
          href="https://t.me/off_Hellboy"
          className="text-saturateBlue"
        >
          @off_Hellboy
        </Link>
        <Link
          target="_blank"
          href="https://t.me/unicheel"
          className="text-saturateBlue"
        >
          @unicheel
        </Link>
      </div>
    </div>
  );
};

export default LobbyFilters;
