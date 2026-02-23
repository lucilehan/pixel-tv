import * as vscode from 'vscode';
import * as http from 'http';
import * as net from 'net';

// ── Local server (serves YouTube iframe from localhost so YouTube allows it) ──
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
  allowfullscreen>
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
  if (server && serverPort) return serverPort;

  const port = await findFreePort();

  server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const videoId = url.searchParams.get('v') || '';

    res.writeHead(200, {
      'Content-Type': 'text/html',
      // Allow the webview to embed this page
      'Access-Control-Allow-Origin': '*',
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

// ── Webview View Provider ──
class PixelTvViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'pixelTv.view';
  private _view?: vscode.WebviewView;
  private _port?: number;

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    this._port = await startServer();

    webviewView.webview.options = {
      enableScripts: true,
      // Allow loading from localhost
      localResourceRoots: [],
    };

    webviewView.webview.html = getWebviewContent(this._port);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'openUrl') {
        vscode.env.openExternal(vscode.Uri.parse(message.url));
      }
      if (message.type === 'playVideo') {
        // Tell webview the localhost URL to load in the screen iframe
        const playerUrl = `http://127.0.0.1:${this._port}/?v=${message.videoId}`;
        this._view?.webview.postMessage({ type: 'loadPlayer', url: playerUrl });
      }
    });
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const provider = new PixelTvViewProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PixelTvViewProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );
}

export function deactivate() {
  stopServer();
}

