import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let panel: vscode.WebviewPanel | undefined;

  // Command: open player (prompts for URL)
  const openCmd = vscode.commands.registerCommand('pixelTv.open', async () => {
    const url = await vscode.window.showInputBox({
      prompt: 'Enter a YouTube URL or video ID',
      placeHolder: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      value: '',
    });
    if (url) {
      openPlayer(url, context, panel);
    } else {
      // Open with empty player
      openPlayer('', context, panel);
    }
  });

  // Command: open with a URL passed programmatically
  const openWithUrlCmd = vscode.commands.registerCommand('pixelTv.openWithUrl', (url: string) => {
    openPlayer(url ?? '', context, panel);
  });

  context.subscriptions.push(openCmd, openWithUrlCmd);
}

function extractVideoId(input: string): string {
  if (!input) return '';
  // Already a bare video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    // Standard watch URL
    if (url.searchParams.get('v')) return url.searchParams.get('v')!;
    // Shortened youtu.be
    if (url.hostname === 'youtu.be') return url.pathname.slice(1);
    // Embed URL
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
  } catch {
    // Not a valid URL – return as-is and let the player handle it
  }
  return input;
}

function openPlayer(input: string, context: vscode.ExtensionContext, panel: vscode.WebviewPanel | undefined) {
  const videoId = extractVideoId(input);

  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    panel.webview.postMessage({ type: 'loadVideo', videoId });
    return;
  }

  panel = vscode.window.createWebviewPanel(
    'ytPlayer',
    '▶ Pixel TV',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getWebviewContent(videoId);

  // Handle messages sent from the webview back to VS Code
  panel.webview.onDidReceiveMessage((message) => {
    switch (message.type) {
      case 'openUrl':
        vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;
      case 'showError':
        vscode.window.showErrorMessage(message.text);
        break;
    }
  });

  panel.onDidDispose(() => {
    panel = undefined;
  });
}

function getWebviewContent(initialVideoId: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pixel TV</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0d0d0d;
      color: #e8e8e8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Top bar ── */
    #toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: #161616;
      border-bottom: 1px solid #2a2a2a;
      flex-shrink: 0;
    }

    #yt-logo {
      font-size: 18px;
      font-weight: 700;
      color: #ff0000;
      letter-spacing: -0.5px;
      white-space: nowrap;
    }

    #url-input {
      flex: 1;
      padding: 7px 12px;
      border-radius: 20px;
      border: 1px solid #333;
      background: #1e1e1e;
      color: #e8e8e8;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    #url-input:focus { border-color: #ff0000; }
    #url-input::placeholder { color: #555; }

    #load-btn {
      padding: 7px 16px;
      border-radius: 20px;
      border: none;
      background: #ff0000;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      white-space: nowrap;
    }
    #load-btn:hover { background: #cc0000; }
    #load-btn:active { transform: scale(0.97); }

    /* ── Player area ── */
    #player-wrapper {
      position: relative;
      flex: 1;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #player-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    #placeholder {
      text-align: center;
      color: #444;
      pointer-events: none;
    }
    #placeholder svg { opacity: 0.3; margin-bottom: 14px; }
    #placeholder p { font-size: 15px; margin-bottom: 6px; }
    #placeholder small { font-size: 12px; color: #333; }

    /* ── Quick-access bar ── */
    #quick-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 8px 12px;
      background: #111;
      border-top: 1px solid #222;
      flex-shrink: 0;
    }
    .quick-chip {
      padding: 4px 12px;
      border-radius: 14px;
      font-size: 11px;
      cursor: pointer;
      border: 1px solid #333;
      background: #1a1a1a;
      color: #bbb;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .quick-chip:hover { background: #ff0000; color: #fff; border-color: #ff0000; }
  </style>
</head>
<body>

  <div id="toolbar">
    <span id="yt-logo">▶ YT</span>
    <input id="url-input" type="text" placeholder="Paste YouTube URL or video ID…" />
    <button id="load-btn">Play</button>
  </div>

  <div id="player-wrapper">
    <div id="placeholder">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="#ff0000">
        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>
      </svg>
      <p>No video loaded</p>
      <small>Paste a YouTube URL above and press Play</small>
    </div>
    <iframe id="player-frame" style="display:none"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen>
    </iframe>
  </div>

  <div id="quick-bar">
    <span class="quick-chip" data-id="jNQXAC9IVRw">🎵 First YouTube Video</span>
    <span class="quick-chip" data-id="dQw4w9WgXcQ">🎸 Never Gonna Give You Up</span>
    <span class="quick-chip" data-id="9bZkp7q19f0">🎤 Gangnam Style</span>
    <span class="quick-chip" data-id="kJQP7kiw5Fk">🌐 Despacito</span>
    <span class="quick-chip" data-id="L_jWHffIx5E">🎶 Smells Like Teen Spirit</span>
    <span class="quick-chip" data-id="hT_nvWreIhg">📊 Lo-fi Chill</span>
  </div>

<script>
  const vscode = acquireVsCodeApi();
  const urlInput = document.getElementById('url-input');
  const loadBtn = document.getElementById('load-btn');
  const frame = document.getElementById('player-frame');
  const placeholder = document.getElementById('placeholder');

  function extractVideoId(input) {
    if (!input) return '';
    input = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    try {
      const url = new URL(input);
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      if (url.hostname === 'youtu.be') return url.pathname.slice(1);
      const m = url.pathname.match(/\\/embed\\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[1];
    } catch(e) {}
    return input;
  }

  function loadVideo(videoId) {
    if (!videoId) return;
    const embedUrl =
      'https://www.youtube-nocookie.com/embed/' + videoId +
      '?autoplay=1&rel=0&modestbranding=1';
    frame.src = embedUrl;
    frame.style.display = 'block';
    placeholder.style.display = 'none';
  }

  loadBtn.addEventListener('click', () => {
    const id = extractVideoId(urlInput.value);
    if (id) { loadVideo(id); }
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadBtn.click();
  });

  // Quick chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      urlInput.value = 'https://www.youtube.com/watch?v=' + id;
      loadVideo(id);
    });
  });

  // Messages from extension host
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'loadVideo' && msg.videoId) {
      urlInput.value = 'https://www.youtube.com/watch?v=' + msg.videoId;
      loadVideo(msg.videoId);
    }
  });

  // Auto-load initial video
  const initialId = ${JSON.stringify(initialVideoId)};
  if (initialId) {
    urlInput.value = 'https://www.youtube.com/watch?v=' + initialId;
    loadVideo(initialId);
  }
</script>
</body>
</html>`;
}

export function deactivate() {}
