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
  #player { width:100%; height:100%; }
</style>
</head>
<body>
<div id="player"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
  var ytPlayer;
  function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('player', {
      videoId: '${videoId}',
      playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
    });
  }
  window.addEventListener('message', function(e) {
    if (!ytPlayer || typeof ytPlayer.setVolume !== 'function') return;
    var d = e.data;
    if (!d) return;
    if (d.type === 'setVolume') ytPlayer.setVolume(d.volume);
    else if (d.type === 'mute') ytPlayer.mute();
    else if (d.type === 'unmute') ytPlayer.unMute();
  });
</script>
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
      'Content-Security-Policy': "script-src https://www.youtube.com 'unsafe-inline'; frame-src https://www.youtube-nocookie.com; default-src 'none'; style-src 'unsafe-inline';"
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
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&eventType=live&maxResults=20&key=${apiKey}`;
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
  { id: "ZyAavTqsU6k", title: "Video Game Music Radio", ch: "Video Game Music Radio", dur: "LIVE", tags: "video game music gaming ost 24/7 chill", room: "music" },
  { id: "Dx5qFachd3A", title: "Jazz & Bossa Nova | Coffee Shop Radio", ch: "Cafe Music BGM", dur: "LIVE", tags: "jazz bossa nova coffee relax chill music", room: "music" },
  { id: "jfKfPfyJRdk", title: "lofi hip hop radio | beats to relax/study to", ch: "Lofi Girl", dur: "LIVE", tags: "lofi dark academia chill relax study beats", room: "music" },
  { id: "S-TNDpQGTSQ", title: "K-POP 24/7 Live Stream", ch: "K-POP Radio", dur: "LIVE", tags: "kpop k-pop korean pop music 24/7", room: "music" },

  // 📰 News
  { id: "iipR5yUp36o", title: "LIVE: ABC News Live - 24/7 news, context and analysis", ch: "ABC News", dur: "LIVE", tags: "news world breaking live global abc", room: "news" },
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
    statusBarItem.text = `$(tv) ${last.title.length > 28 ? last.title.slice(0, 28) + '…' : last.title}`;
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

  public postMessage(msg: object) {
    this._view?.webview.postMessage(msg);
  }

  public stopPlayback() {
    this._view?.webview.postMessage({ type: 'stop' });
    this._context.globalState.update('pixelTube.lastPlayed', undefined);
    updateStatusBar(null);
  }

  public async resetSetup() {
    await this._context.globalState.update('pixelTube.enabledRooms', undefined);
    await this._context.globalState.update('pixelTube.lastPlayed', undefined);
    await vscode.workspace.getConfiguration('pixelTube').update('youtubeApiKey', undefined, vscode.ConfigurationTarget.Global);
    updateStatusBar(null);
    if (this._view && this._port) {
      this._view.webview.html = getWebviewContent(this._port, CURATED_LIVE, ROOMS, undefined, undefined, undefined);
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

    const apiKey = vscode.workspace.getConfiguration('pixelTube').get<string>('youtubeApiKey', '');
    webviewView.webview.html = getWebviewContent(this._port, CURATED_LIVE, ROOMS, lastPlayed, enabledRooms, apiKey);

    // Prompt to reload when the API key is saved via settings UI
    this._context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (!e.affectsConfiguration('pixelTube.youtubeApiKey')) { return; }
        vscode.window.showInformationMessage(
          'Pixel Tube: API key saved. Reload to apply search.',
          'Reload'
        ).then(choice => {
          if (choice !== 'Reload') { return; }
          const newKey = vscode.workspace.getConfiguration('pixelTube').get<string>('youtubeApiKey', '');
          const last: LastPlayed | undefined = this._context.globalState.get('pixelTube.lastPlayed');
          const rooms = this._context.globalState.get<string[]>('pixelTube.enabledRooms');
          webviewView.webview.html = getWebviewContent(this._port!, CURATED_LIVE, ROOMS, last, rooms, newKey);
        });
      })
    );

    webviewView.webview.onDidReceiveMessage(async (msg: any) => {

      if (msg.type === 'saveSettings') {
        await this._context.globalState.update('pixelTube.enabledRooms', msg.enabledRooms);
        if (msg.apiKey) {
          await vscode.workspace.getConfiguration('pixelTube').update('youtubeApiKey', msg.apiKey, vscode.ConfigurationTarget.Global);
        }
        const last: LastPlayed | undefined = this._context.globalState.get('pixelTube.lastPlayed');
        const savedKey = vscode.workspace.getConfiguration('pixelTube').get<string>('youtubeApiKey', '');
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
        const apiKey: string = vscode.workspace.getConfiguration('pixelTube').get('youtubeApiKey', '');
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

      if (msg.type === 'resetSetup') {
        vscode.commands.executeCommand('pixelTube.resetSetup');
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

  context.subscriptions.push(
    vscode.commands.registerCommand('pixelTube.openSetup', () => {
      vscode.commands.executeCommand('pixelTube.view.focus');
      provider.postMessage({ type: 'showSetup' });
    })
  );

  // Status bar click → quick pick: change room or stop
  context.subscriptions.push(
    vscode.commands.registerCommand('pixelTube.statusBarMenu', async () => {
      const last: LastPlayed | undefined = context.globalState.get('pixelTube.lastPlayed');
      const options = last
        ? ['🎚 Change Room', '⏹ Stop', '📺 Open Pixel Tube', '⚙ Settings']
        : ['📺 Open Pixel Tube', '⚙ Settings'];
      const pick = await vscode.window.showQuickPick(options, { placeHolder: 'Pixel Tube' });
      if (!pick) { return; }
      if (pick === '🎚 Change Room') { provider.showChannelPicker(); }
      if (pick === '⏹ Stop') { provider.stopPlayback(); }
      if (pick === '📺 Open Pixel Tube') { vscode.commands.executeCommand('pixelTube.view.focus'); }
      if (pick === '⚙ Settings') { vscode.commands.executeCommand('pixelTube.resetSetup'); }
    })
  );
}

export function deactivate() {
  stopServer();
  statusBarItem?.dispose();
}

// ── Webview HTML ──────────────────────────────────────────────────────────────
function getNonce(): string {
  return require('crypto').randomBytes(16).toString('hex');
}

function getWebviewContent(
  port: number,
  videos: VideoItem[],
  rooms: typeof ROOMS,
  lastPlayed?: LastPlayed,
  enabledRooms?: string[],
  apiKey?: string
): string {
  const nonce = getNonce();
  const videosJson = JSON.stringify(videos);
  const roomsJson = JSON.stringify(rooms);
  const lastJson = JSON.stringify(lastPlayed || null);
  const enabledJson = JSON.stringify(enabledRooms || null);
  const searchPlaceholder = apiKey ? 'Tune into...' : 'Add API key for live search';

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:${port} http://localhost:${port}; img-src https://i.ytimg.com data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'nonce-${nonce}';">
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
    --bez-border:#3a3d42;
    --bez-hi:    #383a3d;
    
    --col-amber: #ffb000;
    --col-amber-dim: #ffb00066;
    --col-green: #6dbf7e;
    --col-green-dim: #4a5a48;
    --col-purple: #8b5cf6;
    --col-red: #ef4444;
    --text-bright: #f0f0f0;
    --text-dim: #808080;
    --glow-amber: 0 0 8px rgba(255,176,0,0.35);
    --glow-purple: 0 0 10px rgba(139,92,246,0.3);
    --trans-mech: 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    --trans-fluid: 0.22s cubic-bezier(0.23, 1, 0.32, 1);
    --scanline:   rgba(0,0,0,0.07);
  }

  * { box-sizing:border-box; margin:0; padding:0; }
  /* Let body height be natural so VS Code measures it and sizes the panel correctly */
  html, body { width:100%; height:100%; margin:0; padding:0; background:#100c08; overflow:hidden; font-family:monospace; }
  body { padding:0 !important; }

  .tv-wrap { display:flex; flex-direction:column; width:100%; height:100%; background-color:var(--wood-1); background-image:repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(0,0,0,0.1) 18px, rgba(0,0,0,0.1) 19px, transparent 19px, transparent 32px, rgba(255,255,255,0.02) 32px, rgba(255,255,255,0.02) 33px); border:3px solid var(--wood-edge); box-shadow:inset 2px 2px 0 var(--wood-3), inset -2px -2px 0 var(--wood-5); overflow:hidden; min-width:200px; }
  .tv-main-content { padding:8px 8px 0 8px; display:flex; flex-direction:column; flex-shrink:0; transition: opacity var(--trans-fluid), transform var(--trans-fluid); }
  .tv-main-content.hidden { opacity:0; transform: translateY(4px); pointer-events:none; position:absolute; }

  .tv-nameplate { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; padding:0 2px; flex-shrink:0; position:relative; }
  .tv-brand { font-family:'Press Start 2P',monospace; font-size:7.5px; letter-spacing:2px; color:var(--brand-text); background:var(--brand-bg); border:2px solid var(--brand-bd); padding:3px 6px; text-shadow:0 1px 0 #000; white-space:nowrap; }
.tv-screws { display:flex; gap:4px; }
  .screw { width:7px; height:7px; background:var(--wood-4); border:1px solid var(--wood-edge); position:relative; }
  .screw::before { content:''; position:absolute; top:50%; left:1px; right:1px; height:1px; background:var(--wood-edge); transform:translateY(-50%); }
  .screw::after  { content:''; position:absolute; left:50%; top:1px; bottom:1px; width:1px; background:var(--wood-edge); transform:translateX(-50%); }

  .screen-bezel { background:var(--bez-2); border:3px solid var(--bez-4); padding:8px; box-shadow:inset 3px 3px 0 var(--bez-hi), inset -3px -3px 0 var(--bez-4), 1px 1px 0 rgba(255,255,255,0.05); margin-bottom:8px; flex-shrink:0; position:relative; }
  .gray-bezel { background:var(--bez-2); border:3px solid var(--bez-4); padding:8px; box-shadow:inset 2px 2px 0 var(--bez-hi), inset -2px -2px 0 var(--bez-4), 0.5px 0.5px 0 rgba(255,255,255,0.05); margin-bottom:8px; flex-shrink:0; }
  .screen { background:var(--screen-bg); border:2px solid var(--bez-4); position:relative; overflow:hidden; width:100%; height:148px; flex-shrink:0; box-shadow: inset 0 4px 12px rgba(0,0,0,0.5); }

  .screen-controls { position:absolute; bottom:6px; right:6px; z-index:25; display:flex; align-items:center; gap:4px; opacity:0; transition:opacity 0.2s; pointer-events:none; }
  .screen:hover .screen-controls { opacity:1; pointer-events:auto; }
  .mute-btn { background:rgba(10,12,14,0.85); border:1px solid var(--bez-4); color:var(--col-amber); font-size:10px; cursor:pointer; width:20px; height:20px; display:flex; align-items:center; justify-content:center; transition: var(--trans-mech); padding:0; }
  .mute-btn:hover { border-color:var(--col-amber); background:rgba(20,18,10,0.9); }
  .vol-toast { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(5,8,10,0.88); border:1px solid var(--bez-4); padding:4px 10px; font-family:'VT323',monospace; font-size:15px; color:var(--col-amber); letter-spacing:2px; z-index:30; pointer-events:none; opacity:0; transition:opacity 0.3s; white-space:nowrap; }
  .vol-toast.visible { opacity:1; }

  .screen-resize-handle { height:8px; background:var(--wood-2); cursor:ns-resize; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-top:1px solid var(--wood-edge); border-bottom:1px solid var(--wood-edge); margin-bottom:0; }
  .screen-resize-handle:hover, .screen-resize-handle.dragging { background:var(--wood-3); }
  .resize-grip { width:20px; height:2px; background:repeating-linear-gradient(90deg, #666 0px, #666 2px, transparent 2px, transparent 4px); }

  .tv-ridge { height:8px; background:var(--bez-4); border-top:1px solid #1a1c1e; border-bottom:1px solid #000; flex-shrink:0; position:relative; overflow:hidden; box-shadow: inset 0 1px 1px rgba(0,0,0,0.5); }
  .tv-ridge::after { content:''; position:absolute; inset:0; background:repeating-linear-gradient(90deg, transparent 0, transparent 6px, rgba(0,0,0,0.2) 6px, rgba(0,0,0,0.2) 7px); opacity:0.6; }
  .screen::after { content:''; position:absolute; inset:0; pointer-events:none; z-index:20; background:repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, var(--scanline) 3px, var(--scanline) 4px); }
  .screen::before { content:''; position:absolute; top:0; left:0; width:45%; height:35%; background:radial-gradient(ellipse at 15% 15%, rgba(255,240,180,0.04) 0%, transparent 65%); pointer-events:none; z-index:30; }

  .static-bg { position:absolute; inset:0; opacity:0.02; pointer-events:none; animation:staticAnim 0.1s steps(1) infinite; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"); }
  @keyframes staticAnim { 0%{background-position:0 0} 25%{background-position:-12px 6px} 50%{background-position:6px -6px} 75%{background-position:-6px 12px} }

  .idle-screen { position:absolute; inset:0; z-index:2; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
  .idle-label { font-family:'VT323',monospace; font-size:16px; color:var(--col-amber); opacity:0.4; text-shadow:var(--glow-amber); animation:flicker 6s ease-in-out infinite; }
  @keyframes flicker { 0%,93%,100%{opacity:0.4} 94%{opacity:0.1} 95%{opacity:0.4} 97%{opacity:0.08} 98%{opacity:0.35} }
  .idle-sub { font-size:6px; color:#2a2a40; font-family:'Press Start 2P',monospace; margin-top:6px; }

  /* Resume banner shown on reload when last session is remembered */
  .resume-banner { position:absolute; inset:0; z-index:6; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; background:rgba(5,8,10,0.92); }
  .resume-banner.hidden { display:none; }
  .resume-label { font-family:'VT323',monospace; font-size:15px; color:var(--col-amber); opacity:0.7; letter-spacing:2px; }
  .resume-title { font-family:'VT323',monospace; font-size:16px; color:var(--text-bright); text-align:center; padding:0 12px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .resume-btn { font-family:'Press Start 2P',monospace; font-size:7px; padding:8px 16px; background:#0c1410; color:var(--col-purple); border:1px solid var(--col-purple); box-shadow:var(--glow-purple); cursor:pointer; margin-top:12px; }
  .resume-btn:hover { background:#141a10; color: #9c6fc2; border-color: #9c6fc2; }
  .resume-dismiss { font-family:'Press Start 2P',monospace; font-size:6px; color:var(--text-dim); cursor:pointer; border:none; background:none; margin-top:24px; margin-bottom:10px; }
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
  .np-dot { width:4px; height:4px; background:var(--col-purple); box-shadow:var(--glow-purple); flex-shrink:0; animation:ledPulse 1.4s ease-in-out infinite; }
  @keyframes ledPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .np-title { font-size:3px; color:var(--text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; width:0; }

  /* API key banner */
  .api-banner { display:none; align-items:center; justify-content:space-between; padding:4px 8px; background:var(--wood-4); border-top:1px solid var(--wood-edge); border-bottom:1px solid var(--wood-edge); gap:4px; flex-shrink:0; }
  .api-banner.visible { display:flex; }
  .api-banner-text { font-family:'Press Start 2P',monospace; font-size:6px; color:#b06a2a; flex:1; }
  .api-banner-btn { font-family:'Press Start 2P',monospace; font-size:6px; padding:4px 6px; background:var(--wood-5); color:var(--col-amber); border:1px solid var(--wood-edge); cursor:pointer; white-space:nowrap; flex-shrink:0; }
  .api-banner-btn:hover { border-color:var(--col-amber); background:var(--wood-4); }

  /* New Bezel-Housed Search */
  .search-bezel { display:flex; align-items:center; gap:12px; height:36px; transition: var(--trans-mech); border:2px solid var(--bez-4); padding:7px 9px; }
  .search-bezel:not(.no-api):focus-within { border-color:var(--col-purple); box-shadow:inset 2px 2px 0 var(--bez-hi), inset -2px -2px 0 var(--bez-4), 0 0 6px rgba(139,92,246,0.4); }
  .set-key-btn { font-family:'Press Start 2P',monospace; font-size:5px; padding:3px 6px; background:var(--wood-5); color:var(--col-amber); border:1px solid var(--wood-edge); cursor:pointer; white-space:nowrap; flex-shrink:0; letter-spacing:1px; }
  .set-key-btn:hover { border-color:var(--col-amber); background:var(--wood-4); }
  .search-label-inline { font-family:'Press Start 2P',monospace; font-size:6px; color:#70707b; opacity:0.8; white-space:nowrap; border:1px solid #2a3828; background:#0c100c; padding:2px 10px; display:inline-flex; align-items:center; justify-content:center; box-shadow: 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03); text-shadow: 0 1px 0 #000; letter-spacing:1px; line-height:1; flex-shrink:0; }
  .search-input { background:none; border:none; outline:none; flex:1; font-family:'VT323',monospace; font-size:18px; color:var(--col-green); caret-color:var(--col-green); min-width:0; height:100%; display:flex; align-items:center; }
  .search-input::placeholder { color:var(--col-green-dim); font-size:15px; }

  /* Rooms bar */
  .rooms-bar { display:flex; flex-direction:column; padding:0; background:none; flex-shrink:0; gap:4px; }
  .room-chip { font-family:'VT323',monospace; padding:6px 8px; border:1px solid var(--wood-edge); border-left:4px solid transparent; background:var(--wood-5); color:#b06a2a; cursor:pointer; display:flex; align-items:center; transition: var(--trans-mech); gap:12px; overflow:hidden; }
  .room-chip:hover { background:var(--wood-4); border-left-color:rgba(139,92,246,0.3); transform: translateX(2px); }
  .room-chip:hover .room-label { color:#d88a45; }
  .room-chip.active { background:var(--wood-5); border-left:4px solid var(--col-purple); padding-left:8px; box-shadow: inset 1px 0 0 rgba(255,255,255,0.1), inset 0 0 8px rgba(0,0,0,0.3); position:relative; }
  .room-chip.active::before { content:''; position:absolute; left:-4px; top:0; bottom:0; width:1px; background:rgba(255,255,255,0.3); z-index:2; }
  .room-chip.active .room-label { color:var(--col-purple); text-shadow: 0 0 4px rgba(139,92,246,0.2); }
  .room-label { font-size:16px; color:#b06a2a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0; line-height:1; }
  .room-desc { font-family:'VT323',monospace; font-size:13px; color:#805020; font-weight:normal; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; text-align:right; }

  .on-air-badge { position:absolute; top:8px; right:8px; display:inline-flex; align-items:center; justify-content:space-between; min-width:72px; gap:8px; border:1px solid #2a3828; padding:2px 10px; background:#0c100c; box-shadow: 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03); z-index:10; pointer-events:none; }
  .results-label { font-size:6px; color:#70707b; opacity:0.8; letter-spacing:1px; font-family:'Press Start 2P',monospace; text-shadow: 0 1px 0 #000; }
  .results-count { font-family:'VT323',monospace; font-size:14px; color:#70707b; line-height:1; }

  .results-list { background:none; flex:1; min-height:132px; overflow-y:auto; overflow-x:hidden; padding:24px 0 0; display:flex; flex-direction:column; gap:4px; }
  .results-list::-webkit-scrollbar { width:3px; }
  .results-list::-webkit-scrollbar-track { background:#030506; }
  .results-list::-webkit-scrollbar-thumb { background:#2a2a1a; }
  .results-list::-webkit-scrollbar-thumb:hover { background:var(--col-purple); }
  
  .result-item { display:flex; align-items:center; gap:10px; padding:4px 8px; height:40px; background:var(--wood-5); border:1px solid var(--wood-edge); border-left:4px solid transparent; cursor:pointer; transition: var(--trans-mech); flex-shrink:0; }
  .result-item:hover { background:var(--wood-4); border-left-color: rgba(139,92,246,0.3); transform: translateX(2px); }
  .result-item.selected { background:var(--wood-5); border-color:var(--wood-edge); border-left:4px solid var(--col-purple); padding-left:8px; box-shadow: inset 1px 0 0 rgba(255,255,255,0.1), inset 8px 0 16px -8px rgba(139,92,246,0.2); position:relative; }
  .result-item.selected::before { content:''; position:absolute; left:-4px; top:0; bottom:0; width:1px; background:rgba(255,255,255,0.3); z-index:2; }
  .result-thumb { width:40px; height:24px; flex-shrink:0; overflow:hidden; border:1px solid #1a1a12; background:#080808; }
  .result-thumb img { width:100%; height:100%; object-fit:cover; filter:saturate(0.3) brightness(0.75); display:block; }
  .result-item:hover .result-thumb img, .result-item.selected .result-thumb img { filter:saturate(0.55) brightness(0.85); }
  .result-meta { flex:1; min-width:0; width:0; overflow:hidden; display:flex; flex-direction:column; justify-content:center; }
  .result-title { font-family:'VT323',monospace; font-size:14px; color:#b06a2a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; opacity:0.9; line-height:1.1; }
  .result-item.selected .result-title { color:var(--col-purple); opacity:1; text-shadow: 0 0 8px rgba(139,92,246,0.3); }
  .result-item:hover .result-title { color:#d88a45; opacity:1; }
  .result-ch { font-size:11px; color:#805020; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; font-family:'VT323',monospace; margin-top:0; }
  .error-msg { font-family:'VT323',monospace; font-size:11px; color:#8a3030; padding:6px 8px; background:#0a0404; text-align:center; }
  
  .equalizer { display:none; gap:2px; height:8px; align-items:flex-end; margin-left:auto; }
  .result-item.selected { display:flex; }
  .result-item.selected .equalizer { display:flex; }
  .eq-bar { width:3px; background:var(--col-purple); animation:eq 0.7s infinite alternate ease-in-out; box-shadow: 0 0 4px rgba(139,92,246,0.3); }
  .eq-bar:nth-child(2) { animation-delay:-0.2s; }
  .eq-bar:nth-child(3) { animation-delay:-0.4s; }
  @keyframes eq { 0%{height:2px} 100%{height:9px} }

  .crt-flash { position:absolute; inset:0; background:#fff; z-index:40; pointer-events:none; opacity:0; }
  @keyframes crtFlash { 0%{opacity:1;} 100%{opacity:0;} }
  .crt-flash.flash { animation:crtFlash 0.3s ease-out; }

  .setup-layer { flex:1; display:none; flex-direction:column; padding:0 8px 8px 8px; gap:8px; overflow:hidden; justify-content:space-between; transition: opacity var(--trans-fluid), transform var(--trans-fluid); }
  .setup-layer.visible { display:flex; }
  .setup-layer.hidden { display:none; opacity:0; transform: translateY(4px); }
  .setup-title-wrap { display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:16px; padding-top:8px; }
  .setup-title { font-family:'Press Start 2P',monospace; font-size:7.5px; letter-spacing:2px; color:var(--brand-text); background:var(--brand-bg); border:2px solid var(--brand-bd); padding:3px 6px; text-shadow:0 1px 0 #000; display:inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03); }
  .setup-subtitle { font-family:'Press Start 2P',monospace; font-size:6px; color:#b06a2a; opacity:0.6; text-shadow: 0 1px 0 #000; letter-spacing:1px; margin-top:24px; margin-bottom:10px; display:block; padding:0 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .setup-channels { display:flex; flex-direction:column; gap:4px; padding:0; overflow-y:auto; overflow-x:hidden; flex:1; }
  .setup-checkbox-lbl { display:flex; align-items:center; gap:12px; cursor:pointer; padding:6px 8px; background:var(--wood-5); border:1px solid var(--wood-edge); transition: var(--trans-mech); margin-left:0; }
  .setup-checkbox-lbl:hover { border-color:var(--col-purple); background:var(--wood-4); transform: translateX(2px); }
  .setup-checkbox-lbl.active { background:var(--wood-5); border-color:var(--wood-edge); }
  .setup-checkbox-lbl input { accent-color:#b06a2a; transform:scale(1.1); margin-top:0; flex-shrink:0; }
  .setup-ch-info { display:flex; flex-direction:row; align-items:center; justify-content:space-between; gap:16px; flex:1; min-width:0; }
  .setup-ch-name { font-family:'VT323', monospace; font-size:16px; color:#b06a2a; line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0; }
  .setup-ch-desc { font-family:'VT323', monospace; font-size:13px; color:#805020; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:right; flex:1; }
  .setup-api-section { margin-top:0; padding:4px 0; position:relative; }
  .setup-api-label { font-family:'VT323', monospace; font-size:14px; color:var(--col-amber); opacity:0.8; margin-bottom:8px; display:block; text-transform:uppercase; letter-spacing:1px; padding:0 8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .setup-api-row { display:flex; gap:8px; align-items:center; padding:0 8px 8px; }
  .setup-api-input { flex:1; background:var(--wood-edge); border:1px solid var(--wood-4); color:var(--col-green-dim); font-family:'VT323',monospace; font-size:15px; padding:7px 34px 7px 8px; outline:none; min-width:0; }
  .setup-api-input::placeholder { color:#4a3219; }
  .setup-api-input:focus { border-color:var(--col-amber); }
  .apiKeyToggle { background:none; border:none; color:#706060; cursor:pointer; font-family:'Press Start 2P',monospace; font-size:4px; padding:0; height:100%; width:34px; position:absolute; right:0; top:0; transition: var(--trans-mech); letter-spacing:0; overflow:hidden; white-space:nowrap; }
  .apiKeyToggle:hover { color:#a09090; }
  .setup-api-hint { font-family:'VT323', monospace; font-size:14px; color:#a0a0b0; }
  .setup-api-hint a { color:#6ea068; text-decoration:none; border-bottom:1px solid #5a7a55; }
  .setup-api-hint a:hover { color:#8fcb84; border-color:#8fcb84; }
  .agent-guide { margin-top:8px; padding-top:12px; border-top:1px dashed var(--wood-edge); font-family:'VT323', monospace; font-size:14px; color:var(--text-dim); position:relative; }
  .agent-guide-header { display:flex; justify-content:space-between; align-items:center; padding:0 8px; margin-bottom:6px; }
  .agent-guide-label { display:block; font-family:'VT323',monospace; font-size:14px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .prompt-wrapper { padding:0 8px; }
  .prompt-text { padding:10px 14px; background:var(--wood-edge); border:1px solid var(--wood-4); color:var(--col-green-dim); font-family:'VT323',monospace; font-size:15px; line-height:1.4; white-space:pre-wrap; overflow-x:hidden; overflow-y:auto; height:80px; flex-shrink:0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); word-break:break-word; }
  .prompt-text::-webkit-scrollbar { width:3px; }
  .prompt-text::-webkit-scrollbar-thumb { background:var(--wood-4); }
  .copy-btn { background:var(--wood-4); border:1px solid var(--wood-edge); color:var(--col-green); padding:4px 8px; border-radius:3px; cursor:pointer; font-size:8px; font-family:'Press Start 2P',monospace; transition: var(--trans-mech); text-shadow: 0 1px 0 #000; }
  .copy-btn:hover { color:var(--text-bright); border-color:var(--col-green); background:var(--wood-3); }
  .setup-save-btn { font-family:'Press Start 2P',monospace; font-size:7px; padding:14px; background:#0c1410; color:var(--col-purple); border:1px solid var(--col-purple); box-shadow:var(--glow-purple); cursor:pointer; text-align:center; margin-top:0; letter-spacing:2px; width:100%; flex-shrink:0; position:sticky; bottom:0; z-index:10; transition: var(--trans-mech); }
  .setup-save-btn:hover { background:#141a10; color: #9c6fc2; border-color: #9c6fc2; }
</style>
</head>
<body>

<div class="tv-wrap" id="tvWrap">
  <div class="tv-static-header" style="padding:8px 8px 0 8px; flex-shrink:0;">
    <div class="tv-nameplate">
      <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
      <div class="tv-brand">PIXEL TUBE</div>
<div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
    </div>
  </div>

  <div id="tvMainView" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
    <div class="tv-main-content" style="padding:0 8px 0 8px;">
      <div class="screen-bezel">
        <div class="screen">
          <div class="static-bg"></div>
          <div class="idle-screen" id="idleScreen">
            <div class="idle-label">NO SIGNAL</div>
            <div class="idle-sub">PICK A ROOM</div>
          </div>
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
          <div class="screen-controls">
            <button class="mute-btn" id="muteBtn" title="Mute / Unmute">🔊</button>
          </div>
          <div class="vol-toast" id="volToast"></div>
          <div class="now-playing-bar" id="nowPlayingBar">
            <div class="np-dot"></div>
            <span class="np-title" id="npTitle"></span>
          </div>
        </div>
      </div>
      <div class="screen-resize-handle" id="screenResizeHandle"><span class="resize-grip"></span></div>
    </div>

    <div class="tv-ridge"></div>

    <div id="roomsSection" style="padding:8px 8px 8px 8px; flex-shrink:0;">
      <div class="gray-bezel" style="margin-bottom:0;">
        <div class="rooms-bar" id="roomsBar"></div>
      </div>
    </div>
    <div id="noChannelSection" style="display:none; padding:8px 8px 8px 8px; flex-shrink:0;">
      <div class="gray-bezel search-bezel no-api" style="margin-bottom:0;">
        <span class="search-label-inline">CHANNEL</span>
        <span style="font-family:'VT323',monospace; font-size:15px; color:var(--col-green-dim); letter-spacing:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">No Channel Selected...</span>
      </div>
    </div>
    <div id="searchSection" style="padding:0 8px 8px 8px; flex-shrink:0;">
      <div class="gray-bezel search-bezel${!apiKey ? ' no-api' : ''}">
        <span class="search-label-inline">SEARCH</span>
        <input class="search-input" id="searchInput" type="text" placeholder="${searchPlaceholder}" autocomplete="off" spellcheck="false"/>
        ${!apiKey ? '<button class="set-key-btn" id="apiKeyBtn">SET KEY ▶</button>' : ''}
      </div>
    </div>

    <div id="resultsSection" style="padding:0 8px 8px 8px; flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <div class="gray-bezel" style="flex:1; display:flex; flex-direction:column; overflow:hidden; position:relative;">
        <div class="on-air-badge">
          <span class="results-label">ON AIR</span>
          <span class="results-count" id="resultsCount">0</span>
        </div>
        <div class="results-list" id="resultsList" style="background:none;"></div>
      </div>
    </div>
  </div>

  <div class="setup-layer" id="setupLayer">
    <div class="setup-main-scroller" style="display:flex; flex-direction:column; flex:1; min-height:0; overflow-y:auto;">
      <div class="setup-subtitle">SELECT CURATED CHANNELS</div>
      <div class="gray-bezel" style="display:flex; flex-direction:column;">
        <div class="setup-channels" id="setupRooms"></div>
      </div>
      <div class="setup-subtitle">SEARCH BEYOND CURATED CHANNELS</div>
      <div class="gray-bezel">
        <div class="setup-api-section">
          <span class="setup-api-label">🔑 YOUTUBE API KEY (OPTIONAL)</span>
          <div class="setup-api-row">
            <div style="position:relative; flex:1; display:flex;">
              <input class="setup-api-input" id="setupApiInput" type="password" value="${apiKey || ''}" placeholder="paste key here..." autocomplete="off" spellcheck="false"/>
              <button class="apiKeyToggle" id="apiKeyToggle" title="Show/Hide">SHOW</button>
            </div>
          </div>
          <div class="setup-api-hint">
            <div class="agent-guide">
              <div class="agent-guide-header">
                <span class="agent-guide-label">Not sure how? Ask the closest agent:</span>
                <button class="copy-btn" id="copyPromptBtn">COPY</button>
              </div>
              <div class="prompt-wrapper">
                <div class="prompt-text" id="promptText">"I need a YouTube Data API v3 key for my extension (https://github.com/lucilehan/pixel-tube.git). Walk me through creating one on Google Cloud Console step-by-step, including enabling the API, creating an API key, and restricting the key to only use the YouTube Data API for security."</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="setup-save-btn" id="setupSaveBtn">TUNE IN ▶</div>
  </div>

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

  // ── Volume / Mute ──────────────────────────────────────────────────────────
  let isMuted = false;
  let volume = 100;
  let _volToastTimer = null;
  const muteBtn  = document.getElementById('muteBtn');
  const volToast = document.getElementById('volToast');

  function postToPlayer(msg) {
    try { playerFrame.contentWindow?.postMessage(msg, '*'); } catch(e) {}
  }

  function showVolToast(label) {
    clearTimeout(_volToastTimer);
    volToast.textContent = label;
    volToast.classList.add('visible');
    _volToastTimer = setTimeout(() => volToast.classList.remove('visible'), 1200);
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(100, v));
    postToPlayer({ type: 'setVolume', volume });
    const bars = Math.round(volume / 20);
    showVolToast('VOL ' + '▓'.repeat(bars) + '░'.repeat(5 - bars));
    if (volume === 0 && !isMuted) { isMuted = true; muteBtn.textContent = '🔇'; }
    else if (volume > 0 && isMuted) { isMuted = false; muteBtn.textContent = '🔊'; }
  }

  screenEl.addEventListener('wheel', e => {
    e.preventDefault();
    if (!playerFrame.src) return;
    if (isMuted) { isMuted = false; postToPlayer({ type: 'unmute' }); muteBtn.textContent = '🔊'; }
    setVolume(volume + (e.deltaY < 0 ? 10 : -10));
  }, { passive: false });

  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (isMuted) {
      postToPlayer({ type: 'mute' });
      muteBtn.textContent = '🔇';
      showVolToast('MUTED');
    } else {
      postToPlayer({ type: 'unmute' });
      muteBtn.textContent = '🔊';
      const bars = Math.round(volume / 20);
      showVolToast('VOL ' + '▓'.repeat(bars) + '░'.repeat(5 - bars));
    }
  });


  const allVideos  = ${videosJson};
  const allRooms   = ${roomsJson};
  const lastPlayed = ${lastJson};
  const enabledRooms = ${enabledJson};

  const isFirstRun = enabledRooms === null;
  const activeRooms = isFirstRun ? allRooms : allRooms.filter(r => enabledRooms.includes(r.id));

  let activeRoomId = null;
  let currentPlayingId = lastPlayed ? lastPlayed.videoId : null;
  let _loadingTimer = null;
  let _searchDebounce = null;

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

  // ── View Switching ──
  const setupLayer = document.getElementById('setupLayer');
  const tvMainView = document.getElementById('tvMainView');

  function showSetupMode(show) {
    if (show) {
      if (tvMainView) tvMainView.classList.add('hidden');
      if (setupLayer) {
        setupLayer.classList.remove('hidden');
        setTimeout(() => {
          if (tvMainView) tvMainView.style.display = 'none';
          setupLayer.style.display = 'flex';
          setupLayer.classList.add('visible');
        }, 30);
      }
    } else {
      if (setupLayer) {
        setupLayer.classList.remove('visible');
        setupLayer.classList.add('hidden');
      }
      setTimeout(() => {
        if (setupLayer) setupLayer.style.display = 'none';
        if (tvMainView) {
          tvMainView.style.display = 'flex';
          tvMainView.classList.remove('hidden');
        }
      }, 30);
    }
  }

  // ── Setup panel (always populated so gear icon works after first run) ──
  {
    const cbContainer = document.getElementById('setupRooms');
    allRooms.forEach(r => {
      const lbl = document.createElement('label');
      const isChecked = enabledRooms ? enabledRooms.includes(r.id) : true;
      lbl.className = 'setup-checkbox-lbl' + (isChecked ? ' active' : '');
      lbl.innerHTML = \`<input type="checkbox" value="\${r.id}"\${isChecked ? ' checked' : ''}><div class="setup-ch-info"><span class="setup-ch-name">\${r.label}</span><span class="setup-ch-desc">\${r.desc}</span></div>\`;
      const cb = lbl.querySelector('input');
      cb.addEventListener('change', () => lbl.classList.toggle('active', cb.checked));
      cbContainer.appendChild(lbl);
    });

    document.getElementById('setupSaveBtn').addEventListener('click', () => {
      const checked = Array.from(cbContainer.querySelectorAll('input:checked')).map(i => i.value);
      const apiKey = document.getElementById('setupApiInput').value.trim();
      vscode.postMessage({ type: 'saveSettings', enabledRooms: checked, apiKey });
    });

    const apiKeyInput = document.getElementById('setupApiInput');
    const apiKeyToggle = document.getElementById('apiKeyToggle');
    if (apiKeyToggle && apiKeyInput) {
      apiKeyToggle.addEventListener('click', () => {
        const isPassword = apiKeyInput.getAttribute('type') === 'password';
        apiKeyInput.setAttribute('type', isPassword ? 'text' : 'password');
        apiKeyToggle.textContent = isPassword ? 'HIDE' : 'SHOW';
      });
    }
  }

  if (isFirstRun) {
    showSetupMode(true);
  }

// ── Build rooms bar ──
if (!isFirstRun) {
  if (activeRooms.length === 0) {
    document.getElementById('roomsSection').style.display = 'none';
    document.getElementById('noChannelSection').style.display = 'block';
  } else {
    activeRooms.forEach(room => {
      const chip = document.createElement('div');
      chip.className = 'room-chip';
      chip.dataset.roomId = room.id;
      chip.innerHTML = \`<span class="room-label">\${room.label}</span><span class="room-desc">\${room.desc}</span>\`;
      chip.addEventListener('click', () => selectRoom(room.id));
      roomsBar.appendChild(chip);
    });
  }
}

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
    apiBanner?.classList.toggle('visible', !!showBanner);
    const shown = videos.slice(0, 20);
    shown.forEach(r => {
      const item = document.createElement('div');
      item.className = 'result-item';
      if (r.id === currentPlayingId) item.classList.add('selected');
      item.innerHTML = \`
        <div class="result-thumb">
          <img src="https://i.ytimg.com/vi/\${escHtml(r.id)}/mqdefault.jpg" onerror="this.style.display='none'"/>
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
    currentPlayingId = r.id;
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

  // ── Landing / Resume banner ──
  const landingVideoId = 'ZyAavTqsU6k';
  let targetVideoId = lastPlayed ? lastPlayed.videoId : (!isFirstRun ? landingVideoId : null);
  
  if (targetVideoId && !isFirstRun) {
    const video = allVideos.find(v => v.id === targetVideoId);
    if (video) {
      idleScreen.style.display = 'none';
      resumeTitle.textContent  = video.title;
      resumeBanner.classList.remove('hidden');
      const labelEl = document.querySelector('.resume-label');
      if (labelEl) labelEl.textContent = lastPlayed ? '⟳ LAST WATCHED' : '⭐ FEATURED';
      const btn = document.getElementById('resumeBtn');
      if (btn) btn.textContent = lastPlayed ? '▶ RESUME' : '▶ TUNE IN';
    }
  }

  document.getElementById('resumeBtn').addEventListener('click', () => {
    const video = allVideos.find(v => v.id === targetVideoId);
    if (video) {
      resumeBanner.classList.add('hidden');
      const fakeItem = document.createElement('div');
      playVideo(fakeItem, video);
    }
  });

  document.getElementById('resumeDismiss').addEventListener('click', () => {
    resumeBanner.classList.add('hidden');
    idleScreen.style.display = '';
    vscode.postMessage({ type: 'stopped' });
    targetVideoId = null; // Prevent re-triggering if no longer desired
  });

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
      currentPlayingId = null;
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

    if (msg.type === 'showSetup') {
      showSetupMode(true);
    }
  });

  document.getElementById('apiKeyBtn')?.addEventListener('click', () => vscode.postMessage({ type: 'openApiKeySettings' }));
  document.getElementById('settingsShortcut')?.addEventListener('click', () => vscode.postMessage({ type: 'resetSetup' }));
  const copyBtn = document.getElementById('copyPromptBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = document.getElementById('promptText').textContent;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'DONE';
        setTimeout(() => copyBtn.textContent = 'COPY', 2000);
      });
    });
  }
  searchInput.addEventListener('keydown', e => { 
    if (e.key === 'Enter') {
      clearTimeout(_searchDebounce);
      doSearch(searchInput.value);
    }
  });
  searchInput.addEventListener('input', () => {
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => doSearch(searchInput.value), 600);
  });
  searchInput.addEventListener('focus', () => {
    activeRoomId = null;
    document.querySelectorAll('.room-chip').forEach(c => c.classList.remove('active'));
  });

  if (!isFirstRun) {
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
