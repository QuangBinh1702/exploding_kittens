export type CardExpansion =
  | "BASE"
  | "IMPLODING"
  | "STREAKING"
  | "BARKING"
  | "ZOMBIE"
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
  | "ILL_TAKE_THAT"
  | "ZOMBIE_KITTEN"
  | "ATTACK_OF_THE_DEAD"
  | "CLAIRVOYANCE"
  | "CLONE"
  | "DIG_DEEPER"
  | "FEED_THE_DEAD"
  | "GRAVE_ROBBER"
  | "SHUFFLE_NOW"
  | "ARMAGEDDON"
  | "GODCAT"
  | "DEVILCAT"
  | "RAISING_HECK"
  | "REVEAL_THE_FUTURE"
  | "POTLUCK";

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
    title: "Exploding Kitten",
    description:
      "Nếu rút phải lá này, bạn nổ và bị loại, trừ khi dùng Gỡ Bom.",
    expansion: "BASE",
    copies: 4,
    nopeable: false,
  },
  {
    id: "defuse",
    type: "DEFUSE",
    title: "Defuse",
    description:
      "Cứu bạn khỏi Mèo Nổ, sau đó đặt Mèo Nổ trở lại xấp rút ở vị trí bí mật.",
    expansion: "BASE",
    copies: 6,
    nopeable: false,
  },
  {
    id: "attack",
    type: "ATTACK",
    title: "Attack",
    description:
      "Kết thúc lượt không rút bài. Người tiếp theo phải chơi hai lượt liên tiếp.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "skip",
    type: "SKIP",
    title: "Skip",
    description: "Kết thúc lượt hiện tại ngay lập tức mà không cần rút bài.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "shuffle",
    type: "SHUFFLE",
    title: "Shuffle",
    description: "Xáo trộn toàn bộ xấp rút mà không nhìn thứ tự các lá.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "see-the-future-3x",
    type: "SEE_THE_FUTURE",
    title: "See the Future 3x",
    description: "Xem riêng ba lá trên cùng của xấp rút rồi đặt lại đúng thứ tự.",
    expansion: "BASE",
    copies: 5,
    nopeable: true,
  },
  {
    id: "see-the-future-5x",
    type: "SEE_THE_FUTURE",
    title: "See the Future 5x",
    description: "Xem riêng năm lá trên cùng của xấp rút rồi đặt lại đúng thứ tự.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "favor",
    type: "FAVOR",
    title: "Favor",
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
    title: "Beard Cat",
    description: "Mèo thường. Dùng để tạo combo mèo thường.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "cattermelon",
    type: "CAT",
    title: "Cattermelon",
    description: "Mèo thường. Không có hiệu ứng riêng khi đánh một mình.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "hairy-potato-cat",
    type: "CAT",
    title: "Hairy Potato Cat",
    description: "Mèo thường. Giữ lại để ghép combo lấy bài.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "rainbow-ralphing-cat",
    type: "CAT",
    title: "Rainbow-Ralphing Cat",
    description: "Mèo thường. Có giá trị khi ghép cặp hoặc ghép bộ.",
    expansion: "BASE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "imploding-kitten",
    type: "IMPLODING_KITTEN",
    title: "Imploding Kitten",
    description:
      "Khi bị rút ở mặt ngửa, người rút bị loại ngay và không thể dùng Gỡ Bom.",
    expansion: "IMPLODING",
    copies: 1,
    nopeable: false,
  },
  {
    id: "alter-the-future-3x",
    type: "ALTER_THE_FUTURE",
    title: "Alter the Future 3x",
    description: "Xem và sắp xếp lại ba lá trên cùng của xấp rút theo ý bạn.",
    expansion: "IMPLODING",
    copies: 4,
    nopeable: true,
  },
  {
    id: "alter-the-future-5x",
    type: "ALTER_THE_FUTURE",
    title: "Alter the Future 5x",
    description: "Xem và sắp xếp lại năm lá trên cùng của xấp rút theo ý bạn.",
    expansion: "IMPLODING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "alter-the-future-now",
    type: "ALTER_THE_FUTURE",
    title: "Alter the Future Now",
    description:
      "Có thể đánh bất cứ lúc nào để xem và sắp xếp lại ba lá trên cùng.",
    expansion: "BARKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "draw-from-bottom",
    type: "DRAW_FROM_BOTTOM",
    title: "Draw from the Bottom",
    description: "Kết thúc lượt bằng cách rút lá dưới cùng của xấp rút.",
    expansion: "IMPLODING",
    copies: 4,
    nopeable: true,
  },
  {
    id: "reverse",
    type: "REVERSE",
    title: "Reverse",
    description: "Đảo chiều lượt chơi và kết thúc lượt của bạn mà không rút bài.",
    expansion: "IMPLODING",
    copies: 4,
    nopeable: true,
  },
  {
    id: "targeted-attack-2x",
    type: "TARGETED_ATTACK",
    title: "Targeted Attack 2x",
    description:
      "Chọn bất kỳ người chơi nào khác. Người đó phải chơi hai lượt liên tiếp.",
    expansion: "IMPLODING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "feral-cat",
    type: "FERAL_CAT",
    title: "Feral Cat",
    description: "Có thể dùng như bất kỳ lá mèo thường nào khi tạo combo.",
    expansion: "IMPLODING",
    copies: 4,
    nopeable: true,
  },
  {
    id: "streaking-kitten",
    type: "STREAKING_KITTEN",
    title: "Streaking Kitten",
    description: "Khi giữ trên tay, bạn có thể giữ một lá Mèo Nổ mà không nổ.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: false,
  },
  {
    id: "catomic-bomb",
    type: "CATOMIC_BOMB",
    title: "Catomic Bomb",
    description:
      "Lấy tất cả Mèo Nổ ra cho mọi người thấy, rồi đặt chúng lên đầu xấp rút.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "super-skip",
    type: "SUPER_SKIP",
    title: "Super Skip",
    description: "Kết thúc toàn bộ lượt còn lại của bạn, kể cả khi đang bị tấn công.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "swap-top-bottom",
    type: "SWAP_TOP_BOTTOM",
    title: "Swap Top and Bottom",
    description: "Đổi vị trí lá trên cùng và lá dưới cùng của xấp rút.",
    expansion: "STREAKING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "garbage-collection",
    type: "GARBAGE_COLLECTION",
    title: "Garbage Collection",
    description:
      "Mỗi người chọn một lá trên tay đặt lại vào xấp rút, sau đó xào bài.",
    expansion: "STREAKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "mark",
    type: "MARK",
    title: "Mark",
    description: "Chọn một lá trên tay đối thủ để họ phải lật ngửa cho mọi người thấy.",
    expansion: "STREAKING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "curse-of-cat-butt",
    type: "CURSE_OF_CAT_BUTT",
    title: "Curse of the Cat Butt",
    description: "Làm một người chơi bị mù bài cho đến khi họ rút bài.",
    expansion: "STREAKING",
    copies: 2,
    nopeable: true,
  },
  {
    id: "barking-kitten",
    type: "BARKING_KITTEN",
    title: "Barking Kitten",
    description:
      "Chọn một người chơi để kéo vào cuộc đối đầu Mèo Sủa. Trong hệ thống hiện tại, nếu mục tiêu còn bài, bạn lấy 1 lá đầu tiên từ tay họ rồi lượt tiếp tục.",
    expansion: "BARKING",
    copies: 2,
    nopeable: true,
  },
  {
    id: "tower-of-power",
    type: "TOWER_OF_POWER",
    title: "Tower of Power",
    description: "Đội vương miện và được bảo vệ khỏi một số hành động lấy bài.",
    expansion: "BARKING",
    copies: 1,
    nopeable: true,
  },
  {
    id: "bury",
    type: "BURY",
    title: "Bury",
    description:
      "Xem riêng lá trên cùng của xấp rút, rồi chèn nó trở lại vào một vị trí bạn chọn (0 = đáy xấp) mà không được xem các lá khác.",
    expansion: "BARKING",
    copies: 2,
    nopeable: true,
  },
  {
    id: "ill-take-that",
    type: "ILL_TAKE_THAT",
    title: "I'll Take That",
    description: "Đặt trước mặt một người chơi để lấy lá tiếp theo họ rút.",
    expansion: "BARKING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "share-the-future",
    type: "SHARE_THE_FUTURE",
    title: "Share the Future",
    description:
      "Xem riêng 3 lá trên cùng của xấp rút, sắp xếp lại, cho người chơi kế tiếp (theo chiều lượt) xem và sắp lại, rồi đặt cả ba lá trở lại đỉnh xấp úp.",
    expansion: "BARKING",
    copies: 2,
    nopeable: true,
  },
  {
    id: "personal-attack-3x",
    type: "PERSONAL_ATTACK",
    title: "Personal Attack 3x",
    description:
      "Kết thúc lượt của bạn rồi chính bạn phải chơi ba lượt liên tiếp.",
    expansion: "BARKING",
    copies: 3,
    nopeable: true,
  },
  {
    id: "zombie-kitten",
    type: "ZOMBIE_KITTEN",
    title: "Zombie Kitten",
    description:
      "Khi rút phải Mèo Nổ, lá này được dùng như Gỡ Bom: bạn chôn Mèo Nổ lại vào xấp, đồng thời hồi sinh 1 người đã bị loại với 1 lá bài. Nếu hồi sinh làm số người sống tăng, hệ thống cân bằng lại số Mèo Nổ trong xấp để vẫn đủ nguy hiểm.",
    expansion: "ZOMBIE",
    copies: 4,
    nopeable: false,
  },
  {
    id: "attack-of-the-dead",
    type: "ATTACK_OF_THE_DEAD",
    title: "Attack of the Dead",
    description:
      "Tương tự Tấn Công nhưng số lượt phải chơi tăng theo số người đã bị loại trong ván.",
    expansion: "ZOMBIE",
    copies: 3,
    nopeable: true,
  },
  {
    id: "clairvoyance",
    type: "CLAIRVOYANCE",
    title: "Clairvoyance",
    description:
      "Khi người khác dùng Mèo Zombie, dùng lá này để xem họ giấu Mèo Nổ ở vị trí nào trong xấp.",
    expansion: "ZOMBIE",
    copies: 3,
    nopeable: true,
  },
  {
    id: "clone",
    type: "CLONE",
    title: "Clone",
    description: "Sao chép hiệu ứng của lá hành động vừa được đánh trước đó.",
    expansion: "ZOMBIE",
    copies: 3,
    nopeable: true,
  },
  {
    id: "dig-deeper",
    type: "DIG_DEEPER",
    title: "Dig Deeper",
    description:
      "Rút và xem lá trên cùng. Bạn có thể giữ lá đó, hoặc lấy lá kế tiếp và đặt lá đầu tiên lại lên đỉnh xấp.",
    expansion: "ZOMBIE",
    copies: 4,
    nopeable: true,
  },
  {
    id: "feed-the-dead",
    type: "FEED_THE_DEAD",
    title: "Feed the Dead",
    description:
      "Chọn một người đã bị loại; mọi người chơi còn sống khác (trừ bạn) phải đưa cho người đó một lá bài.",
    expansion: "ZOMBIE",
    copies: 3,
    nopeable: true,
  },
  {
    id: "grave-robber",
    type: "GRAVE_ROBBER",
    title: "Grave Robber",
    description:
      "Mỗi người đã bị loại còn cầm bài chọn 1 lá trên tay trộn vào xấp rút.",
    expansion: "ZOMBIE",
    copies: 3,
    nopeable: true,
  },
  {
    id: "shuffle-now",
    type: "SHUFFLE_NOW",
    title: "Shuffle Now",
    description:
      "Xáo trộn xấp rút ngay lập tức, kể cả khi đang ngoài khung thời điểm xào bài thông thường.",
    expansion: "ZOMBIE",
    copies: 3,
    nopeable: true,
  },
  {
    id: "armageddon",
    type: "ARMAGEDDON",
    title: "Armageddon",
    description: "Chọn một đối thủ để mở đối đầu Thiện/Ác. Nếu bạn có Godcat và đối thủ có Devilcat, hai lá bị bỏ và đối thủ mất thêm 1 lá; nếu thiếu cặp Godcat/Devilcat, Armageddon chỉ cảnh báo/hiển thị thông tin, không kết thúc ván ngẫu nhiên.",
    expansion: "GOOD_VS_EVIL",
    copies: 3,
    nopeable: true,
  },
  {
    id: "godcat",
    type: "GODCAT",
    title: "Godcat",
    description:
      "Lá Thiện hiếm. Khi Armageddon xảy ra, Godcat bảo vệ người giữ nó khỏi bị phạt và có thể thắng đối đầu nếu phía kia có Devilcat.",
    expansion: "GOOD_VS_EVIL",
    copies: 1,
    nopeable: false,
  },
  {
    id: "devilcat",
    type: "DEVILCAT",
    title: "Devilcat",
    description:
      "Lá Ác hiếm. Khi bị kéo vào Armageddon, Devilcat có thể phản công: nếu đối thủ không có Godcat, đối thủ mất 1 lá; nếu đối thủ có Godcat, Devilcat bị hóa giải.",
    expansion: "GOOD_VS_EVIL",
    copies: 1,
    nopeable: false,
  },
  {
    id: "raising-heck",
    type: "RAISING_HECK",
    title: "Raising Heck",
    description:
      "Đẩy toàn bộ Mèo Nổ trong xấp về phía đáy theo luật bộ Thiện/Ác, làm các lượt rút sau khó đoán hơn.",
    expansion: "GOOD_VS_EVIL",
    copies: 2,
    nopeable: true,
  },
  {
    id: "potluck",
    type: "POTLUCK",
    title: "Potluck",
    description:
      "Mỗi người chơi còn sống đặt 1 lá từ tay lên đỉnh xấp rút theo chiều lượt, làm thay đổi các lá sắp được rút.",
    expansion: "GOOD_VS_EVIL",
    copies: 2,
    nopeable: true,
  },
  {
    id: "reveal-the-future-3x",
    type: "REVEAL_THE_FUTURE",
    title: "Reveal the Future 3x",
    description: "Lật ngửa 3 lá trên cùng của xấp rút cho cả bàn cùng thấy.",
    expansion: "GOOD_VS_EVIL",
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
