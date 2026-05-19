// Electron main process – načte produkčně zbuildovaný Vite frontend (dist/)
// nebo v dev režimu připojí k běžícímu Vite serveru.
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0f0d0a',
    title: 'WoodSetup',
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Všechny externí odkazy ven do systémového prohlížeče.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Zákaz navigace mimo aplikaci (file:// / dev URL OK, vše ostatní ven do browseru).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocal =
      url.startsWith('file://') ||
      url.startsWith(DEV_URL) ||
      url === mainWindow?.webContents.getURL();
    if (!isLocal) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Soubor',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit', label: 'Konec' },
      ],
    },
    {
      label: 'Úpravy',
      submenu: [
        { role: 'undo', label: 'Zpět' },
        { role: 'redo', label: 'Vpřed' },
        { type: 'separator' },
        { role: 'cut', label: 'Vyjmout' },
        { role: 'copy', label: 'Kopírovat' },
        { role: 'paste', label: 'Vložit' },
        { role: 'selectAll', label: 'Vybrat vše' },
      ],
    },
    {
      label: 'Zobrazení',
      submenu: [
        { role: 'reload', label: 'Načíst znovu' },
        { role: 'toggleDevTools', label: 'Vývojářské nástroje' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Výchozí přiblížení' },
        { role: 'zoomIn', label: 'Přiblížit' },
        { role: 'zoomOut', label: 'Oddálit' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Celá obrazovka' },
      ],
    },
    {
      label: 'Okno',
      submenu: [
        { role: 'minimize', label: 'Minimalizovat' },
        { role: 'zoom', label: 'Zvětšit' },
        ...(isMac ? [{ role: 'front', label: 'Přenést vše dopředu' }] : []),
      ],
    },
    {
      label: 'Nápověda',
      submenu: [
        {
          label: 'GitHub – zdrojový kód',
          click: () => shell.openExternal('https://github.com/mirapavlicek/WoodSetup'),
        },
        {
          label: 'O aplikaci WoodSetup',
          click: () =>
            dialog.showMessageBox({
              type: 'info',
              title: 'O aplikaci',
              message: 'WoodSetup',
              detail:
                `Verze ${app.getVersion()}\n` +
                'DIY návrh dřevěných a kovových konstrukcí ve 3D.\n\n' +
                'Licence: PolyForm Noncommercial 1.0.0 (nekomerční použití).\n' +
                'Postaveno na React, Three.js, R3F, Zustand, Vite, Tailwind.',
              buttons: ['OK'],
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Bezpečnostní pojistka: nepovolit otevírání nových webview ani neoprávněných URL.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => event.preventDefault());
});
