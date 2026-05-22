# E2E Test Cases — Mèo Nổ Online

Bộ test case end-to-end cho ứng dụng Mèo Nổ Online (Next.js + Pusher + Upstash).
Chạy bằng Playwright MCP trên trình duyệt thật. Mỗi test có ảnh minh chứng được lưu trong `tests/evidence/`.

## Môi trường

- URL: `http://localhost:3000`
- Browser: Chromium (Playwright MCP)
- Backend: Next.js dev server, Upstash Redis + Pusher (theo `.env`)
- Ngày chạy: 2026-05-17

## Sơ đồ test

| ID    | Tên                                              | Loại         | Evidence                              |
|-------|--------------------------------------------------|--------------|---------------------------------------|
| TC-01 | Trang chủ tải thành công và hiện UI lobby        | Smoke        | `tc01-homepage.png`                   |
| TC-02 | Bộ bài hiển thị đầy đủ và lọc được theo expansion| UI/Filter    | `tc02-cards-all.png`, `tc02-cards-base.png` |
| TC-03 | Validation tên người chơi rỗng khi tạo phòng     | Negative     | `tc03-empty-name-error.png`           |
| TC-04 | Tạo phòng công khai thành công và chuyển vào room| Happy path   | `tc04-room-created.png`               |
| TC-05 | Tạo phòng riêng có mật khẩu, hiển thị badge      | Happy path   | `tc05-private-room.png`               |
| TC-06 | Lobby liệt kê phòng vừa tạo                       | Realtime     | `tc06-rooms-listed.png`               |
| TC-07 | Tìm kiếm phòng theo tên/ID                        | UI           | `tc07-search.png`                     |
| TC-08 | Validation mã phòng rỗng khi vào phòng có sẵn    | Negative     | `tc08-join-empty.png`                 |
| TC-09 | Vào phòng bằng mã không tồn tại — báo lỗi         | Negative     | `tc09-room-not-found.png`             |
| TC-10 | Vào phòng riêng sai mật khẩu — báo lỗi            | Negative     | `tc10-wrong-password.png`             |
| TC-11 | Toggle expansion (tắt rồi bật lại)                | UI           | `tc11-expansions.png`                 |
| TC-12 | Hai người chơi cùng vào một phòng (multi-tab)     | Realtime     | `tc12-two-players.png`                |
| TC-13 | API `/api/rooms` GET trả JSON hợp lệ              | API          | `tc13-api-rooms.png`                  |
| TC-14 | Bắt đầu ván bị disable khi chưa đủ 2 người       | Gameplay     | `tc14-start-disabled.png`             |
| TC-15 | Khách (không phải chủ phòng) không bắt đầu được  | Gameplay     | `tc15-guest-cannot-start.png`         |
| TC-16 | Bắt đầu ván — chuyển sang status PLAYING         | Gameplay     | `tc16-game-started.png`               |
| TC-17 | Rút bài ngoài lượt — server từ chối              | Negative     | `tc17-draw-out-of-turn.png`           |
| TC-18 | Rút bài đúng lượt — handCount tăng, lượt sang   | Gameplay     | `tc18-draw-card.png`, `tc18-guest-turn.png` |
| TC-19 | Sao chép ID phòng đổi nhãn nút                   | UI           | `tc19-copy-room-id.png`               |
| TC-20 | API validation: thiếu trường bắt buộc            | API          | `tc20-api-validation.png`             |
| TC-21 | Realtime sync giữa hai tab                        | Realtime     | `tc21-sync-host.png`, `tc21-sync-guest.png` |
| TC-22 | Người chơi rời phòng — connected=false           | Gameplay     | `tc22-guest-left.png`                 |
| TC-23 | Bài trên tay đối thủ bị che (server-side)        | Security     | `tc23-hidden-hand.png`                |

---

## TC-01 — Trang chủ tải thành công

**Tiền điều kiện:** Dev server đang chạy trên `http://localhost:3000`.

**Bước:**
1. Mở `http://localhost:3000`.
2. Quan sát tiêu đề "Mèo Nổ Online" và form tạo phòng / vào phòng.

**Kết quả mong đợi:**
- Không có lỗi 500.
- Hiển thị heading "Tạo phòng, đặt mật khẩu, rồi cùng bạn bè khuấy đảo bàn bài."
- Có nút "Tạo phòng" và "Vào phòng".

**Evidence:** `tests/evidence/tc01-homepage.png`

---

## TC-02 — Bộ bài hiển thị và filter theo expansion

**Bước:**
1. Cuộn xuống section "Bộ bài hiện có".
2. Đếm số card hiện ở chế độ "Tất cả".
3. Bấm filter "Cơ bản".
4. Kiểm tra số card giảm xuống.

**Kết quả mong đợi:** Tổng số card khớp với `cardsData.length`. Filter "Cơ bản" chỉ hiện card thuộc expansion BASE.

