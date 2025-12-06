"use client";

import { useId, useState } from "react";
import Icon from "../../Icon";
import { Messager } from "../../Messager/Messager";
import { useSendMessage } from "@/app/_utils/functions";
import { Information } from "../../Loading/Loading";
import { useChat } from "@/app/_utils/hooks/useChat";

export interface IChatProps {
  lobbyChatId?: number;
  teamChatId?: number;
  showReport?: boolean;
  userId?: number;
}

export default function Chat({
  teamChatId,
  lobbyChatId,
  showReport,
  userId,
}: IChatProps) {
  const { onMessageSend, condition, message, date, setMessage } = useChat({
    chatId: teamChatId ?? lobbyChatId ?? userId,
  });
  const inputImgId = useId();
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === "Enter") onMessageSend();
  };
  return (
    <div className="w-[450px] mx-auto rounded-[10px] bg-[#1E202F]">
      {/* <div className="flex justify-between">
        <button
          className={`text-[14px] font-medium pb-[15px] text-white ${
            tab === "all"
              ? "border-b-[2px] border-saturateBlue opacity-100"
              : `hover:opacity-100 opacity-30`
          }`}
          onClick={() => setTab("all")}
        >
          Общий чат
        </button>
        <button
          className={`text-[14px] font-medium pb-[15px] text-white ${
            tab === "team"
              ? "border-b-[2px] border-saturateBlue opacity-100"
              : `hover:opacity-100 opacity-30`
          }`}
          onClick={() => setTab("team")}
        >
          Чат команды
        </button>
        {showReport && (
          <button
            className={`text-[14px] font-medium pb-[15px] text-[#FF3C00] ${
              tab === "appeal"
                ? "border-b-[2px] border-saturateBlue opacity-100"
                : `hover:opacity-100 opacity-30`
            }`}
            onClick={() => setTab("appeal")}
          >
            Жалоба
          </button>
        )}
      </div> */}
      <Messager
        chatId={teamChatId ?? lobbyChatId ?? userId}
        date={date}
        isAppeal={false}
        useBorder={false}
      />
      <div className="flex items-center border-t-[1px] border-[#545454] gap-[25px] py-[10px] px-[16px]">
        <label htmlFor={inputImgId} className="cursor-pointer">
          <Icon icon="smile" defaultColor="#545454" hoverColor="#ffffff" />
          <input className="hidden" type="file" id={inputImgId} />
        </label>
        <input
          onKeyDown={onKey}
          onInput={(e) => setMessage(e.currentTarget.value)}
          className="placeholder:text-gray text-[14px] font-medium"
          type="text"
          value={message}
          placeholder="Message..."
        />
        <div className="flex gap-x-4">
          <button onClick={onMessageSend}>
            <Icon
              icon="sendInChat"
              defaultColor="#545454"
              hoverColor="#ffffff"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
