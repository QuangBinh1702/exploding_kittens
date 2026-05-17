"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CardExpansion } from "@/data/cardsData";
import type { PublicRoomSummary } from "@/server/roomTypes";

const expansionOptions: Array<{ id: CardExpansion; label: string; hint: string }> = [
  {
    id: "BASE",
    label: "Cơ bản",
    hint: "Bộ bài Mèo Nổ chuẩn (Mèo Nổ, Gỡ Bom, Nope, Rút từ đáy…). Luôn bật để có thể chơi.",
  },
  {
    id: "IMPLODING",
    label: "Mèo Sập",
    hint: "Bộ mở rộng Imploding Kittens: Mèo Sập, Biến đổi tương lai, Mèo Hoang, Chia sẻ tương lai…",
  },
  {
    id: "STREAKING",
    label: "Ăn gian",
    hint: "Bộ mở rộng Streaking Kittens: Mèo Ăn Gian, Bom Mèo Nguyên tử, Bỏ qua siêu cấp, Đổi đầu và đáy…",
  },
  {
    id: "BARKING",
    label: "Sủa",
    hint: "Bộ mở rộng Barking Kittens: thêm lá và cơ chế theo chủ đề chó.",
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
  const [playerName, setPlayerName] = useState("Người chơi");
  const [playerId, setPlayerId] = useState("p-local");
  const [maxPlayers] = useState(2);
  const [password, setPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [expansions, setExpansions] = useState<CardExpansion[]>(["BASE", "IMPLODING", "STREAKING", "BARKING"]);
  const [error, setError] = useState<string>();
  const [searchQuery, setSearchQuery] = useState("");

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
    const cleanName = playerName.trim() || "Người chơi";
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
        roomName: roomName.trim() || `Phòng ${cleanRoom}`,
        playerId,
        playerName: cleanName,
        maxPlayers,
        password: password.trim() || undefined,
        expansions,
      }),
    });
    const raw = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      setError(
        response.status >= 500
          ? "Máy chủ trả về lỗi (không phải JSON). Kiểm tra API, Redis/Upstash và biến môi trường, rồi thử lại."
          : `Máy chủ trả về ${response.status} (HTML thay vì JSON). Kiểm tra console mạng hoặc cấu hình deploy.`,
      );
      return;
    }
    let data: { roomId?: string; error?: string };
    try {
      data = JSON.parse(raw) as { roomId?: string; error?: string };
    } catch {
      setError("Phản hồi máy chủ không phải JSON hợp lệ.");
      return;
    }
    if (!response.ok || !data.roomId) {
      setError(data.error ?? "Không tạo được phòng.");
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
      setError("Nhập mã phòng (ID) để vào.");
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
      <div className="grid gap-4 rounded-[1.75rem] border-2 border-felt/90 bg-white/90 p-5 shadow-card backdrop-blur-sm md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            className="h-11 rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
            placeholder="Tên người chơi (bắt buộc)"
          />
          <input
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            className="h-11 rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
            placeholder="Tên phòng"
          />
          <input
            value={roomId}
            onChange={(event) => setRoomId(event.target.value.toUpperCase())}
            className="h-11 rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
            placeholder="ID phòng tùy chọn (để trống = tự tạo)"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
            placeholder="Mật khẩu phòng riêng (tùy chọn)"
            type="password"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <p className="text-sm font-bold text-ink/75">
              Mỗi phòng tối đa <span className="font-black text-ink">2 người</span> để bắt đầu ván.
            </p>
            <p className="text-[11px] font-semibold leading-snug text-ink/60">
              Bộ mở rộng: thêm các lá theo từng gói luật Mèo Nổ. Bấm để bật/tắt (luôn giữ gói Cơ bản). Di chuột lên nút để đọc mô tả.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {expansionOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                title={option.hint}
                onClick={() => toggleExpansion(option.id)}
                className={`h-10 rounded-xl border-2 border-felt/90 px-3 text-xs font-black uppercase tracking-[0.12em] transition ${
                  expansions.includes(option.id)
                    ? "bg-felt text-parchment shadow-inner"
                    : "bg-parchment text-ink hover:bg-cream"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={createRoom}
            className="h-11 rounded-xl bg-cherry px-6 text-sm font-black uppercase tracking-[0.12em] text-white shadow-lift transition hover:brightness-110"
          >
            Tạo phòng
          </button>
        </div>
        {error && <p className="rounded-md bg-red-900 px-3 py-2 text-sm font-bold text-white">{error}</p>}
      </div>

      <div className="rounded-[1.75rem] border-2 border-felt/90 bg-gradient-to-br from-felt/8 via-parchment to-amber-100/50 p-5 shadow-lift md:p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-felt">Vào phòng có sẵn</p>
        <p className="mt-2 text-sm font-semibold text-ink/80">
          Nhập <span className="font-black text-ink">mã phòng</span> mà chủ phòng gửi để vào cùng phòng.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            value={joinRoomId}
            onChange={(event) => setJoinRoomId(event.target.value.toUpperCase())}
            className="h-11 min-w-0 flex-1 rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-black tracking-wider text-ink shadow-sm outline-none transition placeholder:font-bold placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/25"
            placeholder="VD: ABC12XY"
            maxLength={16}
          />
          <input
            value={joinPassword}
            onChange={(event) => setJoinPassword(event.target.value)}
            className="h-11 min-w-[140px] rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-semibold text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/25 sm:max-w-[180px]"
            placeholder="Mật khẩu (nếu có)"
            type="password"
          />
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
              <p className="text-sm font-black uppercase tracking-[0.18em] text-felt">Phòng đang mở</p>
              <p className="text-sm font-semibold leading-snug text-ink/70">
                Phòng riêng cần nhập mật khẩu trước khi xin vào.
              </p>
            </div>
            <div className="min-w-0 flex-1 lg:max-w-md">
              <p className="mb-2 text-left text-[10px] font-black uppercase tracking-[0.18em] text-ink/50">
                Tìm theo tên hoặc ID
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-11 min-h-[44px] w-full min-w-0 flex-1 rounded-xl border-2 border-felt/90 bg-parchment px-3 text-sm font-semibold text-ink shadow-sm outline-none ring-felt/10 transition placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-felt/30"
                  placeholder="Gõ để lọc…"
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
                    {room.isPrivate && <span className="rounded bg-cherry px-2 py-1 text-xs font-bold text-white">Riêng tư</span>}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink/70">
                    {room.connectedPlayers}/{room.maxPlayers} người · {room.drawPileCount} lá trong xấp · {room.expansions.join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {room.isPrivate && (
                    <input
                      value={joinPassword}
                      onChange={(event) => setJoinPassword(event.target.value)}
                      className="h-10 rounded-xl border-2 border-felt/90 bg-white px-3 text-sm font-semibold text-ink"
                      placeholder="Mật khẩu"
                      type="password"
                    />
                  )}
                  <button
                    onClick={() => enterRoom(room.id)}
                    disabled={room.connectedPlayers >= room.maxPlayers}
                    className="h-10 rounded-xl bg-felt px-5 text-sm font-black uppercase tracking-[0.12em] text-parchment transition hover:bg-felt-muted disabled:opacity-50"
                  >
                    Xin vào
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {roomsLoaded && rooms.length > 0 && filteredRooms.length === 0 && (
        <p className="rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-950">
          Không có phòng nào khớp từ khóa. Xóa ô tìm kiếm hoặc thử từ khóa khác.
        </p>
      )}

      {roomsLoaded && filteredRooms.length === 0 && rooms.length === 0 && (
        <p className="rounded-xl border-2 border-dashed border-felt/35 bg-cream/80 px-4 py-4 text-center text-sm font-semibold text-ink/70">
          Hiện chưa có phòng nào đang mở. Bạn có thể tạo phòng mới hoặc dùng ô <span className="font-black text-ink">Vào phòng có sẵn</span> nếu đã có mã phòng.
        </p>
      )}
    </div>
  );
}