**Evidence:** `tc02-cards-all.png`, `tc02-cards-base.png`

---

## TC-03 — Validation tên người chơi rỗng

**Bước:**
1. Trong form tạo phòng, xóa trống ô "Tên người chơi".
2. Bấm "Tạo phòng".

**Kết quả mong đợi:** Hiện thông báo lỗi "Vui lòng nhập tên người chơi."; không điều hướng sang `/room/...`.

**Evidence:** `tc03-empty-name-error.png`

---

## TC-04 — Tạo phòng công khai thành công

**Bước:**
1. Nhập tên người chơi: `Tester01`.
2. Nhập tên phòng: `Phòng Test 04`.
3. Để trống mã phòng và mật khẩu.
4. Bấm "Tạo phòng".

**Kết quả mong đợi:** Trình duyệt điều hướng sang URL dạng `/room/<ID>?playerId=...&name=Tester01`. Hiển thị màn hình bàn chơi (chờ người chơi 2).

**Evidence:** `tc04-room-created.png`

---

## TC-05 — Tạo phòng riêng có mật khẩu

**Bước:**
1. Quay lại trang chủ.
2. Tên người chơi: `Owner05`. Tên phòng: `Phòng Riêng`. Mật khẩu: `secret123`.
3. Bấm "Tạo phòng".

**Kết quả mong đợi:** Vào được phòng. Khi quay lại lobby, phòng có badge "Riêng tư".

**Evidence:** `tc05-private-room.png`

---

## TC-06 — Lobby liệt kê phòng đã tạo

**Bước:**
1. Mở tab mới `http://localhost:3000`.
2. Đợi danh sách phòng tự refresh (mỗi 4s).

**Kết quả mong đợi:** Section "Phòng đang mở" hiển thị các phòng vừa tạo với mã ID, số người, expansion.

**Evidence:** `tc06-rooms-listed.png`

---

## TC-07 — Tìm phòng theo từ khóa

**Bước:**
1. Trong section "Phòng đang mở", gõ một phần tên phòng vào ô tìm kiếm.

**Kết quả mong đợi:** Danh sách lọc lại đúng phòng khớp.

**Evidence:** `tc07-search.png`

---

## TC-08 — Validation mã phòng rỗng

**Bước:**
1. Section "Vào phòng có sẵn", để trống ô mã phòng.
2. Bấm "Vào phòng".

**Kết quả mong đợi:** Hiện thông báo "Nhập mã phòng (ID) để vào." (nếu đã có tên), không điều hướng.

**Evidence:** `tc08-join-empty.png`

---

## TC-09 — Vào phòng không tồn tại

**Bước:**
1. Nhập mã phòng `NOEXIST123`.
2. Bấm "Vào phòng".

**Kết quả mong đợi:** Trang phòng hiển thị thông báo phòng không tồn tại / lỗi.

**Evidence:** `tc09-room-not-found.png`

---

## TC-10 — Vào phòng riêng sai mật khẩu

**Bước:**
1. Lấy ID phòng riêng từ TC-05.
2. Nhập mã phòng đó, mật khẩu sai (`wrong-pwd`).
3. Bấm "Vào phòng".

**Kết quả mong đợi:** Báo lỗi "Mật khẩu phòng không đúng." trên màn hình phòng.

**Evidence:** `tc10-wrong-password.png`

---

## TC-11 — Toggle expansion

**Bước:**
1. Bật/tắt nút "Mèo Sập" và quan sát styling đổi giữa active/inactive.
2. Tắt tất cả non-base, kiểm tra "Cơ bản" không thể tắt.

**Kết quả mong đợi:** UI phản hồi đúng. "Cơ bản" luôn còn lại.

**Evidence:** `tc11-expansions.png`

---

## TC-12 — Hai người vào cùng một phòng

**Bước:**
1. Tab A tạo phòng `MULTI-XX` không mật khẩu, copy mã phòng.
2. Tab B mở `http://localhost:3000`, dùng tên khác, vào bằng mã.

**Kết quả mong đợi:** Cả hai tab hiển thị phòng với hai người. Số "người đã kết nối" tăng lên.

**Evidence:** `tc12-two-players.png`

---

## TC-13 — API `/api/rooms` GET

**Bước:**
1. Trên Playwright, evaluate `fetch('/api/rooms').then(r => r.json())`.
2. Đảm bảo trả về object có khóa `rooms` là mảng.

**Kết quả mong đợi:** Status 200, JSON `{ rooms: [...] }`.

**Evidence:** `tc13-api-rooms.png`

---

## TC-14 — Bắt đầu ván bị disable khi chưa đủ 2 người

**Bước:**
1. Tạo phòng `TCGAMEPLAY` chỉ có chủ phòng `Host14`.
2. Quan sát nút "Bắt đầu" trên màn hình phòng.

**Kết quả mong đợi:** Nút "Bắt đầu" bị disable (`disabled=true`), không bấm được.

