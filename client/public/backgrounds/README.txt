Page backgrounds (video or photo)
=================================
Pages: login (sign-in, forgot, reset), dashboard (farmer), weather, marketplace (buyer dashboard + market prices).
List them in manifest.json. Names not listed keep the default gradient.

Video (recommended)
  "login": { "hd": "login-hd.mp4", "sd": "login-sd.mp4", "poster": "login-poster.webp" }
  - No audio, seamless loop, 10-20 s, H.264 .mp4 (or .webm).
  - hd: 1920 px wide, about 2-6 MB. sd: 960 px wide, about 0.5-1.3 MB (phones, slow networks).
  - poster: one frame as WebP. Shown while the video loads, and instead of it when the visitor
    has Reduce Motion or Data Saver on.
  - Sizes are also used by the browser as-is, so keep files small.

Photo
  "login": "login.webp"     (landscape JPEG/WebP, about 2400 px wide, under ~400 KB)

Only plain file names in this folder are accepted (no ../ and no URLs).
A dark overlay is added automatically so text stays readable (lighter one in the light theme).
Only use footage you own or are licensed to use, and add any credit the licence requires.
