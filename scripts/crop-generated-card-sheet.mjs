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
const cellWidth = Math.floor(metadata.width / columns);
const cellHeight = Math.floor(metadata.height / rows);
const insetX = Math.max(0, Math.floor(cellWidth * 0.035));
const insetY = Math.max(0, Math.floor(cellHeight * 0.035));
const cropWidth = cellWidth - insetX * 2;
const cropHeight = cellHeight - insetY * 2;

if (ids.length !== columns * rows) {
  console.error(`Expected ${columns * rows} cards, found ${ids.length}.`);
  process.exit(1);
}

await Promise.all(
  ids.map((id, index) => {
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    return sharp(sheetPath)
      .extract({ left: left + insetX, top: top + insetY, width: cropWidth, height: cropHeight })
      .resize(1024, 1024, { fit: "cover", kernel: "lanczos3" })
      .webp({ quality: 96 })
      .toFile(path.join(outputDir, `${id}.webp`));
  }),
);

console.log(`Cropped ${ids.length} generated card assets into ${outputDir}`);
console.log(`Original placeholder assets backed up in ${backupDir}`);
