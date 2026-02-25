import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

// ── Local server ───────────────────────────────────────────────────────────────
let server: http.Server | undefined;
let serverPort: number | undefined;

function getPlayerHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; background:#000; overflow:hidden; }
  iframe { width:100%; height:100%; border:none; display:block; }
</style>
</head>
<body>
<iframe
  src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  allowfullscreen
  style="width:100%;height:100%;border:none;display:block;">
</iframe>
</body>
</html>`;
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function startServer(): Promise<number> {
  if (server && serverPort) { return serverPort; }
  const port = await findFreePort();
  server = http.createServer((req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405);
      res.end();
      return;
    }

    const host = req.headers.host || '';
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      res.writeHead(403);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const rawVideoId = url.searchParams.get('v') || '';
    const videoIdMatch = rawVideoId.match(/^[a-zA-Z0-9_-]{11}$/);
    const videoId = videoIdMatch ? videoIdMatch[0] : '';

    if (!videoId) {
      res.writeHead(400);
      res.end('Invalid Video ID');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': `http://127.0.0.1:${port}`,
      'Content-Security-Policy': "frame-src https://www.youtube-nocookie.com; default-src 'none'; style-src 'unsafe-inline';"
    });
    res.end(getPlayerHtml(videoId));
  });
  await new Promise<void>((resolve) => server!.listen(port, '127.0.0.1', resolve));
  serverPort = port;
  return port;
}

function stopServer() {
  server?.close();
  server = undefined;
  serverPort = undefined;
}

