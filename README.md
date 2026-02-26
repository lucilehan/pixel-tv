# 📺 Pixel TV

> Tune into live YouTube streams inside your IDE — like flipping channels on a retro TV. Sits in your sidebar, remembers your last channel, and shows what's on in the status bar.

![Pixel TV](https://github.com/lucilehan/pixel-tv/raw/main/media/preview.png)

---

## What it does

Pixel TV sits permanently in your sidebar. Pick a **Room**, click a channel, and it keeps playing while you code.

- **Rooms** — four curated environments (The Café, Rainy Library, Mission Control, Vibe Coding), each with hand-picked 24/7 live streams that match the vibe
- **Channel Memory** — remembers what you were watching. Reopen your IDE and a "Last Watched" banner lets you resume in one click
- **Status Bar** — shows what's on at all times. Click it to change room or stop without opening the sidebar

Think of it less like a video player and more like a TV set that happens to live in your editor — you don't search for content, you just change the channel.

---

## Installation

### Antigravity IDE

Install directly from the command line:

```bash
antigravity --install-extension https://github.com/lucilehan/pixel-tv/releases/latest/download/pixel-tv.vsix
```

Or install a `.vsix` file manually:

```bash
antigravity --install-extension pixel-tv-1.0.2.vsix
```

### VS Code

Available on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=lucilehan.pixel-tv) — search **"Pixel TV"** in the Extensions sidebar.

Or install a `.vsix` file manually:

```bash
code --install-extension pixel-tv-1.0.2.vsix
```

### Open VSX (Gitpod, Codium, etc.)

Available on the [Open VSX Registry](https://open-vsx.org/extension/lucilehan/pixel-tv) — search **"Pixel TV"** in the Extensions sidebar.

---

## Usage

Open the Explorer panel and scroll down to **Pixel TV** — or use the keyboard shortcut:

| Action | macOS | Windows / Linux |
|--------|-------|-----------------|
| Open Pixel TV | `Cmd+Shift+Y` | `Ctrl+Shift+Y` |
| Change room / Stop | Click status bar item | Click status bar item |
| Command palette | `Pixel TV: Open` | `Pixel TV: Now Playing / Change Room` |

Pick a Room, click a channel, and the TV tunes in. The status bar item in the bottom-right shows what's currently on air.

---

## Rooms

Four named environments, each with curated 24/7 live streams:

| Room | Vibe | What's on |
|------|------|-----------|
| ☕ The Café | A corner table by the window. It's raining. | Jazz, bossa nova, coffee shop radio |
| 🌧 Rainy Library | Dark academia. Lamp on. Pages turning. | Lofi Girl, Chillhop |
| 🚀 Mission Control | Synthwave and neon. Somewhere in the future. | Synthwave Plaza, retrowave |
| 🧑‍💻 Vibe Coding | Others are coding too. You're not alone. | Brain Food, study-with-me streams |

---

## Live Stream Search (optional)

If you want to search beyond the built-in channels, add a free YouTube Data API v3 key in Settings — the search bar will then pull live streams directly from YouTube.

**To set up:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a free API key with YouTube Data API v3 enabled
2. Open your IDE settings and search `pixelTv`
3. Paste your key into **Pixel TV: Youtube Api Key**

Your key is stored locally in your IDE's settings and never committed to any repository.

Without a key, the search bar filters the built-in channel list only.

---

## Building from Source

```bash
git clone https://github.com/lucilehan/pixel-tv.git
cd pixel-tv
npm install
npm run compile
```

To package:

```bash
npm install -g @vscode/vsce
vsce package
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

- **Bug reports / feature requests** — open an [Issue](https://github.com/lucilehan/pixel-tv/issues)
- **Code changes** — fork → branch → PR against `main`

---

## Changelog

### 1.0.2
- **Rooms** — genre chips replaced with four named rooms: ☕ The Café, 🌧 Rainy Library, 🚀 Mission Control, 🧑‍💻 Vibe Coding. Each room has its own vibe description and curated channels
- **Channel Memory** — Pixel TV remembers what you were watching. On reload, a "Last Watched" banner appears so you can resume in one click
- **Status Bar** — a live indicator shows what's on. Click it to change room or stop playback without opening the sidebar
- Refreshed channel list organized by room
- "LIVE CHANNELS" header renamed to "ON AIR"
- Security hardening: CSP nonces, videoId validation, XSS-safe DOM rendering, local server protections

### 1.0.1
- Moved into the **Explorer sidebar** underneath Timeline
- Tuning-first design — curated live channels by genre, no setup required
- Optional YouTube API key for live stream search
- Local HTTP server to enable in-editor YouTube playback
- Fixed layout stability — panel size never shifts on interaction

### 1.0.0
- Initial release

---

*Made with 📺 by [lucile han](https://github.com/lucilehan)*
