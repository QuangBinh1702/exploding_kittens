"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Pusher from "pusher-js";
import { useCallback, useEffect, useId, useMemo, useRef, useState, Suspense } from "react";
import { CardView } from "@/components/CardView";
import { DrawPileDeck, type DrawPileAnimMode } from "@/components/DrawPileDeck";
import { getCardData } from "@/data/cardsData";
import type { ClientGameState } from "@/game-engine";

function makePlayerId() {
  return `p-${Math.random().toString(36).slice(2, 10)}`;
}

function baseCardId(cardInstanceId: string) {
  return cardInstanceId.split("#")[0] ?? cardInstanceId;
}

function TrophyIcon({ className }: { className?: string }) {
  const rawId = useId().replace(/:/g, "");
  const gradId = `trophy-grad-${rawId}`;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 3h12v2h1.5a1.5 1.5 0 0 1 1.5 1.5V7a4 4 0 0 1-4 4h-.35A8 8 0 0 1 13 18.92V20h2v2H9v-2h2v-1.08A8 8 0 0 1 7.85 11H7.5A4 4 0 0 1 3.5 7V5.5A1.5 1.5 0 0 1 5 4H6V3Z"
        fill={`url(#${gradId})`}
        stroke="#92400e"
        strokeWidth="0.5"
      />
      <path d="M8 7V5h8v2" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
      <defs>
        <linearGradient id={gradId} x1="6" y1="3" x2="18" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="0.45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function actionDescription(cardId?: string) {
  switch (cardId) {
    case "shuffle":
      return "Sắp xào toàn bộ xấp rút.";
    case "see-the-future-3x":
      return "Sắp hiển thị riêng 3 lá trên cùng cho người đánh.";
    case "see-the-future-5x":
      return "Sắp hiển thị riêng 5 lá trên cùng cho người đánh.";
    case "alter-the-future-3x":
    case "alter-the-future-now":
      return "Sắp hiển thị riêng 3 lá trên cùng để biến đổi tương lai.";
    case "alter-the-future-5x":
      return "Sắp hiển thị riêng 5 lá trên cùng để biến đổi tương lai.";
    case "swap-top-bottom":
      return "Sắp đổi lá trên cùng và dưới cùng của xấp rút.";
    case "catomic-bomb":
      return "Sắp gom Mèo Nổ và đặt lên đầu xấp rút.";
    case "draw-from-bottom":
      return "Sắp rút lá dưới cùng của xấp.";
    case "reverse":
      return "Sắp đảo chiều lượt chơi.";
    case "attack":
    case "targeted-attack-2x":
      return "Sắp chuyển lượt tấn công.";
    case "skip":
    case "super-skip":
      return "Sắp bỏ lượt.";
    default:
      return "Sắp thực hiện chức năng của lá bài.";
  }
}

function isNormalCat(cardInstanceId: string) {
  const card = getCardData(baseCardId(cardInstanceId));
  return card?.type === "CAT" || card?.type === "FERAL_CAT";
}

function requiresTarget(cardId: string) {
  const type = getCardData(cardId)?.type;
  return type === "TARGETED_ATTACK" || type === "FAVOR";
}

