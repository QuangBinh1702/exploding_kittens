import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const source = fs.readFileSync(path.join(process.cwd(), "src", "data", "cardsData.ts"), "utf8");
const ids = [...source.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);

const thumbSize = 160;
const columns = Math.ceil(Math.sqrt(ids.length));
const rows = Math.ceil(ids.length / columns);
const buffers = await Promise.all(
  ids.map((id) => sharp(path.join("public", "assets", "cards", `${id}.webp`)).resize(thumbSize, thumbSize).toBuffer()),
);

await sharp({
  create: {
    width: columns * thumbSize,
    height: rows * thumbSize,
    channels: 3,
    background: "#f8f3e8",
  },
})
  .composite(
    buffers.map((input, index) => ({
      input,
      left: (index % columns) * thumbSize,
      top: Math.floor(index / columns) * thumbSize,
    })),
  )
  .jpeg({ quality: 90 })
  .toFile(path.join("public", "assets", "cards", "generated-preview.jpg"));

console.log("Wrote public/assets/cards/generated-preview.jpg");
