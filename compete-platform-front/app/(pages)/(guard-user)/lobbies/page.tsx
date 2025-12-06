"use client";

import { useMemo, useState } from "react";
import {
  lobbiesAdapter,
  useGetLobbiesQuery,
  useGetUserProfileQuery,
  useGetUserStatusQuery,
  useJoinToLobbyMutation,
} from "@/app/_fetures/lib/api/publicLobbiesApi";
import { useRouter } from "next/navigation";

import { getUserId, handleMutationError } from "@/app/_utils/functions";
import { useScrollPagination } from "@/app/_utils/hooks/useScrollPagination";
import { JoinToLobbyInfo } from "@/app/_utils/types";

import Icon from "@/app/_components/Icon";
import Matches from "@/app/_components/Matches/Matches";
import LobbyModal from "@/app/_components/LobbyModal/LobbyModal";
import LobbyFilters from "@/app/_components/Lobbies/LobbyFilters";
import JoinLobbyModal from "@/app/_components/Lobbies/JoinLobbyModal";
import SiteStats from "@/app/_components/Lobbies/SiteStats";

export interface Filters {
  public: string;
  status: string;
  type: string;
  mode: string;
  maps: string[];
  nickName: string;
}

export default function LobbiesPage() {
  const userReq = useMemo(
    () => ({ userId: undefined, includeFriends: false }),
    []
  );
  const id = parseInt(getUserId());
  const { data: status, refetch } = useGetUserStatusQuery({ id });
  const { data: user, isUninitialized } = useGetUserProfileQuery(userReq);
  const [joinToLobby, {}] = useJoinToLobbyMutation();
  const router = useRouter();
  const { page, pageSize } = useScrollPagination<HTMLDivElement>(true, true);
  const [modalOpen, setModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [currentLobbyId, setCurrentLobbyId] = useState<number | undefined>(
    undefined
  );
  const [currentPassword, setCurrentPassword] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    public: "false",
    status: "",
    type: "",
    mode: "",
    maps: [],
    nickName: "",
  });
  const {
    data: matches,
    isLoading: lobbyLoading,
    error,
  } = useGetLobbiesQuery(
    {
      page,
      pageSize,
      ...filters,
    },
    {
      pollingInterval: 2000,
      selectFromResult: ({ data, ...res }) => ({
        data: lobbiesAdapter
          .getSelectors()
          .selectAll(data ?? lobbiesAdapter.getInitialState()),
        ...res,
      }),
    }
  );

  const onLobbyAdd = (lobbyId: number, password?: string | null) => {
    const lobbyJoinInfo: JoinToLobbyInfo = {
      lobbyId,
      userId: user?.id,
      code: "00000000-0000-0000-0000-000000000000",
      password: password ? password : null,
    };
    if (user)
      joinToLobby(lobbyJoinInfo)
        .unwrap()
        .then(() => router.push(`/create-lobby/${lobbyId}`))
        .catch(handleMutationError);
  };

  const onFiltersChange = (value: string, name: string, checked: boolean) => {
    if (Array.isArray(filters[name])) {
      if (checked) {
        setFilters((pr) => ({ ...pr, [name]: [...pr[name], value] }));
        return;
      }
      setFilters((pr) => ({
        ...pr,
        [name]: pr[name].filter((item) => item !== value),
      }));
      return;
    }
    setFilters((pr) => ({ ...pr, [name]: checked ? value : "" }));
  };

  const onInputChange = (value: string) =>
    setFilters((pr) => ({ ...pr, nickName: value }));

  const onLobbyJoin = (lobbyId: number, password: string | null) => {
    setJoinModalOpen(true);
    setCurrentLobbyId(lobbyId);
    setCurrentPassword(password);
  };

  const onJoinModalClose = () => {
    setJoinModalOpen(false);
    setCurrentLobbyId(undefined);
    setCurrentPassword(null);
  };

  return (
    <section className="flex-1 overflow-auto mt-[15px] flex gap-[75px] max-w-[1570px] mx-auto w-full px-[15px] xl:gap-[25px]">
      <div className="flex flex-col w-[240px] overflow-auto">
        <button
          className="text-[32px] font-semibold text-white w-full flex justify-center py-[10px] bg-saturateBlue rounded-[10px]"
          onClick={() => setModalOpen(true)}
        >
          Создать
        </button>
        <h2 className="text-[24px] mb-[27px] mt-[30px] font-medium">Фильтры</h2>
        <LobbyFilters filters={filters} onFiltersChange={onFiltersChange} />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between">
          <SiteStats />
          <div className="flex gap-[10px] items-center w-[257px]">
            <input
              type="text"
              className="text-[16px] border-none placeholder-gray"
              placeholder="Введите никнейм игрока..."
              value={filters.nickName}
              onChange={(e) => onInputChange(e.target.value)}
            />
            <div className="w-[24px] h-[24px]">
              <Icon defaultColor="#fff" icon="search" />
            </div>
          </div>
        </div>
        <Matches
          onLobbyAdd={onLobbyAdd}
          onLobbyJoin={onLobbyJoin}
          error={error}
          matches={matches}
          lobbyLoading={lobbyLoading}
        />
      </div>

      {modalOpen && (
        <LobbyModal
          onClose={() => setModalOpen(false)}
          isUninitialized={isUninitialized}
          status={status}
          refetch={refetch}
        />
      )}
      {joinModalOpen && (
        <JoinLobbyModal
          onClose={() => onJoinModalClose()}
          onLobbyAdd={onLobbyAdd}
          lobbyId={currentLobbyId}
          currentPassword={currentPassword}
        />
      )}
    </section>
  );
}
