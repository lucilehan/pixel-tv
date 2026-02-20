# Pixel TV

Watch YouTube videos inside VS Code through a pixel-art retro TV 📺

## Features
- Pixel-art CRT TV shell with vintage aesthetics
- Search YouTube and tune into channels
- Quick-access genre chips: Lofi, Synth, Jazz, Nature, Gaming, Focus
- Draggable CH and VOL knobs
- Amber phosphor UI theme

## Usage
- Open the Command Palette → **Pixel TV: Open**
- Or press `Ctrl+Shift+Y` / `Cmd+Shift+Y`

## Requirements
VS Code 1.75.0 or higher (also works in Cursor).

## Building
```bash
npm install
npm run compile
```

## Packaging
```bash
npm install -g @vscode/vsce
vsce package
```
