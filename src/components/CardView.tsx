"use client";

import { getCardData } from "@/data/cardsData";

export interface CardViewProps {
  cardId: string;
  className?: string;
  density?: "normal" | "compact" | "mini";
}

const defaultStyle = {
  frame: "from-stone-900 via-stone-500 to-amber-200",
  badge: "bg-stone-950 text-stone-50",
};

const typeStyles = {
  EXPLODING_KITTEN: { frame: "from-red-700 via-orange-500 to-amber-300", badge: "bg-red-950 text-red-50" },
  IMPLODING_KITTEN: { frame: "from-zinc-950 via-purple-900 to-red-400", badge: "bg-zinc-950 text-red-50" },
  DEFUSE: { frame: "from-emerald-700 via-teal-400 to-lime-200", badge: "bg-emerald-950 text-emerald-50" },
  ATTACK: { frame: "from-zinc-950 via-red-700 to-orange-300", badge: "bg-zinc-950 text-orange-100" },
  TARGETED_ATTACK: { frame: "from-red-950 via-red-700 to-yellow-300", badge: "bg-red-950 text-yellow-50" },
  PERSONAL_ATTACK: { frame: "from-orange-950 via-orange-600 to-yellow-200", badge: "bg-orange-950 text-orange-50" },
  SKIP: { frame: "from-sky-800 via-cyan-500 to-yellow-100", badge: "bg-sky-950 text-sky-50" },
  SUPER_SKIP: { frame: "from-cyan-950 via-sky-500 to-lime-200", badge: "bg-cyan-950 text-cyan-50" },
  REVERSE: { frame: "from-teal-900 via-emerald-500 to-yellow-200", badge: "bg-teal-950 text-teal-50" },
  SHUFFLE: { frame: "from-fuchsia-800 via-rose-500 to-yellow-200", badge: "bg-fuchsia-950 text-fuchsia-50" },
  SEE_THE_FUTURE: { frame: "from-indigo-900 via-violet-600 to-cyan-200", badge: "bg-indigo-950 text-indigo-50" },
  ALTER_THE_FUTURE: { frame: "from-violet-950 via-fuchsia-600 to-amber-200", badge: "bg-violet-950 text-violet-50" },
  SHARE_THE_FUTURE: { frame: "from-blue-950 via-sky-500 to-rose-200", badge: "bg-blue-950 text-blue-50" },
  DRAW_FROM_BOTTOM: { frame: "from-stone-900 via-lime-700 to-amber-200", badge: "bg-lime-950 text-lime-50" },
  FAVOR: { frame: "from-pink-700 via-rose-400 to-amber-100", badge: "bg-pink-950 text-pink-50" },
  NOPE: { frame: "from-stone-950 via-stone-700 to-red-300", badge: "bg-stone-950 text-stone-50" },
  CAT: { frame: "from-amber-700 via-yellow-300 to-cyan-200", badge: "bg-amber-950 text-amber-50" },
  FERAL_CAT: { frame: "from-yellow-950 via-amber-500 to-emerald-200", badge: "bg-yellow-950 text-yellow-50" },
  STREAKING_KITTEN: { frame: "from-rose-800 via-yellow-400 to-cyan-200", badge: "bg-rose-950 text-rose-50" },
  CATOMIC_BOMB: { frame: "from-red-950 via-yellow-500 to-lime-300", badge: "bg-red-950 text-yellow-50" },
  SWAP_TOP_BOTTOM: { frame: "from-slate-900 via-cyan-500 to-orange-200", badge: "bg-slate-950 text-slate-50" },
  GARBAGE_COLLECTION: { frame: "from-green-950 via-stone-500 to-yellow-200", badge: "bg-green-950 text-green-50" },
  MARK: { frame: "from-zinc-900 via-pink-500 to-yellow-100", badge: "bg-zinc-950 text-pink-50" },
  CURSE_OF_CAT_BUTT: { frame: "from-neutral-950 via-amber-700 to-pink-200", badge: "bg-neutral-950 text-amber-50" },
  BARKING_KITTEN: { frame: "from-orange-900 via-red-500 to-sky-200", badge: "bg-orange-950 text-orange-50" },
  TOWER_OF_POWER: { frame: "from-yellow-800 via-amber-300 to-sky-200", badge: "bg-yellow-950 text-yellow-50" },
  BURY: { frame: "from-stone-950 via-amber-800 to-lime-200", badge: "bg-stone-950 text-stone-50" },
  ILL_TAKE_THAT: { frame: "from-blue-950 via-indigo-600 to-yellow-200", badge: "bg-blue-950 text-blue-50" },
} as const;

const densityClass = {
  normal: {
    article: "min-h-[360px]",
    header: "px-4 py-3",
    title: "text-2xl",
    image: "max-h-44",
    body: "px-4 py-4 text-sm",
    showDescription: true,
  },
  compact: {
    article: "min-h-[220px]",
    header: "px-3 py-2",
    title: "text-base",
    image: "max-h-24",
    body: "px-3 py-2 text-xs",
    showDescription: true,
  },
  mini: {
    article: "min-h-[150px]",
    header: "px-2 py-2",
    title: "text-sm",
    image: "max-h-16",
    body: "hidden",
    showDescription: false,
  },
};

export function CardView({ cardId, className = "", density = "normal" }: CardViewProps) {
  const card = getCardData(cardId);
  const densityStyle = densityClass[density];

  if (!card) {
    return (
      <article
        className={`flex aspect-[5/7] ${densityStyle.article} flex-col justify-between rounded-lg border-4 border-dashed border-stone-500 bg-stone-100 p-4 text-stone-900 shadow-card ${className}`}
      >
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
            Không tìm thấy
          </p>
          <h2 className="mt-3 text-xl font-black">Lá bài lạ</h2>
        </div>
        <p className="rounded-md bg-white/75 p-3 text-xs font-semibold">
          Không có dữ liệu cho cardId: {cardId}
        </p>
      </article>
    );
  }

  const style = typeStyles[card.type] ?? defaultStyle;
  const imagePath = `/assets/cards/${card.id}.webp`;

  return (
    <article
      className={`group relative flex aspect-[5/7] ${densityStyle.article} overflow-hidden rounded-lg bg-gradient-to-br ${style.frame} p-2 shadow-card transition duration-300 hover:-translate-y-1 hover:rotate-1 ${className}`}
      aria-label={`${card.title}: ${card.description}`}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-md border-2 border-black/60 bg-[#fff7df]">
        <div className={`flex items-start justify-between gap-2 border-b-2 border-black/70 bg-white/80 ${densityStyle.header}`}>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-stone-600">
              {card.expansion}
            </p>
            <h2 className={`mt-1 line-clamp-2 font-black leading-none text-stone-950 ${densityStyle.title}`}>
              {card.title}
            </h2>
          </div>
          {density !== "mini" && (
            <span
              className={`shrink-0 rounded px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${style.badge}`}
            >
              {card.type.replaceAll("_", " ")}
            </span>
          )}
        </div>

        <div className="relative flex flex-1 items-center justify-center px-3 py-3">
          <div className="absolute inset-3 rounded-full border-4 border-dotted border-black/10" />
          <img
            src={imagePath}
            alt=""
            className={`relative z-10 w-full object-contain drop-shadow-[0_14px_14px_rgba(0,0,0,0.22)] transition duration-300 group-hover:scale-105 ${densityStyle.image}`}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>

        {densityStyle.showDescription && (
          <div className={`border-t-2 border-black/70 bg-white/85 ${densityStyle.body}`}>
            <p className="line-clamp-3 font-bold leading-5 text-stone-900">
              {card.description}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
