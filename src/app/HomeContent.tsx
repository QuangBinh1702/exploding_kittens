"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CardDetailModal } from "@/components/CardDetailModal";
import { CardView } from "@/components/CardView";
import { LobbyForm } from "@/components/LobbyForm";
import { cardsData, type CardExpansion } from "@/data/cardsData";

const expansionLabels: Record<CardExpansion | "ALL", string> = {
  ALL: "All",
  BASE: "Base",
  IMPLODING: "Imploding",
  STREAKING: "Streaking",
  BARKING: "Barking",
  ZOMBIE: "Zombie",
  GOOD_VS_EVIL: "Good vs Evil",
  RECIPES: "Recipes",
};

export default function HomeContent() {
  const [activeExpansion, setActiveExpansion] = useState<CardExpansion | "ALL">("ALL");
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const expansionCounts = useMemo(() => {
    const counts = new Map<CardExpansion | "ALL", number>([["ALL", cardsData.length]]);
    for (const card of cardsData) counts.set(card.expansion, (counts.get(card.expansion) ?? 0) + 1);
    return counts;
  }, []);
  const expansionOptions = useMemo(
    () =>
      (["ALL", ...Array.from(new Set(cardsData.map((card) => card.expansion)))] as Array<CardExpansion | "ALL">)
        .filter((expansion) => (expansionCounts.get(expansion) ?? 0) > 0),
    [expansionCounts],
  );
  const visibleCards = activeExpansion === "ALL" ? cardsData : cardsData.filter((card) => card.expansion === activeExpansion);

  return (
    <main className="relative z-10 min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute left-[8%] top-24 hidden h-40 w-40 rounded-full bg-cherry-glow/15 blur-3xl sm:block" />
      <div className="pointer-events-none absolute bottom-32 right-[5%] hidden h-48 w-48 rounded-full bg-felt-light/20 blur-3xl md:block" />

      <section className="mx-auto flex max-w-7xl flex-col gap-12 lg:gap-16">
        <header className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-12">
          <div className="relative overflow-hidden rounded-[2rem] border-2 border-felt bg-gradient-to-br from-parchment via-cream to-amber-100/50 p-8 shadow-card sm:p-10">
            <div
              className="pointer-events-none absolute -right-8 top-0 h-64 w-64 rotate-12 opacity-[0.07]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-45deg, #143d32 0px, #143d32 2px, transparent 2px, transparent 10px)",
              }}
            />
            <div className="flex items-center gap-4 mb-4">
              <Image src="/assets/logo.png" alt="Mèo Nổ Logo" width={64} height={64} priority className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]" />
              <div>
                <p className="animate-fade-up delay-[40ms] text-xs font-bold uppercase tracking-[0.28em] text-felt">
                  Exploding Kittens Online
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 mt-0.5">
                  Bản Tiếng Việt Cao Cấp
                </p>
              </div>
            </div>
            <h1 className="font-display animate-fade-up delay-[90ms] mt-4 text-balance-safe text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
              Tạo phòng chơi, tùy chỉnh bộ bài, và mời bạn bè vào thế giới hỗn loạn đầy kịch tính.
            </h1>
            <p className="animate-fade-up delay-[160ms] mt-5 max-w-xl text-base font-medium leading-relaxed text-ink/75">
              Tìm phòng trực tiếp, mật khẩu riêng tư, thiết lập từ 2–8 người chơi, tự do cấu hình số lượng bài và thêm bớt các bản mở rộng. Trong suốt quá trình chơi, mỗi người chơi chỉ có thể nhìn thấy bài trên tay của chính mình.
            </p>

            <details className="animate-fade-up delay-[200ms] group relative z-10 mt-8 max-w-xl rounded-2xl border-2 border-felt/25 bg-white/75 p-1 shadow-lift backdrop-blur-sm open:border-felt/40 open:bg-white/90 sm:mt-10">
              <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-felt transition-colors marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span>Luật chơi và Phân bố bộ bài</span>
                  <span className="rounded-full border border-felt/30 bg-felt/5 px-2.5 py-1 text-[10px] text-felt group-open:rotate-180 motion-safe:transition-transform">
                    ▼
                  </span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-felt/10 px-4 pb-4 pt-3 text-sm font-medium leading-relaxed text-ink/85">
                <p>
                  Với số lượng người chơi là <span className="font-bold text-ink">N</span>, chồng bài rút sẽ chứa chính xác{" "}
                  <span className="font-bold text-cherry">N − 1</span> lá bài Exploding Kitten. Mỗi người chơi sẽ bắt đầu ván đấu với{" "}
                  <span className="font-bold text-ink">1 Defuse + 4 lá bài</span>. Chủ phòng chơi có toàn quyền cấu hình số lượng bài rút theo ý muốn thay vì bị giới hạn như trước.
                </p>
                <p className="rounded-xl border border-cherry/25 bg-cherry/5 px-3 py-2.5 text-ink">
                  Các biến thể của lá <span className="font-bold">Alter the Future</span> là các lá bài riêng biệt: phiên bản <span className="font-bold">3x</span> cho phép sắp xếp lại 3 lá, phiên bản <span className="font-bold">5x</span> cho phép sắp xếp lại 5 lá, và phiên bản <span className="font-bold">Now</span> là phiên bản kích hoạt tức thì (hiện được xử lý như sắp xếp lại 3 lá bài trong trò chơi này).
                </p>
              </div>
            </details>
          </div>

          <div className="animate-fade-up delay-[220ms] relative hidden lg:flex h-full min-h-[340px] flex-col justify-between rounded-[2rem] border-2 border-felt/50 bg-felt p-8 text-parchment shadow-lift">
            <div className="flex flex-col items-center text-center">
              <span className="rounded-full bg-parchment/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-parchment/90 ring-1 ring-parchment/35">
                ● Trực tuyến 24/7
              </span>
              
              <div className="my-6 relative group">
                {/* Glow effect using theme cherry-glow */}
                <div className="absolute -inset-1.5 rounded-full bg-cherry-glow/30 blur-xl group-hover:opacity-75 transition duration-500 animate-pulse" />
                <Image
                  src="/assets/logo.png"
                  alt="Mèo Nổ Logo"
                  width={128}
                  height={128}
                  className="relative h-32 w-32 transform object-contain transition duration-500 hover:scale-105 hover:rotate-3"
                />
              </div>

              <h2 className="font-display text-2xl font-black tracking-tight text-parchment uppercase">
                Mèo Nổ Online
              </h2>
              <p className="mt-2 text-xs font-medium leading-relaxed text-parchment/75 max-w-[280px]">
                Hãy tạo phòng hoặc tham gia phòng chơi bên dưới để bắt đầu cuộc chiến Mèo Nổ đầy kịch tính cùng bạn bè!
              </p>
            </div>

            <button
              type="button"
              onClick={() => document.getElementById("lobby-section")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-6 w-full rounded-xl bg-cherry hover:bg-cherry/90 border border-cherry-glow/20 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-parchment shadow-[0_4px_12px_rgba(180,35,47,0.35)] transition duration-200 active:scale-[0.98]"
            >
              Bắt đầu chơi ngay ↓
            </button>
          </div>
        </header>

        <div className="animate-fade-up delay-[240ms] relative z-10" id="lobby-section">
          <LobbyForm />
        </div>

        <section className="animate-fade-up delay-[300ms] border-t-2 border-dashed border-felt/20 pt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-felt">Các lá bài hiện có</p>
              <h2 className="font-display mt-1 text-3xl font-semibold text-ink sm:text-4xl">
                {visibleCards.length}/{cardsData.length} lá bài
              </h2>
              <p className="mt-1 max-w-lg text-sm font-medium text-ink/65">
                Lọc theo bản mở rộng để xem chi tiết từng lá bài và chức năng của nó.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {expansionOptions.map((expansion) => (
              <button
                key={expansion}
                type="button"
                onClick={() => setActiveExpansion(expansion)}
                className={`min-h-10 rounded-xl border-2 border-felt/90 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                  activeExpansion === expansion
                    ? "bg-felt text-parchment shadow-inner"
                    : "bg-parchment text-ink hover:bg-cream"
                }`}
              >
                {expansionLabels[expansion] ?? expansion}
                <span className="ml-2 rounded bg-white/25 px-1.5 py-0.5">{expansionCounts.get(expansion) ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleCards.map((card) => (
              <CardView key={card.id} cardId={card.id} onClick={() => setDetailCardId(card.id)} />
            ))}
          </div>
        </section>
      </section>
      <CardDetailModal cardId={detailCardId} onClose={() => setDetailCardId(null)} />
    </main>
  );
}
