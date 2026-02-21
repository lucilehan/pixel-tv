# 📺 Pixel TV

> A retro pixel-art CRT television that lives inside VS Code and Antigravity — tune in to YouTube without leaving your editor.

![Pixel TV Screenshot](https://github.com/lucilehan/pixel-tv/raw/main/media/preview.png)

---

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=lucilehan.pixel-tv) or search **"Pixel TV"** in the Extensions sidebar.

Or install manually from a `.vsix`:

```bash
code --install-extension pixel-tv-1.0.0.vsix
```

---

## Usage

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:

```
Pixel TV: Open
```

Or use the keyboard shortcut:

| Platform | Shortcut |
|----------|----------|
| macOS    | `Cmd+Shift+Y` |
| Windows / Linux | `Ctrl+Shift+Y` |

The TV opens as a side panel — code on the left, vibes on the right. 📺

---

## Features

### 🎛️ Retro Pixel-Art TV Shell
A handcrafted CRT television with wood-grain cabinet, thick plastic bezel, checkered channel knobs, speaker grille, and stepped pixel legs. Everything is pure CSS — no images.

### 🔍 Built-in Search
Type anything into the search bar and hit **TUNE** — the TV scans its channel library and surfaces the best matches.

### ⚡ Quick-Access Genre Chips
One-click chips to instantly tune into your favourite category:

| Chip | Genre |
|------|-------|
| ◎ LOFI | Lo-fi hip hop & chill beats |
| ▶ SYNTH | Synthwave & retrowave |
| ♪ JAZZ | Jazz, bossa nova & coffee shop |
| ~ NATURE | Rain, ocean waves & forest ambience |
| ⚡ GAMING | Epic gaming & EDM mixes |
| ✦ FOCUS | Deep focus, binaural beats & classical |

### 📡 Always-On Channel List
The right panel shows available channels at all times — browse and switch without interrupting your flow.

### 🎚️ Draggable Knobs
Spin the **CH** and **VOL** dials with your mouse. The CH dial animates every time you switch channels.

### 📺 In-Editor Playback
Videos embed directly using `youtube-nocookie.com` — no ads, no tracking, no leaving the editor.

---

## Configuration

Pixel TV currently requires no configuration. Just open it and tune in.

Coming soon:
- Custom video library (add your own channel IDs)
- Volume control wired to dial position
- Theme variants (green phosphor, amber phosphor, B&W)

---

## Keyboard Shortcuts

| Command | Shortcut |
|---------|----------|
| Open Pixel TV | `Cmd+Shift+Y` / `Ctrl+Shift+Y` |
| Focus search | Click the search bar inside the TV |

---

## How it Works

Pixel TV runs as a VS Code [Webview Panel](https://code.visualstudio.com/api/extension-guides/webview). YouTube videos are embedded via `youtube-nocookie.com` iframes, which are permitted inside VS Code webviews. The entire TV shell — cabinet, antennas, knobs, legs — is rendered with pure CSS using pixel-perfect box-shadows and hard edges.

---

## Building from Source

```bash
git clone https://github.com/lucilehan/pixel-tv.git
cd pixel-tv
npm install
npm run compile
```

To launch in debug mode, open the project in VS Code and press `F5`.

To package:

```bash
npm install -g @vscode/vsce
vsce package
```

---

## Contributing

Issues and pull requests are welcome! If you have a channel you'd love to see in the default library, open an issue with the YouTube video ID and genre.

1. Fork the repo
2. Create your branch: `git checkout -b my-feature`
3. Commit your changes: `git commit -m 'add feature'`
4. Push: `git push origin my-feature`
5. Open a Pull Request

---

## Changelog

### 1.0.0
- Initial release
- Pixel-art CRT TV shell
- Built-in video library with 23 channels across 6 genres
- Search with scoring algorithm
- Quick-access genre chips
- Draggable CH and VOL knobs
- In-editor YouTube playback via `youtube-nocookie.com`

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*Made with 📺 by [lucile han](https://github.com/lucilehan)*
