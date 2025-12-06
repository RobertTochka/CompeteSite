import { getUserId, isNumeric } from "@/app/_utils/functions";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

interface IBidPickerProps {
  creatorId: number;
  bid: number;
  onUpdate: (value: number) => void;
}

export const BidPicker = ({ creatorId, bid, onUpdate }: IBidPickerProps) => {
  const [customBid, setCustomBid] = useState(String(bid ?? 0));
  const [isInputVisible, setIsInputVisible] = useState(false);
  const inputRef = useRef(null);
  const userId = parseInt(getUserId());

  const onSumOk = () => {
    if (isNumeric(customBid)) onUpdate(parseInt(customBid));
    setIsInputVisible((pr) => !pr);
  };

  const onChange = () => {
    setIsInputVisible((pr) => !pr);
    setCustomBid("");
  };

  useEffect(() => {
    if (isInputVisible) {
      inputRef.current?.focus();
    }
  }, [isInputVisible]);

  return (
    <div className="flex items-center w-full gap-[16px]">
      <span className="font-inter">Ставка:</span>
      {!isInputVisible ? (
        <>
          <p className="ml-auto">{bid} R</p>
        </>
      ) : (
        <input
          ref={inputRef}
          onChange={(e) => setCustomBid(e.target.value)}
          placeholder="Сумма"
          className="border-b-[1px] max-w-[90px] ml-auto border-b-gray-new flex items-center placeholder:text-white/20"
          type="number"
          value={customBid}
          min={1}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSumOk();
          }}
        />
      )}
      <button
        className={clsx(
          "font-medium text-[#545454] hover:text-white",
          !isInputVisible && "hidden"
        )}
        onClick={onSumOk}
      >
        ок
      </button>
      {userId === creatorId && (
        <button
          className={clsx(
            "font-medium text-[#545454] hover:text-white",
            isInputVisible && "hidden"
          )}
          onClick={onChange}
        >
          изм.
        </button>
      )}
    </div>
  );
};
