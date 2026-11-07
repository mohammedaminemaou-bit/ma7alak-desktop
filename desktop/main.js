const { app, BrowserWindow, shell, protocol, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const HOST = 'mohammedaminemaou-bit.github.io';
const HOME = 'https://' + HOST + '/MA7ALEK-DZ/';

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function create() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 1024, minHeight: 640,
    backgroundColor: '#0C1F4A', title: 'MA7ALAK DZ',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.maximize();
  win.loadURL(HOME);
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).host !== HOST) shell.openExternal(url);
      else win.loadURL(url);
    } catch (e) {}
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    try {
      const u = new URL(url);
      if (u.host !== HOST && u.protocol !== 'about:' && u.protocol !== 'blob:' && u.protocol !== 'data:') {
        e.preventDefault(); shell.openExternal(url);
      }
    } catch (e2) {}
  });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && (i.key === 'F11')) win.setFullScreen(!win.isFullScreen());
    if (i.type === 'keyDown' && i.key === 'F5') win.webContents.reload();
  });
}

app.whenReady().then(() => {
  // Disk cache: site + Supabase lib + fonts. First run online caches them, then works offline.
  const crypto = require('crypto');
  const dir = path.join(app.getPath('userData'), 'offline-cache');
  fs.mkdirSync(dir, { recursive: true });
  const HOSTS = [HOST, 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
  const key = (u) => path.join(dir, crypto.createHash('sha1').update(u).digest('hex'));

  protocol.handle('https', async (req) => {
    const u = new URL(req.url);
    if (req.method !== 'GET' || !HOSTS.includes(u.host)) {
      return net.fetch(req, { bypassCustomProtocolHandlers: true });
    }
    const f = key(req.url);
    try {
      const r = await net.fetch(req, { bypassCustomProtocolHandlers: true });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        try {
          fs.writeFileSync(f, buf);
          fs.writeFileSync(f + '.type', r.headers.get('content-type') || 'application/octet-stream');
        } catch (e) {}
        return new Response(buf, { status: 200, headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream' } });
      }
      return r;
    } catch (err) {
      try {
        return new Response(fs.readFileSync(f), { headers: { 'content-type': fs.readFileSync(f + '.type', 'utf8') } });
      } catch (e) {}
      const p = u.pathname;
      if (u.host === HOST && (p === '/MA7ALEK-DZ/' || p === '/MA7ALEK-DZ' || p === '/MA7ALEK-DZ/index.html')) {
        return new Response(fs.readFileSync(path.join(__dirname, 'index.html')), { headers: { 'content-type': 'text/html; charset=utf-8' } });
      }
      return Response.error();
    }
  });
  create();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) create(); });
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
