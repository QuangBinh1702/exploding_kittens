export type CardExpansion =
  | "BASE"
  | "IMPLODING"
  | "STREAKING"
  | "BARKING"
  | "GOOD_VS_EVIL"
  | "RECIPES";

export type CardType =
  | "EXPLODING_KITTEN"
  | "IMPLODING_KITTEN"
  | "DEFUSE"
  | "ATTACK"
  | "TARGETED_ATTACK"
  | "PERSONAL_ATTACK"
  | "SKIP"
  | "SUPER_SKIP"
  | "REVERSE"
  | "SHUFFLE"
  | "SEE_THE_FUTURE"
  | "ALTER_THE_FUTURE"
  | "SHARE_THE_FUTURE"
  | "DRAW_FROM_BOTTOM"
  | "FAVOR"
  | "NOPE"
  | "CAT"
  | "FERAL_CAT"
  | "STREAKING_KITTEN"
  | "CATOMIC_BOMB"
  | "SWAP_TOP_BOTTOM"
  | "GARBAGE_COLLECTION"
  | "MARK"
  | "CURSE_OF_CAT_BUTT"
  | "BARKING_KITTEN"
  | "TOWER_OF_POWER"
  | "BURY"
  | "ILL_TAKE_THAT";

export interface CardData {
  id: string;
  type: CardType;
  title: string;
  description: string;
  expansion: CardExpansion;
  copies: number;
  nopeable: boolean;
}

