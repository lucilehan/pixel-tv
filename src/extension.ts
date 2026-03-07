import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import { URL } from 'url';

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
  server = http.createServer((req: any, res: any) => {
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

    const targetUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const rawVideoId = targetUrl.searchParams.get('v') || '';
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
    https.get(url, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
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
  { id: 'music', label: '🎧 Music', desc: 'Live lofi, cafe jazz, and chill beats.', tags: 'lofi beats jazz music chill' },
  { id: 'news', label: '📰 News', desc: 'Live global coverage and financial updates.', tags: 'news world event finance global' },
  { id: 'entertainment', label: '🎬 Entertainment', desc: 'Live films, compilations, and city cams.', tags: 'entertainment funny comedy clips live' },
  { id: 'touch_grass', label: '🌿 Touch Grass', desc: 'Live a little, touch grass.', tags: 'nature grass outdoors wildlife forest' },
];

// ── Curated 24/7 live streams ─────────────────────────────────────────────────
const CURATED_LIVE: VideoItem[] = [
  // 🎧 Music
  { id: "Dx5qFachd3A", title: "Jazz & Bossa Nova | Coffee Shop Radio", ch: "Cafe Music BGM", dur: "LIVE", tags: "jazz bossa nova coffee relax chill music", room: "music" },
  { id: "jfKfPfyJRdk", title: "lofi hip hop radio | beats to relax/study to", ch: "Lofi Girl", dur: "LIVE", tags: "lofi dark academia chill relax study beats", room: "music" },
  { id: "vYcDCcpue_k", title: "Nintendo Radio | 24/7 Music Live Stream", ch: "Nintendo Radio", dur: "LIVE", tags: "nintendo gaming music video game ost 24/7", room: "music" },
  { id: "S-TNDpQGTSQ", title: "K-POP 24/7 Live Stream", ch: "K-POP Radio", dur: "LIVE", tags: "kpop k-pop korean pop music 24/7", room: "music" },

  // 📰 News
  { id: "ZvdiJUYGBis", title: "FOX 24/7 Live Stream", ch: "LiveNOW from FOX", dur: "LIVE", tags: "news world breaking live global fox", room: "news" },
  { id: "f39oHo6vFLg", title: "Bloomberg Live: Business, Finance & Investment News", ch: "Bloomberg Television", dur: "LIVE", tags: "news tech finance stocks bloomberg business", room: "news" },

  // 🌌 Entertainment
  { id: "G43NInZfoPE", title: "The Lord of the Rings | Compilation Live Stream", ch: "Warner Bros. Entertainment", dur: "LIVE", tags: "lord of the rings lotr fantasy film compilation", room: "entertainment" },
  { id: "WVwP298MU7I", title: "Harry Potter ⚡️ | Complete Series Compilation Stream", ch: "Warner Bros. Entertainment", dur: "LIVE", tags: "harry potter wizards fantasy film compilation warner bros", room: "entertainment" },
  { id: "rnXIjl_Rzy4", title: "EarthCam Live: Times Square in 4K", ch: "EarthCam", dur: "LIVE", tags: "new york city times square earthcam", room: "entertainment" },

  // 🌿 Touch Grass
  { id: "8kEzFZvtLzM", title: "Calm Woodland Stream with Beautiful Birdsong", ch: "Calm", dur: "LIVE", tags: "nature grass birdsong", room: "touch_grass" },
];

// ── Status bar ────────────────────────────────────────────────────────────────
let statusBarItem: vscode.StatusBarItem | undefined;

function createStatusBar(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'pixelTube.statusBarMenu';
  context.subscriptions.push(statusBarItem);
  updateStatusBar(null);
  statusBarItem.show();
}

function updateStatusBar(last: LastPlayed | null) {
  if (!statusBarItem) { return; }
  if (last) {
    statusBarItem.text = `$(broadcast) ${last.title.length > 28 ? last.title.slice(0, 28) + '…' : last.title}`;
    statusBarItem.tooltip = `Pixel Tube · ${last.room}\nClick to change channel or stop`;
    statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
  } else {
    statusBarItem.text = `$(tv) Pixel Tube`;
    statusBarItem.tooltip = 'Click to open Pixel Tube';
    statusBarItem.color = undefined;
  }
}

// ── Webview View Provider ─────────────────────────────────────────────────────
class PixelTvViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'pixelTube.view';
  private _view?: vscode.WebviewView;
  private _port?: number;
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  public stopPlayback() {
    this._view?.webview.postMessage({ type: 'stop' });
    this._context.globalState.update('pixelTube.lastPlayed', undefined);
    updateStatusBar(null);
  }

  public async resetSetup() {
    await this._context.globalState.update('pixelTube.enabledRooms', undefined);
    await this._context.globalState.update('pixelTube.lastPlayed', undefined);
    updateStatusBar(null);
    if (this._view && this._port) {
      const _hasKey = !!vscode.workspace.getConfiguration('pixelTv').get('youtubeApiKey', '');
      this._view.webview.html = getWebviewContent(this._port, CURATED_LIVE, ROOMS, undefined, undefined, _hasKey);
    }
  }

  public showChannelPicker() {
    const rooms = ROOMS.map(r => r.label);
    vscode.window.showQuickPick(rooms, { placeHolder: 'Switch to a room…' }).then((pick: any) => {
      if (!pick) { return; }
      const room = ROOMS.find(r => r.label === pick);
      if (room) {
        this._view?.webview.postMessage({ type: 'switchRoom', roomId: room.id });
        vscode.commands.executeCommand('pixelTube.view.focus');
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

    // Restore last played and pinned rooms from global state
    const lastPlayed: LastPlayed | undefined = this._context.globalState.get('pixelTube.lastPlayed');
    const enabledRooms = this._context.globalState.get<string[]>('pixelTube.enabledRooms');

    const hasApiKey = !!vscode.workspace.getConfiguration('pixelTv').get('youtubeApiKey', '');
    webviewView.webview.html = getWebviewContent(this._port, CURATED_LIVE, ROOMS, lastPlayed, enabledRooms, hasApiKey);

    webviewView.webview.onDidReceiveMessage(async (msg: any) => {

      if (msg.type === 'saveSettings') {
        await this._context.globalState.update('pixelTube.enabledRooms', msg.enabledRooms);
        if (msg.apiKey) {
          await vscode.workspace.getConfiguration('pixelTv').update('youtubeApiKey', msg.apiKey, vscode.ConfigurationTarget.Global);
        }
        const last: LastPlayed | undefined = this._context.globalState.get('pixelTube.lastPlayed');
        const savedKey = !!vscode.workspace.getConfiguration('pixelTv').get('youtubeApiKey', '');
        webviewView.webview.html = getWebviewContent(this._port!, CURATED_LIVE, ROOMS, last, msg.enabledRooms, savedKey);
      }

      if (msg.type === 'playVideo') {
        const videoIdMatch = String(msg.videoId).match(/^[a-zA-Z0-9_-]{11}$/);
        const safeId = videoIdMatch ? videoIdMatch[0] : '';
        if (safeId) {
          const url = `http://127.0.0.1:${this._port}/?v=${safeId}`;
          this._view?.webview.postMessage({ type: 'loadPlayer', url });
          // Persist last played
          const last: LastPlayed = { videoId: safeId, title: msg.title, room: msg.room };
          this._context.globalState.update('pixelTube.lastPlayed', last);
          updateStatusBar(last);
        }
      }

      if (msg.type === 'stopped') {
        this._context.globalState.update('pixelTube.lastPlayed', undefined);
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
            results: results,
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
        vscode.commands.executeCommand('workbench.action.openSettings', 'pixelTube.youtubeApiKey');
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

  // Reset setup → clears room selection and last played, shows first-run screen
  context.subscriptions.push(
    vscode.commands.registerCommand('pixelTube.resetSetup', () => {
      provider.resetSetup();
      vscode.commands.executeCommand('pixelTube.view.focus');
    })
  );

  // Status bar click → quick pick: change room or stop
  context.subscriptions.push(
    vscode.commands.registerCommand('pixelTube.statusBarMenu', async () => {
      const last: LastPlayed | undefined = context.globalState.get('pixelTube.lastPlayed');
      const options = last
        ? ['🎚 Change Room', '⏹ Stop', '📺 Open Pixel Tube']
        : ['📺 Open Pixel Tube'];
      const pick = await vscode.window.showQuickPick(options, { placeHolder: 'Pixel Tube' });
      if (!pick) { return; }
      if (pick === '🎚 Change Room') { provider.showChannelPicker(); }
      if (pick === '⏹ Stop') { provider.stopPlayback(); }
      if (pick === '📺 Open Pixel Tube') { vscode.commands.executeCommand('pixelTube.view.focus'); }
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
  lastPlayed?: LastPlayed,
  enabledRooms?: string[],
  hasApiKey?: boolean
): string {
  const nonce = getNonce();
  const videosJson = JSON.stringify(videos);
  const roomsJson = JSON.stringify(rooms);
  const lastJson = JSON.stringify(lastPlayed || null);
  const enabledJson = JSON.stringify(enabledRooms || null);
  const searchPlaceholder = hasApiKey ? 'search streams...' : 'add API key in setup to enable search';

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:${port} http://localhost:${port}; img-src https://i.ytimg.com https: data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}';">
<title>Pixel Tube</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323:wght@400&display=swap');

  :root {
    --wood-1:    #291a13;
    --wood-2:    #3b251b;
    --wood-3:    #4d3122;
    --wood-4:    #1f140e;
    --wood-5:    #120b08;
    --wood-edge: #0a0604;
    
    --brand-text:#e6c280;
    --brand-bg:  #17130c;
    --brand-bd:  #080402;

    --bez-2:     #1d1f21;
    --bez-4:     #0d0e0f;
    --bez-hi:    #383a3d;
    
    --screen-bg: #030405;
    --col-red:    #a83636;
    --col-amber:  #dfaa46;
    --col-purple: #7a4e99;
    --glow-amber: 0 0 10px #dfaa4688, 0 0 20px #dfaa4633;
    --text-bright:#e0e0e0;
    --text-dim:   #60606b;
    --scanline:   rgba(0,0,0,0.3);
  }

  * { box-sizing:border-box; margin:0; padding:0; }
  /* Let body height be natural so VS Code measures it and sizes the panel correctly */
  html, body { width:100%; height:100%; margin:0; padding:0; background:#100c08; overflow:hidden; font-family:monospace; }
  body { padding:0 !important; }

  .tv-wrap { display:flex; flex-direction:column; width:100%; height:100%; background-color:var(--wood-1); background-image:repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(0,0,0,0.1) 18px, rgba(0,0,0,0.1) 19px, transparent 19px, transparent 32px, rgba(255,255,255,0.02) 32px, rgba(255,255,255,0.02) 33px); border:3px solid var(--wood-edge); box-shadow:inset 2px 2px 0 var(--wood-3), inset -2px -2px 0 var(--wood-5); padding:8px; overflow:hidden; }

  .tv-nameplate { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; padding:0 2px; flex-shrink:0; }
  .tv-brand { font-family:'Press Start 2P',monospace; font-size:5px; letter-spacing:2px; color:var(--brand-text); background:var(--brand-bg); border:2px solid var(--brand-bd); padding:3px 6px; text-shadow:0 1px 0 #000; }
  .tv-screws { display:flex; gap:4px; }
  .screw { width:7px; height:7px; background:var(--wood-4); border:1px solid var(--wood-edge); position:relative; }
  .screw::before { content:''; position:absolute; top:50%; left:1px; right:1px; height:1px; background:var(--wood-edge); transform:translateY(-50%); }
  .screw::after  { content:''; position:absolute; left:50%; top:1px; bottom:1px; width:1px; background:var(--wood-edge); transform:translateX(-50%); }

  .screen-bezel { background:var(--bez-2); border:3px solid var(--bez-4); padding:7px; box-shadow:inset 3px 3px 0 var(--bez-hi), inset -3px -3px 0 var(--bez-4); margin-bottom:0; flex-shrink:0; }
  .screen { background:var(--screen-bg); border:2px solid var(--bez-4); position:relative; overflow:hidden; width:100%; height:148px; flex-shrink:0; }

  .screen-resize-handle { height:7px; background:var(--wood-2); cursor:ns-resize; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-top:1px solid var(--wood-3); border-bottom:1px solid var(--wood-4); margin-bottom:6px; }
  .screen-resize-handle:hover, .screen-resize-handle.dragging { background:var(--wood-3); }
  .resize-grip { width:20px; height:2px; background:repeating-linear-gradient(90deg, var(--wood-5) 0px, var(--wood-5) 2px, transparent 2px, transparent 4px); }
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
  .api-banner-text { font-family:'Press Start 2P',monospace; font-size:7px; color:#8a5418; flex:1; }
  .api-banner-btn { font-family:'Press Start 2P',monospace; font-size:7px; padding:3px 5px; background:#100a04; color:var(--col-amber); border:1px solid #5a3408; cursor:pointer; white-space:nowrap; flex-shrink:0; }
  .api-banner-btn:hover { border-color:var(--col-amber); }

  /* Enhanced Search Bar */
  .toolbar { display:flex; align-items:center; gap:4px; padding:6px 6px; background:#0a0c0a; border-top:1px solid #141814; border-bottom:1px solid #0d0d08; flex-shrink:0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }
  .search-box { flex:1; display:flex; align-items:center; background:#111511; border:1px solid #20261f; height:24px; padding:0 8px; min-width:0; border-radius:12px; transition:border-color 0.2s; }
  .search-box:focus-within { border-color:var(--wood-2); }
  .search-input { background:none; border:none; outline:none; flex:1; font-family:'VT323',monospace; font-size:17px; color:#c8e8c8; caret-color:#6dbf7e; min-width:0; }
  .search-input::placeholder { color:#4a5a48; font-size:14px; }

  /* Rooms bar */
  .rooms-bar { display:flex; flex-direction:column; padding:4px; background:#040605; border-top:1px solid #0e110e; flex-shrink:0; gap:3px; }
  .room-chip { font-family:'Press Start 2P',monospace; font-size:8px; padding:6px 8px; border:1px solid #1a1a10; background:#080a06; color:#b06a2a; cursor:pointer; display:flex; align-items:center; justify-content:space-between; transition: 0.1s; }
  .room-chip:hover { border-color:#c87a35; color:#c87a35; }
  .room-chip.active { background:#10080e; border-color:var(--col-purple); color:var(--col-purple); }
  .room-desc { font-family:'VT323',monospace; font-size:12px; color:var(--text-dim); font-weight:normal; }
  .room-chip.active .room-desc { color:#7a4e99aa; }

  .search-header { display:flex; align-items:center; justify-content:space-between; padding:4px 6px 3px; background:#050705; border-top:1px solid #181e16; flex-shrink:0; }
  .search-header-label { font-family:'Press Start 2P',monospace; font-size:6px; color:var(--text-dim); letter-spacing:1px; }
  .search-header-hint { font-family:'VT323',monospace; font-size:11px; color:#3a4a38; }

  .results-header { display:flex; align-items:center; justify-content:flex-end; padding:4px 6px; background:#060806; border-top:1px solid #0e110e; flex-shrink:0; }
  .on-air-badge { display:inline-flex; align-items:center; gap:5px; border:1px solid #2a3828; padding:2px 6px; background:#070a06; }
  .results-label { font-size:6px; color:var(--col-amber); letter-spacing:1px; font-family:'Press Start 2P',monospace; }
  .results-count { font-family:'VT323',monospace; font-size:14px; color:var(--col-amber); opacity:0.8; line-height:1; }

  .results-list { background:#030506; flex:1; min-height:0; overflow-y:auto; }
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
  .result-title { font-family:'VT323',monospace; font-size:14px; color:var(--text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; opacity:0.8; }
  .result-item.selected .result-title { color:#fff; opacity:1; }
  .result-ch { font-size:4px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; font-family:'Press Start 2P',monospace; }
  .error-msg { font-family:'VT323',monospace; font-size:11px; color:#8a3030; padding:6px 8px; background:#0a0404; text-align:center; }
  
  .equalizer { display:none; gap:2px; height:8px; align-items:flex-end; margin-left:auto; }
  .result-item.selected .equalizer { display:flex; }
  .eq-bar { width:3px; background:var(--col-red); animation:eq 0.7s infinite alternate ease-in-out; }
  .eq-bar:nth-child(2) { animation-delay:-0.2s; }
  .eq-bar:nth-child(3) { animation-delay:-0.4s; }
  @keyframes eq { 0%{height:2px} 100%{height:9px} }

  .crt-flash { position:absolute; inset:0; background:#fff; z-index:40; pointer-events:none; opacity:0; }
  @keyframes crtFlash { 0%{opacity:1;} 100%{opacity:0;} }
  .crt-flash.flash { animation:crtFlash 0.3s ease-out; }

  .setup-layer { position:absolute; inset:0; z-index:100; background:#050705; display:flex; flex-direction:column; padding:16px 14px; gap:10px; display:none; }
  .setup-layer.visible { display:flex; }
  .setup-title { font-family:'Press Start 2P', monospace; font-size:9px; color:var(--col-amber); text-align:center; line-height:1.6; letter-spacing:2px; text-shadow:var(--glow-amber); }
  .setup-subtitle { font-family:'VT323', monospace; font-size:15px; color:var(--text-dim); text-align:center; letter-spacing:1px; }
  .setup-channels { display:flex; flex-direction:column; gap:6px; margin:4px 0; overflow-y:auto; }
  .setup-checkbox-lbl { display:flex; align-items:flex-start; gap:10px; cursor:pointer; padding:10px 8px; background:#0c100a; border:1px solid #1e2418; transition:0.15s; }
  .setup-checkbox-lbl:hover { border-color:var(--col-amber); background:#121810; }
  .setup-checkbox-lbl input { accent-color:var(--col-amber); transform:scale(1.3); margin-top:4px; flex-shrink:0; }
  .setup-ch-info { display:flex; flex-direction:column; gap:2px; }
  .setup-ch-name { font-family:'VT323', monospace; font-size:18px; color:var(--text-bright); line-height:1.1; }
  .setup-ch-desc { font-family:'VT323', monospace; font-size:13px; color:var(--text-dim); }
  .setup-api-section { margin-top:4px; padding:10px 8px; background:#0a0d08; border:1px solid #1a2018; }
  .setup-api-label { font-family:'Press Start 2P', monospace; font-size:6px; color:var(--text-dim); letter-spacing:1px; margin-bottom:6px; display:block; }
  .setup-api-row { display:flex; gap:6px; align-items:center; }
  .setup-api-input { flex:1; background:#070a06; border:1px solid #252e22; color:#c8e8c8; font-family:'VT323',monospace; font-size:15px; padding:5px 8px; outline:none; min-width:0; }
  .setup-api-input::placeholder { color:#3a4a38; }
  .setup-api-input:focus { border-color:var(--col-amber); }
  .setup-api-hint { font-family:'VT323', monospace; font-size:12px; color:var(--text-dim); margin-top:4px; }
  .setup-api-hint a { color:#5a7a55; }
  .setup-save-btn { font-family:'Press Start 2P',monospace; font-size:8px; padding:12px; background:#0c1008; color:var(--col-amber); border:2px solid var(--col-amber); box-shadow:var(--glow-amber); cursor:pointer; text-align:center; margin-top:auto; letter-spacing:1px; }
  .setup-save-btn:hover { background:#181e10; }
</style>
</head>
<body>

<div class="setup-layer" id="setupLayer">
  <div class="setup-title">📺 PIXEL TUBE</div>
  <div class="setup-subtitle">SELECT CHANNELS TO ADD TO YOUR TV</div>
  <div class="setup-channels" id="setupRooms"></div>
  <div class="setup-api-section">
    <span class="setup-api-label">YOUTUBE API KEY (OPTIONAL)</span>
    <div class="setup-api-row">
      <input class="setup-api-input" id="setupApiInput" type="password" placeholder="paste key here..." autocomplete="off" spellcheck="false"/>
    </div>
    <div class="setup-api-hint">Enables full YouTube search · <a href="https://console.cloud.google.com" target="_blank">get a key →</a></div>
  </div>
  <button class="setup-save-btn" id="setupSaveBtn">TUNE IN ▶</button>
</div>

<div class="tv-wrap" id="tvWrap">

  <div class="tv-nameplate">
    <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
    <div class="tv-brand">PIXEL TUBE</div>
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
      <div class="crt-flash" id="crtFlash"></div>
      <div class="now-playing-bar" id="nowPlayingBar">
        <div class="np-dot"></div>
        <span class="np-title" id="npTitle"></span>
      </div>
    </div>
  </div>
  <div class="screen-resize-handle" id="screenResizeHandle"><span class="resize-grip"></span></div>

  <div class="api-banner" id="apiBanner">
    <span class="api-banner-text">Add API key for live search</span>
    <div class="api-banner-btn" id="apiKeyBtn">SET KEY ▶</div>
  </div>

  <!-- Rooms replace genre chips -->
  <div class="rooms-bar" id="roomsBar"></div>

  <div class="search-header">
    <span class="search-header-label">SEARCH</span>
    ${!hasApiKey ? '<span class="search-header-hint">Add API key in Setup to search YouTube</span>' : ''}
  </div>

  <div class="toolbar">
    <div class="search-box">
      <input class="search-input" id="searchInput" type="text" placeholder="${searchPlaceholder}" autocomplete="off" spellcheck="false"/>
    </div>
  </div>

  <div class="results-header">
    <div class="on-air-badge">
      <span class="results-label">ON AIR</span>
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
  const screenEl      = document.querySelector('.screen');
  const resizeHandle  = document.getElementById('screenResizeHandle');

  // ── Screen resize ──────────────────────────────────────────────────────────
  let isResizing = false, resizeStartY = 0, resizeStartH = 0;
  resizeHandle.addEventListener('mousedown', e => {
    isResizing = true;
    resizeStartY = e.clientY;
    resizeStartH = screenEl.offsetHeight;
    resizeHandle.classList.add('dragging');
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    const newH = Math.max(60, Math.min(480, resizeStartH + (e.clientY - resizeStartY)));
    screenEl.style.height = newH + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizeHandle.classList.remove('dragging');
  });


  const allVideos  = ${videosJson};
  const allRooms   = ${roomsJson};
  const lastPlayed = ${lastJson};
  const enabledRooms = ${enabledJson};

  const isFirstRun = enabledRooms === null;
  const activeRooms = isFirstRun ? allRooms : allRooms.filter(r => enabledRooms.includes(r.id));

  let activeRoomId = null;
  let _loadingTimer = null;

  function showLoading(text) {
    clearTimeout(_loadingTimer);
    loadingText.textContent = text;
    loadingFill.style.animation = 'none';
    void loadingFill.offsetWidth;
    loadingFill.style.animation = 'loadingAnim 0.5s ease-in-out forwards';
    loadingOverlay.classList.add('visible');
    _loadingTimer = setTimeout(() => loadingOverlay.classList.remove('visible'), 5000);
  }

  function hideLoading() {
    clearTimeout(_loadingTimer);
    loadingOverlay.classList.remove('visible');
  }

  // ── Helpers ──
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── First Run Setup ──
  if (isFirstRun) {
    document.getElementById('tvWrap').style.display = 'none';
    const setupLayer = document.getElementById('setupLayer');
    setupLayer.classList.add('visible');
    
    const cbContainer = document.getElementById('setupRooms');
    allRooms.forEach(r => {
      const lbl = document.createElement('label');
      lbl.className = 'setup-checkbox-lbl';
      lbl.innerHTML = \`<input type="checkbox" value="\${r.id}" checked><div class="setup-ch-info"><span class="setup-ch-name">\${r.label}</span><span class="setup-ch-desc">\${r.desc}</span></div>\`;
      cbContainer.appendChild(lbl);
    });
    
    document.getElementById('setupSaveBtn').addEventListener('click', () => {
      const checked = Array.from(cbContainer.querySelectorAll('input:checked')).map(i => i.value);
      const apiKey = document.getElementById('setupApiInput').value.trim();
      vscode.postMessage({ type: 'saveSettings', enabledRooms: checked, apiKey });
    });
  }

  // ── Build rooms bar ──
  if (!isFirstRun) {
    activeRooms.forEach(room => {
      const chip = document.createElement('div');
      chip.className = 'room-chip';
      chip.dataset.roomId = room.id;
      chip.innerHTML = \`<span>\${room.label}</span><span class="room-desc">\${room.desc}</span>\`;
      chip.addEventListener('click', () => selectRoom(room.id));
      roomsBar.appendChild(chip);
    });
  }

  function selectRoom(roomId) {
    activeRoomId = roomId;
    document.querySelectorAll('.room-chip').forEach(c => c.classList.toggle('active', c.dataset.roomId === roomId));
    const videos = allVideos.filter(v => v.room === roomId);
    renderResults(videos, false);
    searchInput.value = '';
    
    // Auto-play first video in room
    if (videos.length > 0) {
      const firstItem = resultsList.querySelector('.result-item');
      if (firstItem) playVideo(firstItem, videos[0]);
    }
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
        <div class="equalizer"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>
      \`;
      item.addEventListener('click', () => playVideo(item, r));
      resultsList.appendChild(item);
    });
  }

  function playVideo(item, r) {
    document.querySelectorAll('.result-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
    
    // Trigger CRT flash animation
    const flash = document.getElementById('crtFlash');
    if (flash) {
      flash.classList.remove('flash');
      void flash.offsetWidth;
      flash.classList.add('flash');
    }
    
    resumeBanner.classList.add('hidden');
    showLoading('TUNING IN▮');
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

  function doSearch(q) {
    q = q.trim();
    if (!q) {
      activeRoomId ? selectRoom(activeRoomId) : renderResults([], false);
      return;
    }
    activeRoomId = null;
    document.querySelectorAll('.room-chip').forEach(c => c.classList.remove('active'));
    showLoading('SCANNING▮');
    vscode.postMessage({ type: 'search', query: q });
  }

  // ── Messages from extension host ──
  window.addEventListener('message', event => {
    const msg = event.data;

    if (msg.type === 'loadPlayer') {
      hideLoading();
      setTimeout(() => {
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
      vscode.commands.executeCommand?.('pixelTube.view.focus');
    }

    if (msg.type === 'searchResults') {
      hideLoading();
      renderResults(msg.results, !!msg.noApiKey);
    }

    if (msg.type === 'searchError') {
      hideLoading();
      const errDiv = document.createElement('div');
      errDiv.className = 'error-msg';
      errDiv.textContent = '⚠ ' + msg.message;
      resultsList.innerHTML = '';
      resultsList.appendChild(errDiv);
    }
  });

  document.getElementById('apiKeyBtn').addEventListener('click', () => vscode.postMessage({ type: 'openApiKeySettings' }));
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(searchInput.value); });
  searchInput.addEventListener('input', () => doSearch(searchInput.value));

  // ── Init: show default 3 or restore last room ──
  if (!isFirstRun && !lastPlayed) {
    renderResults([], false);
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
