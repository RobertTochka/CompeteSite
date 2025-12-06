import { Dispatch, SetStateAction } from "react";
import Icon from "../../Icon";
import Chat from "./Chat";
import clsx from "clsx";

interface IMiniChat {
  teamChatId: number;
  lobbyChatId: number;
  isOpen: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  tab: "public" | "team" | null;
  setTab: Dispatch<SetStateAction<"public" | "team" | null>>;
}

function MiniChat({
  teamChatId,
  lobbyChatId,
  isOpen,
  setOpen,
  tab,
  setTab,
}: IMiniChat) {
  const handleOnClick = (newTab: "public" | "team") => {
    if (newTab === tab) {
      setOpen(false);
      setTab(null);
      return;
    }
    setTab(newTab);
    setOpen(true);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex gap-8">
      <div className="flex flex-col gap-1 w-[105px] justify-end">
        <button
          className={clsx(
            "flex gap-2 items-center rounded-[10px] p-1 w-full",
            tab === "team" ? "bg-GRADIK-2" : "bg-transparent"
          )}
          onClick={() => handleOnClick("team")}
        >
          <Icon icon="chat" defaultColor="#fff" />
          Team
        </button>
        <button
          className={clsx(
            "flex gap-2 items-center rounded-[10px] p-1 w-full",
            tab === "public" ? "bg-GRADIK-2" : "bg-transparent"
          )}
          onClick={() => handleOnClick("public")}
        >
          <Icon icon="chat" defaultColor="#fff" />
          Public
        </button>
      </div>
      <div
        className={clsx(
          "mt-2 bg-transparent rounded-lg shadow-lg flex flex-col transition-all duration-300",
          isOpen
            ? "opacity-100 translate-y-0 w-auto"
            : "opacity-0 translate-y-full w-0"
        )}
      >
        {tab === "public" && <Chat lobbyChatId={lobbyChatId} />}
        {tab === "team" && <Chat teamChatId={teamChatId} />}
      </div>
    </div>
  );
}

export default MiniChat;
