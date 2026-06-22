const sharp = require("sharp");
const path  = require("path");
const src   = path.join(__dirname, "public", "icon-512.png");
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
(async () => {
  for (const s of sizes) {
    await sharp(src).resize(s, s).toFile(path.join(__dirname, "public", `icon-${s}.png`));
    console.log(`✓ icon-${s}.png`);
  }
  console.log("Done!");
})();
