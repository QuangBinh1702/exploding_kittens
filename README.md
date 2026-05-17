# Mèo Nổ Online

Prototype Next.js App Router cho board game Mèo Nổ online nhiều người chơi.

## Chạy local

```powershell
npm install
npm run dev
```

Mở `http://localhost:3000`, nhập tên rồi tạo phòng hoặc xin vào một phòng đang có trong lobby. Phòng có thể đặt mật khẩu riêng, chọn số người tối đa và chọn bộ mở rộng.

Nếu chưa cấu hình Upstash Redis hoặc Pusher, app tự dùng in-memory fallback để test local. Khi deploy production, hãy cấu hình đủ biến trong `.env.example`.

## Test trước khi deploy

```powershell
npm run test
npm run typecheck
npm run build
```

## Kiến trúc chính

- `src/data/cardsData.ts`: toàn bộ tên, mô tả, type, expansion, số bản sao của thẻ.
- `public/assets/cards/*.webp`: ảnh minh họa không chứa chữ tiếng Việt.
- `src/components/CardView.tsx`: render thẻ bài bằng HTML/CSS + ảnh minh họa.
- `src/game-engine/`: pure functions cho chia bài, rút bài, đánh bài, Gỡ Bom, Mèo Nổ, lượt, Nope và preview tương lai.
- `src/app/api/games/[id]/route.ts`: API serverless, server là single source of truth, có Redis lock `SET NX`.
- `src/server/redisService.ts`: Upstash Redis + fallback local.
- `src/server/pusherService.ts`: broadcast `gameState:update`.
- `src/app/api/rooms/route.ts`: danh sách phòng, tạo phòng, cấu hình mật khẩu, số người và expansion.
- `src/app/room/[id]/page.tsx`: UI bàn chơi với animation, countdown Nope, timer lượt 30 giây, vào phòng theo ID và state đã che bài đối thủ.

## Deploy

1. Tạo Upstash Redis database và điền `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
2. Tạo Pusher Channels app và điền `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`.
3. Deploy lên Vercel hoặc server Node hỗ trợ Next.js.
4. Chạy `npm run build` trong CI trước khi phát hành.

## Giới hạn hiện tại

Bản này đã chơi được ở mức MVP nhiều người: lobby danh sách phòng, tạo phòng riêng có mật khẩu, nhập/xin vào phòng, cấu hình số người và expansion, server state, lock, realtime hook, polling fallback, animation và kiểm thử engine. Một số hiệu ứng mở rộng rất đặc thù như trao đổi bài theo lựa chọn hai phía, Tower of Power nâng cao, Barking Kitten nâng cao có data/UI nền tảng nhưng chưa mô phỏng đủ mọi biến thể luật bàn thật.
