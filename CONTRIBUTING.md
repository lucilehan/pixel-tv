# Contributing to Pixel TV

Thanks for taking the time to contribute! Here's everything you need to know.

---

## Reporting Issues

Use the [GitHub Issues](https://github.com/lucilehan/pixel-tv/issues) tracker.

Before opening a new issue, please search existing issues to avoid duplicates. When filing a bug, include:

- **IDE and version** (e.g. Antigravity 1.2, VS Code 1.87)
- **Extension version** (visible in the Extensions panel)
- **Steps to reproduce**
- **Expected vs. actual behavior**
- **Screenshots or recordings** if relevant (especially for layout or visual bugs)

---

## Suggesting Features

Open an issue with the `enhancement` label. Describe:

- What the feature does
- Why it would be useful
- Any prior art or inspiration

---

## Submitting a Pull Request

1. **Fork** the repository and create a branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Install dependencies** and compile:
   ```bash
   npm install
   npm run compile
   ```

3. **Make your changes** in `src/extension.ts` (all logic and HTML live here)

4. **Test manually** — press `F5` in VS Code / Antigravity to launch a debug instance

5. **Commit with a conventional prefix:**
   ```
   feature: add seasonal rooms
   fix: resume banner not dismissing
   docs: update contributing guide
   ```

6. **Open a PR** against `main`. Fill in the pull request template.

---

## Code Style

- TypeScript for the extension host (`src/extension.ts`)
- All HTML and CSS is embedded in the same file — keep it that way for now
- Security-first: never pass unsanitized values into `innerHTML`; use `escHtml` or `textContent`
- CSP and server hardenings must not be weakened without a documented reason

---

## Setting Up the Project

```bash
git clone https://github.com/lucilehan/pixel-tv.git
cd pixel-tv
npm install
npm run compile
```

Launch in debug mode (VS Code / Antigravity): press `F5`.

Package a `.vsix`:
```bash
npm install -g @vscode/vsce
vsce package
```

---

## Questions?

Open a [Discussion](https://github.com/lucilehan/pixel-tv/discussions) or ping [@lucilehan](https://github.com/lucilehan) in the issue.
