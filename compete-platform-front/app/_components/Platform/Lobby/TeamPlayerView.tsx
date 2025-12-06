import { GetUserDto } from "@/app/_utils/types";
import React from "react";
import Avatar from "../Avatar";
import { truncateString } from "@/app/_utils/functions";
import clsx from "clsx";
import { TeamPlayer } from "./Team";

interface ITeamPlayerViewProps {
  isLeader: boolean;
  bid?: number;
  award?: number;
  win?: boolean;
  canKick?: boolean;
  player: TeamPlayer;
  openContextMenu?: (e: React.MouseEvent, user: TeamPlayer) => void;
}

export const TeamPlayerView = ({
  bid,
  isLeader,
  canKick,
  openContextMenu,
  player,
}: ITeamPlayerViewProps) => {
  return (
    <div
      key={player.id}
      className="flex items-center gap-[15px] box-border py-[7px]"
    >
      <div
        className={clsx(
          "flex items-center gap-[10px] box-border py-[5px] border-[2px] rounded-[10px] transition-opacity bg-opacity-0 border-opacity-0 bg-secondaryBlue border-saturateBlue",
          canKick && "hover:bg-opacity-5 hover:border-opacity-20 cursor-pointer"
        )}
        onClick={canKick ? (e) => openContextMenu(e, player) : undefined}
      >
        <Avatar
          width={64}
          height={64}
          image_url={player.avatarUrl}
          status_online={player.isOnline}
          creator={isLeader}
        />
        <span className="text-[20px] font-medium w-[138px] break-words">
          {truncateString(player.name, 21)}
        </span>
      </div>
      <span
        className={`text-[14px] py-[5px] box-border font-medium text-gray-new text-center w-[75px]`}
      >
        id {player.id}
      </span>
      {bid && (
        <span
          className={`text-[20px] py-[5px] box-border font-medium text-center text-[white]`}
        >
          R&nbsp;{bid}
        </span>
      )}
    </div>
  );
};
