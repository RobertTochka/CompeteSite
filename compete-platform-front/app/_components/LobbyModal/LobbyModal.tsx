import { useEffect, useMemo, useState } from "react";
import { IDefaultModalProps } from "../ChangeTeamNameModal/ChangeTeamNameModal";
import ModalWindow from "../ModalWindow";
import clsx from "clsx";
import { UserStatus } from "@/app/_utils/types";
import toast from "react-hot-toast";
import {
  useCreateLobbyMutation,
  useGetUserStatusQuery,
} from "@/app/_fetures/lib/api/publicLobbiesApi";
import { useHandleError } from "@/app/_utils/hooks/useTemplatedError";
import { Information } from "../Loading/Loading";
import { useRouter } from "next/navigation";
import { useUpdateBid } from "@/app/_utils/functions";

interface ILobbyModal extends IDefaultModalProps {
  isUninitialized: boolean;
  status: UserStatus;
  refetch: ReturnType<typeof useGetUserStatusQuery>["refetch"];
}

const className =
  "font-semibold box-border text-[22px] py-[14px] w-[210px] rounded-[10px] border-[1px] border-[#1D202D] bg-[#1D202D] transition-all";

const LobbyModal = ({
  onClose,
  isUninitialized,
  status,
  refetch,
}: ILobbyModal) => {
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [password, setPassword] = useState("");
  const [defaultBid, setDefaultBid] = useState("");
  const router = useRouter();
  const [setupBid] = useUpdateBid();
  const [createLobby, { error: createErrorMutation, isLoading: isCreation }] =
    useCreateLobbyMutation();

  useEffect(() => {
    if (status?.lobbyId) {
      router.push(`create-lobby/${status.lobbyId}`);
      onClose();
    }
  }, [status, router]);

  const request = useMemo(
    () => ({
      isPublic,
      password: isPublic === false ? password : null,
      lobbyBid: parseInt(defaultBid),
    }),
    [isPublic, password, defaultBid]
  );

  const onCreateLobby = () => {
    if (!status.lobbyId && !isUninitialized) {
      createLobby(request)
        .unwrap()
        .then(() => refetch())
        .then(() => setupBid(parseInt(defaultBid)));
    }
  };

  const onHandleClick = () => {
    if (isPublic === true || isPublic === false) {
      if (!parseInt(defaultBid) || parseInt(defaultBid) < 50) {
        toast.error("Минимальная ставка 50");
        return;
      }
      if (isPublic === false) {
        if (!password) {
          toast.error("Введите пароль для лобби");
          return;
        } else if (password.length > 16) {
          toast.error("Пароль должен быть не длиннее 16 символов");
          return;
        }
      }
      onCreateLobby();
    } else {
      toast.error("Выберите тип лобби");
    }
  };

  const lobbyError = useHandleError(createErrorMutation);
  if (isCreation || lobbyError) {
    return (
      <Information
        size={90}
        loading={isCreation}
        errorMessage={
          lobbyError == "Такого лобби не существует" ? undefined : lobbyError
        }
      />
    );
  }

  return (
    <ModalWindow onClose={onClose} className="rounded-[10px]">
      <div className="flex flex-col m-1">
        <span className="text-[24px] font-semibold mb-[8px]">
          Создание лобби
        </span>
        <span className="text-[18px] font-medium text-secondGray whitespace-normal mt-[8px] mb-[15px]">
          Создавай кастомные матчи в CS2, приглашай соперников
          <br />
          своего уровня и превращай каждую победу в стабильный
          <br />
          доход
        </span>
        <div className="flex items-start justify-center gap-[60px] py-[15px]">
          <div className="relative bg-[#1D202D] rounded-[10px]">
            <button
              className={clsx(
                className,
                "cursor-default text-[#3C66CA] rounded-t-[10px]"
              )}
              disabled
            >
              Игровой взнос
            </button>
            <div className="bg-[#111217] h-[4px] w-[176px]"></div>
            <div
              className={clsx("overflow-hidden transition-all duration-500")}
            >
              <input
                className="bg-[#1D202D] box-border border-[1px] border-[#1D202D] rounded-b-[10px] p-[10px] text-[14px] font-medium w-full placeholder:text-[#3E4051]"
                type="number"
                placeholder="Сумму впиши!"
                value={defaultBid}
                onChange={(e) => setDefaultBid(e.target.value)}
              />
            </div>
            <div className="absolute top-1/3 right-[-32px] w-8 h-4 bg-[#1D202D] -translate-y-1/3" />
            <div className="absolute top-1/3 right-[-55px] w-8 h-10 bg-[#1D202D] -translate-y-[44%] clip-arrow" />
          </div>
          <div className="flex flex-col items-end gap-[4px]">
            <button
              className={clsx(
                className,
                isPublic === true ? "text-saturateBlue" : "text-[#111217]"
              )}
              onClick={() => {
                setIsPublic(true);
              }}
            >
              Публичное
            </button>
            <span className="text-[18px] font-medium text-[#1e2741]">или</span>
            <div className="bg-[#1D202D] rounded-[10px]">
              <button
                className={clsx(
                  className,
                  "rounded-t-[10px]",
                  isPublic === false ? "text-saturateBlue" : "text-[#111217]"
                )}
                onClick={() => {
                  setIsPublic(false);
                }}
              >
                Приватное
              </button>
              <div className="bg-[#111217] h-[4px] w-[176px]"></div>
              <div
                className={clsx("overflow-hidden transition-all duration-500")}
              >
                <input
                  className="bg-[#1D202D] box-border border-[1px] border-[#1D202D] rounded-b-[10px] p-[10px] text-[14px] font-medium w-full placeholder:text-[#3E4051]"
                  type="password"
                  placeholder="Пароль придумай!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPublic === true}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-[20px] relative p-[10px]">
          <div className="w-full h-[2px] bg-[#1D202D]"></div>
          <span className="absolute top-0 left-10 z-10 text-[#3E4050] px-[4px] bg-[#111217]">
            безопасность
          </span>
        </div>
        <div className="flex flex-col mt-3 mb-5">
          <span className="text-[18px] font-medium text-secondGray whitespace-normal mb-2">
            При обнаружении игроков, нарушающих правила игры,
            <br />
            незамедлительно обратитесь в службу поддержки.
          </span>
          <span className="text-[18px] font-medium text-secondGray whitespace-normal">
            Администратор проверит ход матча и в случае выявления
            <br />
            нарушителя изолирует его и вернёт ваши средства.
          </span>
        </div>
        <div className="w-full h-[2px] bg-[#1D202D] mx-1"></div>
        <div className="flex self-end mt-5 gap-4">
          <button
            className="font-semibold box-border text-[20px] text-saturateBlue py-[14px] w-[180px] rounded-[10px] border-[1px] border-[#1D202D] bg-[#111217] transition-all text-opacity-40"
            onClick={() => onClose()}
          >
            Отменить
          </button>
          <button
            className={
              "font-semibold box-border text-[20px] text-[#111217] py-[14px] w-[180px] rounded-[10px] border-[1px] border-saturateBlue bg-saturateBlue transition-all hover:bg-opacity-70 hover:border-opacity-70"
            }
            onClick={onHandleClick}
          >
            Создать
          </button>
        </div>
      </div>
    </ModalWindow>
  );
};

export default LobbyModal;
