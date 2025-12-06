"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect } from "react";
import { useCheckAuthMutation } from "@/app/_fetures/lib/api/publicLobbiesApi";
import { getUserId } from "@/app/_utils/functions";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [checkAuth] = useCheckAuthMutation();
  const router = useRouter();

  useLayoutEffect(() => {
    const timerId = setTimeout(() => {
      checkAuth()
        .unwrap()
        .then(() => router.push(`/profile/${getUserId()}`));
    }, 1000);
    return () => {
      clearInterval(timerId);
    };
  }, []);

  return (
    <div className="relative pt-[112px]">
      <div className="relative z-10 pb-[35px]">
        <h1 className="font-bold text-[60px] max-w-[904px] [text-shadow:_1px_1px_3px_rgb(0_0_0)]">
          СS2 как работа: монетизируй каждую свою победу в кастомных матчах
        </h1>
        <p className="text-gray-new text-[24px] max-w-[671px] mt-[31px]">
          Создавай уникальные кастомные матчи в CS2, приглашай соперников своего
          уровня и превращай каждую победу в стабильный доход – твое мастерство
          теперь стоит денег!
        </p>
        <p className="text-gray-new text-[24px] max-w-[671px] mt-[23px]">
          Новым игрокам — стартовый бонус для участия в первых матчах!
        </p>
        <div className="w-max">
          <Link
            href="api/auth/enter"
            className="w-[434px] flex bg-darkBlue rounded-[20px] text-[40px] font-semibold items-center mt-[61px]"
          >
            <Image
              src="/img/shooter.png"
              width={76}
              height={76}
              alt="Стрелок"
            />
            Начать играть
          </Link>
          <p className="text-[11px] text-gray-new mt-[9px] text-center">
            Нажимая на кнопку вы соглашаетесь с{" "}
            <Link href="/rules" className="text-saturateBlue">
              Правилами проекта
            </Link>
          </p>
        </div>
        <img
          src="/img/start-screen.png"
          alt="Страница лобби"
          width={631}
          className="z-1 absolute top-0 right-0 mt-10 mr-5"
        />
      </div>
    </div>
  );
}
