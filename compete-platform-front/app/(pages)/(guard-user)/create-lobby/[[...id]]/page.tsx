"use client";

import Settings from "@/app/_components/Platform/Lobby/Settings";
import Team, { TeamPlayer } from "@/app/_components/Platform/Lobby/Team";
import Chat from "@/app/_components/Platform/Lobby/Chat";
import Maps from "@/app/_components/Platform/Lobby/Maps";
import { ColumnKeyPair } from "@/app/_components/Text/Text";
import { Information } from "@/app/_components/Loading/Loading";
import { useEffect, useMemo, useState } from "react";
import { JoinToLobbyInfo, LobbyStatus, Map } from "@/app/_utils/types";
import { useParams, useSearchParams } from "next/navigation";
import {
  getTeam,
  getMyBid,
  getMyTeamChatId,
  getTeamBalance,
  getUserBids,
  useUpdateConfig,
  useChangeTeam,
  connection,
} from "@/app/_utils/functions";
import { LobbyAdminConfiguration } from "@/app/_utils/types";
import {
  useGetLobbyQuery,
  useGetUserProfileQuery,
  useJoinToLobbyMutation,
  useLeaveFromLobbyMutation,
} from "@/app/_fetures/lib/api/publicLobbiesApi";
import { useHandleError } from "@/app/_utils/hooks/useTemplatedError";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import MiniChat from "@/app/_components/Platform/Lobby/MiniChat";

