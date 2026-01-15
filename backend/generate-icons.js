import sharp from "sharp";

sharp("logo.png")
  .resize(192, 192)
  .toFile("icon-192.png");

sharp("logo.png")
  .resize(512, 512)
  .toFile("icon-512.png");