async function postAction(roomId: string, body: unknown) {
  const maxAttempts = 5;
  let lastMessage = "Action failed";
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`/api/games/${roomId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as ClientGameState | { error: string } | { deleted: boolean };

    if (!response.ok) {
      lastMessage = "error" in data ? data.error : "Action failed";
      const retryable = /bận|busy|đang xử lý|thử lại/i.test(lastMessage);
      if (retryable && attempt < maxAttempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 180 * (attempt + 1)));
        continue;
      }
      throw new Error(lastMessage);
    }

    if ("deleted" in data && data.deleted) return { deleted: true as const };
    return data as ClientGameState;
  }
  throw new Error(lastMessage);
}

async function getState(roomId: string, playerId: string) {
  const response = await fetch(`/api/games/${roomId}?viewerId=${encodeURIComponent(playerId)}`, {
    cache: "no-store",
  });
  const data = (await response.json()) as ClientGameState | { error: string };
  if (!response.ok) throw new Error("error" in data ? data.error : "Load failed");
  return data as ClientGameState;
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-parchment via-cream to-amber-100/50 px-4">
          <div className="w-full max-w-md animate-pulse rounded-2xl border-2 border-felt/90 bg-white/85 p-8 shadow-card backdrop-blur-sm">
            <div className="h-4 w-1/3 rounded bg-stone-200" />
            <div className="mt-4 h-8 w-2/3 rounded bg-stone-300" />
            <div className="mt-6 h-32 rounded-lg bg-stone-100" />
            <p className="mt-4 text-center text-sm font-bold text-ink/65">Đang tải phòng…</p>
          </div>
        </main>
      }
    >
      <RoomPageContent />
    </Suspense>
  );
}

function RoomPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.id ?? "demo";
  const [playerId, setPlayerId] = useState("p-local");
  const [playerName, setPlayerName] = useState("Người chơi");
  const [state, setState] = useState<ClientGameState>();
  const [targetPlayerId, setTargetPlayerId] = useState("");
  const [error, setError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [selectedCatCards, setSelectedCatCards] = useState<string[]>([]);
  const [alterOrder, setAlterOrder] = useState<string[]>([]);
  const [alterPickIdx, setAlterPickIdx] = useState<number | null>(null);
  const [shareOrder, setShareOrder] = useState<string[]>([]);
  const [sharePickIdx, setSharePickIdx] = useState<number | null>(null);
  const [buryInsertStr, setBuryInsertStr] = useState("");
  const [defuseInsertStr, setDefuseInsertStr] = useState("");
  const [deckAnim, setDeckAnim] = useState<DrawPileAnimMode>("idle");
  const lastBottomDrawSig = useRef<string>("");
  const [copiedRoomId, setCopiedRoomId] = useState(false);

  useEffect(() => {
    const queryId = searchParams.get("playerId");
    const queryName = searchParams.get("name");
    const storedId = window.localStorage.getItem("meo-no-player-id");
    const storedName = window.localStorage.getItem("meo-no-player-name");
    const nextId = queryId || storedId || makePlayerId();
    const nextName = queryName || storedName || "Người chơi";
    window.localStorage.setItem("meo-no-player-id", nextId);
    window.localStorage.setItem("meo-no-player-name", nextName);
    setPlayerId(nextId);
    setPlayerName(nextName);
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const runAction = useCallback(
    async (body: unknown) => {
      setError(undefined);
      setIsBusy(true);
      try {
        const next = await postAction(roomId, body);
        if (next && typeof next === "object" && "deleted" in next && next.deleted) {
          router.push("/");
          return;
        }
        setState(next as ClientGameState);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Không thực hiện được hành động");
      } finally {
        setIsBusy(false);
      }
    },
    [roomId, router],
  );

  const handleDeckDraw = useCallback(() => {
    setDeckAnim("fromTop");
    window.setTimeout(() => {
      setDeckAnim((mode) => (mode === "fromTop" ? "idle" : mode));
    }, 880);
    void runAction({ action: "draw", playerId });
  }, [runAction, playerId]);

  useEffect(() => {
    const last = state?.log?.at(-1) ?? "";
    if (!last.includes("rút từ đáy")) return;
    const sig = `${state?.updatedAt ?? 0}-${last}`;
    if (sig === lastBottomDrawSig.current) return;
    lastBottomDrawSig.current = sig;
    setDeckAnim("fromBottom");
    const timer = window.setTimeout(() => {
      setDeckAnim((mode) => (mode === "fromBottom" ? "idle" : mode));
    }, 1050);
    return () => window.clearTimeout(timer);
  }, [state?.log, state?.updatedAt]);

  useEffect(() => {
    if (playerId === "p-local") return;
    let ignore = false;
    postAction(roomId, {
      action: "join",
      playerId,
      playerName,
      password: window.sessionStorage.getItem(`room-password:${roomId}`) || undefined,
    })
      .then((joined) => {
        if (ignore) return;
        if (joined && typeof joined === "object" && "deleted" in joined && joined.deleted) {
          router.push("/");
          return;
        }
        setState(joined as ClientGameState);
      })
      .catch(async (joinError) => {
        const message = joinError instanceof Error ? joinError.message : "";
        if (!message.includes("Game not found")) throw joinError;
        const created = await postAction(roomId, {
          action: "create",
          playerId,
          playerName,
          maxPlayers: 2,
          expansions: ["BASE", "IMPLODING", "STREAKING", "BARKING"],
          password: window.sessionStorage.getItem(`room-password:${roomId}`) || undefined,
        });
        if (ignore) return;
        if (created && typeof created === "object" && "deleted" in created && created.deleted) {
          router.push("/");
          return;
        }
        setState(created as ClientGameState);
      })
      .catch((bootError) => {
        if (!ignore) setError(bootError instanceof Error ? bootError.message : "Không vào được phòng");
      });
    return () => {
      ignore = true;
    };
  }, [playerId, playerName, roomId, router]);

  useEffect(() => {
    if (playerId === "p-local") return;
    const poll = window.setInterval(() => {
      getState(roomId, playerId)
        .then(setState)
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(poll);
  }, [playerId, roomId]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster || playerId === "p-local") return;

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(`game-${roomId}`);
    channel.bind("gameState:update", () => {
      getState(roomId, playerId).then(setState).catch(() => undefined);
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`game-${roomId}`);
      pusher.disconnect();
    };
  }, [playerId, roomId]);

  const me = state?.players.find((player) => player.id === playerId);
  const opponents = useMemo(
    () => state?.players.filter((player) => player.id !== playerId) ?? [],
    [playerId, state?.players],
  );
  const boardPlayers = useMemo(() => {
    const list = state?.players.filter((player) => player.connected) ?? [];
    return [...list].sort((a, b) => {
      if (a.id === playerId) return -1;
      if (b.id === playerId) return 1;
      return 0;
    });
  }, [playerId, state?.players]);
  const connectedPlayers = useMemo(() => state?.players.filter((player) => player.connected) ?? [], [state?.players]);
  const connectedOpponents = useMemo(() => opponents.filter((player) => player.connected), [opponents]);
  const emptySlotCount = opponents.length - connectedOpponents.length;
  const aliveTargets = useMemo(
    () => connectedOpponents.filter((player) => player.alive),
    [connectedOpponents],
  );
  const currentPlayer = state?.players.find((player) => player.id === state.currentPlayerId);
  const pendingCard = state?.pendingAction ? getCardData(state.pendingAction.cardId) : undefined;
  const hasGameState = state != null;
  const isLobby = hasGameState && state.status === "LOBBY";
  const isPlaying = hasGameState && state.status === "PLAYING";
  const isFinished = hasGameState && state.status === "FINISHED";
  const isMyTurn = isPlaying && state?.currentPlayerId === playerId;
  const turnSeconds = isPlaying && state ? Math.max(0, Math.ceil((state.turnExpiresAt - now) / 1000)) : 0;
  const nopeSeconds = state?.pendingAction
    ? Math.max(0, Math.ceil((state.pendingAction.expiresAt - now) / 1000))
    : 0;

  const mustConfirmAlter = Boolean(state?.pendingDrawAlter);
  const mustConfirmShare = Boolean(state?.pendingShareFuture?.reorderDrawTop?.length);
  const mustBury = Boolean(state?.pendingBury);
  const mustShuffle = Boolean(state?.pendingShuffle);
  const mustDefuse = Boolean(state?.pendingDefuseExplosion);
  const mustPickCatSteal = state?.pendingCatSteal?.type === "pick";
  const waitCatStealVictim = state?.pendingCatSteal?.type === "wait_pick";
  const blockTableActions =
    mustConfirmAlter ||
    mustConfirmShare ||
    mustBury ||
    mustShuffle ||
    mustDefuse ||
    mustPickCatSteal;

  useEffect(() => {
    if (state?.insight?.reorderDrawTop?.length && state.pendingDrawAlter) {
      setAlterOrder([...state.insight.reorderDrawTop]);
      setAlterPickIdx(null);
    } else if (!state?.pendingDrawAlter) {
      setAlterOrder([]);
      setAlterPickIdx(null);
    }
  }, [state?.insight?.reorderDrawTop, state?.pendingDrawAlter, state?.updatedAt]);

  useEffect(() => {
    if (state?.pendingShareFuture?.reorderDrawTop?.length) {
      setShareOrder([...state.pendingShareFuture.reorderDrawTop]);
      setSharePickIdx(null);
    } else if (!state?.pendingShareFuture) {
      setShareOrder([]);
      setSharePickIdx(null);
    }
  }, [state?.pendingShareFuture?.reorderDrawTop, state?.pendingShareFuture, state?.updatedAt]);

  useEffect(() => {
    if (!state?.pendingBury) setBuryInsertStr("");
  }, [state?.pendingBury, state?.updatedAt]);

  useEffect(() => {
    if (!state?.pendingDefuseExplosion) setDefuseInsertStr("");
  }, [state?.pendingDefuseExplosion, state?.updatedAt]);

  useEffect(() => {
    if (playerId === "p-local" || !roomId) return;
    const sendLeave = () => {
      const payload = JSON.stringify({ action: "leave", playerId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/games/${roomId}`, new Blob([payload], { type: "application/json" }));
      }
    };
    window.addEventListener("beforeunload", sendLeave);
    return () => {
      window.removeEventListener("beforeunload", sendLeave);
      sendLeave();
    };
  }, [playerId, roomId]);

  useEffect(() => {
    if (aliveTargets.length > 0 && !aliveTargets.some((player) => player.id === targetPlayerId)) {
      setTargetPlayerId(aliveTargets[0].id);
    }
  }, [aliveTargets, targetPlayerId]);

  useEffect(() => {
    if (!state || isBusy || !isPlaying) return;
    if (state.pendingAction && nopeSeconds <= 0) {
      runAction({ action: "resolve", playerId });
    } else if (!state.pendingAction && turnSeconds <= 0) {
      getState(roomId, playerId).then(setState).catch(() => undefined);
    }
  }, [isBusy, isPlaying, nopeSeconds, playerId, roomId, runAction, state, turnSeconds]);

  function playCard(cardInstanceId: string) {
    if (blockTableActions) return;
    const cardId = baseCardId(cardInstanceId);
    if (isNormalCat(cardInstanceId)) {
      setSelectedCatCards((current) => {
        if (current.includes(cardInstanceId)) return current.filter((card) => card !== cardInstanceId);
        return [...current, cardInstanceId].slice(-2);
      });
      return;
    }
    runAction({
      action: "play",
      playerId,
      cardInstanceId,
      targetPlayerId: requiresTarget(cardId) ? targetPlayerId : undefined,
    });
  }

  function playSelectedCatCombo() {
    if (blockTableActions) return;
    if (selectedCatCards.length !== 2 || !targetPlayerId) return;
    runAction({
      action: "catCombo",
      playerId,
      targetPlayerId,
      cardInstanceIds: selectedCatCards,
    });
    setSelectedCatCards([]);
  }

  function confirmCatStealPick(stolenCardInstanceId: string) {
    if (isBusy) return;
    runAction({ action: "confirmCatSteal", playerId, stolenCardInstanceId });
  }

  function moveAlterCard(from: number, to: number) {
    if (to < 0 || to >= alterOrder.length || from < 0 || from >= alterOrder.length || from === to) return;
    setAlterOrder((order) => {
      const next = [...order];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function moveShareCard(from: number, to: number) {
    if (to < 0 || to >= shareOrder.length || from < 0 || from >= shareOrder.length || from === to) return;
    setShareOrder((order) => {
      const next = [...order];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function confirmShareOrder() {
    if (!shareOrder.length) return;
    runAction({
      action: "confirmShareFuture",
      playerId,
      orderedInstanceIds: shareOrder,
    });
  }

  function confirmAlterOrder() {
    if (!alterOrder.length) return;
    runAction({
      action: "confirmAlterOrder",
      playerId,
      orderedInstanceIds: alterOrder,
    });
  }

  function confirmBury() {
    const value = Number.parseInt(buryInsertStr, 10);
    if (Number.isNaN(value)) return;
    runAction({ action: "confirmBury", playerId, insertIndex: value });
  }

  function confirmShuffleClick() {
    runAction({ action: "confirmShuffle", playerId });
  }

  function confirmDefuse() {
    const value = Number.parseInt(defuseInsertStr, 10);
    if (Number.isNaN(value)) return;
    runAction({ action: "confirmDefuseExplosion", playerId, insertIndex: value });
  }

  function randomDefuseInsert() {
    const max = state?.pendingDefuseExplosion?.maxInsertIndex ?? 0;
    setDefuseInsertStr(String(Math.floor(Math.random() * (max + 1))));
  }

  function randomBuryInsert() {
    const max = state?.pendingBury?.maxInsertIndex ?? 0;
    setBuryInsertStr(String(Math.floor(Math.random() * (max + 1))));
  }

  const nopeCard = me?.hand?.find((card) => baseCardId(card) === "nope");
  const isRoomOwner = (state?.ownerPlayerId ?? state?.players[0]?.id) === playerId;
  const booting = playerId !== "p-local" && !state && !error;

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedRoomId(true);
      window.setTimeout(() => setCopiedRoomId(false), 2000);
    } catch {
      setError("Không sao chép được — hãy chọn và copy thủ công.");
    }
  }

  return (
    <main className="relative z-10 h-screen overflow-hidden bg-gradient-to-b from-parchment via-cream to-amber-100/35 px-3 py-3 text-ink">
      {booting && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-white/80 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-sm animate-pulse space-y-3 rounded-2xl border-2 border-felt/90 bg-white p-6 shadow-card">
            <div className="h-3 w-24 rounded bg-stone-200" />
            <div className="h-8 w-40 rounded bg-stone-300" />
            <div className="h-24 rounded-lg bg-stone-100" />
          </div>
          <p className="text-sm font-bold text-ink/70">Đang vào phòng…</p>
        </div>
      )}
      <section className="mx-auto grid h-full max-w-7xl grid-rows-[auto_1fr_auto] gap-2">
        <header className="grid gap-3 rounded-2xl border-2 border-felt/90 bg-white/90 p-3 shadow-lift backdrop-blur-sm sm:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cherry">Phòng</p>
              <span className="rounded-lg bg-felt px-2.5 py-1 font-mono text-sm font-black tracking-wider text-parchment shadow-inner">
                {roomId}
              </span>
              <button
                type="button"
                onClick={() => void copyRoomId()}
                className="rounded-lg border-2 border-felt/90 bg-parchment px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ink shadow-sm transition hover:bg-cream"
              >
                {copiedRoomId ? "Đã chép" : "Sao chép ID"}
              </button>
            </div>
            {state?.roomName && (
              <p className="mt-0.5 text-xs font-bold text-stone-600">
                Tên phòng: <span className="font-black text-ink">{state.roomName}</span>
              </p>
            )}
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {!hasGameState
                ? "Đang tải…"
                : isFinished
                  ? "Ván đã kết thúc"
                  : isLobby
                    ? "Đang chờ bắt đầu"
                    : isMyTurn
                      ? "Đến lượt: Bạn"
                      : `Đến lượt: ${currentPlayer?.name ?? "…"}`}
            </h1>
            <p className="text-xs font-bold text-stone-700">
              <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded-lg bg-felt px-2.5 py-1 font-black text-parchment">
                  Bạn: {me?.name ?? playerName}
                </span>
                {isPlaying && me && (
                  <span className={isMyTurn ? "font-black text-emerald-800" : "text-stone-600"}>
                    {isMyTurn ? "● Đang tới lượt bạn" : "○ Chờ lượt của bạn"}
                  </span>
                )}
              </span>
              <span className="mt-1 block">
              {!hasGameState
                ? "Đang đồng bộ với máy chủ…"
                : isFinished
                  ? "Ván kết thúc — xem người thắng ở khung giữa (biểu tượng cúp). Bấm «Ván mới» trên thanh trên để chơi lại."
                  : isLobby
                ? isRoomOwner
                  ? "Chờ đủ người rồi bấm Bắt đầu (chỉ chủ phòng bấm được)"
                  : "Chờ chủ phòng bắt đầu ván"
                : waitCatStealVictim && state?.pendingCatSteal?.type === "wait_pick"
                  ? `${state.pendingCatSteal.stealerName} đang chọn một lá từ tay bạn (combo 2 mèo).`
                  : mustPickCatSteal && state?.pendingCatSteal?.type === "pick"
                    ? `Chọn đúng 1 lá từ tay ${state.pendingCatSteal.targetName} — bấm vào lá bài ở khung dưới.`
                : mustDefuse
                  ? "Rút trúng Mèo Nổ! Chọn vị trí chôn lại lá Mèo Nổ (0 = đáy xấp) rồi xác nhận — Gỡ Bom sẽ được dùng tự động."
                  : mustBury
                    ? "Chôn bài: nhập vị trí chèn (0…số lá trong xấp), rồi xác nhận."
                    : mustShuffle
                      ? "Bấm nút trộn để xào ngẫu nhiên xấp rút."
                      : mustConfirmShare
                        ? "Chia Sẻ Tương Lai: sắp xếp các lá, xác nhận — người kế tiếp cũng sắp được trước khi trả lá lên xấp."
                        : mustConfirmAlter
                          ? "Sắp xếp xong các lá trên xấp rút rồi bấm Xác nhận — sau đó bạn vẫn có thể đánh tiếp hoặc rút bài để kết thúc lượt"
                          : isMyTurn
                            ? "Đến lượt bạn: đánh bài tùy ý; chỉ khi không đánh nữa thì bấm xấp rút để rút 1 lá và kết thúc lượt"
                            : "Đang chờ người chơi khác"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isPlaying && (
              <div className="rounded-md bg-felt px-3 py-1.5 text-center text-white">
                <p className="text-[9px] font-black uppercase tracking-[0.12em]">Lượt</p>
                <p className="text-xl font-black">{turnSeconds}s</p>
              </div>
            )}
            {isPlaying && (
              <label className="grid gap-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-stone-600">
                Mục tiêu
                <select
                  value={targetPlayerId}
                  onChange={(event) => setTargetPlayerId(event.target.value)}
                  className="h-9 min-w-[140px] rounded-md border-2 border-felt/90 bg-white px-2 text-xs font-bold normal-case"
                >
                  {aliveTargets.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              disabled={isBusy}
              onClick={() =>
                runAction({
                  action: "create",
                  playerId,
                  playerName,
                  maxPlayers: 2,
                  expansions: ["BASE", "IMPLODING", "STREAKING", "BARKING"],
                  forceNew: true,
                })
              }
              className="h-9 rounded-md bg-white px-3 text-xs font-black shadow transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              Ván mới
            </button>
            {isLobby ? (
              <button
                disabled={isBusy || connectedPlayers.length < 2 || !isRoomOwner}
                onClick={() => runAction({ action: "start", playerId })}
                className="h-9 rounded-md bg-cherry px-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Bắt đầu
              </button>
            ) : isFinished ? null : (
              <button
                disabled={isBusy || !isMyTurn || !!state?.actionPrompt || blockTableActions}
                onClick={handleDeckDraw}
                className="h-9 rounded-md bg-cherry px-3 text-xs font-black text-white shadow transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Rút bài
              </button>
            )}
          </div>
        </header>

        <div className="relative z-0 grid min-h-0 grid-rows-[auto_1fr] gap-2">
          {waitCatStealVictim && (
            <div className="rounded-lg border-2 border-amber-600 bg-amber-100 px-3 py-2 text-center text-xs font-black text-amber-950 shadow-sm">
              {state?.pendingCatSteal?.type === "wait_pick"
                ? `${state.pendingCatSteal.stealerName} đang chọn một lá từ tay bạn (combo 2 mèo).`
                : null}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {boardPlayers.map((player) => {
              const isSelf = player.id === playerId;
              const isTurn = isPlaying && state?.currentPlayerId === player.id;
              return (
                <div
                  key={player.id}
                  className={`rounded-lg border-2 p-2 shadow ${
                    isTurn
                      ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600"
                      : isSelf
                        ? "border-emerald-800 bg-white/90 ring-1 ring-emerald-900/20"
                        : "border-felt/90 bg-white/75"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-black">{player.name}</p>
                      {isSelf && (
                        <span className="shrink-0 rounded bg-emerald-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                          Bạn
                        </span>
                      )}
                    </div>
                    {isPlaying && (
                      <span className="shrink-0 rounded bg-felt px-2 py-1 text-[11px] font-bold text-white">
                        {player.handCount} lá
                      </span>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-600">
                    {isLobby ? (
                      "Đã vào phòng"
                    ) : isFinished ? (
                      player.id === state.winnerId ? (
                        <span className="text-emerald-800">Thắng cuộc</span>
                      ) : !player.alive ? (
                        <>
                          <span aria-hidden>💀</span> Đã bị loại
                        </>
                      ) : (
                        "Hết ván"
                      )
                    ) : !player.alive ? (
                      <>
                        <span aria-hidden>💀</span> Đã bị loại
                      </>
                    ) : isTurn ? (
                      <span className="text-emerald-800">Đang tới lượt</span>
                    ) : (
                      "Đang chờ lượt"
                    )}
                  </p>
                </div>
              );
            })}
            {emptySlotCount > 0 && (
              <div className="rounded-lg border-2 border-dashed border-stone-500 bg-white/50 p-2 text-sm font-black text-stone-600">
                Còn {emptySlotCount} chỗ trống
              </div>
            )}
          </div>

          {!hasGameState ? (
            <div className="grid min-h-0 place-items-center rounded-2xl border-2 border-dashed border-felt/30 bg-white/70 py-20 shadow-inner backdrop-blur-sm">
              <div className="max-w-xs space-y-2 px-4 text-center">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-felt">Đang tải</p>
                <p className="text-xs font-semibold text-ink/65">Đang lấy trạng thái phòng từ máy chủ…</p>
              </div>
            </div>
          ) : isLobby ? (
            <div className="grid min-h-0 grid-rows-[auto_1fr] gap-4 rounded-2xl border-2 border-felt/90 bg-white/95 p-5 shadow-card backdrop-blur-sm">
              <div className="shrink-0 space-y-2 text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cherry">Sảnh chờ</p>
                <h2 className="text-2xl font-black sm:text-3xl">Chưa bắt đầu ván</h2>
                <p className="text-sm font-bold text-stone-700">
                  Đã có {connectedPlayers.length}/{state?.players.length ?? 0} người. Timer và bài trên tay chỉ hiện sau khi bấm Bắt đầu.
                </p>
                <button
                  disabled={isBusy || connectedPlayers.length < 2 || !isRoomOwner}
                  onClick={() => runAction({ action: "start", playerId })}
                  className="mt-1 h-11 rounded-md bg-cherry px-5 text-sm font-black uppercase tracking-[0.12em] text-white shadow disabled:opacity-50"
                >
                  Bắt đầu
                </button>
              </div>
              <div className="flex min-h-0 flex-col rounded-md border border-stone-200 bg-stone-50/90">
                <p className="shrink-0 border-b border-stone-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-stone-500">
                  Nhật ký phòng
                </p>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-left text-xs font-semibold text-stone-700">
                  {(state?.log ?? []).map((line, index) => (
                    <p key={`${index}-${line.slice(0, 24)}`} className="border-b border-stone-100 py-1 last:border-b-0">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : isFinished ? (
            <div
              className="grid min-h-0 place-items-center rounded-2xl border-2 border-felt/90 bg-gradient-to-b from-amber-50/90 via-parchment to-white px-6 py-12 text-center shadow-card backdrop-blur-sm"
              role="status"
              aria-label="Kết quả ván chơi"
            >
              <div className="flex max-w-md flex-col items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-800 shadow-lg ring-4 ring-amber-200/80">
                  <TrophyIcon className="h-14 w-14 drop-shadow-md" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-900">Người thắng</p>
                  <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                    {state.players.find((p) => p.id === state.winnerId)?.name ?? state.winnerId ?? "—"}
                  </p>
                </div>
                <p className="text-sm font-medium leading-relaxed text-ink/75">
                  Chúc mừng nhà vô địch ván này. Nhật ký các nước đi nằm ở cuối trang.
                </p>
                <p className="text-xs font-semibold text-ink/55">
                  Bấm nút <span className="font-black text-ink">«Ván mới»</span> góc trên phải để bắt đầu ván mới trong
                  cùng phòng.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 grid-cols-[1fr_minmax(190px,250px)] items-start gap-3 pb-40">
              <div className="relative z-20 grid min-h-0 place-items-start justify-self-center">
                <div className="grid w-full max-w-xl grid-cols-2 gap-4 self-start [min-height:280px] content-start items-start">
                  <div className="relative z-20 flex justify-center pt-1">
                    <DrawPileDeck
                      count={state?.drawPileCount ?? 0}
                      disabled={isBusy || !isMyTurn || !!state?.actionPrompt || blockTableActions}
                      onDraw={handleDeckDraw}
                      dangerPulse={mustDefuse}
                      shuffleWiggle={Boolean(state?.insight?.title?.toLowerCase().includes("xào"))}
                      animMode={deckAnim}
                    />
                  </div>

                  <div className="aspect-[5/7] w-full max-w-[200px] justify-self-end rounded-2xl border-[3px] border-dashed border-felt/50 bg-cream/80 p-2 shadow-lift backdrop-blur-sm">
                    {state?.discardTop ? (
                      <CardView cardId={state.discardTop} density="compact" className="shadow-none" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                        Xấp bỏ
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <aside className="grid gap-2 rounded-2xl border-2 border-felt/90 bg-white/88 p-4 shadow-lift backdrop-blur-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-600">Hành động</p>
                {pendingCard ? (
                  <>
                    <CardView cardId={pendingCard.id} density="mini" className="shadow-none" />
                    <p className="text-sm font-black">{pendingCard.title}</p>
                    <p className="text-xs font-bold text-stone-700">{actionDescription(pendingCard.id)}</p>
                    <div className="rounded-md bg-yellow-200 px-3 py-2 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em]">Chờ Nope</p>
                      <p className="text-3xl font-black text-cherry">{nopeSeconds}s</p>
                    </div>
                    <button
                      disabled={!nopeCard || isBusy}
                      onClick={() => runAction({ action: "nope", playerId, cardInstanceId: nopeCard })}
                      className="h-9 rounded-md bg-felt px-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
                    >
                      Dùng Nope
                    </button>
                  </>
                ) : state?.insight ? (
                  <>
                    <p className="text-sm font-black">{state.insight.title}</p>
                    {state.insight.message && <p className="text-xs font-bold text-stone-700">{state.insight.message}</p>}
                  </>
                ) : (
                  <p className="text-xs font-bold text-stone-600">
                    Đánh lá chức năng sẽ hiện ở đây. Nếu hết thời gian chờ Nope, hệ thống tự thực hiện chức năng.
                  </p>
                )}
              </aside>
            </div>
          )}

          <AnimatePresence>
            {isPlaying &&
              (mustDefuse ||
                mustPickCatSteal ||
                mustBury ||
                mustShuffle ||
                mustConfirmShare ||
                (mustConfirmAlter && alterOrder.length > 0) ||
                (state?.insight && state.insight.cards.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="pointer-events-auto absolute bottom-2 left-1/2 z-20 w-[min(92vw,620px)] max-h-[min(70vh,520px)] -translate-x-1/2 overflow-y-auto rounded-2xl border-4 border-felt/90 bg-parchment p-4 shadow-card"
              >
                {mustPickCatSteal && state?.pendingCatSteal?.type === "pick" ? (
                  <>
                    <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-amber-900">Combo 2 mèo</p>
                    <p className="mt-1 text-center text-sm font-bold text-stone-800">
                      Chọn <span className="text-cherry">đúng 1 lá</span> từ tay{" "}
                      <span className="font-black">{state.pendingCatSteal.targetName}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                      {state.pendingCatSteal.cards.map((c) => (
                        <button
                          key={c.instanceId}
                          type="button"
                          disabled={isBusy}
                          onClick={() => confirmCatStealPick(c.instanceId)}
                          className="rounded-lg border-2 border-felt/90 bg-amber-50/80 p-1 shadow transition hover:-translate-y-1 hover:ring-2 hover:ring-amber-500 disabled:opacity-50"
                        >
                          <CardView cardId={c.baseId} density="mini" className="w-[104px] shrink-0 shadow-none sm:w-28" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : mustDefuse ? (
                  <>
                    <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-cherry">
                      Mèo Nổ!
                    </p>
                    <div className="mt-2 flex justify-center">
                      <CardView cardId="exploding-kitten" density="compact" className="max-w-[200px] shadow-lg ring-4 ring-cherry" />
                    </div>
                    <p className="mt-2 text-center text-sm font-bold text-stone-800">
                      Chọn vị trí chèn Mèo Nổ vào xấp rút (0 = đáy, {state.pendingDefuseExplosion?.maxInsertIndex ?? 0} = trên cùng).
                      Gỡ Bom sẽ được dùng khi bạn xác nhận.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={state.pendingDefuseExplosion?.maxInsertIndex ?? 0}
                        value={defuseInsertStr}
                        onChange={(e) => setDefuseInsertStr(e.target.value)}
                        className="h-10 w-28 rounded-md border-2 border-felt/90 px-2 text-center text-sm font-black"
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={randomDefuseInsert}
                        className="h-10 rounded-md border-2 border-felt/90 bg-amber-100 px-3 text-xs font-black"
                      >
                        Ngẫu nhiên
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={confirmDefuse}
                        className="h-10 rounded-md bg-cherry px-4 text-xs font-black uppercase tracking-[0.12em] text-white"
                      >
                        Xác nhận Gỡ Bom
                      </button>
                    </div>
                  </>
                ) : mustBury ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cherry">Chôn bài</p>
                    <div className="mt-2 flex justify-center">
                      <CardView
                        cardId={state.pendingBury?.cardBaseId ?? "shuffle"}
                        density="compact"
                        className="max-w-[200px] shadow-none"
                      />
                    </div>
                    <p className="mt-2 text-xs font-bold text-stone-700">
                      Vị trí chèn (0…{state.pendingBury?.maxInsertIndex ?? 0}). Số phải ≤ số lá hiện trong xấp.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={state.pendingBury?.maxInsertIndex ?? 0}
                        value={buryInsertStr}
                        onChange={(e) => setBuryInsertStr(e.target.value)}
                        className="h-10 w-28 rounded-md border-2 border-felt/90 px-2 text-center text-sm font-black"
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={randomBuryInsert}
                        className="h-10 rounded-md border-2 border-felt/90 bg-amber-100 px-3 text-xs font-black"
                      >
                        Ngẫu nhiên
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={confirmBury}
                        className="h-10 rounded-md bg-cherry px-4 text-xs font-black text-white"
                      >
                        Xác nhận chôn bài
                      </button>
                    </div>
                  </>
                ) : mustShuffle ? (
                  <div className="grid place-items-center gap-4 py-6">
                    <p className="text-center text-sm font-black text-ink">Xào bài — trộn ngẫu nhiên cả xấp rút</p>
                    <motion.button
                      type="button"
                      initial={false}
                      disabled={isBusy}
                      onClick={confirmShuffleClick}
                      whileTap={{ scale: 0.95 }}
                      animate={{ rotate: [0, 2, -2, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="rounded-full border-4 border-amber-400 bg-gradient-to-br from-amber-300 via-orange-500 to-cherry px-10 py-6 text-lg font-black uppercase tracking-[0.15em] text-white shadow-xl"
                    >
                      Trộn ngay
                    </motion.button>
                  </div>
                ) : mustConfirmShare && shareOrder.length > 0 ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cherry">Chia sẻ tương lai</p>
                    <p className="mt-1 text-[11px] font-bold text-sky-900">
                      Bấm hai lá để hoán đổi, hoặc dùng mũi tên. Trái = rút trước.
                    </p>
                    <div className="mt-2 flex flex-wrap items-end justify-center gap-3">
                      {shareOrder.map((instanceId, index) => (
                        <div key={`${instanceId}-s-${index}`} className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              if (sharePickIdx === null) setSharePickIdx(index);
                              else if (sharePickIdx === index) setSharePickIdx(null);
                              else {
                                moveShareCard(sharePickIdx, index);
                                setSharePickIdx(null);
                              }
                            }}
                            className={`rounded-md border-2 p-1 ${
                              sharePickIdx === index ? "border-cherry ring-2 ring-cherry-glow/50" : "border-dashed border-felt/35"
                            }`}
                          >
                            <CardView cardId={baseCardId(instanceId)} density="mini" className="w-28 shrink-0 shadow-none" />
                          </button>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={isBusy || index === 0}
                              onClick={() => moveShareCard(index, index - 1)}
                              className="h-7 w-9 rounded border-2 border-felt/90 bg-stone-100 text-xs font-black disabled:opacity-40"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              disabled={isBusy || index === shareOrder.length - 1}
                              onClick={() => moveShareCard(index, index + 1)}
                              className="h-7 w-9 rounded border-2 border-felt/90 bg-stone-100 text-xs font-black disabled:opacity-40"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={confirmShareOrder}
                      className="mt-3 w-full rounded-md bg-cherry py-2 text-sm font-black uppercase tracking-[0.12em] text-white shadow disabled:opacity-50"
                    >
                      Xác nhận
                    </button>
                  </>
                ) : state?.insight ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cherry">{state.insight.title}</p>
                    {state.insight.message && <p className="text-xs font-bold text-stone-600">{state.insight.message}</p>}
                    {mustConfirmAlter && alterOrder.length > 0 ? (
                      <>
                        <p className="mt-2 text-[11px] font-bold text-sky-900">
                          Bấm hai lá để hoán đổi chỗ, hoặc dùng mũi tên. Trái = rút trước.
                        </p>
                        <div className="mt-2 flex flex-wrap items-end justify-center gap-3">
                          {alterOrder.map((instanceId, index) => (
                            <div key={`${instanceId}-a-${index}`} className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  if (alterPickIdx === null) setAlterPickIdx(index);
                                  else if (alterPickIdx === index) setAlterPickIdx(null);
                                  else {
                                    moveAlterCard(alterPickIdx, index);
                                    setAlterPickIdx(null);
                                  }
                                }}
                                className={`rounded-md border-2 p-1 ${
                                  alterPickIdx === index ? "border-cherry ring-2 ring-cherry-glow/50" : "border-dashed border-felt/35"
                                }`}
                              >
                                <CardView cardId={baseCardId(instanceId)} density="mini" className="w-28 shrink-0 shadow-none" />
                              </button>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={isBusy || index === 0}
                                  onClick={() => moveAlterCard(index, index - 1)}
                                  className="h-7 w-9 rounded border-2 border-felt/90 bg-stone-100 text-xs font-black disabled:opacity-40"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy || index === alterOrder.length - 1}
                                  onClick={() => moveAlterCard(index, index + 1)}
                                  className="h-7 w-9 rounded border-2 border-felt/90 bg-stone-100 text-xs font-black disabled:opacity-40"
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={isBusy || !isMyTurn}
                          onClick={confirmAlterOrder}
                          className="mt-3 w-full rounded-md bg-cherry py-2 text-sm font-black uppercase tracking-[0.12em] text-white shadow disabled:opacity-50"
                        >
                          Xác nhận thứ tự lên xấp rút
                        </button>
                      </>
                    ) : (
                      <div className="mt-2 flex gap-2 overflow-x-auto">
                        {state.insight.cards.map((cardId, index) => (
                          <CardView
                            key={`${cardId}-${index}`}
                            cardId={cardId}
                            density="mini"
                            className="w-28 shrink-0 shadow-none"
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="relative z-20 grid min-h-0 gap-2 rounded-2xl border-2 border-felt/90 bg-white/92 p-3 shadow-lift backdrop-blur-sm">
          {error && <p className="rounded-md bg-red-900 px-3 py-2 text-xs font-bold text-white">{error}</p>}
          {!hasGameState ? (
            <div className="text-xs font-bold text-ink/60">Đang tải dữ liệu phòng…</div>
          ) : isPlaying ? (
            <div>
              <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-stone-700">
                Tay bài của bạn ({me?.handCount ?? 0})
              </p>
              <div className="mb-2 flex flex-col gap-2 text-xs font-bold text-stone-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <span>
                  Combo 2 mèo: {selectedCatCards.length}/2 — chọn hai lá cùng loại (hoặc Mèo Hoang + một mèo thường), chọn mục tiêu ở ô trên, rồi bấm để bốc{" "}
                  <span className="font-black text-cherry">một lá bạn chọn</span> từ tay đối thủ.
                </span>
                <span className="font-bold text-ink">
                  Mục tiêu: {aliveTargets.find((player) => player.id === targetPlayerId)?.name ?? "chưa có"}
                </span>
                <button
                  disabled={isBusy || !isMyTurn || !!state?.actionPrompt || blockTableActions || selectedCatCards.length !== 2 || !targetPlayerId}
                  onClick={playSelectedCatCombo}
                  className="h-8 w-full shrink-0 rounded-md bg-amber-700 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow disabled:opacity-50 sm:w-auto"
                >
                  Bốc 1 lá tay địch
                </button>
              </div>
              <div className="grid max-h-[26vh] grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2 overflow-y-auto pr-1 sm:grid-cols-[repeat(auto-fill,minmax(118px,1fr))]">
                {me?.hand?.map((cardInstanceId, index) => {
                  const cardId = baseCardId(cardInstanceId);
                  const selectedCat = selectedCatCards.includes(cardInstanceId);
                  const canPlay =
                    isMyTurn &&
                    !state?.actionPrompt &&
                    !blockTableActions &&
                    cardId !== "defuse" &&
                    cardId !== "exploding-kitten" &&
                    cardId !== "imploding-kitten";
                  return (
                    <motion.button
                      key={`${cardInstanceId}-${index}`}
                      initial={false}
                      disabled={isBusy || !canPlay}
                      onClick={() => playCard(cardInstanceId)}
                      className={`min-w-0 rounded-lg text-left disabled:cursor-not-allowed disabled:opacity-60 ${selectedCat ? "ring-4 ring-cherry" : ""}`}
                      whileHover={canPlay ? { y: -4 } : undefined}
                    >
                      <CardView cardId={cardId} density="mini" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : isFinished ? (
            <div className="text-xs font-semibold text-ink/70">
              Ván đã kết thúc — tay bài không còn hiển thị theo chế độ xem an toàn của máy chủ.
            </div>
          ) : (
            <div className="text-xs font-bold text-stone-700">
              Bài trên tay sẽ được mở sau khi ván bắt đầu.
            </div>
          )}
          {hasGameState && !isLobby && (
            <div className="grid max-h-16 gap-1 overflow-y-auto text-xs font-semibold text-stone-700 sm:grid-cols-2">
              {(state?.log ?? []).slice(-8).map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          )}
        </footer>
      </section>
    </main>
  );
}
