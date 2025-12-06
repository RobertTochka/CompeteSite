"use client";

import AppealChat from "@/app/_components/Faq/AppealChat";
import { Information } from "@/app/_components/Loading/Loading";
import {
  useGetAppealChatIdByUserIdQuery,
  useGetUserProfileQuery,
} from "@/app/_fetures/lib/api/publicLobbiesApi";
import { useEffect, useMemo, useState } from "react";

export default function FaqPage() {
  const [hasChatRefetched, setHasChatRefetched] = useState(false);
  const userReq = useMemo(
    () => ({ userId: undefined, includeFriends: false }),
    []
  );
  const { data: user, isLoading } = useGetUserProfileQuery(userReq);
  const { data: chatId, refetch: refetchChat } =
    useGetAppealChatIdByUserIdQuery(user?.id, {
      skip: !user,
    });

  useEffect(() => {
    if (user && !hasChatRefetched) {
      refetchChat();
      setHasChatRefetched(true);
    }
  }, [user, hasChatRefetched, refetchChat]);

  return (
    <div className="bg-[#191B21] rounded-[20px] w-full pt-[40px] h-full mt-[60px] flex-1 overflow-auto flex flex-col">
      {user?.isAdmin || isLoading ? (
        <Information
          loading={isLoading}
          label="Чат с администратором недоступен, так как Вы являетесь админом"
        />
      ) : (
        <AppealChat chatId={chatId} />
      )}
    </div>
  );
}
