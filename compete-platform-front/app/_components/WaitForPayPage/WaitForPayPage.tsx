import { connection, getMyTeamChatId, getTeam } from "@/app/_utils/functions";
import { GetLobbyDto } from "@/app/_utils/types";
import { useEffect, useState } from "react";
import Team from "../Platform/Lobby/Team";
import { ColumnKeyPair } from "../Text/Text";
import Link from "next/link";
import MiniChat from "../Platform/Lobby/MiniChat";
import { usePayLobbyMutation } from "@/app/_fetures/lib/api/publicLobbiesApi";
import toast from "react-hot-toast";
import clsx from "clsx";

interface WaitForPayPageProps extends GetLobbyDto {
  userId: number;
}

export const WaitForPayPage = ({ userId, ...rest }: WaitForPayPageProps) => {
  const rightTeam = getTeam(rest);
  const leftTeam = rest.teams[0];
  const myTeamChatId = getMyTeamChatId(rest, userId);
  const [isChatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<"team" | "public" | null>(null);
  const [isPayed, setIsPayed] = useState(false);

  const [pay, { isLoading: payLoading, error: payError }] =
    usePayLobbyMutation();

  const handlePay = () => {
    pay({ lobbyId: rest.id })
      .unwrap()
      .then((url) => window.open(url));
  };

  useEffect(() => {
    if (rest.payedUserIds.includes(userId)) setIsPayed(true);
  }, [rest.payedUserIds]);

  useEffect(() => {
    if (!connection) return;
    connection.on("SuccessPayment", () => {
      toast.success("Оплата прошла успешно");
      setIsPayed(true);
    });
    return () => connection.off("SuccessPayment");
  }, []);

  return (
    <section className="px-[15px] pt-[40px] xl:px-8">
      <div className="flex items-start justify-between gap-5">
        <Team
          currentUserId={userId}
          {...leftTeam}
          teamLength={rest.playersAmount}
        />
        <div className="">
          <ColumnKeyPair
            keyValue="Разыгранный банк"
            value={`R ${rest.bids
              .map((b) => b.bid)
              .reduce((a, v) => a + v, 0)}`}
            valuesClassnames="text-[40px]"
          />
          <div className="mt-[40px] flex flex-col gap-[10px] items-center">
            <div className="bg-[#1d202d] rounded-[10px] px-[20px] py-[14px] text-[18px] text-[#88888e] max-w-[600px] w-full">
              <p className="mb-[5px]">Ожидание оплаты игроков...</p>
              <p>
                После проведения оплаты всеми участниками лобби, начнется матч.
                При возникновении вопросов или проблем, обратитесь в поддержку
                сайта.
              </p>
            </div>

            <div className="bg-[#1d202d] rounded-[10px] px-[20px] py-[14px] text-[18px] text-[#88888e] max-w-[600px] w-full">
              Следите за обновлениями и влияйте на них в нашем
              <Link
                target="_blank"
                href="https://t.me/off_Hellboy"
                className="text-saturateBlue"
              >
                {" "}
                tg-канале
              </Link>
              .
            </div>
            <div className="flex justify-center gap-[10px] mt-[10px] max-w-[250px]">
              <button
                className={clsx(
                  "w-[240px] h-[60px] rounded-[10px] text-[20px] font-semibold mx-auto flex items-center justify-center bg-[#1d202d]",
                  isPayed || payLoading ? "text-[#008927]" : "text-positive",
                )}
                disabled={isPayed || payLoading}
                onClick={handlePay}
              >
                Оплатить
              </button>
            </div>
          </div>
        </div>
        <Team
          {...rightTeam}
          currentUserId={userId}
          teamLength={rest.playersAmount}
          isSecondTeam
        />
      </div>
      <div className="w-[650px] mx-auto mt-[38px]">
        <MiniChat
          teamChatId={myTeamChatId}
          lobbyChatId={rest.chatId}
          isOpen={isChatOpen}
          setOpen={setChatOpen}
          tab={chatTab}
          setTab={setChatTab}
        />
      </div>
    </section>
  );
};
