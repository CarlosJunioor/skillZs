import sharp from "sharp";
import path from "node:path";

const src = "C:/Users/Carlos Junior/Desktop/skillZsfavi.png";
const out = "C:/Users/Carlos Junior/claude-projects/skillZs/app";

await sharp(src)
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(out, "icon.png"));

await sharp(src)
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(out, "apple-icon.png"));

console.log("ok");
