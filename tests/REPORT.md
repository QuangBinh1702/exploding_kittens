# Báo cáo kiểm thử E2E — Mèo Nổ Online

- **Ngày chạy:** 2026-05-17 → 2026-05-18 (đợt mở rộng)
- **URL:** http://localhost:3000
- **Tool:** Playwright MCP (Chromium)
- **Tổng số test case:** 23 E2E + 111 unit/engine tests
- **Pass:** 22 E2E + 111 unit/engine  ·  **Pass với chú thích:** 1  ·  **Fail:** 0
- **Test cases gốc:** [tests/e2e/test-cases.md](e2e/test-cases.md)

## Bảng tổng hợp

| ID    | Tên                                            | Loại        | Kết quả        | Bằng chứng |
|-------|------------------------------------------------|-------------|----------------|------------|
| TC-01 | Trang chủ tải thành công                       | Smoke       | ✅ Pass         | [tc01-homepage.png](evidence/tc01-homepage.png) |
| TC-02 | Bộ bài hiển thị & filter expansion             | UI          | ✅ Pass         | [tc02-cards-all.png](evidence/tc02-cards-all.png), [tc02-cards-base.png](evidence/tc02-cards-base.png) |
| TC-03 | Validation tên người chơi rỗng                 | Negative    | ✅ Pass         | [tc03-empty-name-error.png](evidence/tc03-empty-name-error.png) |
| TC-04 | Tạo phòng công khai và chuyển vào              | Happy path  | ✅ Pass         | [tc04-room-created.png](evidence/tc04-room-created.png) |
| TC-05 | Tạo phòng riêng có mật khẩu                    | Happy path  | ✅ Pass         | [tc05-private-room.png](evidence/tc05-private-room.png) |
| TC-06 | Lobby liệt kê phòng vừa tạo                    | Realtime    | ✅ Pass         | [tc06-rooms-listed.png](evidence/tc06-rooms-listed.png) |
| TC-07 | Tìm phòng theo tên/ID                          | UI          | ✅ Pass         | [tc07-search.png](evidence/tc07-search.png) |
| TC-08 | Validation mã phòng rỗng                       | Negative    | ✅ Pass         | [tc08-join-empty.png](evidence/tc08-join-empty.png) |
| TC-09 | Vào phòng bằng mã không tồn tại                | Negative    | ⚠️ Pass có chú thích | [tc09-room-not-found.png](evidence/tc09-room-not-found.png) |
| TC-10 | Vào phòng riêng sai mật khẩu                   | Negative    | ✅ Pass         | [tc10-wrong-password.png](evidence/tc10-wrong-password.png) |
| TC-11 | Toggle expansion (BASE không tắt được)         | UI          | ✅ Pass         | [tc11-expansions.png](evidence/tc11-expansions.png) |
| TC-12 | Hai người vào cùng một phòng                   | Realtime    | ✅ Pass         | [tc12-two-players.png](evidence/tc12-two-players.png), [tc12-two-players-host.png](evidence/tc12-two-players-host.png) |
| TC-13 | API `/api/rooms` GET                           | API         | ✅ Pass         | [tc13-api-rooms.png](evidence/tc13-api-rooms.png) |
| TC-14 | Bắt đầu ván bị disable khi <2 người            | Gameplay    | ✅ Pass         | [tc14-start-disabled.png](evidence/tc14-start-disabled.png) |
| TC-15 | Khách không bắt đầu được                       | Gameplay    | ✅ Pass         | [tc15-guest-cannot-start.png](evidence/tc15-guest-cannot-start.png) |
| TC-16 | Bắt đầu ván chuyển sang PLAYING                | Gameplay    | ✅ Pass         | [tc16-game-started.png](evidence/tc16-game-started.png) |
| TC-17 | Rút bài ngoài lượt bị từ chối                  | Negative    | ✅ Pass         | [tc17-draw-out-of-turn.png](evidence/tc17-draw-out-of-turn.png) |
| TC-18 | Rút bài hợp lệ trong lượt mình                 | Gameplay    | ✅ Pass         | [tc18-draw-card.png](evidence/tc18-draw-card.png), [tc18-guest-turn.png](evidence/tc18-guest-turn.png) |
| TC-19 | Sao chép ID phòng                              | UI          | ✅ Pass         | [tc19-copy-room-id.png](evidence/tc19-copy-room-id.png) |
| TC-20 | API validation thiếu trường bắt buộc            | API         | ✅ Pass         | [tc20-api-validation.png](evidence/tc20-api-validation.png) |
| TC-21 | Realtime sync giữa hai tab                     | Realtime    | ✅ Pass         | [tc21-sync-host.png](evidence/tc21-sync-host.png), [tc21-sync-guest.png](evidence/tc21-sync-guest.png) |
| TC-22 | Người chơi rời phòng                           | Gameplay    | ✅ Pass         | [tc22-guest-left.png](evidence/tc22-guest-left.png) |
| TC-23 | Bài trên tay đối thủ bị che (server-side)      | Security    | ✅ Pass         | [tc23-hidden-hand.png](evidence/tc23-hidden-hand.png) |

