import React, { HTMLAttributes } from "react";
import Avatar from "../Avatar";
import clsx from "clsx";

interface AddPlayerView extends HTMLAttributes<HTMLDivElement> {
  isUnknown?: boolean;
  showLastColumn?: boolean;
  canChangeTeam?: boolean;
}

export const AddPlayerView = ({
  className,
  isUnknown,
  canChangeTeam,
  showLastColumn = true,
  ...rest
}: AddPlayerView) => {
  return (
    <div className="box-border flex items-center py-[5px]">
      <div
        {...rest}
        className={clsx(
          `flex items-center gap-3 box-border py-[5px] border-[2px] rounded-[10px] transition-opacity bg-opacity-0 border-opacity-0 bg-secondaryBlue border-saturateBlue ${"basis-[60%]"}`,
          canChangeTeam &&
            "hover:bg-opacity-5 hover:border-opacity-20 cursor-pointer",
          !isUnknown && "cursor-pointer"
        )}
      >
        <Avatar width={64} height={64} add_friend={isUnknown !== true} />
      </div>
      <span
        className={`box-border text-[20px] py-[5px] text-gray text-center ${"basis-[20%]"}`}
      >
        -
      </span>
      {showLastColumn && (
        <span
          className={`box-border text-[20px] py-[5px] text-center ${"basis-[20%]"}`}
        >
          -
        </span>
      )}
    </div>
  );
};
