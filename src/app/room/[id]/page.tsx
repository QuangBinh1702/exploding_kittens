"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Pusher from "pusher-js";
import { useCallback, useEffect, useId, useMemo, useRef, useState, Suspense } from "react";
import { CardDetailModal } from "@/components/CardDetailModal";
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

function compactLog(lines: readonly string[]): string[] {
  const SKIP_PATTERNS = [
    /Hành động có hiệu lực sau thời gian chờ Nope\.?/i,
    /^uses Clairvoyance/i,
    /^Phòng đã tạo với tối đa/i,
    /^Gỡ Bom: \d+ lá trên tay/i,
  ];
  const filtered = lines.filter((line) => !SKIP_PATTERNS.some((re) => re.test(line)));
  const out: string[] = [];
  for (const line of filtered) {
    if (out[out.length - 1] === line) continue;
    out.push(line);
  }
  return out;
}

function actionDescription(cardId?: string) {
  switch (cardId) {
    case "shuffle":
    case "shuffle-now":
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
    case "attack-of-the-dead":
      return "Sắp chuyển lượt tấn công.";
    case "skip":
    case "super-skip":
      return "Sắp bỏ lượt.";
    case "clairvoyance":
      return "Xem bài trên tay mục tiêu.";
    case "clone":
      return "Sao chép lá hành động vừa đánh.";
    case "dig-deeper":
      return "Rút sâu hơn trong xấp bài.";
    case "feed-the-dead":
    case "grave-robber":
      return "Tương tác với người chơi đã bị loại.";
    case "armageddon":
    case "godcat":
    case "devilcat":
    case "raising-heck":
      return "Hiệu ứng đặc biệt Good vs Evil.";
    case "potluck":
      return "Mỗi người đặt một lá lên xấp rút.";
    case "reveal-the-future-3x":
      return "Lộ công khai 3 lá trên cùng.";
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
  return (
    type === "TARGETED_ATTACK" ||
    type === "FAVOR" ||
    type === "MARK" ||
    type === "CURSE_OF_CAT_BUTT" ||
    type === "BARKING_KITTEN" ||
    type === "ILL_TAKE_THAT" ||
    type === "CLAIRVOYANCE" ||
    type === "ARMAGEDDON" ||
    type === "DEVILCAT"
  );
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
  const [roomPassword, setRoomPassword] = useState("");
  const [showRoomPassword, setShowRoomPassword] = useState(false);
  const [copiedRoomPassword, setCopiedRoomPassword] = useState(false);
  const [dismissedInsightKey, setDismissedInsightKey] = useState("");
  const [insightDismissAt, setInsightDismissAt] = useState<number | null>(null);
  const [defuseModalDismissed, setDefuseModalDismissed] = useState(false);
  const [detailCardId, setDetailCardId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(`room-password:${roomId}`) ?? "";
    setRoomPassword(stored);
  }, [roomId]);

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
        setError(actionError instanceof Error ? actionError.message : "Action failed");
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
          expansions: ["BASE", "IMPLODING", "STREAKING", "BARKING", "ZOMBIE", "GOOD_VS_EVIL"],
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
        if (!ignore) setError(bootError instanceof Error ? bootError.message : "Could not join the room");
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
        .catch((pollError) => {
          const message = pollError instanceof Error ? pollError.message : "";
          if (/busy|đang xử lý|thử lại/i.test(message)) return;
        });
    }, 2000);
    return () => window.clearInterval(poll);
  }, [playerId, roomId]);

  useEffect(() => {
    if (playerId === "p-local") return;

    const handleLeave = () => {
      const url = `/api/games/${roomId}`;
      const payload = JSON.stringify({ action: "leave", playerId });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    };

    window.addEventListener("beforeunload", handleLeave);
    return () => {
      window.removeEventListener("beforeunload", handleLeave);
      handleLeave();
    };
  }, [roomId, playerId]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster || playerId === "p-local") return;

    const pusher = new Pusher(key, { cluster });
    const channel = pusher.subscribe(`game-${roomId}`);
    channel.bind("gameState:update", () => {
      getState(roomId, playerId).then(setState).catch((stateError) => {
        const message = stateError instanceof Error ? stateError.message : "";
        if (/busy|đang xử lý|thử lại/i.test(message)) return;
      });
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
  const recentExplosion = state?.lastExplosion && now - state.lastExplosion.at < 4500 ? state.lastExplosion : undefined;
  const turnSeconds = isPlaying && state ? Math.max(0, Math.ceil((state.turnExpiresAt - now) / 1000)) : 0;
  const nopeSeconds = state?.pendingAction
    ? Math.max(0, Math.ceil((state.pendingAction.expiresAt - now) / 1000))
    : 0;
  const insightKey = state?.insight
    ? `${state.insight.playerId}:${state.insight.title}:${state.insight.expiresAt}:${state.updatedAt}`
    : "";
  const visibleInsight = state?.insight && insightKey !== dismissedInsightKey && (!insightDismissAt || now < insightDismissAt)
    ? state.insight
    : undefined;
  const insightSeconds = visibleInsight ? Math.max(0, Math.ceil(((insightDismissAt ?? visibleInsight.expiresAt) - now) / 1000)) : 0;

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
    if (state?.pendingDefuseExplosion) {
      setDefuseModalDismissed(false);
    }
  }, [state?.pendingDefuseExplosion]);

  useEffect(() => {
    if (state?.insight) setInsightDismissAt(Math.min(state.insight.expiresAt, Date.now() + 10000));
    else setInsightDismissAt(null);
  }, [insightKey, state?.insight]);

  useEffect(() => {
    if (!visibleInsight || mustConfirmAlter || mustConfirmShare || mustBury || mustShuffle || mustDefuse || mustPickCatSteal) return;
    if (insightSeconds > 0) return;
    setDismissedInsightKey(insightKey);
  }, [insightKey, insightSeconds, mustBury, mustConfirmAlter, mustConfirmShare, mustDefuse, mustPickCatSteal, mustShuffle, visibleInsight]);

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
      getState(roomId, playerId).then(setState).catch((stateError) => {
        const message = stateError instanceof Error ? stateError.message : "";
        if (/busy|đang xử lý|thử lại/i.test(message)) return;
      });
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

  async function copyRoomPassword() {
    if (!roomPassword) return;
    try {
      await navigator.clipboard.writeText(roomPassword);
      setCopiedRoomPassword(true);
      window.setTimeout(() => setCopiedRoomPassword(false), 2000);
    } catch {
      setError("Không sao chép được mật khẩu.");
    }
  }

  return (
    <main className="relative z-10 min-h-screen overflow-x-hidden bg-gradient-to-b from-parchment via-cream to-amber-100/35 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 text-ink sm:px-3 sm:py-3 lg:min-h-screen lg:overflow-y-auto">
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
      <section className="mx-auto grid max-w-7xl gap-2 lg:h-full lg:grid-rows-[auto_1fr_auto]">
        <header className="sticky top-2 z-30 grid gap-2 rounded-2xl border-2 border-felt/90 bg-white/95 p-2.5 shadow-lift backdrop-blur-md sm:grid-cols-[1fr_auto] sm:p-3 lg:static lg:z-auto">
          <div className="flex items-start gap-3">
            <img src="/assets/logo.png" alt="Mèo Nổ Logo" className="h-12 w-12 object-contain shrink-0 mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
            <div className="flex-1 min-w-0">
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
                {roomPassword && (
                  <span className="inline-flex items-center gap-1 rounded-lg border-2 border-amber-700/80 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-900 shadow-sm">
                    <span aria-hidden>🔒</span>
                    <span>MK:</span>
                    <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] tracking-wider">
                      {showRoomPassword ? roomPassword : "•".repeat(Math.max(roomPassword.length, 4))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRoomPassword((v) => !v)}
                      className="rounded bg-amber-200 px-1.5 py-0.5 text-[9px] font-black hover:bg-amber-300"
                    >
                      {showRoomPassword ? "Ẩn" : "Hiện"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyRoomPassword()}
                      className="rounded bg-amber-700 px-1.5 py-0.5 text-[9px] font-black text-white hover:bg-amber-800"
                    >
                      {copiedRoomPassword ? "Đã chép" : "Sao chép"}
                    </button>
                  </span>
                )}
              </div>
              {state?.roomName && (
                <p className="mt-0.5 hidden text-xs font-bold text-stone-600 sm:block">
                  Tên phòng: <span className="font-black text-ink">{state.roomName}</span>
                </p>
              )}
              <h1 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-2xl">
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
              <p className="text-[11px] font-bold leading-snug text-stone-700 sm:text-xs">
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
                <span className="mt-1 line-clamp-2 sm:block sm:line-clamp-none">
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
                              ? "Rút trúng Mèo Nổ! Chọn vị trí chôn lại lá Mèo Nổ rồi xác nhận."
                              : mustBury
                                ? "Chôn bài: nhập vị trí chèn rồi xác nhận."
                                : mustShuffle
                                  ? "Bấm nút trộn để xào ngẫu nhiên xấp rút."
                                  : mustConfirmShare
                                    ? "Chia Sẻ Tương Lai: sắp xếp các lá rồi xác nhận."
                                    : mustConfirmAlter
                                      ? "Sắp xếp xong các lá rồi bấm Xác nhận."
                                      : isMyTurn
                                        ? "Đến lượt bạn: đánh bài hoặc rút để kết thúc lượt."
                                        : "Đang chờ người chơi khác"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {isPlaying && (
              <div className="rounded-md bg-felt px-2.5 py-1 text-center text-white sm:px-3 sm:py-1.5">
                <p className="text-[9px] font-black uppercase tracking-[0.12em]">Lượt</p>
                <p className="text-lg font-black sm:text-xl">{turnSeconds}s</p>
              </div>
            )}
            {isPlaying && (
              <label className="grid gap-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-stone-600">
                Mục tiêu
                <select
                  value={targetPlayerId}
                  onChange={(event) => setTargetPlayerId(event.target.value)}
                  className="h-9 min-w-[118px] rounded-md border-2 border-felt/90 bg-white px-2 text-xs font-bold normal-case sm:min-w-[140px]"
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
                  expansions: ["BASE", "IMPLODING", "STREAKING", "BARKING", "ZOMBIE", "GOOD_VS_EVIL"],
                  forceNew: true,
                })
              }
              className="h-9 rounded-md bg-white px-2.5 text-[11px] font-black shadow transition hover:-translate-y-0.5 disabled:opacity-50 sm:px-3 sm:text-xs"
            >
              Ván mới
            </button>
            <button
              onClick={() => router.push("/")}
              className="h-9 rounded-md bg-stone-100 hover:bg-stone-200 border border-stone-300 px-2.5 text-[11px] font-black shadow transition hover:-translate-y-0.5 sm:px-3 sm:text-xs text-ink"
            >
              Thoát
            </button>
            {isLobby ? (
              <button
                disabled={isBusy || connectedPlayers.length < 2 || !isRoomOwner}
                onClick={() => runAction({ action: "start", playerId })}
                className="h-9 rounded-md bg-cherry px-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow transition hover:-translate-y-0.5 disabled:opacity-50 sm:px-3 sm:text-xs"
              >
                Bắt đầu
              </button>
            ) : isFinished ? null : (
              <button
                disabled={isBusy || !isMyTurn || !!state?.actionPrompt || blockTableActions}
                onClick={handleDeckDraw}
                className="h-9 rounded-md bg-cherry px-2.5 text-[11px] font-black text-white shadow transition hover:-translate-y-0.5 disabled:opacity-50 sm:px-3 sm:text-xs"
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
          <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0">
            {boardPlayers.map((player) => {
              const isSelf = player.id === playerId;
              const isTurn = isPlaying && state?.currentPlayerId === player.id;
              return (
                <div
                  key={player.id}
                  className={`min-w-[148px] rounded-xl border-2 p-2 shadow sm:min-w-0 ${
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
                      {!player.alive && (
                        <motion.span
                          initial={{ scale: 0.6, rotate: -8 }}
                          animate={{ scale: [1, 1.18, 1], rotate: [0, -4, 4, 0] }}
                          transition={{ duration: 0.7, repeat: 3 }}
                          className="shrink-0 rounded-full bg-cherry px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow"
                        >
                          BOOM
                        </motion.span>
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
              <div className="min-w-[148px] rounded-xl border-2 border-dashed border-stone-500 bg-white/50 p-2 text-sm font-black text-stone-600 sm:min-w-0">
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
                  {compactLog(state?.log ?? []).map((line, index) => (
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
            <div className="grid min-h-0 grid-cols-1 items-start gap-2 pb-28 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(190px,250px)] lg:pb-32">
              <div className="relative z-10 flex w-full justify-center overflow-visible px-2 py-3 sm:px-4 sm:py-5">
                <div className="grid w-full max-w-2xl grid-cols-2 items-start gap-4 overflow-visible sm:gap-8">
                  <div className="relative z-10 flex min-h-[260px] justify-center overflow-visible pt-1 sm:min-h-[330px] sm:pt-2">
                    <DrawPileDeck
                      count={state?.drawPileCount ?? 0}
                      disabled={isBusy || !isMyTurn || !!state?.actionPrompt || blockTableActions}
                      onDraw={handleDeckDraw}
                      dangerPulse={mustDefuse}
                      shuffleWiggle={Boolean(visibleInsight?.title?.toLowerCase().includes("xào"))}
                      animMode={deckAnim}
                    />
                  </div>

                  <div className="aspect-[5/7] w-full max-w-[132px] justify-self-center rounded-2xl border-[3px] border-dashed border-felt/50 bg-cream/80 p-1.5 shadow-lift backdrop-blur-sm sm:max-w-[200px] sm:justify-self-end sm:p-2">
                    {state?.discardTop ? (
                      <CardView cardId={state.discardTop} density="compact" className="w-full h-full shadow-none" onClick={() => setDetailCardId(state.discardTop ?? null)} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                        Xấp bỏ
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <aside className="grid gap-2 rounded-2xl border-2 border-felt/90 bg-white/88 p-3 shadow-lift backdrop-blur-sm sm:p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-600">Hành động</p>
                {pendingCard ? (
                  <div className="grid gap-2 rounded-xl border-2 border-cherry/50 bg-amber-50 p-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-20 shrink-0">
                        <CardView cardId={pendingCard.id} density="mini" className="shadow-none" onClick={() => setDetailCardId(pendingCard.id)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{pendingCard.title}</p>
                        <p className="line-clamp-3 text-[11px] font-semibold text-stone-700">{actionDescription(pendingCard.id)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-yellow-200 px-3 py-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em]">Chờ Nope</p>
                        <p className="text-3xl font-black leading-none text-cherry">{nopeSeconds}s</p>
                      </div>
                      <motion.button
                        disabled={!nopeCard || isBusy}
                        onClick={() => runAction({ action: "nope", playerId, cardInstanceId: nopeCard })}
                        whileTap={{ scale: 0.95 }}
                        className="h-12 rounded-xl bg-cherry px-5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lift disabled:opacity-40"
                      >
                        🚫 Dùng Nope
                      </motion.button>
                    </div>
                    {!nopeCard && (
                      <p className="text-[10px] font-bold text-stone-600">Bạn không có lá Nope trên tay.</p>
                    )}
                  </div>
                ) : visibleInsight ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black">{visibleInsight.title}</p>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-900">
                        {insightSeconds}s
                      </span>
                    </div>
                    {visibleInsight.message && <p className="text-xs font-bold text-stone-700">{visibleInsight.message}</p>}
                    {visibleInsight.cards.length > 0 && (
                      <p className="text-[10px] font-bold text-stone-500">Bấm “Đóng” ở popup nếu không muốn xem nữa.</p>
                    )}
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
            {recentExplosion?.eliminated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: [1, 1.06, 1] }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-[60] grid place-items-center bg-cherry/25 px-4 backdrop-blur-[1px]"
              >
                <div className="max-w-sm rounded-3xl border-4 border-cherry bg-parchment p-6 text-center shadow-card">
                  <p className="text-5xl font-black text-cherry">BOOM!</p>
                  <p className="mt-3 text-lg font-black text-ink">{recentExplosion.playerName} đã bị loại</p>
                  <p className="mt-2 text-sm font-bold text-stone-700">Người chơi không còn Gỡ Bom/Zombie Kitten nên Mèo Nổ phát nổ.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isPlaying &&
              ((mustDefuse && !defuseModalDismissed) ||
                mustPickCatSteal ||
                mustBury ||
                mustShuffle ||
                mustConfirmShare ||
                (mustConfirmAlter && alterOrder.length > 0) ||
                (visibleInsight && visibleInsight.cards.length > 0)) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 grid place-items-center bg-ink/35 px-3 py-4 backdrop-blur-[2px]"
              >
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 24, scale: 0.97 }}
                  className="pointer-events-auto w-[min(94vw,760px)] max-h-[min(82vh,620px)] overflow-y-auto rounded-2xl border-4 border-felt/90 bg-parchment p-4 shadow-card"
                >
                {visibleInsight && !mustConfirmAlter && !mustConfirmShare && !mustBury && !mustShuffle && !mustDefuse && !mustPickCatSteal && (
                  <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-900">
                      Tự đóng sau {insightSeconds}s
                    </p>
                    <button
                      type="button"
                      onClick={() => setDismissedInsightKey(insightKey)}
                      className="h-9 rounded-lg bg-felt px-4 text-xs font-black uppercase tracking-[0.12em] text-parchment shadow"
                    >
                      Đóng
                    </button>
                  </div>
                )}
                {mustPickCatSteal && state?.pendingCatSteal?.type === "pick" ? (
                  <>
                    <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-amber-900">Combo 2 mèo</p>
                    <p className="mt-1 text-center text-sm font-bold text-stone-800">
                      Chọn <span className="text-cherry">đúng 1 lá</span> từ tay{" "}
                      <span className="font-black">{state.pendingCatSteal.targetName}</span>
                      <span className="ml-1 text-[11px] font-bold text-stone-600">— bài đối phương đang úp, bạn không nhìn thấy mặt bài.</span>
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-3">
                      {state.pendingCatSteal.cards.map((c, idx) => (
                        <button
                          key={c.instanceId}
                          type="button"
                          disabled={isBusy}
                          onClick={() => confirmCatStealPick(c.instanceId)}
                          className="rounded-lg border-2 border-amber-700 bg-emerald-900 p-1 shadow transition hover:-translate-y-1 hover:ring-2 hover:ring-amber-500 disabled:opacity-50"
                        >
                          <div className="relative w-[88px] sm:w-24">
                            <CardView cardId="exploding-kitten" density="mini" faceDown className="shadow-none" />
                            <span className="pointer-events-none absolute inset-x-0 bottom-1 mx-auto w-fit rounded-full bg-amber-200 px-2 py-0.5 text-[9px] font-black text-amber-950">
                              #{idx + 1}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : waitCatStealVictim && state?.pendingCatSteal?.type === "wait_pick" ? (
                  <>
                    <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-amber-900">Đối phương đang chọn bài</p>
                    <p className="mt-1 text-center text-sm font-bold text-stone-800">
                      <span className="font-black">{state.pendingCatSteal.stealerName}</span> sắp lấy 1 lá ngẫu nhiên từ tay bạn ({state.pendingCatSteal.cardCount} lá).
                    </p>
                    <p className="mt-1 text-center text-[11px] font-semibold text-stone-600">
                      Bạn có thể bấm nút bên dưới để xáo lại tay bài, làm khó người chọn.
                    </p>
                    <div className="mt-3 flex justify-center">
                      <button
                        type="button"
                        disabled={isBusy || (me?.handCount ?? 0) <= 1}
                        onClick={() => runAction({ action: "shuffleMyHand", playerId })}
                        className="rounded-md bg-emerald-700 px-5 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow disabled:opacity-50"
                      >
                        🔀 Xáo bài trên tay
                      </button>
                    </div>
                  </>
                ) : mustDefuse ? (
                  <>
                    <div className="flex justify-between items-center border-b border-stone-200 pb-2 mb-3">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-cherry">
                        Mèo Nổ!
                      </p>
                      {(state?.players.filter(p => p.alive).length ?? 0) >= 2 && (
                        <button
                          type="button"
                          onClick={() => setDefuseModalDismissed(true)}
                          className="rounded bg-stone-200 hover:bg-stone-300 px-2 py-1 text-[10px] font-black text-stone-700"
                        >
                          Ẩn giao diện
                        </button>
                      )}
                    </div>
                    <div className="mt-2 flex justify-center">
                      <CardView cardId="exploding-kitten" density="compact" className="max-w-[200px] shadow-lg ring-4 ring-cherry" onClick={() => setDetailCardId("exploding-kitten")} />
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
                        onClick={() => setDetailCardId(state.pendingBury?.cardBaseId ?? "shuffle")}
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
                  <div className="grid place-items-center gap-4 py-4">
                    <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-fuchsia-900">Xào Bài</p>
                    <div className="w-24">
                      <CardView cardId="shuffle" density="mini" className="shadow-none" onClick={() => setDetailCardId("shuffle")} />
                    </div>
                    <p className="text-center text-sm font-bold text-stone-800">
                      Bấm nút bên dưới để trộn ngẫu nhiên toàn bộ xấp rút.
                    </p>
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
                      🔀 Trộn ngay
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
                ) : visibleInsight ? (
                  <>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cherry">{visibleInsight.title}</p>
                    {visibleInsight.message && <p className="text-xs font-bold text-stone-600">{visibleInsight.message}</p>}
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
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {visibleInsight.cards.map((cardId, index) => (
                          <div key={`${cardId}-${index}`} className="rounded-xl border-2 border-cherry/70 bg-white p-2 shadow-lift">
                            <p className="mb-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-stone-500">
                              Lá {index + 1}
                            </p>
                            <CardView
                              cardId={cardId}
                              density="mini"
                              className="mx-auto w-28 shrink-0 shadow-none"
                              onClick={() => setDetailCardId(cardId)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {mustDefuse && defuseModalDismissed && (
            <div className="fixed bottom-32 right-4 z-40">
              <button
                type="button"
                onClick={() => setDefuseModalDismissed(false)}
                className="flex items-center gap-2 rounded-full border-4 border-cherry bg-amber-100 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-cherry shadow-card ring-2 ring-cherry/30 animate-bounce"
              >
                💥 Gỡ Bom Mèo Nổ
              </button>
            </div>
          )}
        </div>

        <footer className="sticky bottom-2 z-30 grid min-h-0 gap-2 rounded-2xl border-2 border-felt/90 bg-white/95 p-2.5 shadow-lift backdrop-blur-md sm:p-3 lg:relative lg:bottom-auto lg:z-20">
          {error && <p className="rounded-md bg-red-900 px-3 py-2 text-xs font-bold text-white">{error}</p>}
          {!hasGameState ? (
            <div className="text-xs font-bold text-ink/60">Đang tải dữ liệu phòng…</div>
          ) : isPlaying ? (
            <div>
              <p className="mb-1 flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-stone-700">
                <span>Tay bài của bạn ({me?.handCount ?? 0})</span>
                {isMyTurn && <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] text-white">Đến lượt</span>}
              </p>
              <div className="mb-2 grid gap-1.5 text-[11px] font-bold text-stone-700 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-amber-100 px-2 py-1 font-black text-amber-900">
                    Combo mèo {selectedCatCards.length}/2
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-1 font-bold text-ink">
                    Mục tiêu: {aliveTargets.find((player) => player.id === targetPlayerId)?.name ?? "chưa có"}
                  </span>
                </div>
                <button
                  disabled={isBusy || !isMyTurn || !!state?.actionPrompt || blockTableActions || selectedCatCards.length !== 2 || !targetPlayerId}
                  onClick={playSelectedCatCombo}
                  className="h-9 w-full shrink-0 rounded-xl bg-amber-700 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow disabled:opacity-50 sm:h-8 sm:w-auto"
                >
                  Bốc 1 lá tay địch
                </button>
              </div>
              <div className="grid max-h-[34vh] min-h-[140px] grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5 overflow-y-auto pr-1 sm:max-h-[28vh] sm:grid-cols-[repeat(auto-fill,minmax(108px,1fr))] sm:gap-2">
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
                      <div className="relative">
                        <CardView cardId={cardId} density="mini" className="shadow-sm" />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailCardId(cardId);
                          }}
                          className="absolute right-1 top-1 rounded-full border border-ink/20 bg-white/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-ink shadow focus:outline-none focus:ring-2 focus:ring-cherry-glow"
                          aria-label={`Xem chi tiết lá bài ${getCardData(cardId)?.title ?? cardId}`}
                        >
                          Xem
                        </button>
                      </div>
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
            <details className="rounded-xl border border-stone-200 bg-stone-50/80 px-2 py-1 text-[11px] font-semibold text-stone-700 sm:open:block lg:open:block">
              <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em] text-stone-500 marker:content-none [&::-webkit-details-marker]:hidden">
                Nhật ký gần đây
              </summary>
              <div className="mt-1 grid max-h-20 gap-1 overflow-y-auto sm:grid-cols-2">
                {compactLog(state?.log ?? []).slice(-6).map((line, index) => (
                  <p key={`${line}-${index}`} className="truncate">{line}</p>
                ))}
              </div>
            </details>
          )}
        </footer>
        <CardDetailModal cardId={detailCardId} onClose={() => setDetailCardId(null)} />
      </section>
    </main>
  );
}
