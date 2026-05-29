"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CardExpansion } from "@/data/cardsData";
import type { PublicRoomSummary } from "@/server/roomTypes";

const expansionOptions: Array<{ id: CardExpansion; label: string; hint: string }> = [
  {
    id: "BASE",
    label: "Base",
    hint: "Các lá bài Mèo Nổ cơ bản. Luôn được kích hoạt để đảm bảo phòng chơi có thể hoạt động.",
  },
  {
    id: "IMPLODING",
    label: "Imploding",
    hint: "Thêm các lá bài Imploding Kitten, Alter the Future, Feral Cat, Share the Future và nhiều lá khác.",
  },
  {
    id: "STREAKING",
    label: "Streaking",
    hint: "Thêm các lá bài Streaking Kitten, Catomic Bomb, Super Skip, Swap Top and Bottom và nhiều lá khác.",
  },
  {
    id: "BARKING",
    label: "Barking",
    hint: "Thêm các lá bài Barking Kittens và các lá bài gây hỗn loạn phòng chơi.",
  },
  {
    id: "ZOMBIE",
    label: "Zombie",
    hint: "Thêm các lá bài Zombie Kitten, Clone, Dig Deeper, Attack of the Dead và Grave Robber.",
  },
  {
    id: "GOOD_VS_EVIL",
    label: "Good vs Evil",
    hint: "Thêm các lá bài Armageddon, Godcat, Devilcat, Potluck và Reveal the Future.",
  },
];

function makeRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function makePlayerId() {
  return `p-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanRoomId(roomId: string) {
  return roomId.replace(/[^A-Z0-9-]/gi, "").toUpperCase().slice(0, 16);
}

export function LobbyForm() {
  const router = useRouter();
  const [rooms, setRooms] = useState<PublicRoomSummary[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [playerName, setPlayerName] = useState("Player");
  const [playerId, setPlayerId] = useState("p-local");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const minimumDeckSize = maxPlayers * 5 + (maxPlayers - 1) + 1;
  const recommendedDeckSize = 19 + maxPlayers * 5;
  const [targetDeckSize, setTargetDeckSize] = useState(recommendedDeckSize);
  const [password, setPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [expansions, setExpansions] = useState<CardExpansion[]>([
    "BASE",
    "IMPLODING",
    "STREAKING",
    "BARKING",
    "ZOMBIE",
    "GOOD_VS_EVIL",
  ]);
  const [error, setError] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");
  const [roomPasswords, setRoomPasswords] = useState<Record<string, string>>({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [showRoomPasswords, setShowRoomPasswords] = useState<Record<string, boolean>>({});

  const refreshRooms = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const raw = await response.text();
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.includes("application/json")) {
        setRooms([]);
        return;
      }
      try {
        const data = JSON.parse(raw) as { rooms?: PublicRoomSummary[] };
        setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      } catch {
        setRooms([]);
      }
    } catch {
      setRooms([]);
    } finally {
      setRoomsLoaded(true);
    }
  }, []);

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (room) => room.name.toLowerCase().includes(q) || room.id.toLowerCase().includes(q),
    );
  }, [rooms, searchQuery]);

  useEffect(() => {
    setTargetDeckSize((current) => Math.min(120, Math.max(minimumDeckSize, current)));
  }, [minimumDeckSize]);

  useEffect(() => {
    const existingId = window.localStorage.getItem("meo-no-player-id");
    const existingName = window.localStorage.getItem("meo-no-player-name");
    const nextId = existingId || makePlayerId();
    window.localStorage.setItem("meo-no-player-id", nextId);
    setPlayerId(nextId);
    if (existingName) setPlayerName(existingName);
  }, []);

  useEffect(() => {
    void refreshRooms();
    const timer = window.setInterval(() => {
      void refreshRooms();
    }, 4000);
    const onFocus = () => {
      void refreshRooms();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshRooms]);

  function persistIdentity() {
    const cleanName = playerName.trim() || "Player";
    window.localStorage.setItem("meo-no-player-name", cleanName);
    return cleanName;
  }

  function enterRoom(targetRoomId: string, targetPassword = joinPassword) {
    const cleanRoom = cleanRoomId(targetRoomId);
    const cleanName = persistIdentity();
    if (targetPassword) window.sessionStorage.setItem(`room-password:${cleanRoom}`, targetPassword);
    router.push(
      `/room/${encodeURIComponent(cleanRoom)}?playerId=${encodeURIComponent(playerId)}&name=${encodeURIComponent(cleanName)}`,
    );
  }

  async function createRoom() {
    setError(undefined);
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên người chơi.");
      return;
    }
    const cleanName = persistIdentity();
    const cleanRoom = cleanRoomId(roomId || makeRoomId());
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: cleanRoom,
        roomName: roomName.trim() || `Phòng chơi ${cleanRoom}`,
        playerId,
        playerName: cleanName,
        maxPlayers,
        targetDeckSize,
        password: password.trim() || undefined,
        expansions,
      }),
    });
    const raw = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      setError(
        response.status >= 500
          ? "Máy chủ gặp sự cố kỹ thuật. Vui lòng kiểm tra lại cấu hình hoặc thử lại sau."
          : `Không thể kết nối đến máy chủ (Mã lỗi ${response.status}).`,
      );
      return;
    }
    let data: { roomId?: string; error?: string };
    try {
      data = JSON.parse(raw) as { roomId?: string; error?: string };
    } catch {
      setError("Phản hồi từ máy chủ không hợp lệ.");
      return;
    }
    if (!response.ok || !data.roomId) {
      setError(data.error ?? "Không thể tạo phòng chơi.");
      return;
    }
    if (password.trim()) window.sessionStorage.setItem(`room-password:${data.roomId}`, password.trim());
    enterRoom(data.roomId, password.trim());
  }

  function joinByRoomId() {
    setError(undefined);
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên người chơi.");
      return;
    }
    const id = cleanRoomId(joinRoomId);
    if (!id) {
      setError("Nhập mã phòng để tham gia.");
      return;
    }
    enterRoom(id);
  }

  function toggleExpansion(expansion: CardExpansion) {
    setExpansions((current) => {
      if (current.includes(expansion)) {
        const next = current.filter((item) => item !== expansion);
        return next.length ? next : ["BASE"];
      }
      return [...current, expansion];
    });
  }

  return (
    <div className="grid gap-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(20,61,50,0.18)] backdrop-blur-xl">
        <div className="grid gap-5 border-b border-felt/10 bg-gradient-to-br from-felt via-felt-muted to-emerald-900 p-6 text-parchment md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200/80">Tạo bàn chơi riêng tư</p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight">Làm chủ phòng chơi chuyên nghiệp</h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-parchment/75">
              Tùy chỉnh số người chơi, kích thước bộ bài, bản mở rộng và mật khẩu bảo vệ trước khi mời bạn bè.
            </p>
          </div>
          <button
            onClick={createRoom}
            className="h-12 rounded-2xl bg-cherry px-7 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lift transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Tạo phòng
          </button>
        </div>

        <div className="grid gap-5 p-5 md:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              className="h-12 rounded-2xl border border-felt/20 bg-parchment px-4 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
              placeholder="Tên người chơi (bắt buộc)"
            />
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              className="h-12 rounded-2xl border border-felt/20 bg-parchment px-4 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
              placeholder="Tên phòng chơi"
            />
            <input
              value={roomId}
              onChange={(event) => setRoomId(event.target.value.toUpperCase())}
              className="h-12 rounded-2xl border border-felt/20 bg-parchment px-4 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
              placeholder="Mã phòng tùy chỉnh (tùy chọn)"
            />
            <div className="relative flex items-center">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-felt/20 bg-parchment pl-4 pr-12 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30 font-sans"
                placeholder="Mật khẩu riêng tư (tùy chọn)"
                type={showCreatePassword ? "text" : "password"}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword((v) => !v)}
                className="absolute right-4 text-[10px] font-black uppercase tracking-[0.1em] text-felt/60 hover:text-felt select-none"
              >
                {showCreatePassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.5rem] border border-felt/15 bg-gradient-to-br from-parchment to-white p-4 lg:grid-cols-[1fr_220px]">
            <div className="space-y-4">
              <label className="grid gap-2 text-sm font-bold text-ink/75">
                <span className="flex items-center justify-between gap-3">
                  <span>Số người chơi</span>
                  <span className="rounded-full bg-felt px-3 py-1 text-xs font-black text-parchment">{maxPlayers}</span>
                </span>
                <input
                  type="range"
                  min={2}
                  max={8}
                  value={maxPlayers}
                  onChange={(event) => setMaxPlayers(Number(event.target.value))}
                  className="accent-felt"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-ink/75">
                <span className="flex items-center justify-between gap-3">
                  <span>Kích thước bộ bài</span>
                  <span className="text-xs text-ink/55">tối thiểu {minimumDeckSize} · đề xuất {recommendedDeckSize}</span>
                </span>
                <input
                  type="number"
                  min={minimumDeckSize}
                  max={120}
                  value={targetDeckSize}
                  onChange={(event) => setTargetDeckSize(Math.min(120, Math.max(minimumDeckSize, Number(event.target.value) || minimumDeckSize)))}
                  className="h-12 rounded-2xl border border-felt/20 bg-white px-4 text-sm font-black text-ink shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-felt/25"
                />
              </label>
              <p className="text-xs font-semibold leading-relaxed text-ink/60">
                Bộ bài luôn giữ thiết lập cân bằng: mỗi người chơi nhận 5 lá khởi đầu, Exploding Kittens = số người chơi − 1, và còn lại đúng 1 lá Defuse dự phòng trong xấp bài rút.
              </p>
            </div>
            <div className="rounded-2xl bg-felt p-4 text-parchment shadow-inner">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/80">Thiết lập</p>
              <p className="mt-3 text-3xl font-black">{targetDeckSize}</p>
              <p className="text-sm font-semibold text-parchment/70">tổng số lá bài</p>
              <p className="mt-3 text-xs font-semibold text-parchment/60">{expansions.length} bản mở rộng được bật</p>
            </div>
          </div>

          <div className="rounded-3xl border border-felt/10 bg-white/55 p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="inline-flex rounded-full bg-amber-200 px-4 py-2 text-sm font-black uppercase tracking-[0.2em] text-felt shadow-[0_8px_20px_rgba(245,158,11,0.22)] ring-1 ring-amber-300/70">Chọn thể loại</p>
                <p className="mt-2 text-sm font-semibold text-ink/65">Bật/tắt các bản mở rộng cho bộ bài trước khi tạo phòng.</p>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-felt/60">{expansions.length} đang bật</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {expansionOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  title={option.hint}
                  onClick={() => toggleExpansion(option.id)}
                  className={`h-10 rounded-full border px-4 text-xs font-black uppercase tracking-[0.12em] transition ${
                    expansions.includes(option.id)
                      ? "border-felt bg-felt text-parchment shadow-inner"
                      : "border-felt/20 bg-parchment text-ink hover:bg-cream"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="rounded-2xl bg-red-950 px-4 py-3 text-sm font-bold text-white">{error}</p>}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-felt/15 bg-gradient-to-br from-white via-parchment to-amber-100/50 p-5 shadow-lift md:p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-felt">Tham gia phòng chơi có sẵn</p>
        <p className="mt-2 text-sm font-semibold text-ink/80">
          Nhập <span className="font-black text-ink">mã phòng</span> được chia sẻ từ chủ phòng.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            value={joinRoomId}
            onChange={(event) => setJoinRoomId(event.target.value.toUpperCase())}
            className="h-11 min-w-0 flex-1 rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-black tracking-wider text-ink shadow-sm outline-none transition placeholder:font-bold placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/25"
            placeholder="Ví dụ: ABC12D"
            maxLength={16}
          />
          <div className="relative flex items-center min-w-[140px] sm:max-w-[180px] w-full">
            <input
              value={joinPassword}
              onChange={(event) => setJoinPassword(event.target.value)}
              className="h-11 w-full rounded-xl border-2 border-felt/90 bg-parchment pl-3 pr-10 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/25 font-sans"
              placeholder="Mật khẩu (nếu có)"
              type={showJoinPassword ? "text" : "password"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowJoinPassword((v) => !v)}
              className="absolute right-3 text-[9px] font-black uppercase tracking-[0.1em] text-felt/70 hover:text-felt select-none"
            >
              {showJoinPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <button
            type="button"
            onClick={joinByRoomId}
            className="h-11 shrink-0 rounded-xl bg-felt px-7 text-sm font-black uppercase tracking-[0.14em] text-parchment shadow-lift transition hover:bg-felt-muted"
          >
            Vào phòng
          </button>
        </div>
      </div>

      {roomsLoaded && filteredRooms.length > 0 && (
        <div className="rounded-[1.75rem] border-2 border-felt/90 bg-white/90 p-5 shadow-card backdrop-blur-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 shrink-0 space-y-1 lg:max-w-[min(100%,22rem)]">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-felt">Phòng chơi trực tuyến</p>
              <p className="text-sm font-semibold leading-snug text-ink/70">
                Danh sách phòng chơi tự động cập nhật liên tục và tự động lọc bỏ các phòng trống.
              </p>
            </div>
            <div className="min-w-0 flex-1 lg:max-w-md">
              <p className="mb-2 text-left text-[10px] font-black uppercase tracking-[0.18em] text-ink/50">
                Tìm theo tên hoặc mã phòng
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-11 min-h-[44px] w-full min-w-0 flex-1 rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-semibold text-ink shadow-sm outline-none ring-felt/10 transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
                  placeholder="Nhập từ khóa cần tìm..."
                  type="search"
                  autoComplete="off"
                />
                <div className="flex shrink-0 gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => void refreshRooms()}
                    className="h-11 min-h-[44px] flex-1 rounded-xl border-2 border-felt/90 bg-felt px-4 text-xs font-black uppercase tracking-[0.14em] text-parchment shadow-sm transition hover:bg-felt-muted sm:flex-none sm:px-5"
                  >
                    Tìm
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshRooms()}
                    className="h-11 min-h-[44px] flex-1 rounded-xl border-2 border-felt/90 bg-parchment px-4 text-xs font-black uppercase tracking-[0.12em] text-ink shadow-sm transition hover:bg-cream sm:flex-none sm:px-5"
                  >
                    Làm mới
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {filteredRooms.map((room) => (
              <div key={room.id} className="grid gap-3 rounded-xl border-2 border-felt/90 bg-parchment/60 p-4 transition hover:bg-parchment md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{room.name}</p>
                    <span className="rounded-md bg-felt px-2 py-1 text-xs font-bold text-parchment">{room.id}</span>
                    {room.isPrivate && <span className="rounded bg-cherry px-2 py-1 text-xs font-bold text-white">Mật khẩu</span>}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink/70">
                    {room.connectedPlayers}/{room.maxPlayers} người chơi · {room.drawPileCount} lá bài trong xấp rút · bộ bài {room.targetDeckSize ?? room.drawPileCount} lá · {room.expansions.join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {room.isPrivate && (
                    <div className="relative flex items-center">
                      <input
                        value={roomPasswords[room.id] ?? ""}
                        onChange={(event) => setRoomPasswords({ ...roomPasswords, [room.id]: event.target.value })}
                        className="h-10 rounded-xl border-2 border-felt/90 bg-white pl-3 pr-10 text-sm font-semibold text-ink font-sans"
                        placeholder="Nhập mật khẩu"
                        type={showRoomPasswords[room.id] ? "text" : "password"}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRoomPasswords({ ...showRoomPasswords, [room.id]: !showRoomPasswords[room.id] })}
                        className="absolute right-3 text-[9px] font-black uppercase tracking-[0.1em] text-felt/70 hover:text-felt select-none"
                      >
                        {showRoomPasswords[room.id] ? "Ẩn" : "Hiện"}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => enterRoom(room.id, roomPasswords[room.id])}
                    disabled={room.connectedPlayers >= room.maxPlayers}
                    className="h-10 rounded-xl bg-felt px-5 text-sm font-black uppercase tracking-[0.12em] text-parchment transition hover:bg-felt-muted disabled:opacity-50"
                  >
                    Vào chơi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {roomsLoaded && rooms.length > 0 && filteredRooms.length === 0 && (
        <p className="rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-950">
          Không tìm thấy phòng chơi phù hợp. Vui lòng xóa bộ lọc hoặc thử lại với từ khóa khác.
        </p>
      )}

      {roomsLoaded && filteredRooms.length === 0 && rooms.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-felt/35 bg-cream/80 px-4 py-4 text-center text-sm font-semibold text-ink/70">
          Hiện tại không có phòng chơi nào đang mở. Hãy tạo một phòng mới hoặc dùng ô <span className="font-black text-ink">Tham gia phòng chơi có sẵn</span> nếu bạn đã có mã phòng.
        </p>
      )}
    </div>
  );
}
