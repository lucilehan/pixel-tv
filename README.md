# 📺 Pixel TV

> Tune into live YouTube streams inside VS Code — like flipping channels on a retro TV. Sits in your Explorer sidebar, remembers your last channel, and shows what's on in the status bar.

![Pixel TV](https://github.com/lucilehan/pixel-tv/raw/main/media/preview.png)

---

## What it does

Pixel TV sits permanently in your Explorer panel underneath Timeline. Pick a **Room**, click a channel, and it keeps playing while you code.

- **Rooms** — four curated environments (The Café, Rainy Library, Mission Control, Vibe Coding), each with hand-picked 24/7 live streams that match the vibe
- **Channel Memory** — remembers what you were watching. Reopen VS Code and a "Last Watched" banner lets you resume in one click
- **Status Bar** — shows what's on in the bottom bar at all times. Click it to change room or stop without opening the sidebar

Think of it less like a video player and more like a TV set that happens to live in your editor — you don't search for content, you just change the channel.

---

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=lucilehan.pixel-tv) or search **"Pixel TV"** in the Extensions sidebar.

Or install manually from a `.vsix`:

```bash
code --install-extension pixel-tv-1.0.1.vsix
```

---

## Usage

Open the Explorer panel (`Cmd+Shift+E`) and scroll down to **Pixel TV** — or jump to it directly:

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

If you want to search beyond the built-in channels, add a free YouTube Data API v3 key in Settings and the search bar will pull live streams directly from YouTube.

**To set up:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a free API key with YouTube Data API v3 enabled
2. Open VS Code Settings (`Cmd+,`) and search `pixelTv`
3. Paste your key into **Pixel TV: Youtube Api Key**

Your key is stored locally in VS Code's settings and never committed to any repository.

Without a key, the search bar filters the built-in channel list only.

---

## Building from Source

```bash
git clone https://github.com/lucilehan/pixel-tv.git
cd pixel-tv
npm install
npm run compile
```

Press `F5` in VS Code to launch in debug mode.

To package:

```bash
npm install -g @vscode/vsce
vsce package
```

---

## Changelog

### 1.0.2
- **Rooms** — genre chips replaced with four named rooms: ☕ The Café, 🌧 Rainy Library, 🚀 Mission Control, 🧑‍💻 Vibe Coding. Each room has its own vibe description and curated channels
- **Channel Memory** — Pixel TV remembers what you were watching. On reload, a "Last Watched" banner appears on screen so you can resume in one click
- **Status Bar** — a live indicator appears in the VS Code status bar showing what's on. Click it to change room or stop playback without opening the sidebar
- Refreshed channel list organized by room
- "LIVE CHANNELS" header renamed to "ON AIR"

### 1.0.1
- Moved into the **Explorer sidebar** underneath Timeline
- Tuning-first design — curated live channels by genre, no setup required
- Optional YouTube API key for live stream search
- Local HTTP server to enable in-editor YouTube playback
- Fixed layout stability — panel size never shifts on interaction
- Refreshed channel list with only persistent 24/7 streams
- Updated icon and screenshot

### 1.0.0
- Initial release

---

*Made with 📺 by [lucile han](https://github.com/lucilehan)*
