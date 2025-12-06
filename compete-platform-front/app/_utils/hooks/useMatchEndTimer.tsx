import { useGetTimeLeftQuery } from "@/app/_fetures/lib/api/publicLobbiesApi";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export const useMatchEndTimer = () => {
  const [timeLeft, setTimeLeft] = useState(120);
  const cachedEndsAt = localStorage.getItem("endsAt");
  const { data: endsAtQueryData } = useGetTimeLeftQuery(undefined, {
    skip: !!cachedEndsAt,
  });
  const endsAt = cachedEndsAt ?? endsAtQueryData;

  useEffect(() => {
    if (!endsAt) return;

    localStorage.setItem("endsAt", endsAt.toString());
    const interval = setInterval(() => {
      const now = new Date();
      const endsAtDate = new Date(endsAt);
      const secondsLeft = Math.max(
        0,
        Math.floor((endsAtDate.getTime() - now.getTime()) / 1000)
      );
      setTimeLeft(secondsLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt]);

  return timeLeft;
};
