const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vivaAPI', {
  openPlaylistFile: () => ipcRenderer.invoke('playlist:open-file'),
  fetchPlaylistUrl: (url) => ipcRenderer.invoke('playlist:fetch-url', url)
});
