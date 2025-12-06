import { Format } from "@/app/_utils/types";
import clsx from "clsx";
import { useEffect, useState } from "react";

interface IMatchFormatPickerProps {
  matchFormat: Format;
  isAim: boolean;
  onUpdate: (newValue: number) => void;
}

export const MatchFormatPicker = ({
  matchFormat,
  isAim,
  onUpdate,
}: IMatchFormatPickerProps) => {
  const [matchFormats, setMatchFormats] = useState(["bo1"]);

  useEffect(() => {
    setMatchFormats(isAim ? ["bo1"] : ["bo1", "bo3", "bo5"]);
    if (isAim && matchFormat !== Format.BO1) onUpdate(1);
  }, [isAim]);

  return (
    <div className="flex items-center justify-between">
      <span className="font-inter">Формат матча:</span>
      <div
        className={clsx(
          "flex items-center gap-4",
          matchFormat === Format.BO1 ? "min-w-[50%] justify-center" : ""
        )}
      >
        {matchFormats.map((value, i) => (
          <button
            key={value}
            className={`font-medium ${
              i + 1 === (matchFormat as number)
                ? "text-white cursor-default"
                : "text-gray hover:text-white"
            }`}
            onClick={() => onUpdate(i + 1)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
};
