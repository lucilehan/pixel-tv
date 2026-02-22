import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let panel: vscode.WebviewPanel | undefined;

  const openCmd = vscode.commands.registerCommand('pixelTv.open', async () => {
    if (panel) {
      // Reveal in column Two (beside active editor), like vscode-pets
      panel.reveal(vscode.ViewColumn.Two);
      return;
    }
    panel = createPanel(context);
    panel.onDidDispose(() => { panel = undefined; });
  });

  const openWithUrlCmd = vscode.commands.registerCommand('pixelTv.openWithUrl', (url: string) => {
    if (!panel) {
      panel = createPanel(context);
      panel.onDidDispose(() => { panel = undefined; });
    }
    panel.webview.postMessage({ type: 'loadVideo', videoId: extractVideoId(url ?? '') });
  });

  context.subscriptions.push(openCmd, openWithUrlCmd);
}

function extractVideoId(input: string): string {
  if (!input) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.searchParams.get('v')) return url.searchParams.get('v')!;
    if (url.hostname === 'youtu.be') return url.pathname.slice(1);
    const m = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  } catch {}
  return input;
}

function createPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
  // Open in column Two (beside the active editor) — same as vscode-pets
  const column = vscode.window.activeTextEditor
    ? vscode.ViewColumn.Two
    : vscode.ViewColumn.One;

  const panel = vscode.window.createWebviewPanel(
    'pixelTv',
    '📺 Pixel TV',
    column,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getWebviewContent();

  panel.webview.onDidReceiveMessage((message) => {
    if (message.type === 'openUrl') {
      vscode.env.openExternal(vscode.Uri.parse(message.url));
    }
  });

  return panel;
}

