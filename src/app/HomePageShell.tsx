"use client";

import dynamic from "next/dynamic";

const HomeContent = dynamic(() => import("./HomeContent"), {
  ssr: false,
  loading: () => (
    <main className="relative z-10 min-h-screen px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center rounded-[2rem] border-2 border-dashed border-felt/30 bg-white/70 px-6 py-20 text-center shadow-inner backdrop-blur-sm">
        <p className="text-sm font-semibold text-ink/70">Đang tải giao diện…</p>
      </div>
    </main>
  ),
});

export default function HomePageShell() {
  return <HomeContent />;
}