**Evidence:** `tc14-start-disabled.png`

---

## TC-15 — Khách (không phải chủ phòng) không bắt đầu được

**Bước:**
1. Tab thứ hai dùng tên `Guest14` vào phòng `TCGAMEPLAY`.
2. Trên tab khách, kiểm tra trạng thái nút "Bắt đầu".

**Kết quả mong đợi:** Nút có hiển thị nhưng `disabled` ở phía khách. (Server cũng từ chối nếu khách bypass UI.)

**Evidence:** `tc15-guest-cannot-start.png`

---

## TC-16 — Bắt đầu ván chuyển sang PLAYING

**Bước:**
1. Trên tab chủ phòng, bấm "Bắt đầu".
2. Quan sát log phòng và status từ API `/api/games/TCGAMEPLAY`.

**Kết quả mong đợi:** `status` chuyển từ `LOBBY` → `PLAYING`. Log có dòng `Ván chơi bắt đầu với 2 người chơi.`. Có `currentPlayerId`, `turnExpiresAt`. Mỗi người có 5 lá trên tay (sau khi nhận chia).

**Evidence:** `tc16-game-started.png`

---

## TC-17 — Rút bài ngoài lượt bị từ chối

**Bước:**
1. Khi `currentPlayerId === p-guest14`, tab host gọi `POST /api/games/TCGAMEPLAY` với body `{ action: "draw", playerId: "p-host14" }`.

**Kết quả mong đợi:** Status 400, body `{ error: "Not this player's turn" }`. Game state không đổi.

**Evidence:** `tc17-draw-out-of-turn.png`

---

## TC-18 — Rút bài hợp lệ trong lượt mình

**Bước:**
1. Đợi tới lượt host (currentPlayerId là `p-host14`).
2. Gọi `POST` với `{ action: "draw", playerId: "p-host14" }`.

**Kết quả mong đợi:** Status 200. `handCount` của host tăng thêm 1. `currentPlayerId` chuyển sang khách (hoặc tăng `pendingTurns` nếu đang bị Attack).

**Evidence:** `tc18-draw-card.png`, `tc18-guest-turn.png`

---

## TC-19 — Sao chép ID phòng

**Bước:**
1. Trong room screen, bấm nút "SAO CHÉP ID".
2. Quan sát text của nút sau khi click.

**Kết quả mong đợi:** Nút đổi nhãn thành "Đã chép" trong vài giây, rồi quay về.

**Evidence:** `tc19-copy-room-id.png`

---

## TC-20 — API validation thiếu trường bắt buộc

**Bước:**
1. Lần lượt gửi 4 payload thiếu trường tới `POST /api/games/TCGAMEPLAY`:
   - `{ action: "create" }` (room đã tồn tại)
   - `{ action: "play", playerId: "p-host14" }` (thiếu `cardInstanceId`)
   - `{ action: "catCombo", playerId: "p-host14", targetPlayerId: "p-guest14", cardInstanceIds: ["x"] }` (1 thay vì 2 thẻ)
   - `{ action: "confirmBury", playerId: "p-host14" }` (thiếu `insertIndex`)

**Kết quả mong đợi:** Tất cả trả status 400 với message rõ ràng (xem `src/app/api/games/[id]/route.ts`).

**Evidence:** `tc20-api-validation.png`

---

## TC-21 — Realtime sync giữa hai tab

**Bước:**
1. Sau khi nhiều hành động (rút bài, combo cat, Clairvoyance) chạy trên một tab.
2. So sánh state trên cả hai tab và backend.

**Kết quả mong đợi:** Cả hai tab cùng hiển thị log mới nhất, currentPlayerId nhất quán, drawPileCount giống nhau. Polling mỗi 2s + Pusher (nếu cấu hình) đảm bảo sync.

**Evidence:** `tc21-sync-host.png`, `tc21-sync-guest.png`

---

## TC-22 — Rời phòng

**Bước:**
1. Tab khách gọi `POST { action: "leave", playerId: "p-guest14" }`.
2. Tab host quan sát log phòng.

**Kết quả mong đợi:** API trả game state với `players[guest].connected = false`. Log phòng có dòng "Guest14 đã rời phòng.". Tab host UI cập nhật trạng thái khách.

**Evidence:** `tc22-guest-left.png`

---

## TC-23 — Bài trên tay đối thủ bị che (server-side)

**Bước:**
1. Gọi `GET /api/games/TCGAMEPLAY?viewerId=p-guest14`.
2. Kiểm tra trường `hand` cho từng người chơi trong response.

**Kết quả mong đợi:** Player của viewer (guest) có mảng `hand: [...]` đầy đủ. Player đối thủ chỉ có `handCount`, không có trường `hand`. Đảm bảo client không nhận được thẻ của đối phương.

**Evidence:** `tc23-hidden-hand.png`