## Chi tiết các đợt

### Đợt 1 — Lobby & UI cơ bản (TC-01 → TC-13)

Đã kiểm tra trang chủ, form tạo / vào phòng, validation, hiển thị bộ bài, lọc expansion, tạo phòng public/private, tìm kiếm phòng, mật khẩu sai, hai người vào cùng phòng, API `/api/rooms`.

#### Quan sát

- **Auto-cleanup phòng LOBBY khi chủ rời:** xem `src/server/redisService.ts:87`. Nếu chủ phòng disconnect và game vẫn ở `LOBBY`, phòng tự bị xóa khi `listPublicRooms` chạy.
- **Auto-create on join (TC-09):** vào phòng bằng ID không tồn tại sẽ tự tạo phòng mới. Hành vi cố ý (UX share-link) — ghi nhận để team xác nhận.

### Đợt 2 — Gameplay & API (TC-14 → TC-23)

Tạo `TCGAMEPLAY`, host = `Host14`, khách = `Guest14`. Bắt đầu ván, rút bài, ngoài lượt, sao chép ID, validation API, sync realtime, leave room, hidden hand.

#### Chi tiết các test mới

**TC-14:** Khi chỉ có chủ phòng, nút "Bắt đầu" có `disabled=true`. Class CSS chứa `disabled:opacity-50`. Server cũng phụ thuộc `joinGame` trước.

**TC-15:** Trên tab khách, nút "Bắt đầu" hiển thị nhưng cũng disabled. Lỗi server gốc: trong `route.ts`, `if (body.playerId !== ownerId) throw new Error("Chỉ chủ phòng mới được bắt đầu ván.")`.

**TC-16:** Sau khi host bấm "Bắt đầu" và lock release, API trả về:
```
status: PLAYING
log: ["Ván chơi bắt đầu với 2 người chơi.", ...]
players: [Host14 alive=true handCount=5+, Guest14 alive=true handCount=5+]
turnExpiresAt: ~30s sau startedAt
```

**TC-17:** Khi `currentPlayerId === "p-guest14"` mà gửi `draw` với `playerId: "p-host14"` → status 400, error "Not this player's turn". Đây là bảo vệ trong `drawCard()` (game-engine).

**TC-18:** Sau khi host rút (đúng lượt), `players[host].handCount` tăng thêm 1, log có "Host14 rút một lá bài.", `currentPlayerId` chuyển sang khách. Note: timer 30s/lượt hoạt động — trong test có ghi nhận một số dòng log "Host14 hết 30 giây, hệ thống tự rút bài." chứng minh server-side timeout đúng.

**TC-19:** Click "SAO CHÉP ID" → nhãn nút đổi thành "Đã chép" và `navigator.clipboard.writeText` được gọi. (Quan sát: nút có state `copiedRoomId` trong RoomPageContent.)

**TC-20:** 4 case validation đều trả 400 với message rõ ràng:
- `Phòng đã tồn tại. Hãy vào phòng bằng mật khẩu nếu có.`
- `playerId and cardInstanceId are required`
- `playerId, targetPlayerId and exactly 2 cardInstanceIds are required`
- `playerId and insertIndex are required`

**TC-21:** Sau nhiều thao tác liên tiếp (combo, Clairvoyance), cả host tab và guest tab đều thấy log mới nhất + `discardTop: "clairvoyance"` + drawPile = 118. State đồng bộ qua polling 2s và (nếu cấu hình) `gameState:update` trên Pusher.

**TC-22:** `POST { action: "leave", playerId: "p-guest14" }` → state có `players[guest].connected = false`, log có "Guest14 đã rời phòng.". Vì game đã `PLAYING`, phòng không bị xóa (chỉ rooms LOBBY mất chủ mới bị xóa).

**TC-23:** `GET /api/games/TCGAMEPLAY?viewerId=p-guest14`:
```
players[host14]:  hand=undefined  handCount=6
players[guest14]: hand=[…9 ids…] handCount=9
```
Server sạch — không leak bài đối thủ ra client.

## Đợt 3 — UI/UX polish + 49-card validation

### Thay đổi chính