function getWebviewContent(): string {
  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src https://www.youtube-nocookie.com https://www.youtube.com; img-src https://i.ytimg.com https: data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'unsafe-inline';">
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
    --panel-1:   #7a4e18;
    --panel-2:   #5e3a10;
    --panel-3:   #3e2608;
    --bez-2:     #4a4e60;
    --bez-3:     #2e3040;
    --bez-4:     #1a1c28;
    --bez-hi:    #8890a8;
    --knob-hi:   #c8d8e8;
    --knob-mid:  #8899aa;
    --knob-dk:   #445566;
    --knob-xdk:  #1a2233;
    --leg-1:     #778090;
    --leg-2:     #556070;
    --leg-3:     #334050;
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
    overflow: hidden;
    background: #100c08;
    background-image:
      repeating-linear-gradient(90deg, rgba(255,180,80,.018) 0px, rgba(255,180,80,.018) 1px, transparent 1px, transparent 40px),
      radial-gradient(ellipse at 50% 20%, #1e1608 0%, #080604 100%);
    image-rendering: pixelated;
  }

  /* Outer wrapper fills the panel and centres the TV */
  #scale-root {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  /* TV wrapper — natural size, scaled via JS transform */
  #tv-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    transform-origin: center center;
    /* Natural design width: 800px */
  }

  /* ANTENNAS */
  .antennas {
    position: relative; width: min(760px, 100%);
    height: 56px; flex-shrink: 0; pointer-events: none; z-index: 3;
  }
  .antenna-l, .antenna-r { position: absolute; bottom: 0; }
  .antenna-l { left: 28%; }
  .antenna-r { right: 28%; }
  .ant-shaft {
    width: 4px; background: var(--bez-2);
    box-shadow: 2px 0 0 var(--bez-4), -1px 0 0 var(--bez-hi);
    position: relative;
  }
  .antenna-l .ant-shaft { height: 50px; transform: rotate(-24deg); transform-origin: bottom center; }
  .antenna-r .ant-shaft { height: 50px; transform: rotate(24deg);  transform-origin: bottom center; }
  .ant-tip {
    position: absolute; top: -7px; left: -2px;
    width: 8px; height: 8px; background: #cc2222;
    box-shadow: 2px 0 0 #991111, 0 -2px 0 #ee4444, -2px 2px 0 #881111, 0 0 0 1px #440000;
  }
  .antenna-hub {
    position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 26px; height: 13px; background: var(--bez-2);
    box-shadow: 0 -2px 0 var(--bez-hi), 2px 0 0 var(--bez-3), -2px 0 0 var(--bez-hi), 0 2px 0 var(--bez-4);
    z-index: 1;
  }

  /* TV CABINET */
  .tv-cabinet {
    position: relative; z-index: 1; width: min(760px, 100%);
    background-color: var(--wood-1);
    background-image: repeating-linear-gradient(90deg,
      transparent 0px, transparent 18px,
      rgba(0,0,0,0.07) 18px, rgba(0,0,0,0.07) 19px,
      transparent 19px, transparent 32px,
      rgba(255,255,255,0.04) 32px, rgba(255,255,255,0.04) 33px);
    border: 4px solid var(--wood-edge);
    box-shadow:
      inset 4px 4px 0 0 var(--wood-3), inset 8px 8px 0 0 rgba(255,255,255,0.06),
      inset -4px -4px 0 0 var(--wood-5),
      4px 4px 0 0 var(--wood-edge), 6px 6px 0 0 var(--wood-5),
      8px 8px 0 0 rgba(0,0,0,0.5), 12px 12px 24px rgba(0,0,0,0.7);
    padding: 14px 14px 10px;
  }

  .tv-top-strip {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px; padding: 0 4px;
  }
  .tv-brand-plate {
    background: var(--wood-5); border: 2px solid var(--wood-edge);
    padding: 3px 8px;
    box-shadow: inset 1px 1px 0 rgba(255,255,255,0.08), 2px 2px 0 var(--wood-edge);
  }
  .tv-brand-plate span {
    font-family: 'Press Start 2P', monospace;
    font-size: 6px; letter-spacing: 2px; color: var(--wood-3);
    text-shadow: 0 1px 0 var(--wood-edge);
  }
  .tv-screws { display: flex; gap: 6px; }
  .screw {
    width: 8px; height: 8px; background: var(--wood-4);
    border: 2px solid var(--wood-edge);
    box-shadow: inset 1px 1px 0 rgba(255,255,255,0.15), 1px 1px 0 var(--wood-edge);
    position: relative;
  }
  .screw::before { content: ''; position: absolute; top: 50%; left: 1px; right: 1px; height: 1px; background: var(--wood-edge); transform: translateY(-50%); }
  .screw::after  { content: ''; position: absolute; left: 50%; top: 1px; bottom: 1px; width: 1px; background: var(--wood-edge); transform: translateX(-50%); }

  .tv-middle { display: flex; gap: 10px; align-items: stretch; }

  /* SCREEN */
  .screen-section { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .screen-bezel {
    position: relative; background: var(--bez-2); border: 4px solid var(--bez-4); padding: 10px;
    box-shadow:
      inset 4px 4px 0 0 var(--bez-hi), inset 8px 8px 0 0 rgba(255,255,255,0.04),
      inset -4px -4px 0 0 var(--bez-4), 4px 4px 0 var(--bez-4);
    flex: 1; display: flex; flex-direction: column;
  }
  .screen {
    background: var(--screen-bg); border: 3px solid var(--bez-4);
    position: relative; overflow: hidden; display: flex; flex-direction: column; flex: 1;
    box-shadow: inset 0 0 40px rgba(0,0,0,0.95), inset 0 0 12px rgba(0,0,0,0.7);
  }
  .screen::before {
    content: ''; position: absolute; top: 0; left: 0; width: 50%; height: 35%;
    background: radial-gradient(ellipse at 15% 15%, rgba(255,240,180,0.04) 0%, transparent 65%);
    pointer-events: none; z-index: 300;
  }
  .screen::after {
    content: ''; position: absolute; inset: 0;
    background: repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, var(--scanline) 2px, var(--scanline) 4px);
    pointer-events: none; z-index: 200;
  }

  /* CONTROL PANEL */
  .control-panel {
    width: 86px; flex-shrink: 0;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    background-color: var(--panel-1);
    background-image: repeating-linear-gradient(90deg, transparent 0, transparent 10px, rgba(0,0,0,0.06) 10px, rgba(0,0,0,0.06) 11px);
    border: 3px solid var(--wood-edge); padding: 10px 8px;
    box-shadow: inset 3px 3px 0 0 var(--wood-2), inset -3px -3px 0 0 var(--panel-3), 2px 2px 0 var(--wood-edge);
  }
  .brand-badge { width: 100%; text-align: center; border-bottom: 2px solid var(--panel-3); padding-bottom: 6px; margin-bottom: 2px; }
  .brand-name { font-family: 'Press Start 2P', monospace; font-size: 5px; color: var(--wood-3); letter-spacing: 1px; text-shadow: 0 1px 0 var(--wood-edge); }
  .brand-model { font-family: 'Press Start 2P', monospace; font-size: 4px; color: var(--panel-2); margin-top: 3px; }

  .dial-group { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .dial {
    width: 50px; height: 50px;
    background: repeating-conic-gradient(var(--knob-mid) 0% 25%, var(--knob-hi) 0% 50%) 0 0 / 12px 12px, var(--knob-mid);
    border: 4px solid var(--knob-xdk); border-radius: 50%;
    box-shadow: inset 0 4px 0 rgba(255,255,255,0.25), inset 0 -4px 0 rgba(0,0,0,0.35),
      0 3px 0 var(--knob-xdk), 0 5px 0 rgba(0,0,0,0.4), 0 8px 12px rgba(0,0,0,0.5);
    position: relative; cursor: grab; user-select: none; overflow: hidden;
  }
  .dial::after {
    content: ''; position: absolute; top: 4px; left: 50%; transform: translateX(-50%);
    width: 8px; height: 8px; border-radius: 50%; background: var(--knob-xdk);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
  }
  .dial-label { font-family: 'Press Start 2P', monospace; font-size: 5px; color: var(--wood-3); text-shadow: 0 1px 0 var(--wood-edge); letter-spacing: 1px; }

  .sub-panel {
    width: 100%; flex: 1; background: var(--panel-3); border: 2px solid var(--wood-edge);
    padding: 6px 5px; display: flex; flex-direction: column; gap: 4px;
    box-shadow: inset 2px 2px 0 rgba(0,0,0,0.4);
  }
  .grille-lines { display: flex; flex-direction: column; gap: 4px; flex: 1; justify-content: center; }
  .grille-line { height: 2px; background: rgba(0,0,0,0.5); box-shadow: 0 1px 0 rgba(255,255,255,0.06); }
  .oval-buttons { display: flex; justify-content: center; gap: 7px; margin-top: 6px; }
  .oval-btn {
    width: 22px; height: 12px; background: var(--knob-mid); border: 2px solid var(--knob-xdk);
    box-shadow: inset 0 2px 0 var(--knob-hi), inset 0 -2px 0 var(--knob-dk), 0 2px 0 var(--knob-xdk);
    cursor: pointer; transition: transform 0.05s;
  }
  .oval-btn:active { transform: translateY(1px); }

  .tv-bottom-strip { margin-top: 8px; display: flex; align-items: center; justify-content: space-between; padding: 0 4px; }
  .ch-dots { display: flex; gap: 4px; align-items: center; }
  .ch-dot { width: 6px; height: 6px; background: var(--wood-4); border: 1px solid var(--wood-edge); }
  .ch-dot.active { background: var(--col-amber); box-shadow: 0 0 4px var(--col-amber); }
  .model-label { font-family: 'Press Start 2P', monospace; font-size: 5px; letter-spacing: 2px; color: var(--wood-4); }

  /* TOOLBAR */
  .toolbar {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 9px; background: #080a06; border-bottom: 1px solid #111a0e;
    flex-shrink: 0; position: relative; z-index: 10;
  }
  .yt-logo { font-size: 6px; color: var(--col-red); text-shadow: var(--glow-red); padding: 3px 6px; border: 1px solid var(--col-red); opacity: 0.8; flex-shrink: 0; white-space: nowrap; }
  .search-box { flex: 1; display: flex; align-items: center; background: #060808; border: 1px solid #1a2018; height: 24px; gap: 5px; padding: 0 7px; min-width: 0; }
  .search-icon { color: var(--text-dim); font-size: 13px; flex-shrink: 0; font-family: 'VT323', monospace; line-height: 1; }
  .search-input { background: none; border: none; outline: none; flex: 1; font-family: 'VT323', monospace; font-size: 15px; color: #6dbf7e; caret-color: #6dbf7e; min-width: 0; }
  .search-input::placeholder { color: #2a3a28; font-size: 13px; }
  .search-btn { font-family: 'Press Start 2P', monospace; font-size: 5px; padding: 4px 8px; background: #0c1410; color: var(--col-amber); border: 1px solid var(--col-amber); box-shadow: 1px 1px 0 #0008, var(--glow-amber); cursor: pointer; height: 24px; opacity: 0.8; flex-shrink: 0; transition: opacity 0.1s; }
  .search-btn:hover { opacity: 1; }

  /* CONTENT AREA */
  .content-area { flex: 1; min-height: 280px; position: relative; display: flex; }

  .video-panel { flex: 1; position: relative; background: #030506; display: flex; align-items: center; justify-content: center; overflow: hidden; min-width: 0; }
  .static-bg { position: absolute; inset: 0; opacity: 0.1; animation: staticAnim 0.1s steps(1) infinite; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  }
  @keyframes staticAnim { 0%{background-position:0 0} 25%{background-position:-12px 6px} 50%{background-position:6px -6px} 75%{background-position:-6px 12px} }

  .idle-screen { position: relative; z-index: 2; text-align: center; pointer-events: none; display: flex; flex-direction: column; align-items: center; }
  .idle-label { font-family: 'VT323', monospace; font-size: 18px; color: var(--col-amber); opacity: 0.4; text-shadow: var(--glow-amber); animation: flicker 6s ease-in-out infinite; margin-bottom: 5px; }
  @keyframes flicker { 0%,93%,100%{opacity:0.4} 94%{opacity:0.1} 95%{opacity:0.4} 97%{opacity:0.08} 98%{opacity:0.35} }
  .idle-sub { font-size: 4px; color: #2a2a40; font-family: 'Press Start 2P', monospace; }

  #ytIframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; display: none; z-index: 5; }

  .now-playing-bar { position: absolute; bottom: 0; left: 0; right: 0; padding: 5px 10px 6px; background: linear-gradient(transparent, #00000099 70%); z-index: 30; display: none; align-items: center; gap: 8px; pointer-events: none; overflow: hidden; }
  .now-playing-bar.visible { display: flex; }
  .np-dot { width: 5px; height: 5px; background: var(--col-amber); box-shadow: var(--glow-amber); flex-shrink: 0; animation: ledPulse 1.4s ease-in-out infinite; }
  @keyframes ledPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .np-title { font-size: 4px; color: var(--text-bright); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.85; min-width: 0; width: 0; flex: 1; }
  .np-ch { font-size: 4px; color: var(--text-dim); white-space: nowrap; flex-shrink: 0; }

  /* RESULTS PANEL */
  .results-panel { width: 200px; flex-shrink: 0; background: #030506; border-left: 1px solid #0e1410; display: flex; flex-direction: column; z-index: 15; }
  .results-header { padding: 5px 9px; background: #060806; border-bottom: 1px solid #0e110e; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .results-header-label { font-size: 4px; color: var(--text-dim); letter-spacing: 1px; }
  .results-count { font-family: 'VT323', monospace; font-size: 12px; color: var(--col-amber); opacity: 0.6; }
  .results-list { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #2a2a1a transparent; }

  .result-item { display: flex; align-items: center; gap: 8px; padding: 0 9px; height: 52px; border-bottom: 1px solid #0c0e0a; cursor: pointer; transition: background 0.1s; flex-shrink: 0; }
  .result-item:hover { background: #0a0d08; }
  .result-item.selected { background: #0c1008; border-left: 2px solid var(--col-amber); padding-left: 7px; }
  .result-thumb { width: 50px; height: 32px; flex-shrink: 0; overflow: hidden; border: 1px solid #1a1a12; background: #080808; }
  .result-thumb img { width: 100%; height: 100%; object-fit: cover; filter: saturate(0.3) brightness(0.75) sepia(0.2); display: block; transition: filter 0.15s; }
  .result-item:hover .result-thumb img, .result-item.selected .result-thumb img { filter: saturate(0.55) brightness(0.85); }
  .result-meta { flex: 1; min-width: 0; width: 0; overflow: hidden; }
  .result-title { font-family: 'VT323', monospace; font-size: 13px; color: var(--text-bright); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; opacity: 0.8; display: block; max-width: 100%; }
  .result-item.selected .result-title { color: #fff; opacity: 1; }
  .result-ch { font-size: 4px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
  .result-dur { font-family: 'VT323', monospace; font-size: 11px; color: var(--col-amber); opacity: 0.55; flex-shrink: 0; align-self: flex-end; padding-bottom: 1px; white-space: nowrap; }

  /* LOADING */
  .loading-overlay { position: absolute; inset: 0; z-index: 8; display: none; flex-direction: column; align-items: center; justify-content: center; background: #030506; gap: 10px; }
  .loading-overlay.visible { display: flex; }
  .loading-bar { width: 100px; height: 3px; background: #111a0e; border: 1px solid #0a120a; overflow: hidden; }
  .loading-bar-fill { height: 100%; background: var(--col-amber); box-shadow: var(--glow-amber); width: 0%; animation: loadingAnim 0.9s ease-in-out forwards; }
  @keyframes loadingAnim { to { width: 100%; } }
  .loading-text { font-family: 'VT323', monospace; font-size: 15px; color: var(--col-amber); opacity: 0.6; animation: pulse 0.7s steps(1) infinite; }
  @keyframes pulse { 50%{ opacity: 0.15; } }

  /* QUICK CHIPS */
  .quick-bar { display: flex; flex-wrap: wrap; padding: 5px 7px; background: #040605; border-top: 1px solid #0e110e; position: relative; z-index: 10; flex-shrink: 0; }
  .chip { font-family: 'Press Start 2P', monospace; font-size: 7px; padding: 4px 9px; margin: 2px; border: 1px solid #1a1a10; background: #080a06; color: #b06a2a; cursor: pointer; transition: all 0.08s; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
  .chip:hover { background: #101208; border-color: #c87a35; color: #c87a35; }
  .chip.active { background: #10080e; border-color: var(--col-purple); color: var(--col-purple); }

  /* LEGS */
  .tv-legs { position: relative; z-index: 1; width: min(760px, 100%); display: flex; justify-content: space-between; padding: 0 70px; }
  .leg-pair { display: flex; gap: 8px; }
  .leg { display: flex; flex-direction: column; align-items: flex-start; }
  .leg-seg { background: var(--leg-1); border-left: 2px solid var(--leg-3); border-right: 2px solid rgba(255,255,255,0.08); border-bottom: 2px solid var(--leg-3); }
  .leg-ll .leg-seg:nth-child(1){width:12px;height:8px} .leg-ll .leg-seg:nth-child(2){width:10px;height:8px;margin-left:1px} .leg-ll .leg-seg:nth-child(3){width:8px;height:8px;margin-left:2px} .leg-ll .leg-seg:nth-child(4){width:8px;height:6px;margin-left:2px;background:var(--leg-2)}
  .leg-lr .leg-seg:nth-child(1){width:10px;height:8px} .leg-lr .leg-seg:nth-child(2){width:10px;height:8px} .leg-lr .leg-seg:nth-child(3){width:8px;height:8px} .leg-lr .leg-seg:nth-child(4){width:8px;height:6px;background:var(--leg-2)}
  .leg-rl .leg-seg:nth-child(1){width:10px;height:8px} .leg-rl .leg-seg:nth-child(2){width:10px;height:8px} .leg-rl .leg-seg:nth-child(3){width:8px;height:8px;margin-left:2px} .leg-rl .leg-seg:nth-child(4){width:8px;height:6px;margin-left:2px;background:var(--leg-2)}
  .leg-rr .leg-seg:nth-child(1){width:12px;height:8px} .leg-rr .leg-seg:nth-child(2){width:10px;height:8px} .leg-rr .leg-seg:nth-child(3){width:8px;height:8px} .leg-rr .leg-seg:nth-child(4){width:8px;height:6px;background:var(--leg-2)}
  .leg-foot { width: 16px; height: 4px; background: var(--leg-2); border: 2px solid var(--leg-3); align-self: center; box-shadow: 0 2px 0 rgba(0,0,0,0.5); }
</style>
</head>
<body>
<div id="scale-root">
<div id="tv-wrapper">

<div class="antennas">
  <div class="antenna-l"><div class="ant-shaft"><div class="ant-tip"></div></div></div>
  <div class="antenna-hub"></div>
  <div class="antenna-r"><div class="ant-shaft"><div class="ant-tip"></div></div></div>
</div>

<div class="tv-cabinet">
  <div class="tv-top-strip">
    <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
    <div class="tv-brand-plate"><span>PIXEL TV · MODEL 9</span></div>
    <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
  </div>

  <div class="tv-middle">
    <div class="screen-section">
      <div class="screen-bezel">
        <div class="screen">

          <div class="toolbar">
            <div class="yt-logo">▶YT</div>
            <div class="search-box">
              <span class="search-icon">⌕</span>
              <input class="search-input" id="searchInput" type="text" placeholder="search videos..." autocomplete="off" spellcheck="false"/>
            </div>
            <button class="search-btn" id="searchBtn">TUNE</button>
          </div>

          <div class="content-area">
            <div class="video-panel" id="videoPanel">
              <div class="static-bg"></div>
              <div class="idle-screen" id="idleScreen">
                <div class="idle-label">── NO SIGNAL ──</div>
                <div class="idle-sub">TUNE TO A CHANNEL ABOVE</div>
              </div>
              <div class="loading-overlay" id="loadingOverlay">
                <div class="loading-bar"><div class="loading-bar-fill" id="loadingFill"></div></div>
                <div class="loading-text" id="loadingText">TUNING▮</div>
              </div>
              <iframe id="ytIframe"
                src=""
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowfullscreen>
              </iframe>
              <div class="now-playing-bar" id="nowPlayingBar">
                <div class="np-dot"></div>
                <span class="np-title" id="npTitle"></span>
                <span class="np-ch" id="npCh"></span>
              </div>
            </div>

            <div class="results-panel" id="resultsPanel">
              <div class="results-header">
                <span class="results-header-label">CHANNELS</span>
                <span class="results-count" id="resultsCount">0</span>
              </div>
              <div class="results-list" id="resultsList"></div>
            </div>
          </div>

          <div class="quick-bar">
            <div class="chip" data-q="lofi hip hop">◎ LOFI</div>
            <div class="chip" data-q="synthwave music">▶ SYNTH</div>
            <div class="chip" data-q="jazz chill">♪ JAZZ</div>
            <div class="chip" data-q="nature sounds relaxing">~ NATURE</div>
            <div class="chip" data-q="gaming music mix">⚡ GAMING</div>
            <div class="chip" data-q="focus study music">✦ FOCUS</div>
          </div>

        </div>
      </div>
    </div>

    <div class="control-panel">
      <div class="brand-badge">
        <div class="brand-name">PIXEL TV</div>
        <div class="brand-model">MODEL 9</div>
      </div>
      <div class="dial-group">
        <div class="dial" id="mainDial"></div>
        <div class="dial-label">CH</div>
      </div>
      <div class="dial-group">
        <div class="dial" id="volDial"></div>
        <div class="dial-label">VOL</div>
      </div>
      <div class="sub-panel">
        <div class="grille-lines">
          <div class="grille-line"></div><div class="grille-line"></div>
          <div class="grille-line"></div><div class="grille-line"></div>
          <div class="grille-line"></div><div class="grille-line"></div>
          <div class="grille-line"></div>
        </div>
        <div class="oval-buttons">
          <div class="oval-btn"></div>
          <div class="oval-btn"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="tv-bottom-strip">
    <div class="ch-dots">
      <div class="ch-dot active"></div><div class="ch-dot"></div>
      <div class="ch-dot"></div><div class="ch-dot"></div>
      <div class="ch-dot"></div><div class="ch-dot"></div>
    </div>
    <div class="model-label">UHF · VHF · FM</div>
    <div class="tv-screws"><div class="screw"></div><div class="screw"></div></div>
  </div>
</div>

<div class="tv-legs">
  <div class="leg-pair">
    <div class="leg leg-ll"><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-foot"></div></div>
    <div class="leg leg-lr"><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-foot"></div></div>
  </div>
  <div class="leg-pair">
    <div class="leg leg-rl"><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-foot"></div></div>
    <div class="leg leg-rr"><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-seg"></div><div class="leg-foot"></div></div>
  </div>
</div>

</div><!-- /tv-wrapper -->
</div><!-- /scale-root -->

<script>
  // ── Scale TV to fit panel (like vscode-pets ratio approach) ──
  const tvWrapper = document.getElementById('tv-wrapper');
  const DESIGN_W = 800;  // natural TV width
  const DESIGN_H = 680;  // natural TV height incl antennas + legs

  function scaleTV() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaleX = vw / DESIGN_W;
    const scaleY = vh / DESIGN_H;
    // Use the smaller axis so TV always fits — same ratio logic as vscode-pets
    const scale = Math.min(scaleX, scaleY) * 0.92;
    tvWrapper.style.transform = \`scale(\${scale})\`;
  }

  window.addEventListener('resize', scaleTV);
  scaleTV();
  const vscode = acquireVsCodeApi();

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
  const npCh           = document.getElementById('npCh');
  const ytIframe       = document.getElementById('ytIframe');

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
      const results = scored.sort((a, b) => b.score - a.score).filter(v => v.score > 0).slice(0, 6);
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
          <img src="https://i.ytimg.com/vi/\${r.id}/mqdefault.jpg"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
          <div class="result-thumb-placeholder" style="display:none;align-items:center;justify-content:center;width:100%;height:100%;background:#0a0a0a;color:#222;font-family:VT323,monospace;font-size:13px;">▶</div>
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

    setTimeout(() => {
      loadingOverlay.classList.remove('visible');
      idleScreen.style.display = 'none';

      // Embed directly — works in VS Code webviews
      ytIframe.src = \`https://www.youtube-nocookie.com/embed/\${r.id}?autoplay=1&rel=0&modestbranding=1\`;
      ytIframe.style.display = 'block';

      npTitle.textContent = r.title;
      npCh.textContent = r.ch;
      nowPlayingBar.classList.add('visible');
    }, 500);
  }

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

  // Messages from extension host (e.g. openWithUrl command)
  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.type === 'loadVideo' && msg.videoId) {
      idleScreen.style.display = 'none';
      ytIframe.src = \`https://www.youtube-nocookie.com/embed/\${msg.videoId}?autoplay=1&rel=0\`;
      ytIframe.style.display = 'block';
    }
  });

  // Draggable dials
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

  // Seed default results on load
  renderResults(allVideos.slice(0, 6));
</script>
</body>
</html>`;
}

export function deactivate() {}
