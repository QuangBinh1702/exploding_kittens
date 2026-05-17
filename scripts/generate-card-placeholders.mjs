import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const source = fs.readFileSync(path.join(process.cwd(), "src", "data", "cardsData.ts"), "utf8");
const ids = [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
const outputDir = path.join(process.cwd(), "public", "assets", "cards");
fs.mkdirSync(outputDir, { recursive: true });

const palette = [
  ["#dc2626", "#fde68a"],
  ["#059669", "#a7f3d0"],
  ["#111827", "#f97316"],
  ["#0284c7", "#bae6fd"],
  ["#c026d3", "#fbcfe8"],
  ["#4f46e5", "#c7d2fe"],
  ["#db2777", "#fecdd3"],
  ["#292524", "#d6d3d1"],
  ["#d97706", "#fef3c7"],
  ["#0f766e", "#ccfbf1"],
  ["#7c3aed", "#ddd6fe"],
  ["#be123c", "#ffe4e6"],
];

function motif(id) {
  if (id.includes("exploding") || id.includes("catomic")) {
    return `<g fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round"><path d="M256 100v312M100 256h312M148 148l216 216M364 148 148 364"/></g><circle cx="256" cy="256" r="92" fill="#fef3c7"/><circle cx="256" cy="256" r="48" fill="#ef4444"/>`;
  }
  if (id.includes("defuse")) {
    return `<path d="M172 320c70-58 103-129 90-214 90 50 115 141 78 226" fill="none" stroke="#064e3b" stroke-width="28" stroke-linecap="round"/><circle cx="256" cy="322" r="82" fill="#ecfdf5"/><path d="m214 322 30 30 64-78" fill="none" stroke="#059669" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (id.includes("future")) {
    return `<circle cx="256" cy="246" r="122" fill="#eef2ff"/><circle cx="256" cy="246" r="62" fill="#818cf8"/><path d="M150 246c52-80 160-80 212 0-52 80-160 80-212 0Z" fill="none" stroke="#111827" stroke-width="18"/><circle cx="256" cy="246" r="24" fill="#111827"/>`;
  }
  if (id.includes("attack")) {
    return `<path d="M100 284 324 116l-48 110 136 2-224 168 48-110-136-2Z" fill="#fef3c7" stroke="#111827" stroke-width="18" stroke-linejoin="round"/>`;
  }
  if (id.includes("shuffle") || id.includes("swap") || id.includes("reverse")) {
    return `<g fill="none" stroke="#111827" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path d="M130 190h92c66 0 78 132 144 132h24"/><path d="m356 286 38 36-38 36"/><path d="M130 322h92c66 0 78-132 144-132h24"/><path d="m356 154 38 36-38 36"/></g>`;
  }
  if (id.includes("skip")) {
    return `<g fill="none" stroke="#111827" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"><path d="M150 140v232l88-88 88 88V140"/><path d="m338 160 54 96-54 96"/></g>`;
  }
  if (id.includes("nope")) {
    return `<circle cx="256" cy="256" r="142" fill="#fee2e2" stroke="#111827" stroke-width="22"/><path d="M162 350 350 162" stroke="#dc2626" stroke-width="34" stroke-linecap="round"/>`;
  }
  if (id.includes("tower")) {
    return `<path d="M160 398h192l-22-176 42-58-70 12-46-72-46 72-70-12 42 58-22 176Z" fill="#fef3c7" stroke="#111827" stroke-width="18" stroke-linejoin="round"/>`;
  }
  if (id.includes("bury")) {
    return `<path d="M104 350c84-72 220-72 304 0v54H104v-54Z" fill="#92400e"/><path d="M256 124v206" stroke="#111827" stroke-width="22" stroke-linecap="round"/><path d="m190 252 66 78 66-78" fill="none" stroke="#111827" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return `<g fill="#fff7ed" stroke="#111827" stroke-width="16" stroke-linejoin="round"><circle cx="256" cy="260" r="118"/><path d="M152 180 108 102l96 28M360 180l44-78-96 28"/></g><g fill="#111827"><circle cx="218" cy="246" r="15"/><circle cx="294" cy="246" r="15"/><path d="M236 292h40l-20 22z"/></g>`;
}

await Promise.all(
  ids.map((id, index) => {
    const [primary, secondary] = palette[index % palette.length];
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
        <rect width="512" height="512" fill="none"/>
        <circle cx="256" cy="256" r="220" fill="${secondary}" opacity="0.82"/>
        <path d="M88 392c66-52 270-52 336 0" fill="none" stroke="${primary}" stroke-width="44" stroke-linecap="round" opacity="0.42"/>
        ${motif(id)}
      </svg>
    `;
    return sharp(Buffer.from(svg)).webp({ quality: 92 }).toFile(path.join(outputDir, `${id}.webp`));
  }),
);

console.log(`Generated ${ids.length} illustrated card assets in ${outputDir}`);