// ── YouTube API search ────────────────────────────────────────────────────────
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function searchYouTubeLiveStreams(query: string, apiKey: string): Promise<VideoItem[]> {
  const q = encodeURIComponent(query);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&eventType=live&maxResults=10&key=${apiKey}`;
  const raw = await httpsGet(url);
  const json = JSON.parse(raw);
  if (json.error) { throw new Error(json.error.message || 'YouTube API error'); }
  return (json.items || []).map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    ch: item.snippet.channelTitle,
    dur: 'LIVE',
    tags: '',
    room: '',
  }));
}

// ── Data types ────────────────────────────────────────────────────────────────
interface VideoItem {
  id: string;
  title: string;
  ch: string;
  dur: string;
  tags: string;
  room: string;
}

interface LastPlayed {
  videoId: string;
  title: string;
  room: string;
}

// ── Rooms (replaces genre chips) ──────────────────────────────────────────────
const ROOMS = [
  { id: 'cafe', label: '☕ The Café', desc: 'A corner table by the window. It\'s raining.', tags: 'jazz bossa nova coffee' },
  { id: 'library', label: '🌧 Rainy Library', desc: 'Dark academia. Lamp on. Pages turning.', tags: 'lofi dark academia chill' },
  { id: 'mission', label: '🚀 Mission Control', desc: 'Synthwave and neon. Somewhere in the future.', tags: 'gaming synthwave retrowave' },
  { id: 'vibe', label: '🧑‍💻 Vibe Coding', desc: 'Others are coding too. You\'re not alone.', tags: 'study vibe focus vibecoding' },
];

// ── Curated 24/7 live streams ─────────────────────────────────────────────────
const CURATED_LIVE: VideoItem[] = [
  // ☕ The Café
  { id: "Dx5qFachd3A", title: "Jazz & Bossa Nova – Coffee Shop Radio", ch: "Cafe Music BGM", dur: "LIVE", tags: "jazz bossa nova coffee relax chill music", room: "cafe" },
  { id: "DWcJFNfaw9c", title: "Coffee Shop Radio – Jazz & Bossa Nova", ch: "Cafe Music BGM", dur: "LIVE", tags: "jazz bossa nova coffee cafe chill music", room: "cafe" },
  { id: "TbFrCUMFaZ8", title: "Jazz Piano Radio – Relaxing Music 24/7", ch: "Cafe Music BGM", dur: "LIVE", tags: "jazz piano relax smooth music chill", room: "cafe" },
  // 🌧 Rainy Library
  { id: "jfKfPfyJRdk", title: "lofi hip hop radio – beats to relax/study to", ch: "Lofi Girl", dur: "LIVE", tags: "lofi dark academia chill relax study beats", room: "library" },
  { id: "5qap5aO4i9A", title: "lofi hip hop radio – beats to sleep/chill to", ch: "Lofi Girl", dur: "LIVE", tags: "lofi dark academia chill sleep beats music", room: "library" },
  { id: "kgx4WGK0oNU", title: "Chillhop Radio – jazzy & lofi beats", ch: "Chillhop Music", dur: "LIVE", tags: "lofi dark academia chillhop chill beats", room: "library" },
  // 🚀 Mission Control
  { id: "4m_oTMFpJOE", title: "Synthwave Radio – beats to chill/drive to", ch: "Synthwave Plaza", dur: "LIVE", tags: "gaming synthwave retrowave electronic music", room: "mission" },
  { id: "MVPTGNGiI-4", title: "Chillstep Radio – 24/7 Gaming Beats", ch: "Chillstep", dur: "LIVE", tags: "gaming chillstep electronic beats music", room: "mission" },
  { id: "n61ULEU7CO0", title: "Epic Music Radio – Gaming & Study Beats", ch: "Epic Music", dur: "LIVE", tags: "gaming synthwave epic music beats", room: "mission" },
  // 🧑‍💻 Vibe Coding
  { id: "5tUCmMM9S4E", title: "Brain Food – Deep Focus Music 24/7", ch: "Brain Food", dur: "LIVE", tags: "study vibe focus vibecoding coding work", room: "vibe" },
  { id: "lTRiuFIWV54", title: "Lofi Girl – beats to study/code to", ch: "Lofi Girl", dur: "LIVE", tags: "study vibe focus vibecoding coding lofi", room: "vibe" },
  { id: "HoWRmBzVMdM", title: "Study With Me – Pomodoro Timer Live", ch: "Study Together", dur: "LIVE", tags: "study vibe with me focus pomodoro coding", room: "vibe" },
];

// ── Status bar ────────────────────────────────────────────────────────────────
let statusBarItem: vscode.StatusBarItem | undefined;

function createStatusBar(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'pixelTv.statusBarMenu';
  context.subscriptions.push(statusBarItem);
  updateStatusBar(null);
  statusBarItem.show();
}

function updateStatusBar(last: LastPlayed | null) {
  if (!statusBarItem) { return; }
  if (last) {
    statusBarItem.text = `$(broadcast) ${last.title.length > 28 ? last.title.slice(0, 28) + '…' : last.title}`;
    statusBarItem.tooltip = `Pixel TV · ${last.room}\nClick to change channel or stop`;
    statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
  } else {
    statusBarItem.text = `$(tv) Pixel TV`;
    statusBarItem.tooltip = 'Click to open Pixel TV';
    statusBarItem.color = undefined;
  }
}

// ── Webview View Provider ─────────────────────────────────────────────────────
class PixelTvViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'pixelTv.view';
  private _view?: vscode.WebviewView;
  private _port?: number;
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  public stopPlayback() {
    this._view?.webview.postMessage({ type: 'stop' });
    this._context.globalState.update('pixelTv.lastPlayed', undefined);
    updateStatusBar(null);
  }

  public showChannelPicker() {
    const rooms = ROOMS.map(r => r.label);
    vscode.window.showQuickPick(rooms, { placeHolder: 'Switch to a room…' }).then(pick => {
      if (!pick) { return; }
      const room = ROOMS.find(r => r.label === pick);
      if (room) {
        this._view?.webview.postMessage({ type: 'switchRoom', roomId: room.id });
        vscode.commands.executeCommand('pixelTv.view.focus');
      }
    });
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    this._port = await startServer();

    webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };

    // Restore last played from global state
    const lastPlayed: LastPlayed | undefined = this._context.globalState.get('pixelTv.lastPlayed');
    webviewView.webview.html = getWebviewContent(this._port, CURATED_LIVE, ROOMS, lastPlayed);

    webviewView.webview.onDidReceiveMessage(async (msg) => {

      if (msg.type === 'playVideo') {
        const videoIdMatch = String(msg.videoId).match(/^[a-zA-Z0-9_-]{11}$/);
        const safeId = videoIdMatch ? videoIdMatch[0] : '';
        if (safeId) {
          const url = `http://127.0.0.1:${this._port}/?v=${safeId}`;
          this._view?.webview.postMessage({ type: 'loadPlayer', url });
          // Persist last played
          const last: LastPlayed = { videoId: safeId, title: msg.title, room: msg.room };
          this._context.globalState.update('pixelTv.lastPlayed', last);
          updateStatusBar(last);
        }
      }

      if (msg.type === 'stopped') {
        this._context.globalState.update('pixelTv.lastPlayed', undefined);
        updateStatusBar(null);
      }

      if (msg.type === 'search') {
        const apiKey: string = vscode.workspace.getConfiguration('pixelTv').get('youtubeApiKey', '');
        const safeQuery = String(msg.query).slice(0, 200);

        if (!apiKey) {
          const q = safeQuery.toLowerCase();
          const results = CURATED_LIVE.filter(v => (v.title + v.ch + v.tags).toLowerCase().includes(q));
          this._view?.webview.postMessage({
            type: 'searchResults',
            results: results.length > 0 ? results : CURATED_LIVE,
            noApiKey: true,
          });
          return;
        }
        try {
          const results = await searchYouTubeLiveStreams(safeQuery, apiKey);
          this._view?.webview.postMessage({ type: 'searchResults', results });
        } catch (err: any) {
          this._view?.webview.postMessage({ type: 'searchError', message: err.message });
        }
      }

      if (msg.type === 'openApiKeySettings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'pixelTv.youtubeApiKey');
      }

      // Webview reports its natural pixel height — reveal the view so VS Code
      // allocates enough space for the full widget on first load
      if (msg.type === 'setHeight') {
        webviewView.show(true); // preserve focus, just ensure panel is expanded
      }
    });

    // If something was playing, restore status bar
    if (lastPlayed) { updateStatusBar(lastPlayed); }
  }
}

