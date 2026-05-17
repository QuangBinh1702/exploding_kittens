"use client";

import { AnimatePresence, motion } from "framer-motion";

export type DrawPileAnimMode = "idle" | "fromTop" | "fromBottom";

function DeckGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <title>Xấp bài</title>
      <rect x="10" y="14" width="28" height="22" rx="3" className="stroke-amber-200/90" strokeWidth="2" fill="url(#deckg1)" />
      <rect x="8" y="10" width="28" height="22" rx="3" className="stroke-amber-100/70" strokeWidth="1.5" fill="url(#deckg2)" />
      <rect x="6" y="6" width="28" height="22" rx="3" className="stroke-white/40" strokeWidth="1.5" fill="url(#deckg3)" />
      <defs>
        <linearGradient id="deckg1" x1="10" y1="14" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e293b" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="deckg2" x1="8" y1="10" x2="36" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#334155" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="deckg3" x1="6" y1="6" x2="34" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#475569" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ArrowDownBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border-2 border-lime-300/80 bg-lime-950/90 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-lime-100 shadow ${className}`}
      title="Đáy xấp"
    >
      <span aria-hidden className="mr-0.5 text-[11px]">
        ↓
      </span>
      Đáy
    </span>
  );
}

function ArrowUpBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border-2 border-amber-300/80 bg-amber-950/90 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 shadow ${className}`}
      title="Đỉnh xấp"
    >
      <span aria-hidden className="mr-0.5 text-[11px]">
        ↑
      </span>
      Đỉnh
    </span>
  );
}

export interface DrawPileDeckProps {
  count: number;
  disabled: boolean;
  onDraw: () => void;
  dangerPulse: boolean;
  shuffleWiggle: boolean;
  animMode: DrawPileAnimMode;
}

export function DrawPileDeck({ count, disabled, onDraw, dangerPulse, shuffleWiggle, animMode }: DrawPileDeckProps) {
  return (
    <div className="relative flex w-full max-w-[200px] flex-col items-center gap-2 overflow-visible [perspective:900px]">
      <div className="flex w-full items-center justify-between gap-1 px-0.5">
        <ArrowUpBadge />
        <ArrowDownBadge />
      </div>

      <motion.div
        className="relative w-full"
        initial={false}
        animate={
          animMode === "fromBottom"
            ? { rotateX: [0, 14, 10, 0], y: [0, -6, -2, 0] }
            : animMode === "fromTop"
              ? { rotateX: [0, -6, 0], y: [0, -10, 0] }
              : dangerPulse
                ? { scale: [1, 1.06, 1], boxShadow: ["0 0 0 0 rgba(220,38,38,0)", "0 0 0 14px rgba(220,38,38,0.28)", "0 0 0 0 rgba(220,38,38,0)"] }
                : shuffleWiggle
                  ? { rotate: [0, -4, 4, -2, 2, 0] }
                  : { rotateX: 0, y: 0, scale: 1, boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
        }
        transition={{
          duration: animMode === "fromBottom" ? 0.95 : animMode === "fromTop" ? 0.75 : dangerPulse ? 1.1 : shuffleWiggle ? 0.85 : 0.35,
          repeat: dangerPulse ? Infinity : shuffleWiggle ? Infinity : 0,
          ease: animMode === "idle" ? "easeOut" : [0.22, 1, 0.36, 1],
        }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* stacked backs */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="absolute aspect-[5/7] w-[88%] rounded-xl border-2 border-black/30 bg-gradient-to-br from-slate-700 via-slate-900 to-black shadow-lg"
            style={{ transform: "translate(6px, 10px) rotate(-2deg)", zIndex: 0 }}
          />
          <div
            className="absolute aspect-[5/7] w-[88%] rounded-xl border-2 border-black/25 bg-gradient-to-br from-slate-600 via-indigo-950 to-slate-900 shadow-md"
            style={{ transform: "translate(3px, 5px) rotate(1.5deg)", zIndex: 1 }}
          />
          <div
            className="absolute aspect-[5/7] w-[88%] rounded-xl border-2 border-black/20 bg-gradient-to-br from-slate-500 via-slate-800 to-slate-950 opacity-90 shadow"
            style={{ transform: "translate(-2px, 2px) rotate(-1deg)", zIndex: 2 }}
          />
        </div>

        <motion.button
          type="button"
          initial={false}
          disabled={disabled}
          onClick={onDraw}
          whileHover={disabled ? undefined : { y: -3, scale: 1.02 }}
          whileTap={disabled ? undefined : { scale: 0.97 }}
          className="relative z-30 flex aspect-[5/7] w-full flex-col justify-between overflow-hidden rounded-2xl border-[3px] border-amber-200/90 bg-gradient-to-br from-slate-900 via-indigo-950 to-black p-3 text-left text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/15 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(251,191,36,0.12),transparent_55%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-12deg,transparent,transparent_6px,rgba(255,255,255,0.35)_6px,rgba(255,255,255,0.35)_7px)]" />

          <div className="pointer-events-none relative flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/95">Xấp rút</p>
              <DeckGlyph className="h-9 w-9 opacity-95 drop-shadow-md" />
            </div>
            <span className="rounded-lg bg-black/35 px-2 py-1 text-[10px] font-bold text-amber-100/90 ring-1 ring-amber-400/30">
              {count} lá
            </span>
          </div>

          <div className="pointer-events-none relative mt-auto">
            <p className="text-4xl font-black leading-none tracking-tight text-white drop-shadow-sm">{count}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-300">Bấm để rút từ đỉnh</p>
          </div>
        </motion.button>

        <AnimatePresence>
          {animMode === "fromTop" && (
              <motion.div
                key="fly-top"
              initial={{ opacity: 0.95, y: 8, scale: 0.92, rotate: -3 }}
              animate={{ opacity: 0, y: -72, scale: 0.82, rotate: 4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute left-1/2 top-[18%] z-20 aspect-[5/7] w-[62%] -translate-x-1/2 rounded-xl border-2 border-amber-200/80 bg-gradient-to-br from-slate-700 via-slate-900 to-black shadow-2xl ring-2 ring-amber-400/40"
            />
          )}
          {animMode === "fromBottom" && (
              <motion.div
                key="fly-bottom"
              initial={{ opacity: 0, y: "78%", scale: 0.75, rotate: 6 }}
              animate={{ opacity: [0, 1, 0.92, 0], y: ["78%", "12%", "8%", "-28%"], scale: [0.75, 1, 1, 0.88], rotate: [6, 2, -2, -6] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.95, ease: [0.19, 1, 0.22, 1] }}
              className="pointer-events-none absolute left-1/2 top-0 z-20 aspect-[5/7] w-[64%] -translate-x-1/2 rounded-xl border-2 border-lime-300/90 bg-gradient-to-br from-lime-950 via-slate-900 to-black shadow-2xl ring-2 ring-lime-400/50"
            />
          )}
        </AnimatePresence>
      </motion.div>

      <p className="max-w-[11rem] text-center text-[10px] font-bold leading-snug text-stone-600">
        Lá &quot;Rút từ đáy&quot; sẽ nhấc xấp và lấy từ <span className="font-black text-lime-800">đáy</span> — rút thường lấy từ{" "}
        <span className="font-black text-amber-800">đỉnh</span>.
      </p>
    </div>
  );
}
