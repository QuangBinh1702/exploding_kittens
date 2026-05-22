import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const source = fs.readFileSync(path.join(process.cwd(), "src", "data", "cardsData.ts"), "utf8");
const ids = [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);

const missing = [];
const wrongSize = [];

for (const id of ids) {
  const filePath = path.join(process.cwd(), "public", "assets", "cards", `${id}.webp`);
  if (!fs.existsSync(filePath)) {
    missing.push(id);
    continue;
  }

  const metadata = await sharp(filePath).metadata();
  if (metadata.width !== 1024 || metadata.height !== 1024) {
    wrongSize.push(`${id}: ${metadata.width}x${metadata.height}`);
  }
}

if (missing.length || wrongSize.length) {
  if (missing.length) console.error(`Missing assets: ${missing.join(", ")}`);
  if (wrongSize.length) console.error(`Wrong-size assets: ${wrongSize.join(", ")}`);
  process.exit(1);
}

console.log(`Verified ${ids.length} card assets at 1024x1024.`);
