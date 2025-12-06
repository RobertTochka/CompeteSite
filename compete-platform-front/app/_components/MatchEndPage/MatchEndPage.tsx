import React, { useState } from "react";
import Team from "../Platform/Lobby/Team";
import { GetLobbyDto } from "@/app/_utils/types";
import {
  getMyTeamChatId,
  getTeam,
  getUserAwards,
  getUserBids,
} from "@/app/_utils/functions";
import { ColumnKeyPair } from "../Text/Text";
import MiniChat from "../Platform/Lobby/MiniChat";
import Link from "next/link";
import clsx from "clsx";
import { useRouter } from "next/navigation";

interface MatchEndPageProps extends GetLobbyDto {
  userId: number;
}

export const MatchEndPage = ({ userId, ...rest }: MatchEndPageProps) => {
  const rightTeam = getTeam(rest);
  const leftTeam = rest.teams[0];
  const userBids = getUserBids(rest);
  const userAwards = getUserAwards(rest);
  const myTeamChatId = getMyTeamChatId(rest, userId);
  const router = useRouter();
  const [isChatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<"team" | "public" | null>(null);

  const isWinner = rest.teams
    .find(({ id }) => rest.teamWinner === id)
    ?.users.find(({ id }) => id === userId);

  return (
    <section className="px-[15px] pt-[40px] xl:px-8">
      <div className="flex items-start justify-between gap-5">
        <Team
          userAwards={userAwards}
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
            {!rest.teams.find(({ id }) => rest.teamWinner === id) ? (
              <div className="flex gap-[10px] mb-[10px] justify-center max-w-[600px] w-full">
                <div className="bg-[#1d202d] whitespace-nowrap flex justify-center items-center rounded-[10px] px-[20px] py-[20px] font-semibold text-[19px]">
                  Матч отменен
                </div>
                <div className="bg-[#1d202d] whitespace-nowrap w-full flex items-center justify-center rounded-[10px] px-[20px] py-[20px] font-semibold text-[19px]">
                  Ваши средства не спишутся
                </div>
              </div>
            ) : (
              <div className="flex gap-[10px] mb-[10px] justify-center">
                <div className="bg-[#1d202d] max-w-[345px] flex justify-center items-center rounded-[10px] px-[20px] py-[20px] font-semibold text-[19px]">
                  {isWinner ? "Вы выиграли!" : "Вы проиграли!"}
                </div>
                <div className="bg-[#1d202d] rounded-[10px] flex justify-center items-center p-[20px] font-semibold text-[19px]">
                  {rest.firstTeamMapScore}:{rest.secondTeamMapScore}
                </div>
                <div
                  className={clsx(
                    "bg-[#1d202d] max-w-[300px] flex items-center justify-center rounded-[10px] px-[20px] py-[20px] font-semibold text-[19px]",
                    isWinner ? "text-[#09FA21]" : "text-[#FF3C00]"
                  )}
                >
                  {isWinner
                    ? `+ ${userBids[`${userId}`]}`
                    : `- ${userBids[`${userId}`]}`}
                </div>
              </div>
            )}

            {isWinner && (
              <div className="bg-[#1d202d] rounded-[10px] px-[20px] py-[14px] text-[18px] text-[#88888e] max-w-[600px] w-full">
                Превращай и дальше каждую победу в стабильный доход - твое
                мастерство теперь стоит денег!
              </div>
            )}
            {!rest.teams.find(({ id }) => rest.teamWinner === id) ? (
              <div className="bg-[#1d202d] rounded-[10px] px-[20px] py-[14px] text-[18px] text-[#88888e] max-w-[600px] w-full">
                Один из игроков отменил матч в процессе подготовки лобби
              </div>
            ) : (
              <div className="bg-[#1d202d] rounded-[10px] px-[20px] py-[14px] text-[18px] text-[#88888e] max-w-[600px] w-full">
                <p className="mb-[5px]">
                  При обноружении игроков, нарушающих правила игры, немедленно
                  обратитесь в службу поддержки.
                </p>
                <p>
                  Администрация проверит ход матча и, в случае подтверждения
                  нарушения, изолирует игрока и вернет ваши средства.
                </p>
              </div>
            )}

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
            <div className="flex justify-center gap-[10px] mt-[10px] max-w-[490px]">
              <button
                className="w-[240px] h-[60px] rounded-[10px] text-[20px] text-saturateBlue font-semibold mx-auto flex items-center justify-center bg-[#1d202d]"
                onClick={() => router.replace(`/lobbies`)}
              >
                Завершить
              </button>
              <button
                className="w-[240px] h-[60px] rounded-[10px] text-[20px] text-saturateBlue font-semibold mx-auto flex items-center justify-center bg-[#1d202d]"
                onClick={() => router.replace(`/faq-new`)}
              >
                Пожаловаться
              </button>
            </div>
          </div>
        </div>
        <Team
          userAwards={userAwards}
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
