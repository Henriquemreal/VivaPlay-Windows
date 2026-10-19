const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: '#10131a',
    title: 'VivaPlay',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('playlist:open-file', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Selecionar playlist',
    properties: ['openFile'],
    filters: [{ name: 'Playlists', extensions: ['m3u', 'm3u8', 'txt'] }]
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  try {
    const content = await fs.readFile(result.filePaths[0], 'utf8');
    return { canceled: false, content, fileName: path.basename(result.filePaths[0]) };
  } catch (error) {
    return { error: `Não foi possível ler o arquivo: ${error.message}` };
  }
});

ipcMain.handle('playlist:fetch-url', async (_event, rawUrl) => {
  try {
    const parsed = new URL(String(rawUrl || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { error: 'Use uma URL HTTP ou HTTPS válida.' };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(parsed.href, {
        signal: controller.signal,
        headers: { 'User-Agent': 'VivaPlay/1.0 (Windows)' },
        redirect: 'follow'
      });
      if (!response.ok) return { error: `O servidor respondeu HTTP ${response.status}.` };
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      if (!text.trim()) return { error: 'O servidor retornou uma resposta vazia.' };
      if (text.trimStart().startsWith('<!doctype html') || text.trimStart().startsWith('<html')) {
        return { error: 'O endereço retornou uma página HTML, possivelmente uma tela de login, e não uma playlist M3U.' };
      }
      return { content: text, contentType, finalUrl: response.url };
    } catch (error) {
      if (error.name === 'AbortError') return { error: 'A conexão demorou mais de 45 segundos e foi cancelada.' };
      return { error: `Falha ao buscar a playlist: ${error.message}` };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return { error: 'Informe uma URL HTTP ou HTTPS válida.' };
  }
});