// ── Webview HTML (sidebar UI) ──
function getWebviewContent(port: number): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src http://127.0.0.1:${port} http://localhost:${port}; img-src https://i.ytimg.com https: data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline';">
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
    --knob-hi:   #c8d8e8;
    --knob-mid:  #8899aa;
    --knob-xdk:  #1a2233;
    --screen-bg: #05080a;
    --col-red:    #b04040;
    --col-amber:  #c49a3a;
    --col-purple: #7a4e99;
    --glow-amber: 0 0 8px #c49a3a66, 0 0 18px #c49a3a22;
    --glow-red:   0 0 6px #b0404055;
    --text-bright:#c8c8d8;
    --text-dim:   #4a4a62;
    --scanline:   rgba(0,0,0,0.2);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 100%; height: 100%;
    background: #100c08;
    overflow-x: hidden;
    overflow-y: auto;
    font-family: monospace;
  }

  .tv-wrap {
    display: flex; flex-direction: column; width: 100%;
    background-color: var(--wood-1);
    background-image: repeating-linear-gradient(90deg,
      transparent 0px, transparent 18px,
      rgba(0,0,0,0.07) 18px, rgba(0,0,0,0.07) 19px,
      transparent 19px, transparent 32px,
      rgba(255,255,255,0.04) 32px, rgba(255,255,255,0.04) 33px);
    border: 3px solid var(--wood-edge);
    box-shadow: inset 3px 3px 0 var(--wood-3), inset -3px -3px 0 var(--wood-5);
    padding: 8px;
  }

  .tv-nameplate {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px; padding: 0 2px;
  }
  .tv-brand {
    font-family: 'Press Start 2P', monospace;
    font-size: 5px; letter-spacing: 2px; color: var(--wood-3);
    background: var(--wood-5); border: 2px solid var(--wood-edge);
    padding: 3px 6px; text-shadow: 0 1px 0 var(--wood-edge);
    box-shadow: inset 1px 1px 0 rgba(255,255,255,0.08);
  }
  .tv-screws { display: flex; gap: 4px; }
  .screw {
    width: 7px; height: 7px; background: var(--wood-4);
    border: 1px solid var(--wood-edge); position: relative;
    box-shadow: inset 1px 1px 0 rgba(255,255,255,0.12);
  }
  .screw::before { content:''; position:absolute; top:50%; left:1px; right:1px; height:1px; background:var(--wood-edge); transform:translateY(-50%); }
  .screw::after  { content:''; position:absolute; left:50%; top:1px; bottom:1px; width:1px; background:var(--wood-edge); transform:translateX(-50%); }

  .screen-bezel {
    background: var(--bez-2); border: 3px solid var(--bez-4); padding: 7px;
    box-shadow: inset 3px 3px 0 var(--bez-hi), inset -3px -3px 0 var(--bez-4);
    margin-bottom: 6px;
  }
  .screen {
    background: var(--screen-bg); border: 2px solid var(--bez-4);
    position: relative; overflow: hidden;
    width: 100%; height: 148px; flex-shrink: 0;
  }
  .screen::after {
    content:''; position:absolute; inset:0; pointer-events:none; z-index:20;
    background: repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, var(--scanline) 2px, var(--scanline) 4px);
  }
  .screen::before {
    content:''; position:absolute; top:0; left:0; width:45%; height:35%;
    background: radial-gradient(ellipse at 15% 15%, rgba(255,240,180,0.04) 0%, transparent 65%);
    pointer-events:none; z-index:30;
  }
  .static-bg {
    position:absolute; inset:0; opacity:0.1; pointer-events:none;
    animation: staticAnim 0.1s steps(1) infinite;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  }
  @keyframes staticAnim { 0%{background-position:0 0} 25%{background-position:-12px 6px} 50%{background-position:6px -6px} 75%{background-position:-6px 12px} }

  .idle-screen {
    position:absolute; inset:0; z-index:2;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    pointer-events:none;
  }
  .idle-label {
    font-family:'VT323',monospace; font-size:14px; color:var(--col-amber);
    opacity:0.4; text-shadow:var(--glow-amber);
    animation: flicker 6s ease-in-out infinite;
  }
  @keyframes flicker { 0%,93%,100%{opacity:0.4} 94%{opacity:0.1} 95%{opacity:0.4} 97%{opacity:0.08} 98%{opacity:0.35} }
  .idle-sub { font-size:4px; color:#2a2a40; font-family:'Press Start 2P',monospace; margin-top:4px; }

  /* The player iframe loads from localhost */
  #playerFrame {
    position:absolute; inset:0; width:100%; height:100%;
    border:none; display:none; z-index:5;
  }

  .loading-overlay { position:absolute; inset:0; z-index:8; display:none; flex-direction:column; align-items:center; justify-content:center; background:var(--screen-bg); gap:8px; }
  .loading-overlay.visible { display:flex; }
  .loading-bar { width:80px; height:3px; background:#111a0e; border:1px solid #0a120a; overflow:hidden; }
  .loading-bar-fill { height:100%; background:var(--col-amber); box-shadow:var(--glow-amber); width:0%; animation:loadingAnim 0.9s ease-in-out forwards; }
  @keyframes loadingAnim { to { width:100%; } }
  .loading-text { font-family:'VT323',monospace; font-size:13px; color:var(--col-amber); opacity:0.6; animation:pulse 0.7s steps(1) infinite; }
  @keyframes pulse { 50%{ opacity:0.15; } }

  .now-playing-bar {
    position:absolute; bottom:0; left:0; right:0; padding:4px 8px;
    background:linear-gradient(transparent, #00000099 70%);
    z-index:30; display:none; align-items:center; gap:6px; pointer-events:none; overflow:hidden;
  }
  .now-playing-bar.visible { display:flex; }
  .np-dot { width:4px; height:4px; background:var(--col-amber); box-shadow:var(--glow-amber); flex-shrink:0; animation:ledPulse 1.4s ease-in-out infinite; }
  @keyframes ledPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .np-title { font-size:3px; color:var(--text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; width:0; }

  .toolbar {
    display:flex; align-items:center; gap:4px;
    padding:5px 4px; background:#080a06; border-top:1px solid var(--wood-edge);
    border-bottom:1px solid #0d0d08;
  }
  .yt-logo { font-size:5px; color:var(--col-red); padding:2px 5px; border:1px solid var(--col-red); opacity:0.8; flex-shrink:0; }
  .search-box { flex:1; display:flex; align-items:center; background:#060808; border:1px solid #1a2018; height:20px; padding:0 5px; min-width:0; }
  .search-input { background:none; border:none; outline:none; flex:1; font-family:'VT323',monospace; font-size:13px; color:#6dbf7e; caret-color:#6dbf7e; min-width:0; }
  .search-input::placeholder { color:#2a3a28; font-size:11px; }
  .search-btn { font-family:'Press Start 2P',monospace; font-size:4px; padding:3px 6px; background:#0c1410; color:var(--col-amber); border:1px solid var(--col-amber); box-shadow:var(--glow-amber); cursor:pointer; height:20px; opacity:0.8; flex-shrink:0; }
  .search-btn:hover { opacity:1; }

  .quick-bar { display:flex; flex-wrap:wrap; padding:4px; background:#040605; border-top:1px solid #0e110e; }
  .chip { font-family:'Press Start 2P',monospace; font-size:4px; padding:3px 6px; margin:2px; border:1px solid #1a1a10; background:#080a06; color:#b06a2a; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; }
  .chip:hover { border-color:#c87a35; color:#c87a35; }
  .chip.active { background:#10080e; border-color:var(--col-purple); color:var(--col-purple); }

  .results-header { display:flex; align-items:center; justify-content:space-between; padding:4px 6px; background:#060806; border-top:1px solid #0e110e; }
  .results-label { font-size:3px; color:var(--text-dim); letter-spacing:1px; }
  .results-count { font-family:'VT323',monospace; font-size:11px; color:var(--col-amber); opacity:0.6; }
  .results-list { background:#030506; }

  .result-item { display:flex; align-items:center; gap:6px; padding:0 6px; height:44px; border-bottom:1px solid #0c0e0a; cursor:pointer; transition:background 0.1s; flex-shrink:0; }
  .result-item:hover { background:#0a0d08; }
  .result-item.selected { background:#0c1008; border-left:2px solid var(--col-amber); padding-left:4px; }
  .result-thumb { width:44px; height:28px; flex-shrink:0; overflow:hidden; border:1px solid #1a1a12; background:#080808; }
  .result-thumb img { width:100%; height:100%; object-fit:cover; filter:saturate(0.3) brightness(0.75); display:block; }
  .result-item:hover .result-thumb img, .result-item.selected .result-thumb img { filter:saturate(0.55) brightness(0.85); }
  .result-meta { flex:1; min-width:0; width:0; overflow:hidden; }
  .result-title { font-family:'VT323',monospace; font-size:12px; color:var(--text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; max-width:100%; opacity:0.8; }
  .result-item.selected .result-title { color:#fff; opacity:1; }
  .result-ch { font-size:3px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; }
  .result-dur { font-family:'VT323',monospace; font-size:10px; color:var(--col-amber); opacity:0.55; flex-shrink:0; white-space:nowrap; }

  .knob-strip {
    display:flex; align-items:center; justify-content:center; gap:16px;
    padding:6px 8px; background-color:#7a4e18;
    background-image: repeating-linear-gradient(90deg, transparent 0, transparent 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 11px);
    border-top:2px solid var(--wood-edge);
    box-shadow: inset 0 2px 0 var(--wood-2), inset 0 -2px 0 var(--wood-edge);
  }
  .dial-group { display:flex; flex-direction:column; align-items:center; gap:3px; }
  .dial {
    width:32px; height:32px;
    background: repeating-conic-gradient(var(--knob-mid) 0% 25%, var(--knob-hi) 0% 50%) 0 0 / 8px 8px, var(--knob-mid);
    border:3px solid var(--knob-xdk); border-radius:50%;
    box-shadow: inset 0 3px 0 rgba(255,255,255,0.2), inset 0 -3px 0 rgba(0,0,0,0.3), 0 3px 0 var(--knob-xdk), 0 5px 8px rgba(0,0,0,0.5);
    position:relative; cursor:grab; user-select:none;
  }
  .dial::after { content:''; position:absolute; top:3px; left:50%; transform:translateX(-50%); width:5px; height:5px; border-radius:50%; background:var(--knob-xdk); }
  .dial-label { font-family:'Press Start 2P',monospace; font-size:4px; color:var(--wood-3); letter-spacing:1px; }
  .led-row { display:flex; gap:3px; align-items:center; }
  .led { width:5px; height:5px; background:var(--wood-4); border:1px solid var(--wood-edge); }
  .led.active { background:var(--col-amber); box-shadow:0 0 4px var(--col-amber); }
</style>
</head>
<body>
<div class="tv-wrap">

  <div class="tv-nameplate">
    <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
    <div class="tv-brand">PIXEL TV · MODEL 9</div>
    <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
  </div>

  <div class="screen-bezel">
    <div class="screen" id="screen">
      <div class="static-bg"></div>
      <div class="idle-screen" id="idleScreen">
        <div class="idle-label">NO SIGNAL</div>
        <div class="idle-sub">TUNE A CHANNEL</div>
      </div>
      <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-bar"><div class="loading-bar-fill" id="loadingFill"></div></div>
        <div class="loading-text" id="loadingText">TUNING▮</div>
      </div>
      <!-- Loads YouTube from localhost to bypass Error 153 -->
      <iframe id="playerFrame" src="" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
      <div class="now-playing-bar" id="nowPlayingBar">
        <div class="np-dot"></div>
        <span class="np-title" id="npTitle"></span>
      </div>
    </div>
  </div>

  <div class="toolbar">
    <div class="yt-logo">▶YT</div>
    <div class="search-box">
      <input class="search-input" id="searchInput" type="text" placeholder="search channels..." autocomplete="off" spellcheck="false"/>
    </div>
    <button class="search-btn" id="searchBtn">TUNE</button>
  </div>

  <div class="quick-bar">
    <div class="chip" data-q="lofi hip hop">◎ LOFI</div>
    <div class="chip" data-q="synthwave music">▶ SYNTH</div>
    <div class="chip" data-q="jazz chill">♪ JAZZ</div>
    <div class="chip" data-q="nature sounds">~ NATURE</div>
    <div class="chip" data-q="gaming music">⚡ GAMING</div>
    <div class="chip" data-q="focus study">✦ FOCUS</div>
  </div>

  <div class="results-header">
    <span class="results-label">CHANNELS</span>
    <span class="results-count" id="resultsCount">0</span>
  </div>
  <div class="results-list" id="resultsList"></div>

  <div class="knob-strip">
    <div class="led-row">
      <div class="led active"></div><div class="led"></div>
      <div class="led"></div><div class="led"></div>
    </div>
    <div class="dial-group">
      <div class="dial" id="mainDial"></div>
      <div class="dial-label">CH</div>
    </div>
    <div class="dial-group">
      <div class="dial" id="volDial"></div>
      <div class="dial-label">VOL</div>
    </div>
    <div class="led-row">
      <div class="led"></div><div class="led"></div>
      <div class="led"></div><div class="led active"></div>
    </div>
  </div>

</div>

<script>
  const vscode = acquireVsCodeApi();
  const playerFrame = document.getElementById('playerFrame');

  const allVideos = [
    { id:"jfKfPfyJRdk", title:"lofi hip hop radio – beats to relax/study to", ch:"Lofi Girl",           dur:"LIVE",    tags:"lofi hip hop chill relax study beats music" },
    { id:"5qap5aO4i9A", title:"lofi hip hop radio – beats to sleep/chill to",  ch:"Lofi Girl",           dur:"LIVE",    tags:"lofi hip hop chill sleep beats music" },
    { id:"DWcJFNfaw9c", title:"Coffee Shop Radio – Jazz & Bossa Nova",          ch:"Cafe Music BGM",      dur:"LIVE",    tags:"jazz bossa nova coffee cafe chill relax music" },
    { id:"kgx4WGK0oNU", title:"Chillhop Radio – jazzy lofi beats",              ch:"Chillhop Music",      dur:"LIVE",    tags:"lofi chillhop jazz hip hop chill beats music" },
    { id:"4m_oTMFpJOE", title:"Synthwave Radio – Beats to chill/drive to",      ch:"Synthwave Plaza",     dur:"LIVE",    tags:"synthwave synth retro 80s electronic chill drive music" },
    { id:"CD71fFzEpFY", title:"Outrun Synthwave Radio",                          ch:"NewRetroWave",        dur:"LIVE",    tags:"synthwave outrun retro 80s electronic music neon" },
    { id:"b9FOFQ7ZnQI", title:"Cyberpunk Synth Mix",                             ch:"SynthCity",           dur:"1:02:33", tags:"synthwave cyberpunk electronic synth music retro" },
    { id:"Dx5qFachd3A", title:"Relaxing Jazz Bar – Slow Jazz Music",             ch:"Cafe Music BGM",      dur:"LIVE",    tags:"jazz relax slow bar cafe music chill evening" },
    { id:"AEilkHf1ani", title:"Smooth Jazz – Coffee Shop Ambiance",              ch:"Smooth Jazz",         dur:"3:22:10", tags:"jazz smooth coffee shop ambiance relax chill music" },
    { id:"lP8yB4F9xmM", title:"Late Night Jazz – Piano & Double Bass",           ch:"Jazz Vibes",          dur:"2:48:00", tags:"jazz piano bass night late chill relax music" },
    { id:"eKFTSSKCzWA", title:"Forest Rain Sounds – 8 Hours Sleep",              ch:"Relaxing Nature",     dur:"8:00:00", tags:"rain forest nature sounds sleep relax ambient" },
    { id:"q76bMs-NwRk", title:"Ocean Waves on Rocky Beach",                      ch:"Nature Sounds",       dur:"3:00:00", tags:"ocean waves beach nature sounds relax sleep ambient" },
    { id:"b-lFEY8AXNw", title:"Rainforest Ambience – Birds & Rain",              ch:"Sounds of Nature",    dur:"1:00:00", tags:"rainforest birds rain nature sounds ambient relax" },
    { id:"LXo4WrCJgbg", title:"NightCore Gaming Mix 2024",                       ch:"NightCore",           dur:"1:10:22", tags:"gaming nightcore music mix edm electronic fast" },
    { id:"HKtsdZs9LJo", title:"Epic Gaming Music – Best EDM",                    ch:"GamingMix",           dur:"2:00:15", tags:"gaming epic music edm electronic mix battle" },
    { id:"R-VKhQpSX5M", title:"Retro Video Game Soundtracks Mix",                ch:"GameTunes",           dur:"1:30:00", tags:"gaming retro video game soundtrack music chiptune" },
    { id:"t3217H8mppg", title:"4 Hours Deep Focus Music – Study/Work",           ch:"Yellow Brick Cinema", dur:"4:00:00", tags:"focus study work deep music concentration productivity" },
    { id:"5tUCmMM9S4E", title:"Brain Food – Deep Focus Concentration",            ch:"Brain Food",          dur:"LIVE",    tags:"focus brain study concentration work productivity music" },
    { id:"WPni755-Krg", title:"Binaural Beats – Focus & Clarity",                ch:"Binaural Beats",      dur:"3:00:00", tags:"binaural beats focus clarity study concentration brain" },
    { id:"MKHNQwdCLPI", title:"Classical Music for Studying – Mozart Bach",      ch:"Classical Study",     dur:"3:08:00", tags:"classical music studying mozart bach beethoven focus piano" },
    { id:"q6BIEdKkNBg", title:"Heavy Metal Mix – Best of 2024",                  ch:"Metal Nation",        dur:"1:45:00", tags:"metal heavy rock loud intense music mix" },
    { id:"3nQNiWdeH2Q", title:"Ambient Space Music – Relaxing Universe",         ch:"Space Ambient",       dur:"2:00:00", tags:"ambient space music relax universe stars meditation" },
    { id:"8Z_UXqJkxBs", title:"Meditation Music – Inner Peace & Calm",           ch:"Zen Meditation",      dur:"1:30:00", tags:"meditation music calm peace zen relax mindfulness" },
  ];

  const searchInput    = document.getElementById('searchInput');
  const searchBtn      = document.getElementById('searchBtn');
  const resultsList    = document.getElementById('resultsList');
  const resultsCount   = document.getElementById('resultsCount');
  const idleScreen     = document.getElementById('idleScreen');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingFill    = document.getElementById('loadingFill');
  const loadingText    = document.getElementById('loadingText');
  const nowPlayingBar  = document.getElementById('nowPlayingBar');
  const npTitle        = document.getElementById('npTitle');

  function doSearch(q) {
    q = q.trim().toLowerCase();
    if (!q) return;
    idleScreen.style.display = 'none';
    loadingText.textContent = 'TUNING▮';
    loadingFill.style.animation = 'none';
    void loadingFill.offsetWidth;
    loadingFill.style.animation = 'loadingAnim 0.9s ease-in-out forwards';
    loadingOverlay.classList.add('visible');
    setTimeout(() => {
      loadingOverlay.classList.remove('visible');
      const words = q.split(/\s+/).filter(w => w.length > 1);
      const scored = allVideos.map(v => {
        const hay = (v.title + ' ' + v.ch + ' ' + v.tags).toLowerCase();
        let score = 0;
        for (const w of words) {
          if (hay.includes(w)) score += 2;
          if (hay.split(/\s+/).some(hw => hw.startsWith(w))) score += 1;
        }
        return { ...v, score };
      });
      const results = scored.sort((a,b) => b.score - a.score).filter(v => v.score > 0).slice(0, 6);
      renderResults(results.length > 0 ? results : allVideos.slice(0, 4));
    }, 700 + Math.random() * 300);
  }

  function renderResults(results) {
    resultsList.innerHTML = '';
    resultsCount.textContent = results.length;
    results.forEach(r => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.innerHTML = \`
        <div class="result-thumb">
          <img src="https://i.ytimg.com/vi/\${r.id}/mqdefault.jpg" onerror="this.style.display='none'"/>
        </div>
        <div class="result-meta">
          <div class="result-title">\${r.title}</div>
          <div class="result-ch">\${r.ch}</div>
        </div>
        <div class="result-dur">\${r.dur}</div>
      \`;
      item.addEventListener('click', () => playVideo(item, r));
      resultsList.appendChild(item);
    });
  }

  function playVideo(item, r) {
    document.querySelectorAll('.result-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
    loadingText.textContent = 'TUNING IN▮';
    loadingFill.style.animation = 'none';
    void loadingFill.offsetWidth;
    loadingFill.style.animation = 'loadingAnim 0.5s ease-in-out forwards';
    loadingOverlay.classList.add('visible');

    const dial = document.getElementById('mainDial');
    const rot = parseFloat(dial.dataset.rot || '0') + 55 + Math.random() * 50;
    dial.dataset.rot = rot;
    dial.style.transform = \`rotate(\${rot}deg)\`;

    // Tell the extension host to give us the localhost player URL
    vscode.postMessage({ type: 'playVideo', videoId: r.id });

    npTitle.textContent = r.title;
  }

  // Extension sends back the localhost URL to load
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
  });

  searchBtn.addEventListener('click', () => doSearch(searchInput.value));
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(searchInput.value); });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      searchInput.value = chip.dataset.q;
      doSearch(chip.dataset.q);
    });
  });

  document.querySelectorAll('.dial').forEach(dial => {
    let dragging = false, startY = 0;
    dial.addEventListener('mousedown', e => { dragging = true; startY = e.clientY; e.preventDefault(); });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      let rot = parseFloat(dial.dataset.rot || '0') + (startY - e.clientY) * 3;
      dial.dataset.rot = rot;
      dial.style.transform = \`rotate(\${rot}deg)\`;
      startY = e.clientY;
    });
    document.addEventListener('mouseup', () => dragging = false);
  });

  renderResults(allVideos.slice(0, 6));
</script>
</body>
</html>`;
}
