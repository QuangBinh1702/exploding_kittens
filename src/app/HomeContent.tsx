"use client";

import { CardView } from "@/components/CardView";
import { LobbyForm } from "@/components/LobbyForm";
import { cardsData } from "@/data/cardsData";

export default function HomeContent() {
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
            <p className="animate-fade-up delay-[40ms] text-xs font-bold uppercase tracking-[0.28em] text-felt">
              Mèo Nổ Online
            </p>
            <h1 className="font-display animate-fade-up delay-[90ms] mt-4 text-balance-safe text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
              Tạo phòng, đặt mật khẩu, rồi cùng bạn bè khuấy đảo bàn bài.
            </h1>
            <p className="animate-fade-up delay-[160ms] mt-5 max-w-xl text-base font-medium leading-relaxed text-ink/75">
              Danh sách phòng đang mở, phòng riêng có mật khẩu, tối đa hai người mỗi phòng và các bộ mở rộng tùy
              chọn. Trong ván, mỗi người chỉ xem được bài trên tay của mình.
            </p>

            <details className="animate-fade-up delay-[200ms] group relative z-10 mt-8 max-w-xl rounded-2xl border-2 border-felt/25 bg-white/75 p-1 shadow-lift backdrop-blur-sm open:border-felt/40 open:bg-white/90 sm:mt-10">
              <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-felt transition-colors marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span>Bộ bài &amp; số lá theo số người</span>
                  <span className="rounded-full border border-felt/30 bg-felt/5 px-2.5 py-1 text-[10px] text-felt group-open:rotate-180 motion-safe:transition-transform">
                    ▼
                  </span>
                </span>
              </summary>
              <div className="space-y-3 border-t border-felt/10 px-4 pb-4 pt-3 text-sm font-medium leading-relaxed text-ink/85">
                <p>
                  Với <span className="font-bold text-ink">N</span> người: trong xấp rút có đúng{" "}
                  <span className="font-bold text-cherry">N − 1</span> lá{" "}
                  <span className="font-bold text-ink">Mèo Nổ</span>. Mỗi người nhận{" "}
                  <span className="font-bold text-ink">1 Gỡ Bom + 4 lá</span> khi chia (5 lá trên tay lúc đầu). Các lá
                  khác của bộ (kể cả Gỡ Bom chưa gắn tay) được trộn vào xấp theo bộ bài bạn chọn.
                </p>
                <ul className="list-inside list-disc space-y-1.5 pl-1 text-ink/80">
                  <li>
                    <span className="font-bold text-ink">Gỡ Bom:</span> luật gắn với người là{" "}
                    <span className="font-bold">N lá</span> — mỗi người 1 trên tay. Trò chơi web{" "}
                    <span className="font-bold">thêm đúng 1 lá Gỡ Bom</span> vào xấp rút để tăng may rủi / cơ hội lật
                    kèo (ngoài các lá Gỡ Bom còn lại của bộ bài trong xấp).
                  </li>
                  <li>
                    <span className="font-bold text-ink">Mèo Nổ:</span> luôn{" "}
                    <span className="font-bold text-cherry">N − 1</span> lá trong xấp (vd. 2 người → 1 Mèo Nổ; 3 người
                    → 2 Mèo Nổ).
                  </li>
                </ul>
                <ul className="list-inside list-disc space-y-1.5 pl-1 text-ink/80">
                  <li>
                    <span className="font-bold text-ink">2 người:</span> 1 Mèo Nổ trong xấp; mỗi người 5 lá ban đầu;
                    tổng lá phụ thuộc gói mở rộng.
                  </li>
                  <li>
                    <span className="font-bold text-ink">3 người</span> (nếu sau này hỗ trợ): 2 Mèo Nổ trong xấp; vẫn
                    mỗi người 1 Gỡ Bom + 4 lá ban đầu.
                  </li>
                </ul>
                <p className="rounded-xl border border-cherry/25 bg-cherry/5 px-3 py-2.5 text-ink">
                  <span className="font-bold text-cherry">Tóm tắt luật web:</span>{" "}
                  <span className="font-bold">Mèo Nổ = N − 1</span> trong xấp;{" "}
                  <span className="font-bold">Gỡ Bom = N trên tay + 1 lá thêm trong xấp</span> (cộng phần Gỡ Bom còn lại
                  của bộ bài).
                </p>
                <p className="text-xs font-semibold text-ink/55">
                  Nếu console báo lỗi hydration với thuộc tính lạ (
                  <code className="rounded-md bg-felt/10 px-1.5 py-0.5 font-mono text-[11px] text-felt">bis_skin_checked</code>
                  …): thường do tiện ích bảo mật (ví dụ Bitdefender) chèn vào DOM — tắt tiện ích hoặc dùng cửa sổ ẩn
                  danh. Trang chủ tải giao diện phía trình duyệt để tránh xung đột với HTML từ máy chủ.
                </p>
              </div>
            </details>
          </div>

          <div className="animate-fade-up delay-[220ms] relative hidden h-full min-h-[200px] rounded-[2rem] border-2 border-ink/90 bg-felt p-6 text-parchment shadow-lift lg:block">
            <p className="font-display text-3xl font-semibold leading-tight text-parchment/95">Sẵn sàng?</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-parchment/75">
              Một ván nhanh, hai người, đủ hỗn loạn. Kéo xuống để tạo phòng hoặc dán mã phòng.
            </p>
            <div className="absolute bottom-6 right-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-parchment/30 bg-cherry text-2xl shadow-lg">
              🐱
            </div>
          </div>
        </header>

        <div className="animate-fade-up delay-[240ms] relative z-10">
          <LobbyForm />
        </div>

        <section className="animate-fade-up delay-[300ms] border-t-2 border-dashed border-felt/20 pt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-felt">Bộ bài hiện có</p>
              <h2 className="font-display mt-1 text-3xl font-semibold text-ink sm:text-4xl">{cardsData.length} lá bài</h2>
              <p className="mt-1 max-w-lg text-sm font-medium text-ink/65">Xem trước họa tiết và tên từng lá trong bộ bạn đã bật.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cardsData.map((card) => (
              <CardView key={card.id} cardId={card.id} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
