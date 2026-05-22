import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const source = fs.readFileSync(path.join(process.cwd(), "src", "data", "cardsData.ts"), "utf8");
const ids = [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
const outputDir = path.join(process.cwd(), "public", "assets", "cards");

fs.mkdirSync(outputDir, { recursive: true });

const styles = {
  "zombie-kitten": ["#365314", "#d9f99d", zombie()],
  "attack-of-the-dead": ["#1f2937", "#bbf7d0", boltTarget()],
  clairvoyance: ["#312e81", "#c7d2fe", eyeCards(4)],
  clone: ["#0f766e", "#ccfbf1", clone()],
  "dig-deeper": ["#78350f", "#fde68a", shovel()],
  "feed-the-dead": ["#581c87", "#e9d5ff", gift()],
  "grave-robber": ["#27272a", "#d4d4d8", shovel()],
  "shuffle-now": ["#9d174d", "#fbcfe8", swirlCards()],
  armageddon: ["#7f1d1d", "#fed7aa", explosion()],
  godcat: ["#a16207", "#fef3c7", crown()],
  devilcat: ["#450a0a", "#fecaca", horns()],
  "raising-heck": ["#9a3412", "#ffedd5", flame()],
  potluck: ["#166534", "#dcfce7", potluck()],
  "reveal-the-future-3x": ["#075985", "#bae6fd", eyeCards(3)],
};

function cardShape(x, y, rotate = 0, fill = "#f8fafc") {
  return `<rect x="${x}" y="${y}" width="86" height="120" rx="12" fill="${fill}" stroke="#111827" stroke-width="12" transform="rotate(${rotate} ${x + 43} ${y + 60})"/>`;
}

function eyeCards(count) {
  const cards = Array.from({ length: count }, (_, index) =>
    cardShape(154 + index * 34, 250 - Math.abs(index - 1.5) * 18, (index - 1.5) * 10, "#e0f2fe"),
  ).join("");
  return `${cards}<path d="M130 210c70-88 182-88 252 0-70 88-182 88-252 0Z" fill="#fff" stroke="#111827" stroke-width="16"/><circle cx="256" cy="210" r="54" fill="#60a5fa" stroke="#111827" stroke-width="12"/><circle cx="256" cy="210" r="20" fill="#111827"/>`;
}

function explosion() {
  return `<path d="M256 58 298 178l118-52-58 112 110 52-122 28 36 122-100-76-82 92-8-122-126 8 92-86-92-82 124 4Z" fill="#f97316" stroke="#111827" stroke-width="14" stroke-linejoin="round"/><circle cx="256" cy="264" r="72" fill="#111827"/><path d="M236 232h40M220 280h72" stroke="#fef3c7" stroke-width="18" stroke-linecap="round"/>`;
}

function zombie() {
  return `<circle cx="256" cy="250" r="112" fill="#bef264" stroke="#111827" stroke-width="16"/><path d="M176 196 126 112l98 26M336 196l50-84-98 26" fill="#bef264" stroke="#111827" stroke-width="16" stroke-linejoin="round"/><circle cx="216" cy="242" r="16" fill="#111827"/><circle cx="300" cy="242" r="16" fill="#111827"/><path d="M214 308c34 24 66 24 100 0" fill="none" stroke="#111827" stroke-width="14" stroke-linecap="round"/><path d="M156 346c60 34 140 42 208 0" stroke="#4d7c0f" stroke-width="22" stroke-linecap="round"/>`;
}

function boltTarget() {
  return `<circle cx="256" cy="256" r="150" fill="none" stroke="#111827" stroke-width="14"/><circle cx="256" cy="256" r="88" fill="none" stroke="#ef4444" stroke-width="18"/><path d="M196 292 260 88l20 126h86L248 424l20-132Z" fill="#facc15" stroke="#111827" stroke-width="14" stroke-linejoin="round"/>`;
}

function clone() {
  return `${cardShape(150, 146, -10, "#ccfbf1")}${cardShape(244, 180, 10, "#99f6e4")}<path d="M170 344c52 56 128 60 184 4" fill="none" stroke="#111827" stroke-width="20" stroke-linecap="round"/><path d="m338 310 38 40-46 30" fill="none" stroke="#111827" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function shovel() {
  return `<path d="M150 352c76-72 188-72 264 0v56H150z" fill="#92400e" stroke="#111827" stroke-width="12"/><path d="m178 310 176-176" stroke="#111827" stroke-width="24" stroke-linecap="round"/><path d="m328 94 70 70-50 50-70-70z" fill="#94a3b8" stroke="#111827" stroke-width="14" stroke-linejoin="round"/>${cardShape(206, 296, -12, "#dbeafe")}`;
}

function gift() {
  return `${cardShape(190, 206, -8, "#fce7f3")}<path d="M130 306h252" stroke="#111827" stroke-width="18" stroke-linecap="round"/><path d="M178 176c-38 0-58 52-4 62h82c-20-42-44-62-78-62Zm156 0c38 0 58 52 4 62h-82c20-42 44-62 78-62Z" fill="#f472b6" stroke="#111827" stroke-width="12" stroke-linejoin="round"/>`;
}

function potluck() {
  return `<path d="M132 356c72-48 176-48 248 0v42H132z" fill="#854d0e" stroke="#111827" stroke-width="14"/><path d="M162 216h188l-18 142H180z" fill="#fef3c7" stroke="#111827" stroke-width="14" stroke-linejoin="round"/><path d="M190 216c10-66 122-66 132 0" fill="none" stroke="#111827" stroke-width="14"/><circle cx="214" cy="280" r="18" fill="#ef4444"/><circle cx="260" cy="266" r="18" fill="#22c55e"/><circle cx="304" cy="292" r="18" fill="#f59e0b"/>${cardShape(112, 116, -18, "#dbeafe")}${cardShape(308, 122, 18, "#fce7f3")}`;
}

function swirlCards() {
  return `<path d="M134 288c-50-126 128-216 230-118 102 98 12 260-120 218" fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round"/><path d="m226 418 76-10-42-62" fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>${cardShape(156, 136, -22, "#fce7f3")}${cardShape(270, 156, 18, "#e0f2fe")}${cardShape(220, 260, 2, "#fef3c7")}`;
}

function crown() {
  return `<path d="M150 360h212l-26-148 54-74-90 28-44-92-44 92-90-28 54 74z" fill="#facc15" stroke="#111827" stroke-width="16" stroke-linejoin="round"/><circle cx="256" cy="282" r="54" fill="#fff7ed" stroke="#111827" stroke-width="14"/><path d="M222 282h68" stroke="#111827" stroke-width="16" stroke-linecap="round"/>`;
}

function horns() {
  return `<circle cx="256" cy="270" r="106" fill="#7f1d1d" stroke="#111827" stroke-width="16"/><path d="M178 188 108 92c82 10 118 44 126 96M334 188l70-96c-82 10-118 44-126 96" fill="#f97316" stroke="#111827" stroke-width="14" stroke-linejoin="round"/><circle cx="218" cy="254" r="16" fill="#fef2f2"/><circle cx="294" cy="254" r="16" fill="#fef2f2"/><path d="M214 326c32-24 52-24 84 0" fill="none" stroke="#fef2f2" stroke-width="14" stroke-linecap="round"/>`;
}

function flame() {
  return `<path d="M254 426c-86-46-102-132-42-200 38-42 40-92 20-142 82 46 144 122 118 202 34-24 48-58 48-92 54 88 22 196-62 232z" fill="#fb923c" stroke="#111827" stroke-width="16" stroke-linejoin="round"/><path d="M248 388c-36-30-36-72 0-116 42 34 58 74 28 116z" fill="#fef3c7"/>`;
}

const missing = [];
for (const id of ids) {
  const out = path.join(outputDir, `${id}.webp`);
  if (fs.existsSync(out)) continue;
  const [primary, secondary, motif] = styles[id] ?? ["#334155", "#e2e8f0", eyeCards(3)];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" fill="none"/>
      <circle cx="256" cy="256" r="224" fill="${secondary}" opacity="0.9"/>
      <path d="M94 390c72-58 250-58 324 0" fill="none" stroke="${primary}" stroke-width="42" stroke-linecap="round" opacity="0.42"/>
      ${motif}
    </svg>
  `;
  await sharp(Buffer.from(svg)).webp({ quality: 92 }).toFile(out);
  missing.push(id);
}

console.log(`Generated ${missing.length} missing card assets: ${missing.join(", ") || "none"}`);
