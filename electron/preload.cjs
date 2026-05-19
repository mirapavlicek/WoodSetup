// Preload skript běží v izolovaném kontextu rendereru s přístupem k Node.js.
// Zatím nepotřebujeme nic exponovat – aplikace funguje jako čistý web (file://).
// Pokud bys v budoucnu chtěl native FS dialog, sem patří `contextBridge.exposeInMainWorld`.

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('woodsetup', {
  // Statická metadata, kdyby je UI chtělo zobrazit.
  isElectron: true,
  platform: process.platform,
});
