"use client";

import { Map } from "@/app/_utils/types";
import clsx from "clsx";
import Image from "next/image";
const defaultMaps = [
  "Mirage",
  "Inferno",
  "Nuke",
  "Anubis",
  "Overpass",
  "Vertigo",
  "Ancient",
  "Dust2",
  "Office",
  "Italy",
];
const aimMaps = [
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

interface IMapsProps {
  mapsOnLobby: Map[];
  onMapChange: (map: Map) => void;
  isPublic: boolean;
  isAim: boolean;
}

export default function Maps({
  mapsOnLobby,
  onMapChange,
  isPublic,
  isAim,
}: IMapsProps) {
  const maps = defaultMaps.concat(aimMaps);
  const mapsToShow = isAim ? aimMaps : defaultMaps;
  const mapToEnum = (map: string) => maps.findIndex((m) => m === map);

  return (
    <div
      className={clsx(
        "flex flex-col gap-[11px] overflow-auto max-h-[488px] w-[50%] pr-[10px] custom-scrollbar transition-all duration-500",
        !isPublic && "max-h-[559px]"
      )}
    >
      {mapsToShow.map((map) => (
        <div
          onClick={() => onMapChange(mapToEnum(map))}
          key={map}
          className={`cursor-pointer flex ${
            mapsOnLobby.includes(mapToEnum(map))
              ? "bg-[#1E202F]"
              : "bg-[#00000040]"
          } rounded-[10px] hover:bg-[#1E202F]`}
        >
          <div className="rounded-[10px] relative w-[100px] overflow-hidden">
            <Image
              src={`/img/maps/${map.toLowerCase().replace(/\s/g, "_")}.png`}
              alt={map}
              fill
              objectFit="cover"
            />
          </div>
          <div className="flex flex-col gap-[10px] items-center w-[60%]">
            <p className="text-gray font-medium">Карта</p>
            <p>{map}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
