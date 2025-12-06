import { useState } from "react";
import ModalWindow from "../ModalWindow";
import toast from "react-hot-toast";
import Icon from "../Icon";

interface IJoinLobbyModal {
  onClose: () => void;
  onLobbyAdd: (lobbyId: number, password?: string | null) => void;
  lobbyId: number;
  currentPassword: string | null;
}

const JoinLobbyModal = ({
  onClose,
  onLobbyAdd,
  lobbyId,
  currentPassword,
}: IJoinLobbyModal) => {
  const [password, setPassword] = useState<string | null>(null);

  const handleOnClick = () => {
    if (password === currentPassword) {
      onLobbyAdd(lobbyId, password);
      onClose();
    } else {
      toast.error("Неверный пароль");
      setPassword(null);
    }
  };

  return (
    <ModalWindow onClose={onClose}>
      <div className="flex flex-col gap-y-[26px] items-center m-1">
        <span className="text-[24px] font-bold">Вход в приватное лобби</span>
        <div className="overflow-hidden max-h-[40px] max-w-[321px] flex justify-between border-[1px] border-saturateBlue rounded-[10px] items-center pl-[12px]">
          <Icon
            icon="lock"
            defaultColor="#2563EB"
            className="flex items-center"
          />
          <input
            className="bg-transparent text-[14px] px-[12px] font-semibold box-border w-full"
            type="password"
            placeholder="Пароль лобби..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="font-semibold box-border text-[14px] px-[10px] py-[10px] rounded-[8px] bg-saturateBlue transition-all hover:bg-secondaryBlue"
            onClick={() => handleOnClick()}
          >
            Войти
          </button>
        </div>
      </div>
    </ModalWindow>
  );
};

export default JoinLobbyModal;