- **Tên lá:** giữ tên tiếng Anh cho các lá Zombie / Good-vs-Evil; mô tả đã Việt hóa toàn bộ để người chơi Việt hiểu luật nhanh.
- **Card UI:** lá bài trong tay giờ hiển thị mô tả ngắn ngay cả ở chế độ mini, có `title` tooltip đầy đủ khi hover.
- **Steal/combo 2 mèo:** người bốc bài chỉ thấy mặt sau các lá, không còn lộ `baseId`; người bị bốc có nút **Xáo bài trên tay** trước khi đối phương chọn.
- **Mật khẩu phòng:** room header có nút ẩn/hiện mật khẩu và sao chép mật khẩu, tránh lộ khi share màn hình.
- **Log:** lọc bớt log kỹ thuật/dư thừa, chỉ giữ sự kiện cần thiết cho người chơi.
- **Responsive/mobile:** layout room bỏ `h-screen overflow-hidden` cố định ở mobile, bài trên tay scroll tốt hơn, draw pile/discard không bị biến mất khi nhiều bài.
- **Nope/Xào bài:** panel hành động rõ hơn, nút lớn hơn và mô tả dễ hiểu hơn.

### Minh chứng mới

| Nội dung | Bằng chứng |
|---|---|
| TypeScript compile pass | [typecheck-ui-ux.log](evidence/typecheck-ui-ux.log) |
| 49-card/unit suite: 111 tests pass | [vitest-49-cards.log](evidence/vitest-49-cards.log) |
| Room desktop: mật khẩu ẩn + copy | [uiux-room-password-desktop.png](evidence/uiux-room-password-desktop.png) |
| Room desktop: mật khẩu hiện | [uiux-room-password-visible.png](evidence/uiux-room-password-visible.png) |
| Gameplay desktop layout | [uiux-gameplay-desktop.png](evidence/uiux-gameplay-desktop.png) |
| Gameplay mobile responsive | [uiux-gameplay-mobile.png](evidence/uiux-gameplay-mobile.png) |
| Tên English + mô tả tiếng Việt | [uiux-cards-english-title-vietnamese-description.png](evidence/uiux-cards-english-title-vietnamese-description.png) |

### Kết quả 49 lá

File test mới: `src/game-engine/all-cards.test.ts`.

- Kiểm tra `cardsData.length === 49`.
- Kiểm tra count theo expansion: BASE 13, IMPLODING 7, STREAKING 8, BARKING 7, ZOMBIE 8, GOOD_VS_EVIL 6.
- Với mỗi lá playable: add vào hand, gọi `playCard`, resolve pending action nếu cần, đảm bảo engine không throw và không fallback sai.
- Với các lá không play trực tiếp (Exploding Kitten/Defuse/Nope/Cat/Zombie Kitten/Godcat/Devilcat...) kiểm tra tồn tại trong deck/hand hoặc flow đặc thù.
- Kiểm tra Defuse flow khi rút Exploding Kitten.

## Quan sát chung & gợi ý

1. **Lock contention:** dev server đôi khi báo "Máy chủ đang xử lý yêu cầu khác. Đang thử lại…" do lock 8s trên Upstash. Client tự retry (xem `postAction`), nhưng test cần loop chờ vì gọi raw API.
2. **30 giây/lượt:** turn timer rất hữu ích cho test thoát kẹt nhưng cũng làm các test thủ công bị thay đổi state nếu thao tác chậm.
3. **Auto-create on join (TC-09):** cân nhắc thêm hộp xác nhận "Phòng chưa tồn tại, tạo mới?" để tránh người dùng gõ nhầm ID xong tự tạo phòng.
4. **Hidden hand (TC-23):** đã đảm bảo ở server. Client không nên trust `hand` của opponent — đã đúng.
5. **Auto-cleanup khi chủ phòng rời (LOBBY):** ổn cho UX nhưng test cần giữ tab chủ mở.

## Cách tái chạy

```powershell
npm run dev   # http://localhost:3000
# Mở Playwright/Browser, chạy theo các bước trong tests/e2e/test-cases.md
# Screenshots lưu vào tests/evidence/
```

## Cấu trúc

```
tests/
├── REPORT.md                        # File này (23 test cases)
├── e2e/
│   └── test-cases.md                # Test cases chi tiết
└── evidence/                        # Screenshots PNG
    ├── tc01-homepage.png
    ├── tc02-cards-all.png
    ├── tc02-cards-base.png
    ├── tc03-empty-name-error.png
    ├── tc04-room-created.png
    ├── tc05-private-room.png
    ├── tc06-rooms-listed.png
    ├── tc07-search.png
    ├── tc08-join-empty.png
    ├── tc09-room-not-found.png
    ├── tc10-wrong-password.png
    ├── tc11-expansions.png
    ├── tc12-two-players.png
    ├── tc12-two-players-host.png
    ├── tc13-api-rooms.png
    ├── tc14-start-disabled.png
    ├── tc15-guest-cannot-start.png
    ├── tc16-game-started.png
    ├── tc17-draw-out-of-turn.png
    ├── tc18-draw-card.png
    ├── tc18-guest-turn.png
    ├── tc19-copy-room-id.png
    ├── tc20-api-validation.png
    ├── tc21-sync-host.png
    ├── tc21-sync-guest.png
    ├── tc22-guest-left.png
    └── tc23-hidden-hand.png
```
