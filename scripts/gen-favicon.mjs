import sharp from "sharp";
import path from "node:path";

const src = "C:/Users/Carlos Junior/Desktop/skillZs-removebg-preview.png";
const out = "C:/Users/Carlos Junior/claude-projects/skillZs/app";

const meta = await sharp(src).metadata();
const size = Math.min(meta.width, meta.height);
const r = size / 2;

const mask = Buffer.from(
  `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`
);

const circular = await sharp(src)
  .resize(size, size, { fit: "cover", position: "center" })
  .ensureAlpha()
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer();

await sharp(circular)
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(out, "icon.png"));

await sharp(circular)
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(out, "apple-icon.png"));

console.log("ok");