const getParam = (wrappedParam: string | string[] | undefined) => {
  if (typeof wrappedParam === "undefined") return undefined;
  if (typeof wrappedParam === "string") {
    try {
      return parseInt(wrappedParam);
    } catch {
      return undefined;
    }
  }
  if (wrappedParam.length > 0) {
    try {
      return parseInt(wrappedParam[0]);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export default function CreateLobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams();
  const lobbyId = getParam(id);
  const [contextMenuUser, setContextMenuUser] = useState<TeamPlayer | null>(
    null
  );
  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isChatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<"team" | "public" | null>(null);

  const code = searchParams.get("code");
  const {
    data: actionInfo,
    isLoading,
    error: getLobbyError,
    refetch,
    isFetching,
  } = useGetLobbyQuery({ id: lobbyId }, { refetchOnMountOrArgChange: true });

  const [leaveLobby, { isLoading: lobbyLeaveLoading }] =
    useLeaveFromLobbyMutation();
  const [updateConfig] = useUpdateConfig();
  const [joinToLobby, { error: joinError, isLoading: isJoining }] =
    useJoinToLobbyMutation();

  const userReq = useMemo(
    () => ({ userId: undefined, includeFriends: false }),
    []
  );
  const {
    data: user,
    isLoading: userLoading,
    isUninitialized,
  } = useGetUserProfileQuery(userReq);

  const [changeTeam] = useChangeTeam();

  const onMapChanging = (map: Map) => {
    if (actionInfo === undefined) return;
    const needDelete = actionInfo.newLobby?.pickMaps.includes(map);
    let newMaps = needDelete
      ? actionInfo.newLobby?.pickMaps.filter((m) => m !== map)
      : [...actionInfo.newLobby?.pickMaps, map];
    let newCfg: LobbyAdminConfiguration = {
      ...actionInfo.newLobby,
      pickMaps: newMaps,
    };
    updateConfig(newCfg);
  };

  const onServerPropSetup = (prop: string) => (value: any) => {
    if (actionInfo === undefined) return;
    const newCfg: LobbyAdminConfiguration = {
      ...actionInfo.newLobby,
      config: { ...actionInfo.newLobby.config, [prop]: value },
    };
    updateConfig(newCfg);
  };

  const onPropSetup = (property: string) => (value: any) => {
    if (actionInfo === undefined) return;
    let newCfg: LobbyAdminConfiguration = {
      ...actionInfo.newLobby,
      [property]: value,
    };
    // if (
    //   (property === "playersAmount" &&
    //     actionInfo.newLobby.playersAmount === 1 &&
    //     value !== 1) ||
    //   (actionInfo.newLobby.playersAmount !== 1 && value === 1)
    // ) {
    //   newCfg = {
    //     ...newCfg,
    //     pickMaps: [],
    //   };
    // }
    updateConfig(newCfg);
  };

  const onLobbyLeave = () => {
    if (actionInfo && user)
      leaveLobby({ userId: user?.id, lobbyId: actionInfo.newLobby?.id }).then(
        () => {
          router.push("/lobbies");
        }
      );
  };

  const handleUserClick = (e: React.MouseEvent, user: TeamPlayer) => {
    e.preventDefault();
    setContextMenuUser(user);
    setMenuPosition({ x: e.pageX, y: e.pageY });
  };

  const closeMenu = () => {
    setContextMenuUser(null);
    setMenuPosition(null);
  };

  const handleKick = () => {
    if (actionInfo && user && contextMenuUser) {
      leaveLobby({
        userId: contextMenuUser.id,
        lobbyId: actionInfo.newLobby?.id,
        kick: true,
      });
      closeMenu();
    }
  };

  useEffect(() => {
    if (!connection) return;
    connection.on("KickedFromLobby", () => {
      toast.error("Вы были исключены из лобби");
      router.push("/lobbies");
    });
    return () => {
      connection.off("KickedFromLobby");
    };
  }, [connection]);

  useEffect(() => {
    if (!connection) return;
    connection.on("LobbyDisbanded", () => {
      toast.error("Лобби было расформировано из-за бездействия");
      router.push("/lobbies");
    });
    return () => {
      connection.off("LobbyDisbanded");
    };
  }, [connection]);

  const handleMove = () => {
    if (contextMenuUser && actionInfo) {
      changeTeam({
        lobbyId: actionInfo.newLobby?.id,
        userId: contextMenuUser.id,
      });
      closeMenu();
    }
  };

  useEffect(() => {
    if (
      actionInfo &&
      actionInfo.newLobby.status !== LobbyStatus.Configuring &&
      !isLoading &&
      !isFetching &&
      id !== actionInfo.newLobby.id.toString() &&
      !isUninitialized
    ) {
      router.push(`/lobby/${actionInfo.newLobby.id}`);
    }
  }, [actionInfo, id, isUninitialized, isLoading, isFetching]);

  useEffect(() => {
    if (code && id && user) {
      const joinToLobbyInfo: JoinToLobbyInfo = {
        lobbyId,
        userId: user?.id,
        code,
      };
      joinToLobby(joinToLobbyInfo)
        .unwrap()
        .then((t) => {
          refetch();
        });
    }
  }, [code, user, id]);

  const lobbyError = useHandleError(joinError || getLobbyError);
  if (
    (isLoading && !actionInfo) ||
    (!user && userLoading) ||
    lobbyError ||
    isJoining
  ) {
    return (
      <Information
        size={90}
        loading={
          (isLoading && !actionInfo) || (!user && userLoading) || isJoining
        }
        errorMessage={
          lobbyError == "Такого лобби не существует" ? undefined : lobbyError
        }
      />
    );
  }

  const rightTeam = getTeam(actionInfo?.newLobby, 1);
  const leftTeam = getTeam(actionInfo?.newLobby, 0);
  const leftTeamBalance = getTeamBalance(actionInfo?.newLobby, 0);
  const rightTeamBalance = getTeamBalance(actionInfo?.newLobby, 1);
  const bid = getMyBid(actionInfo?.newLobby, user?.id);
  const userBids = getUserBids(actionInfo?.newLobby);
  const myTeamChatId = getMyTeamChatId(actionInfo?.newLobby, user?.id);

  return (
    <section className="px-[25px] flex-1 flex flex-col overflow-auto">
      <div className="flex justify-between max-w-[1617px] mx-auto w-full flex-1 overflow-auto custom-scrollbar pr-[10px]">
        {actionInfo && (
          <Team
            lobbyId={actionInfo?.newLobby.id}
            currentUserId={user?.id ?? -1}
            {...leftTeam}
            leftTeamCount={leftTeam.users.length}
            mainPlayer={leftTeam.creatorId}
            lobbyCreatorId={actionInfo.newLobby.creatorId}
            teamLength={actionInfo.newLobby.playersAmount}
            userBids={userBids}
            openContextMenu={handleUserClick}
          />
        )}
        <div className="flex-1 flex flex-col">
          <div className="mb-[40px] flex gap-[65px] justify-center items-center max-h-max">
            <ColumnKeyPair
              keyValue="Банк команды"
              value={`R ${leftTeamBalance}`}
              valuesClassnames="text-[20px]"
            />
            {actionInfo?.newLobby && (
              <ColumnKeyPair
                keyValue="Общий банк"
                value={`R ${actionInfo.newLobby.bids
                  .map((b) => b.bid)
                  .reduce((a, v) => a + v, 0)}`}
                valuesClassnames="text-[40px]"
              />
            )}
            <ColumnKeyPair
              keyValue="Банк команды"
              value={`R ${rightTeamBalance}`}
              valuesClassnames="text-[20px]"
            />
          </div>
          <div className="flex w-[624px] mx-auto">
            {actionInfo?.newLobby && (
              <Maps
                isPublic={actionInfo.newLobby.public}
                mapsOnLobby={actionInfo.newLobby.pickMaps}
                onMapChange={onMapChanging}
                isAim={actionInfo.newLobby.playersAmount === 1}
              />
            )}
            {actionInfo?.newLobby && (
              <Settings
                bid={bid}
                {...actionInfo.newLobby}
                onPropSetup={onPropSetup}
                onServerConfigSetup={onServerPropSetup}
                onLobbyLeave={onLobbyLeave}
              />
            )}
          </div>
        </div>
        {actionInfo?.newLobby && (
          <Team
            lobbyId={actionInfo?.newLobby.id}
            currentUserId={user?.id ?? -1}
            {...rightTeam}
            teamLength={actionInfo.newLobby.playersAmount}
            leftTeamCount={leftTeam.users.length}
            mainPlayer={leftTeam.creatorId}
            lobbyCreatorId={actionInfo.newLobby.creatorId}
            userBids={userBids}
            isSecondTeam
            openContextMenu={handleUserClick}
          />
        )}
        <MiniChat
          teamChatId={myTeamChatId}
          lobbyChatId={actionInfo?.newLobby?.chatId ?? 0}
          isOpen={isChatOpen}
          setOpen={setChatOpen}
          tab={chatTab}
          setTab={setChatTab}
        />

        {actionInfo && contextMenuUser && menuPosition && (
          <div
            className="absolute z-50 min-w-[190px] rounded-xl shadow-xl border border-gray-new"
            style={{ top: menuPosition.y - 15, left: menuPosition.x - 15 }}
            onMouseLeave={closeMenu}
          >
            <div className="bg-gradient-to-tl from-GRADIK-2 to-GRADIK-1 rounded-xl overflow-hidden">
              <div className="bg-GRADIK-1 rounded-[10px] flex flex-col">
                <button
                  className="px-4 py-3 text-base text-white text-left hover:bg-secondaryBlue hover:text-deepBlue transition-colors rounded-t-xl"
                  onClick={handleMove}
                >
                  🔁 Переместить в другую команду
                </button>
                <button
                  className="px-4 py-3 text-base text-negative text-left hover:bg-[#e60000] hover:text-deepBlue transition-colors rounded-b-xl"
                  onClick={handleKick}
                >
                  ❌ Выгнать из лобби
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
