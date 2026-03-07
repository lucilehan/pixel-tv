# 📺 Pixel Tube

> Your in-editor broadcast player — flip through curated channels while you code. Sits in your Explorer sidebar, remembers your last channel, and shows what's on in the status bar.


<img src="media/02-playing.png" width="320" alt="Pixel Tube playing Nintendo Radio">

---

## What it does

Pixel Tube lives permanently in your Explorer sidebar. Pick a **Channel**, click a broadcast, and it keeps playing while you code.

- **Channels** — four curated environments (Music, News, Entertainment, Touch Grass), each with hand-picked 24/7 broadcasts
- **Channel Memory** — remembers what you were tuned into. Reopen your IDE and a "Last Tuned" banner lets you resume in one click
- **Status Bar** — shows what's on at all times. Click it to switch channels or stop without touching the sidebar
- **Search** — filter built-in channels instantly, or connect a YouTube API key to search all of YouTube

---

## Installation

### Antigravity IDE

```bash
antigravity --install-extension https://github.com/lucilehan/pixel-tube/releases/latest/download/pixel-tube.vsix
```

Or install a `.vsix` manually:

```bash
antigravity --install-extension pixel-tube-1.1.0.vsix
```

### VS Code

Available on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=lucilehan.pixel-tube) — search **"Pixel Tube"** in the Extensions sidebar.

Or install a `.vsix` manually:

```bash
code --install-extension pixel-tube-1.1.0.vsix
```

### Open VSX (Gitpod, VSCodium, etc.)

Available on the [Open VSX Registry](https://open-vsx.org/extension/lucilehan/pixel-tube) — search **"Pixel Tube"** in the Extensions sidebar.

---

## Usage

Open the Explorer panel and scroll down to **Pixel Tube** — or use the keyboard shortcut:

| Action | macOS | Windows / Linux |
|--------|-------|-----------------|
| Open Pixel Tube | `Cmd+Shift+Y, T` | `Ctrl+Shift+Y, T` |
| Reset setup (reselect channels) | `Cmd+Shift+Alt+Y` | `Ctrl+Shift+Alt+Y` |
| Switch channel / Stop | Click status bar item | Click status bar item |
| Command palette | `Pixel Tube: Open` | `Pixel Tube: Now Playing / Change Room` |
| Pause / Play | Media Pause/Play key | Media Pause/Play key |
| Volume up / down | Media Volume keys | Media Volume keys |

On first launch you'll pick which channels to load. After that, just pick a channel and the TV tunes in.

---

## Channels

Four environments, each with curated 24/7 broadcasts:

| Channel | What's on |
|---------|-----------|
| 🎧 Music | Lofi, jazz, Nintendo Radio, K-POP — perfect focus beats |
| 📰 News | Global coverage and financial updates |
| 🎬 Entertainment | Films, compilations, city cams and more |
| 🌿 Touch Grass | Nature, wildlife, and the outdoors |

---

## Search (recommended)

The search bar filters built-in channels by default. To search all of YouTube, add a YouTube Data API v3 key:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create an API key with **YouTube Data API v3** enabled
2. Open your IDE settings and search `pixelTube`
3. Paste your key into **Pixel Tube: Youtube Api Key**

Your key is stored locally in your IDE settings and never committed to any repository.

---

## Building from Source

```bash
git clone https://github.com/lucilehan/pixel-tube.git
cd pixel-tube
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

- **Bug reports / feature requests** — open an [Issue](https://github.com/lucilehan/pixel-tube/issues)
- **Code changes** — fork → branch → PR against `main`

---

## Changelog

### 1.2.1
- **Icon tweak**: Adjusted brightness, contrast, and saturation of the new dark wood icon for better visibility

### 1.2.0
- **New icon**: dark wood exterior matching the in-editor TV, red LED, red antenna tips
- **Fix**: content no longer bleeds below the screen when the panel is minimized

### 1.1.3
- **Featured Landing**: Nintendo Radio now appears as a "Featured" banner on first launch
- **Smooth Browsing**: Toggling channels no longer interrupts your current playback
- **Sticky Equalizer**: Audio animation now stays on the currently playing video during searches and room switching
- **New Shortcut**: Call Pixel Tube with `Cmd+Shift+Y, T` (chord) to avoid debug conflicts
- **Visuals**: Scaled down README screenshots for better legibility and removed old demo GIF

### 1.1.2
- Enhanced searchability with new keywords (entertainment, news, stream, video)

### 1.1.1
- Fixed extension metadata and repository URLs for VS Code Marketplace stability
- Synchronized package-lock configurations

### 1.1.0
- Renamed to **Pixel Tube** (removed Dev suffix)
- New channels: Entertainment (Lord of the Rings, Harry Potter, EarthCam), updated Music (Nintendo Radio, K-POP), updated News (LiveNOW FOX, Bloomberg)
- API key input added to first-run setup screen
- Setup page redesigned for legibility — channel names, descriptions, amber accents
- TV exterior now fills full sidebar width
- Loading overlay auto-dismisses on timeout

### 1.0.3
- Bumped version to resolve a publication conflict on Open VSX
- Automated `.vsix` attachments on GitHub Releases for direct Antigravity installs

### 1.0.2
- **Channels** — replaced genre chips with four named channels: 🎧 Music, 📰 News, 🌌 Ambient, 🌿 Touch Grass
- **Channel Memory** — remembers last tuned; resume banner on reload
- **Status Bar** — indicator shows what's on; click to change channel or stop
- First-run setup screen to pick active channels
- Refreshed curated channel list organized by category
- Security hardening: CSP nonces, video ID validation, XSS-safe DOM rendering, local server host validation

### 1.0.1
- Moved into the Explorer sidebar
- Tuning-first design — curated channels, no setup required
- Optional YouTube API key for search
- Local HTTP server for in-editor playback

### 1.0.0
- Initial release

---

*Made with 📺 by [lucile han](https://github.com/lucilehan)*
