"use client";

import { useEffect } from "react";
import { CardView } from "@/components/CardView";
import { getCardData } from "@/data/cardsData";

const MAX_PLAYERS = 8;

function displayedQuantity(cardId: string, catalogCopies: number) {
  if (cardId === "exploding-kitten" || cardId === "imploding-kitten") {
    return { label: "Tối đa trong ván 8 người", count: MAX_PLAYERS - 1 };
  }
  if (cardId === "defuse") {
    return { label: "Tối đa trong ván 8 người", count: MAX_PLAYERS + 1 };
  }
  return { label: "Số lá trong bộ gốc", count: catalogCopies };
}

interface CardDetailModalProps {
  cardId: string | null;
  onClose: () => void;
}

export function CardDetailModal({ cardId, onClose }: CardDetailModalProps) {
  const card = cardId ? getCardData(cardId) : undefined;

  useEffect(() => {
    if (!cardId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cardId, onClose]);

  if (!cardId || !card) return null;

  const quantity = displayedQuantity(card.id, card.copies);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/75 px-3 py-5 backdrop-blur-md sm:px-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết lá bài ${card.title}`}
        className="relative grid w-[min(100%,980px)] max-h-[min(92vh,760px)] overflow-hidden rounded-[2rem] border-[3px] border-amber-300/80 bg-[radial-gradient(circle_at_top_left,rgba(252,211,77,0.28),transparent_36%),linear-gradient(135deg,#fff7df_0%,#f8e5b8_45%,#143d32_46%,#143d32_100%)] shadow-[0_30px_90px_rgba(8,20,16,0.55)] lg:grid-cols-[minmax(250px,360px)_1fr]"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-cherry-glow/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-amber-300/25 blur-2xl" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết lá bài"
          className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full border-2 border-ink/20 bg-parchment/95 text-xl font-black text-ink shadow-lift transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-cherry-glow/45"
        >
          ×
        </button>

        <div className="relative z-10 flex items-center justify-center bg-felt/10 p-5 sm:p-8 lg:bg-transparent">
          <div className="w-[min(76vw,300px)] rotate-[-2deg] transition hover:rotate-0 sm:w-[300px]">
            <CardView cardId={card.id} density="normal" className="shadow-[0_24px_55px_rgba(0,0,0,0.38)] ring-4 ring-white/45" />
          </div>
        </div>

        <div className="relative z-10 min-h-0 overflow-y-auto border-t-2 border-amber-300/50 bg-parchment/96 p-6 text-ink lg:border-l-2 lg:border-t-0 lg:bg-parchment/92 lg:p-8">
          <p className="w-fit rounded-full border border-felt/20 bg-felt/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-felt">
            {card.expansion} · {card.nopeable ? "Có thể Nope" : "Không thể Nope"}
          </p>
          <h2 className="font-display mt-4 text-4xl font-black leading-none tracking-tight text-ink sm:text-5xl">
            {card.title}
          </h2>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-cherry">
            {card.type.replaceAll("_", " ")}
          </p>

          <div className="mt-6 rounded-2xl border-2 border-felt/30 bg-white/78 p-5 shadow-inner">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-felt/70">Chức năng</p>
            <p className="mt-3 text-lg font-black leading-relaxed text-stone-950 sm:text-xl">
              {card.description}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-300/70 bg-amber-100/75 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900">{quantity.label}</p>
              <p className="mt-1 text-3xl font-black text-amber-950">{quantity.count}</p>
            </div>
            <div className="rounded-2xl border border-cherry/30 bg-cherry/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cherry">Loại hiệu ứng</p>
              <p className="mt-2 text-sm font-black leading-tight text-ink">{card.nopeable ? "Có thể bị chặn bởi Nope" : "Hiệu ứng đặc biệt / không bị Nope"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 h-12 w-full rounded-2xl bg-felt text-sm font-black uppercase tracking-[0.16em] text-parchment shadow-lift transition hover:-translate-y-0.5 hover:bg-ink focus:outline-none focus:ring-4 focus:ring-cherry-glow/45"
          >
            Đóng
          </button>
        </div>
      </section>
    </div>
  );
}
