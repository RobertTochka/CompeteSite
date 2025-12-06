import { getUserId, useStartVeto } from "@/app/_utils/functions";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { HashLoader } from "react-spinners";

interface IStartMatchButtonProps {
  lobbyId: number;
  creatorId: number;
}

export const StartMatchButton = ({
  lobbyId,
  creatorId,
}: IStartMatchButtonProps) => {
  const [startVeto, { condition: vetoCondition }] = useStartVeto();
  const userId = parseInt(getUserId());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (vetoCondition !== "loading") setIsLoading(false);
    else setIsLoading(true);
  }, [vetoCondition]);

  return (
    <button
      className={clsx(
        "text-[20px] py-[18px] w-[200px] rounded-[10px] whitespace-nowrap",
        userId === creatorId
          ? "bg-saturateBlue hover:bg-secondaryBlue font-medium"
          : "bg-transparent border-[1px] border-saturateBlue text-saturateBlue font-light"
      )}
      onClick={() => startVeto(lobbyId)}
      disabled={isLoading || userId !== creatorId}
    >
      {isLoading && <HashLoader color="white" size={25} />}
      {userId != creatorId && !isLoading ? "Ожидание хоста" : "Запустить матч"}
    </button>
  );
};
