import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , sheetPathArg] = process.argv;

if (!sheetPathArg) {
  console.error("Usage: node scripts/crop-generated-card-sheet.mjs <sheet.png>");
  process.exit(1);
}

const sheetPath = path.resolve(sheetPathArg);
const outputDir = path.join(process.cwd(), "public", "assets", "cards");
const backupDir = path.join(outputDir, "_placeholder-backup");
const source = fs.readFileSync(path.join(process.cwd(), "src", "data", "cardsData.ts"), "utf8");
const ids = [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);

if (!fs.existsSync(sheetPath)) {
  console.error(`Sheet not found: ${sheetPath}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(backupDir, { recursive: true });

for (const id of ids) {
  const currentPath = path.join(outputDir, `${id}.webp`);
  const backupPath = path.join(backupDir, `${id}.webp`);
  if (fs.existsSync(currentPath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(currentPath, backupPath);
  }
}

const metadata = await sharp(sheetPath).metadata();
if (!metadata.width || !metadata.height) {
  console.error("Unable to read sheet dimensions.");
  process.exit(1);
}

const columns = Math.ceil(Math.sqrt(ids.length));
const rows = Math.ceil(ids.length / columns);
const defaultTrim = { top: 0, right: 0, bottom: 0, left: 0 };
const edgeTrims = {
  potluck: { right: 14 },
  "shuffle-now": { right: 8 },
  armageddon: { right: 8 },
  godcat: { right: 8 },
  devilcat: { right: 8 },
  "raising-heck": { right: 8 },
  "reveal-the-future-3x": { right: 8 },
};
const gridX = [0, 160, 320, 480, 640, 800, 960, metadata.width];
const gridY = [0, 160, 320, 480, 640, 800, 948, metadata.height];

if (metadata.width !== 1120 || metadata.height !== 1120) {
  console.error(`This sheet crop map expects a 1120x1120 generated card sheet, got ${metadata.width}x${metadata.height}.`);
  process.exit(1);
}

if (gridX.length !== columns + 1 || gridY.length !== rows + 1) {
  console.error("Grid boundary map does not match the expected card grid.");
  process.exit(1);
}

if (ids.length !== columns * rows) {
  console.error(`Expected ${columns * rows} cards, found ${ids.length}.`);
  process.exit(1);
}

await Promise.all(
  ids.map((id, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = gridX[column];
    const top = gridY[row];
    const right = gridX[column + 1];
    const bottom = gridY[row + 1];
    const trim = { ...defaultTrim, ...edgeTrims[id] };
    const extractLeft = left + trim.left;
    const extractTop = top + trim.top;
    const extractWidth = right - left - trim.left - trim.right;
    const extractHeight = bottom - top - trim.top - trim.bottom;
    return sharp(sheetPath)
      .extract({ left: extractLeft, top: extractTop, width: extractWidth, height: extractHeight })
      .resize(1024, 1024, { fit: "contain", background: "#f5ecd6", kernel: "lanczos3" })
      .webp({ quality: 98 })
      .toFile(path.join(outputDir, `${id}.webp`));
  }),
);

console.log(`Cropped ${ids.length} generated card assets by exact ${columns}x${rows} grid cells into ${outputDir}`);
console.log(`Original placeholder assets backed up in ${backupDir}`);