export const cardsData = [
  {
    id: "exploding-kitten",
    type: "EXPLODING_KITTEN",
    title: "Mèo Nổ",
    description:
      "Nếu rút phải lá này, bạn nổ và bị loại, trừ khi dùng Gỡ Bom.",
    expansion: "BASE",
    copies: 4,
    nopeable: false,
  },
  {
    id: "defuse",
    type: "DEFUSE",
    title: "Gỡ Bom",
    description:
      "Cứu bạn khỏi Mèo Nổ, sau đó đặt Mèo Nổ trở lại xấp rút ở vị trí bí mật.",
    expansion: "BASE",
    copies: 6,
    nopeable: false,
  },
  {
    id: "attack",
    type: "ATTACK",
    title: "Tấn Công",
    description:
      "Kết thúc lượt không rút bài. Người tiếp theo phải chơi hai lượt liên tiếp.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "skip",
    type: "SKIP",
    title: "Bỏ Lượt",
    description: "Kết thúc lượt hiện tại ngay lập tức mà không cần rút bài.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "shuffle",
    type: "SHUFFLE",
    title: "Xào Bài",
    description: "Xáo trộn toàn bộ xấp rút mà không nhìn thứ tự các lá.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "see-the-future-3x",
    type: "SEE_THE_FUTURE",
    title: "Xem Tương Lai 3 Lá",
    description: "Xem riêng ba lá trên cùng của xấp rút rồi đặt lại đúng thứ tự.",
    expansion: "BASE",
    copies: 5,
    nopeable: true,
  },
  {
    id: "see-the-future-5x",
    type: "SEE_THE_FUTURE",
    title: "Xem Tương Lai 5 Lá",
    description: "Xem riêng năm lá trên cùng của xấp rút rồi đặt lại đúng thứ tự.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "favor",
    type: "FAVOR",
    title: "Thiện Ý",
    description:
      "Chọn một người chơi. Người đó phải đưa cho bạn một lá bài họ tự chọn.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "nope",
    type: "NOPE",
    title: "Nope",
    description:
      "Hủy lá hành động vừa được đánh. Chuỗi Nope chẵn/lẻ sẽ quyết định hành động có hiệu lực hay không.",
    expansion: "BASE",
    copies: 5,
    nopeable: false,
  },
  {
    id: "tacocat",
    type: "CAT",
    title: "Tacocat",
    description: "Mèo thường. Ghép cặp hoặc ghép bộ để lấy bài từ đối thủ.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "beard-cat",
    type: "CAT",
    title: "Mèo Râu",
    description: "Mèo thường. Dùng để tạo combo mèo thường.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "cattermelon",
    type: "CAT",
    title: "Mèo Dưa Hấu",
    description: "Mèo thường. Không có hiệu ứng riêng khi đánh một mình.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "hairy-potato-cat",
    type: "CAT",
    title: "Mèo Khoai Tây Lông Lá",
    description: "Mèo thường. Giữ lại để ghép combo lấy bài.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "rainbow-ralphing-cat",
    type: "CAT",
    title: "Mèo Cầu Vồng",
    description: "Mèo thường. Có giá trị khi ghép cặp hoặc ghép bộ.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "imploding-kitten",
    type: "IMPLODING_KITTEN",
    title: "Mèo Sập",
    description:
      "Khi bị rút ở mặt ngửa, người rút bị loại ngay và không thể dùng Gỡ Bom.",
    expansion: "IMPLODING",
    copies: 1,
    nopeable: false,
  },
  {
    id: "alter-the-future-3x",
    type: "ALTER_THE_FUTURE",
    title: "Biến Đổi Tương Lai 3 Lá",
    description: "Xem và sắp xếp lại ba lá trên cùng của xấp rút theo ý bạn.",
    expansion: "IMPLODING",
    copies: 4,
    nopeable: true,
  },
  {
    id: "alter-the-future-5x",
    type: "ALTER_THE_FUTURE",
    title: "Biến Đổi Tương Lai 5 Lá",
    description: "Xem và sắp xếp lại năm lá trên cùng của xấp rút theo ý bạn.",
    expansion: "IMPLODING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "alter-the-future-now",
    type: "ALTER_THE_FUTURE",
    title: "Biến Đổi Tương Lai Ngay",
    description:
      "Có thể đánh bất cứ lúc nào để xem và sắp xếp lại ba lá trên cùng.",
    expansion: "BARKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "draw-from-bottom",
    type: "DRAW_FROM_BOTTOM",
    title: "Rút Từ Đáy",
    description: "Kết thúc lượt bằng cách rút lá dưới cùng của xấp rút.",
    expansion: "IMPLODING",
    copies: 4,
    nopeable: true,
  },
  {
    id: "reverse",
    type: "REVERSE",
    title: "Đảo Chiều",
    description: "Đảo chiều lượt chơi và kết thúc lượt của bạn mà không rút bài.",
    expansion: "IMPLODING",
    copies: 4,
    nopeable: true,
  },
  {
    id: "targeted-attack-2x",
    type: "TARGETED_ATTACK",
    title: "Tấn Công Chỉ Định 2 Lượt",
    description:
      "Chọn bất kỳ người chơi nào khác. Người đó phải chơi hai lượt liên tiếp.",
    expansion: "IMPLODING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "feral-cat",
    type: "FERAL_CAT",
    title: "Mèo Hoang",
    description: "Có thể dùng như bất kỳ lá mèo thường nào khi tạo combo.",
    expansion: "IMPLODING",
    copies: 4,
    nopeable: true,
  },
  {
    id: "streaking-kitten",
    type: "STREAKING_KITTEN",
    title: "Mèo Ăn Gian",
    description: "Khi giữ trên tay, bạn có thể giữ một lá Mèo Nổ mà không nổ.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: false,
  },
  {
    id: "catomic-bomb",
    type: "CATOMIC_BOMB",
    title: "Bom Mèo Nguyên Tử",
    description:
      "Lấy tất cả Mèo Nổ ra cho mọi người thấy, rồi đặt chúng lên đầu xấp rút.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "super-skip",
    type: "SUPER_SKIP",
    title: "Bỏ Qua Siêu Cấp",
    description: "Kết thúc toàn bộ lượt còn lại của bạn, kể cả khi đang bị tấn công.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "swap-top-bottom",
    type: "SWAP_TOP_BOTTOM",
    title: "Đổi Đầu Và Đáy",
    description: "Đổi vị trí lá trên cùng và lá dưới cùng của xấp rút.",
    expansion: "STREAKING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "garbage-collection",
    type: "GARBAGE_COLLECTION",
    title: "Thu Gom Rác",
    description:
      "Mỗi người chọn một lá trên tay đặt lại vào xấp rút, sau đó xào bài.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "mark",
    type: "MARK",
    title: "Đánh Dấu",
    description: "Chọn một lá trên tay đối thủ để họ phải lật ngửa cho mọi người thấy.",
    expansion: "STREAKING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "curse-of-cat-butt",
    type: "CURSE_OF_CAT_BUTT",
    title: "Lời Nguyền Mông Mèo",
    description: "Làm một người chơi bị mù bài cho đến khi họ rút bài.",
    expansion: "STREAKING",
    copies: 2,
    nopeable: true,
  },
  {
    id: "barking-kitten",
    type: "BARKING_KITTEN",
    title: "Mèo Sủa",
    description:
      "Tạo tình huống đối đầu với người giữ lá Mèo Sủa còn lại theo luật mở rộng.",
    expansion: "BARKING",
    copies: 2,
    nopeable: true,
  },
  {
    id: "tower-of-power",
    type: "TOWER_OF_POWER",
    title: "Tháp Quyền Lực",
    description: "Đội vương miện và được bảo vệ khỏi một số hành động lấy bài.",
    expansion: "BARKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "bury",
    type: "BURY",
    title: "Chôn Bài",
    description:
      "Xem riêng lá trên cùng của xấp rút, rồi chèn nó trở lại vào một vị trí bạn chọn (0 = đáy xấp) mà không được xem các lá khác.",
    expansion: "BARKING",
    copies: 2,
    nopeable: true,
  },
  {
    id: "ill-take-that",
    type: "ILL_TAKE_THAT",
    title: "Để Tôi Lấy Lá Đó",
    description: "Đặt trước mặt một người chơi để lấy lá tiếp theo họ rút.",
    expansion: "BARKING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "share-the-future",
    type: "SHARE_THE_FUTURE",
    title: "Chia Sẻ Tương Lai",
    description:
      "Xem riêng 3 lá trên cùng của xấp rút, sắp xếp lại, cho người chơi kế tiếp (theo chiều lượt) xem và sắp lại, rồi đặt cả ba lá trở lại đỉnh xấp úp.",
    expansion: "BARKING",
    copies: 2,
    nopeable: true,
  },
  {
    id: "personal-attack-3x",
    type: "PERSONAL_ATTACK",
    title: "Tự Tấn Công 3 Lượt",
    description:
      "Kết thúc lượt của bạn rồi chính bạn phải chơi ba lượt liên tiếp.",
    expansion: "BARKING",
    copies: 3,
    nopeable: true,
  },
] as const satisfies readonly CardData[];

export type CardId = (typeof cardsData)[number]["id"];

export const cardsById: Record<CardId, CardData> = Object.fromEntries(
  cardsData.map((card) => [card.id, card]),
) as Record<CardId, CardData>;

export function getCardData(cardId: string): CardData | undefined {
  return cardsData.find((card) => card.id === cardId);
}

export function createDeckCardIds(expansions: readonly CardExpansion[] = ["BASE"]) {
  const allowed = new Set<CardExpansion>(expansions);
  return cardsData
    .filter((card) => allowed.has(card.expansion))
    .flatMap((card) => Array.from({ length: card.copies }, () => card.id));
}
