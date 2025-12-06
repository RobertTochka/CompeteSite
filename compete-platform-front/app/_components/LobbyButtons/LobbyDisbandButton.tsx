import { useCancelVeto } from "@/app/_utils/functions";

interface ILobbyDisbandButton {
  lobbyId: number;
}

const LobbyDisbandButton = ({ lobbyId }: ILobbyDisbandButton) => {
  const [cancelVeto] = useCancelVeto();

  return (
    <button
      className="w-[400px] h-[60px] rounded-[10px] text-[20px] mx-auto flex items-center justify-center bg-saturateBlue bg-opacity-20"
      onClick={() => cancelVeto(lobbyId)}
    >
      Отменить лобби
    </button>
  );
};

export default LobbyDisbandButton;