// ── Activate ──────────────────────────────────────────────────────────────────
let provider: PixelTvViewProvider;

export async function activate(context: vscode.ExtensionContext) {
  provider = new PixelTvViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PixelTvViewProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  createStatusBar(context);

  // Status bar click → quick pick: change room or stop
  context.subscriptions.push(
    vscode.commands.registerCommand('pixelTv.statusBarMenu', async () => {
      const last: LastPlayed | undefined = context.globalState.get('pixelTv.lastPlayed');
      const options = last
        ? ['🎚 Change Room', '⏹ Stop', '📺 Open Pixel TV']
        : ['📺 Open Pixel TV'];
      const pick = await vscode.window.showQuickPick(options, { placeHolder: 'Pixel TV' });
      if (!pick) { return; }
      if (pick === '🎚 Change Room') { provider.showChannelPicker(); }
      if (pick === '⏹ Stop') { provider.stopPlayback(); }
      if (pick === '📺 Open Pixel TV') { vscode.commands.executeCommand('pixelTv.view.focus'); }
    })
  );
}

export function deactivate() {
  stopServer();
  statusBarItem?.dispose();
}

// ── Webview HTML ──────────────────────────────────────────────────────────────
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getWebviewContent(
  port: number,
  videos: VideoItem[],
  rooms: typeof ROOMS,
  lastPlayed?: LastPlayed
): string {
  const nonce = getNonce();
  const videosJson = JSON.stringify(videos);
  const roomsJson = JSON.stringify(rooms);
  const lastJson = JSON.stringify(lastPlayed || null);

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:${port} http://localhost:${port}; img-src https://i.ytimg.com https: data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}';">
<title>Pixel TV</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&display=swap');

  :root {
    --wood-1:    #b8742a;
    --wood-2:    #c98438;
    --wood-3:    #e09a48;
    --wood-4:    #8a5418;
    --wood-5:    #5a3408;
    --wood-edge: #3e2208;
    --bez-2:     #4a4e60;
    --bez-4:     #1a1c28;
    --bez-hi:    #8890a8;
    --screen-bg: #05080a;
    --col-red:    #b04040;
    --col-amber:  #c49a3a;
    --col-purple: #7a4e99;
    --glow-amber: 0 0 8px #c49a3a66, 0 0 18px #c49a3a22;
    --text-bright:#c8c8d8;
    --text-dim:   #4a4a62;
    --scanline:   rgba(0,0,0,0.2);
  }

  * { box-sizing:border-box; margin:0; padding:0; }
  /* Let body height be natural so VS Code measures it and sizes the panel correctly */
  html, body { width:100%; background:#100c08; overflow:hidden; font-family:monospace; }

  .tv-wrap { display:flex; flex-direction:column; width:100%; background-color:var(--wood-1); background-image:repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(0,0,0,0.07) 18px, rgba(0,0,0,0.07) 19px, transparent 19px, transparent 32px, rgba(255,255,255,0.04) 32px, rgba(255,255,255,0.04) 33px); border:3px solid var(--wood-edge); box-shadow:inset 3px 3px 0 var(--wood-3), inset -3px -3px 0 var(--wood-5); padding:8px; overflow:hidden; }

  .tv-nameplate { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; padding:0 2px; flex-shrink:0; }
  .tv-brand { font-family:'Press Start 2P',monospace; font-size:5px; letter-spacing:2px; color:var(--wood-3); background:var(--wood-5); border:2px solid var(--wood-edge); padding:3px 6px; text-shadow:0 1px 0 var(--wood-edge); }
  .tv-screws { display:flex; gap:4px; }
  .screw { width:7px; height:7px; background:var(--wood-4); border:1px solid var(--wood-edge); position:relative; }
  .screw::before { content:''; position:absolute; top:50%; left:1px; right:1px; height:1px; background:var(--wood-edge); transform:translateY(-50%); }
  .screw::after  { content:''; position:absolute; left:50%; top:1px; bottom:1px; width:1px; background:var(--wood-edge); transform:translateX(-50%); }

  .screen-bezel { background:var(--bez-2); border:3px solid var(--bez-4); padding:7px; box-shadow:inset 3px 3px 0 var(--bez-hi), inset -3px -3px 0 var(--bez-4); margin-bottom:6px; flex-shrink:0; }
  .screen { background:var(--screen-bg); border:2px solid var(--bez-4); position:relative; overflow:hidden; width:100%; height:148px; flex-shrink:0; }
  .screen::after { content:''; position:absolute; inset:0; pointer-events:none; z-index:20; background:repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, var(--scanline) 2px, var(--scanline) 4px); }
  .screen::before { content:''; position:absolute; top:0; left:0; width:45%; height:35%; background:radial-gradient(ellipse at 15% 15%, rgba(255,240,180,0.04) 0%, transparent 65%); pointer-events:none; z-index:30; }

  .static-bg { position:absolute; inset:0; opacity:0.1; pointer-events:none; animation:staticAnim 0.1s steps(1) infinite; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"); }
  @keyframes staticAnim { 0%{background-position:0 0} 25%{background-position:-12px 6px} 50%{background-position:6px -6px} 75%{background-position:-6px 12px} }

  .idle-screen { position:absolute; inset:0; z-index:2; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
  .idle-label { font-family:'VT323',monospace; font-size:14px; color:var(--col-amber); opacity:0.4; text-shadow:var(--glow-amber); animation:flicker 6s ease-in-out infinite; }
  @keyframes flicker { 0%,93%,100%{opacity:0.4} 94%{opacity:0.1} 95%{opacity:0.4} 97%{opacity:0.08} 98%{opacity:0.35} }
  .idle-sub { font-size:4px; color:#2a2a40; font-family:'Press Start 2P',monospace; margin-top:4px; }

  /* Resume banner shown on reload when last session is remembered */
  .resume-banner { position:absolute; inset:0; z-index:6; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; background:rgba(5,8,10,0.88); }
  .resume-banner.hidden { display:none; }
  .resume-label { font-family:'VT323',monospace; font-size:12px; color:var(--col-amber); opacity:0.7; letter-spacing:2px; }
  .resume-title { font-family:'VT323',monospace; font-size:13px; color:var(--text-bright); text-align:center; padding:0 8px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .resume-btn { font-family:'Press Start 2P',monospace; font-size:5px; padding:5px 10px; background:#0c1410; color:var(--col-amber); border:1px solid var(--col-amber); box-shadow:var(--glow-amber); cursor:pointer; }
  .resume-btn:hover { background:#141a10; }
  .resume-dismiss { font-family:'Press Start 2P',monospace; font-size:4px; color:var(--text-dim); cursor:pointer; border:none; background:none; }
  .resume-dismiss:hover { color:var(--text-bright); }

  #playerFrame { position:absolute; inset:0; width:100%; height:100%; border:none; display:none; z-index:5; }

  .loading-overlay { position:absolute; inset:0; z-index:8; display:none; flex-direction:column; align-items:center; justify-content:center; background:var(--screen-bg); gap:8px; }
  .loading-overlay.visible { display:flex; }
  .loading-bar { width:80px; height:3px; background:#111a0e; border:1px solid #0a120a; overflow:hidden; }
  .loading-bar-fill { height:100%; background:var(--col-amber); box-shadow:var(--glow-amber); width:0%; animation:loadingAnim 0.9s ease-in-out forwards; }
  @keyframes loadingAnim { to{width:100%;} }
  .loading-text { font-family:'VT323',monospace; font-size:13px; color:var(--col-amber); opacity:0.6; animation:pulse 0.7s steps(1) infinite; }
  @keyframes pulse { 50%{opacity:0.15;} }

  .now-playing-bar { position:absolute; bottom:0; left:0; right:0; padding:4px 8px; background:linear-gradient(transparent, #00000099 70%); z-index:30; display:none; align-items:center; gap:6px; pointer-events:none; overflow:hidden; }
  .now-playing-bar.visible { display:flex; }
  .np-dot { width:4px; height:4px; background:var(--col-amber); box-shadow:var(--glow-amber); flex-shrink:0; animation:ledPulse 1.4s ease-in-out infinite; }
  @keyframes ledPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .np-title { font-size:3px; color:var(--text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; width:0; }

  /* API key banner */
  .api-banner { display:none; align-items:center; justify-content:space-between; padding:4px 6px; background:#0c0806; border-top:1px solid #3e2208; gap:4px; flex-shrink:0; }
  .api-banner.visible { display:flex; }
  .api-banner-text { font-family:'Press Start 2P',monospace; font-size:6px; color:#8a5418; flex:1; }
  .api-banner-btn { font-family:'Press Start 2P',monospace; font-size:6px; padding:3px 5px; background:#100a04; color:var(--col-amber); border:1px solid #5a3408; cursor:pointer; white-space:nowrap; flex-shrink:0; }
  .api-banner-btn:hover { border-color:var(--col-amber); }

  .toolbar { display:flex; align-items:center; gap:4px; padding:5px 4px; background:#080a06; border-top:1px solid var(--wood-edge); border-bottom:1px solid #0d0d08; flex-shrink:0; }
  .yt-logo { font-size:5px; color:var(--col-red); padding:2px 5px; border:1px solid var(--col-red); opacity:0.8; flex-shrink:0; }
  .search-box { flex:1; display:flex; align-items:center; background:#060808; border:1px solid #1a2018; height:20px; padding:0 5px; min-width:0; }
  .search-input { background:none; border:none; outline:none; flex:1; font-family:'VT323',monospace; font-size:13px; color:#6dbf7e; caret-color:#6dbf7e; min-width:0; }
  .search-input::placeholder { color:#2a3a28; font-size:11px; }
  .search-btn { font-family:'Press Start 2P',monospace; font-size:4px; padding:3px 6px; background:#0c1410; color:var(--col-amber); border:1px solid var(--col-amber); box-shadow:var(--glow-amber); cursor:pointer; height:20px; opacity:0.8; flex-shrink:0; }
  .search-btn:hover { opacity:1; }

  /* Rooms bar */
  .rooms-bar { display:flex; flex-direction:column; padding:4px; background:#040605; border-top:1px solid #0e110e; flex-shrink:0; gap:2px; }
  .room-chip { font-family:'Press Start 2P',monospace; font-size:6px; padding:5px 8px; border:1px solid #1a1a10; background:#080a06; color:#b06a2a; cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
  .room-chip:hover { border-color:#c87a35; color:#c87a35; }
  .room-chip.active { background:#10080e; border-color:var(--col-purple); color:var(--col-purple); }
  .room-desc { font-family:'VT323',monospace; font-size:10px; color:var(--text-dim); font-weight:normal; }
  .room-chip.active .room-desc { color:#7a4e99aa; }

  .results-header { display:flex; align-items:center; justify-content:space-between; padding:4px 6px; background:#060806; border-top:1px solid #0e110e; flex-shrink:0; }
  .results-label { font-size:3px; color:var(--text-dim); letter-spacing:1px; font-family:'Press Start 2P',monospace; }
  .results-count-wrap { display:flex; align-items:center; gap:4px; }
  .live-badge { font-family:'Press Start 2P',monospace; font-size:3px; padding:1px 3px; background:#3a0808; border:1px solid var(--col-red); color:var(--col-red); }
  .results-count { font-family:'VT323',monospace; font-size:11px; color:var(--col-amber); opacity:0.6; }

  .results-list { background:#030506; height:135px; overflow-y:auto; flex-shrink:0; }
  .results-list::-webkit-scrollbar { width:3px; }
  .results-list::-webkit-scrollbar-track { background:#030506; }
  .results-list::-webkit-scrollbar-thumb { background:#2a2a1a; }
  .results-list::-webkit-scrollbar-thumb:hover { background:var(--col-amber); }

  .result-item { display:flex; align-items:center; gap:6px; padding:0 6px; height:44px; border-bottom:1px solid #0c0e0a; cursor:pointer; transition:background 0.1s; flex-shrink:0; }
  .result-item:hover { background:#0a0d08; }
  .result-item.selected { background:#0c1008; border-left:2px solid var(--col-amber); padding-left:4px; }
  .result-thumb { width:44px; height:28px; flex-shrink:0; overflow:hidden; border:1px solid #1a1a12; background:#080808; }
  .result-thumb img { width:100%; height:100%; object-fit:cover; filter:saturate(0.3) brightness(0.75); display:block; }
  .result-item:hover .result-thumb img, .result-item.selected .result-thumb img { filter:saturate(0.55) brightness(0.85); }
  .result-meta { flex:1; min-width:0; width:0; overflow:hidden; }
  .result-title { font-family:'VT323',monospace; font-size:12px; color:var(--text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; opacity:0.8; }
  .result-item.selected .result-title { color:#fff; opacity:1; }
  .result-ch { font-size:3px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; font-family:'Press Start 2P',monospace; }
  .result-dur { font-family:'Press Start 2P',monospace; font-size:4px; color:var(--col-red); opacity:0.8; flex-shrink:0; white-space:nowrap; }
  .error-msg { font-family:'VT323',monospace; font-size:11px; color:#8a3030; padding:6px 8px; background:#0a0404; text-align:center; }
</style>
</head>
<body>
<div class="tv-wrap">

  <div class="tv-nameplate">
    <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
    <div class="tv-brand">PIXEL TV</div>
    <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
  </div>

  <div class="screen-bezel">
    <div class="screen">
      <div class="static-bg"></div>
      <div class="idle-screen" id="idleScreen">
        <div class="idle-label">NO SIGNAL</div>
        <div class="idle-sub">PICK A ROOM</div>
      </div>
      <!-- Resume banner: shown on reload if last session exists -->
      <div class="resume-banner hidden" id="resumeBanner">
        <div class="resume-label">⟳ LAST WATCHED</div>
        <div class="resume-title" id="resumeTitle"></div>
        <button class="resume-btn" id="resumeBtn">▶ RESUME</button>
        <button class="resume-dismiss" id="resumeDismiss">dismiss</button>
      </div>
      <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-bar"><div class="loading-bar-fill" id="loadingFill"></div></div>
        <div class="loading-text" id="loadingText">TUNING▮</div>
      </div>
      <iframe id="playerFrame" src="" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
      <div class="now-playing-bar" id="nowPlayingBar">
        <div class="np-dot"></div>
        <span class="np-title" id="npTitle"></span>
      </div>
    </div>
  </div>

  <div class="api-banner" id="apiBanner">
    <span class="api-banner-text">Add API key for live search</span>
    <div class="api-banner-btn" id="apiKeyBtn">SET KEY ▶</div>
  </div>

  <div class="toolbar">
    <div class="yt-logo">▶YT</div>
    <div class="search-box">
      <input class="search-input" id="searchInput" type="text" placeholder="search live streams..." autocomplete="off" spellcheck="false"/>
    </div>
    <button class="search-btn" id="searchBtn">TUNE</button>
  </div>

  <!-- Rooms replace genre chips -->
  <div class="rooms-bar" id="roomsBar"></div>

  <div class="results-header">
    <span class="results-label">ON AIR</span>
    <div class="results-count-wrap">
      <span class="live-badge">● LIVE</span>
      <span class="results-count" id="resultsCount">0</span>
    </div>
  </div>
  <div class="results-list" id="resultsList"></div>

</div>

<script nonce="${nonce}">
  const vscode        = acquireVsCodeApi();
  const playerFrame   = document.getElementById('playerFrame');
  const idleScreen    = document.getElementById('idleScreen');
  const loadingOverlay= document.getElementById('loadingOverlay');
  const loadingFill   = document.getElementById('loadingFill');
  const loadingText   = document.getElementById('loadingText');
  const nowPlayingBar = document.getElementById('nowPlayingBar');
  const npTitle       = document.getElementById('npTitle');
  const resultsList   = document.getElementById('resultsList');
  const resultsCount  = document.getElementById('resultsCount');
  const searchInput   = document.getElementById('searchInput');
  const apiBanner     = document.getElementById('apiBanner');
  const roomsBar      = document.getElementById('roomsBar');
  const resumeBanner  = document.getElementById('resumeBanner');
  const resumeTitle   = document.getElementById('resumeTitle');

  const allVideos  = ${videosJson};
  const allRooms   = ${roomsJson};
  const lastPlayed = ${lastJson};

  let activeRoomId = null;

  // ── Helpers ──
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── Build rooms bar ──
  allRooms.forEach(room => {
    const chip = document.createElement('div');
    chip.className = 'room-chip';
    chip.dataset.roomId = room.id;
    chip.innerHTML = \`<span>\${room.label}</span><span class="room-desc">\${room.desc}</span>\`;
    chip.addEventListener('click', () => selectRoom(room.id));
    roomsBar.appendChild(chip);
  });

  function selectRoom(roomId) {
    activeRoomId = roomId;
    document.querySelectorAll('.room-chip').forEach(c => c.classList.toggle('active', c.dataset.roomId === roomId));
    const videos = allVideos.filter(v => v.room === roomId);
    renderResults(videos, false);
    searchInput.value = '';
  }

  // ── Render results ──
  function renderResults(videos, showBanner) {
    resultsList.innerHTML = '';
    resultsCount.textContent = videos.length;
    apiBanner.classList.toggle('visible', !!showBanner);
    const shown = videos.slice(0, activeRoomId ? videos.length : 3);
    shown.forEach(r => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML = \`
        <div class="result-thumb">
          <img src="https://i.ytimg.com/vi/\${r.id}/mqdefault.jpg" onerror="this.style.display='none'"/>
        </div>
        <div class="result-meta">
          <div class="result-title">\${escHtml(r.title)}</div>
          <div class="result-ch">\${escHtml(r.ch)}</div>
        </div>
        <div class="result-dur">● LIVE</div>
      \`;
      item.addEventListener('click', () => playVideo(item, r));
      resultsList.appendChild(item);
    });
  }

  // ── Play ──
  function playVideo(item, r) {
    document.querySelectorAll('.result-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
    resumeBanner.classList.add('hidden');
    loadingText.textContent = 'TUNING IN▮';
    loadingFill.style.animation = 'none';
    void loadingFill.offsetWidth;
    loadingFill.style.animation = 'loadingAnim 0.5s ease-in-out forwards';
    loadingOverlay.classList.add('visible');
    const roomLabel = allRooms.find(rm => rm.id === r.room)?.label || '';
    vscode.postMessage({ type: 'playVideo', videoId: r.id, title: r.title, room: roomLabel });
    npTitle.textContent = r.title;
  }

  // ── Resume banner ──
  if (lastPlayed) {
    idleScreen.style.display = 'none';
    resumeTitle.textContent  = lastPlayed.title;
    resumeBanner.classList.remove('hidden');

    document.getElementById('resumeBtn').addEventListener('click', () => {
      const video = allVideos.find(v => v.id === lastPlayed.videoId);
      resumeBanner.classList.add('hidden');
      if (video) {
        // Find and highlight its list item if visible, else just play
        const fakeItem = document.createElement('div');
        playVideo(fakeItem, video);
      }
    });

    document.getElementById('resumeDismiss').addEventListener('click', () => {
      resumeBanner.classList.add('hidden');
      idleScreen.style.display = '';
      vscode.postMessage({ type: 'stopped' });
    });
  }

  // ── Search ──
  function doSearch(q) {
    q = q.trim();
    if (!q) {
      activeRoomId ? selectRoom(activeRoomId) : renderResults(allVideos.slice(0, 3), false);
      return;
    }
    activeRoomId = null;
    document.querySelectorAll('.room-chip').forEach(c => c.classList.remove('active'));
    loadingText.textContent = 'SCANNING▮';
    loadingFill.style.animation = 'none';
    void loadingFill.offsetWidth;
    loadingFill.style.animation = 'loadingAnim 1.2s ease-in-out forwards';
    loadingOverlay.classList.add('visible');
    vscode.postMessage({ type: 'search', query: q });
  }

  // ── Messages from extension host ──
  window.addEventListener('message', event => {
    const msg = event.data;

    if (msg.type === 'loadPlayer') {
      setTimeout(() => {
        loadingOverlay.classList.remove('visible');
        idleScreen.style.display = 'none';
        playerFrame.src = msg.url;
        playerFrame.style.display = 'block';
        nowPlayingBar.classList.add('visible');
      }, 500);
    }

    if (msg.type === 'stop') {
      playerFrame.src = '';
      playerFrame.style.display = 'none';
      nowPlayingBar.classList.remove('visible');
      idleScreen.style.display = '';
      document.querySelectorAll('.result-item').forEach(el => el.classList.remove('selected'));
    }

    if (msg.type === 'switchRoom') {
      selectRoom(msg.roomId);
      vscode.commands.executeCommand?.('pixelTv.view.focus');
    }

    if (msg.type === 'searchResults') {
      loadingOverlay.classList.remove('visible');
      renderResults(msg.results, !!msg.noApiKey);
    }

    if (msg.type === 'searchError') {
      loadingOverlay.classList.remove('visible');
      const errDiv = document.createElement('div');
      errDiv.className = 'error-msg';
      errDiv.textContent = '⚠ ' + msg.message;
      resultsList.innerHTML = '';
      resultsList.appendChild(errDiv);
    }
  });

  document.getElementById('apiKeyBtn').addEventListener('click', () => vscode.postMessage({ type: 'openApiKeySettings' }));
  document.getElementById('searchBtn').addEventListener('click', () => doSearch(searchInput.value));
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(searchInput.value); });

  // ── Init: show default 3 or restore last room ──
  if (!lastPlayed) {
    renderResults(allVideos.slice(0, 3), false);
  }

  // ── Tell VS Code the natural height so the panel expands to fit ──
  function reportHeight() {
    const h = document.body.scrollHeight;
    vscode.postMessage({ type: 'setHeight', height: h });
  }
  // Report on load and whenever content changes
  reportHeight();
  new ResizeObserver(reportHeight).observe(document.body);
</script>
</body>
</html>`;
}
