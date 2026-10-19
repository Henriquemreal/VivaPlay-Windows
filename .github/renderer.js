(() => {
  const $ = id => document.getElementById(id);
  const video = $('video');
  let channels = [], selected = -1, category = 'Todos', hls = null;
  let filteredChannels = [], renderedCount = 0, renderToken = 0;
  const PAGE_SIZE = 100;
  const say = text => $('message').textContent = text;
  const setStatus = text => $('statusText').textContent = text;

  function safeUrl(raw) {
    try { const u = new URL(String(raw).trim()); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; }
    catch { return ''; }
  }

  // Parse in small batches so the UI can keep responding while large playlists load.
  async function parseM3UAsync(text, baseUrl = '') {
    const out = []; let meta = '', start = 0, processed = 0;
    const source = String(text).replace(/^\uFEFF/, '');
    while (start < source.length) {
      const end = Math.min(source.length, start + 256 * 1024);
      let stop = end;
      if (end < source.length) {
        let nl = source.lastIndexOf('\n', end);
        if (nl <= start) nl = source.indexOf('\n', end);
        if (nl >= 0) stop = nl + 1;
      }
      const chunk = source.slice(start, stop);
      const lines = chunk.split(/\r?\n/);
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (line.startsWith('#EXTINF')) { meta = line; continue; }
        if (line.startsWith('#')) continue;
        let url = '';
        try {
          if (baseUrl && !/^https?:\/\//i.test(line)) url = new URL(line, baseUrl).href;
          else url = safeUrl(line);
        } catch {}
        if (!url || !/^https?:/i.test(url)) { meta = ''; continue; }
        const nameMatch = meta.match(/,(.*)$/);
        const groupMatch = meta.match(/group-title=["']([^"']*)["']/i);
        const logoMatch = meta.match(/tvg-logo=["']([^"']*)["']/i);
        let hostname = 'Canal';
        try { hostname = new URL(url).hostname; } catch {}
        out.push({ name: (nameMatch && nameMatch[1].trim()) || hostname, group: (groupMatch && groupMatch[1]) || 'Outros', logo: (logoMatch && logoMatch[1]) || '', url });
        meta = '';
        processed++;
      }
      start = stop;
      say(`Lendo playlist… ${Math.min(100, Math.round(start / Math.max(1, source.length) * 100))}%`);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return out;
  }

  function renderCategories() {
    const cats = ['Todos', ...new Set(channels.map(c => c.group || 'Outros'))];
    const fragment = document.createDocumentFragment();
    cats.forEach(cat => {
      const b = document.createElement('button'); b.className = 'chip' + (category === cat ? ' active' : '');
      b.type = 'button'; b.textContent = cat; b.title = cat;
      b.addEventListener('click', () => { category = cat; renderCategories(); renderList(); });
      fragment.appendChild(b);
    });
    $('categoryTabs').replaceChildren(fragment);
  }

  function getFiltered() {
    const term = $('search').value.trim().toLocaleLowerCase('pt-BR');
    return channels.map((c, i) => ({ ...c, index: i })).filter(c =>
      (category === 'Todos' || c.group === category) &&
      (c.name.toLocaleLowerCase('pt-BR').includes(term) || c.group.toLocaleLowerCase('pt-BR').includes(term))
    );
  }

  function appendPage(token) {
    if (token !== renderToken) return;
    const list = $('channelList');
    const end = Math.min(renderedCount + PAGE_SIZE, filteredChannels.length);
    const fragment = document.createDocumentFragment();
    for (let n = renderedCount; n < end; n++) {
      const c = filteredChannels[n];
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'channel' + (selected === c.index ? ' selected' : '');
      const num = document.createElement('span'); num.className = 'channel-number'; num.textContent = String(c.index + 1).padStart(2, '0');
      const copy = document.createElement('span'); copy.className = 'channel-copy';
      const name = document.createElement('span'); name.className = 'channel-name'; name.textContent = c.name;
      const group = document.createElement('span'); group.className = 'channel-group'; group.textContent = c.group || 'Outros';
      copy.append(name, group); b.append(num, copy); b.addEventListener('click', () => playChannel(c.index));
      fragment.appendChild(b);
    }
    list.appendChild(fragment);
    renderedCount = end;
    if (renderedCount < filteredChannels.length) {
      const more = document.createElement('div'); more.className = 'list-empty'; more.dataset.loadMore = 'true';
      more.textContent = `Mostrando ${renderedCount} de ${filteredChannels.length} canais · role para carregar mais`;
      list.appendChild(more);
    }
  }

  function renderList() {
    renderToken++;
    const token = renderToken;
    filteredChannels = getFiltered(); renderedCount = 0;
    const list = $('channelList'); list.replaceChildren(); list.scrollTop = 0;
    if (!filteredChannels.length) {
      const empty = document.createElement('div'); empty.className = 'list-empty';
      empty.textContent = channels.length ? 'Nenhum canal corresponde à busca.' : 'Nenhuma playlist carregada.';
      list.appendChild(empty); return;
    }
    appendPage(token);
  }

  $('channelList').addEventListener('scroll', () => {
    const list = $('channelList');
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 140 && renderedCount < filteredChannels.length) {
      const more = list.querySelector('[data-load-more="true"]'); if (more) more.remove();
      appendPage(renderToken);
    }
  });

  function setChannels(items, sourceName = '') {
    channels = items; selected = -1; category = 'Todos'; $('search').value = '';
    renderCategories(); renderList(); $('channelCount').textContent = String(channels.length);
    if (channels.length) { say(`${channels.length.toLocaleString('pt-BR')} canal(is) importado(s)${sourceName ? ' de ' + sourceName : ''}. Selecione um para começar.`); setStatus('Playlist carregada'); }
    else { say('Nenhum canal válido encontrado. Verifique se o arquivo contém URLs HTTP/HTTPS.'); setStatus('Lista vazia'); }
    $('prevBtn').disabled = $('nextBtn').disabled = channels.length < 2;
  }

  function cleanupHls() { if (hls) { hls.destroy(); hls = null; } }
  function playUrl(rawUrl, title) {
    const url = safeUrl(rawUrl);
    if (!url) { say('Endereço de mídia inválido.'); return; }
    cleanupHls(); video.pause(); video.removeAttribute('src'); video.load();
    $('emptyPlayer').style.display = 'none'; $('nowTitle').textContent = title;
    let errorShown = false;
    const fail = detail => {
      if (errorShown) return; errorShown = true; setStatus('Falha na reprodução');
      say(detail + ' Confira se o link está ativo, se sua conta tem acesso e se o formato é compatível.');
    };
    video.onerror = () => {
      const code = video.error?.code;
      const reasons = { 2: 'Falha de rede ao carregar o stream.', 3: 'O navegador não conseguiu decodificar o vídeo.', 4: 'Formato não suportado ou endereço de mídia inacessível.' };
      fail(reasons[code] || 'Não foi possível reproduzir este stream.');
    };
    const isHls = /\.m3u8($|[?#])/i.test(url) || /[?&](type|format)=hls\b/i.test(url);
    if (isHls && window.Hls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        backBufferLength: 15,
        manifestLoadingTimeOut: 12000,
        fragLoadingTimeOut: 20000
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          setStatus('Recuperando vídeo…');
          try { hls.recoverMediaError(); } catch { fail('Não foi possível recuperar a mídia HLS.'); }
        } else fail('Falha no stream HLS: ' + (data.details || 'erro desconhecido') + '.');
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('Pronto para reproduzir'); video.play().catch(() => setStatus('Toque em Reproduzir'));
      });
      hls.loadSource(url); hls.attachMedia(video);
    } else {
      video.src = url; video.load(); video.play().catch(() => setStatus('Toque em Reproduzir'));
    }
  }

  function playChannel(index) {
    if (index < 0 || index >= channels.length) return;
    selected = index; const c = channels[index]; playUrl(c.url, c.name); renderList();
    $('prevBtn').disabled = $('nextBtn').disabled = channels.length < 2;
  }

  $('loadFileBtn').addEventListener('click', async () => {
    say('Abrindo arquivos…');
    try {
      const result = await window.vivaAPI.openPlaylistFile();
      if (result.canceled) { say('Importação cancelada.'); return; }
      if (result.error) { say(result.error); return; }
      if (!result.content.trim()) { say('O arquivo está vazio.'); return; }
      setChannels(await parseM3UAsync(result.content), result.fileName || 'arquivo');
    } catch (error) { say('Não foi possível ler o arquivo: ' + (error.message || 'erro desconhecido')); }
  });

  $('loadUrlBtn').addEventListener('click', async () => {
    const url = safeUrl($('playlistUrl').value);
    if (!url) { say('Informe uma URL HTTP ou HTTPS válida.'); return; }
    say('Buscando playlist…');
    try {
      const result = await window.vivaAPI.fetchPlaylistUrl(url);
      if (result.error) { say(result.error); return; }
      if (!result.content.trim()) { say('O servidor retornou uma playlist vazia.'); return; }
      const items = await parseM3UAsync(result.content, result.finalUrl || url);
      setChannels(items, 'URL');
    } catch (error) { say('Não foi possível carregar a playlist: ' + (error.message || 'erro desconhecido')); }
  });

  $('playDirectBtn').addEventListener('click', () => {
    const url = safeUrl($('directUrl').value);
    if (!url) { say('Informe uma URL HTTP ou HTTPS válida.'); return; }
    selected = -1; renderList(); playUrl(url, 'Stream direto'); say('Endereço enviado ao player.');
  });
  $('search').addEventListener('input', renderList);
  $('prevBtn').addEventListener('click', () => { if (channels.length) playChannel((selected <= 0 ? channels.length : selected) - 1); });
  $('nextBtn').addEventListener('click', () => { if (channels.length) playChannel((selected + 1) % channels.length); });
  $('clearBtn').addEventListener('click', () => {
    cleanupHls(); video.pause(); video.removeAttribute('src'); video.load(); channels = []; selected = -1; category = 'Todos';
    $('emptyPlayer').style.display = 'flex'; $('nowTitle').textContent = 'Nenhum canal selecionado';
    $('channelCount').textContent = '0'; $('search').value = ''; renderCategories(); renderList();
    $('prevBtn').disabled = $('nextBtn').disabled = true; setStatus('Aguardando playlist'); say('Lista limpa.');
  });
  video.addEventListener('playing', () => setStatus('Reproduzindo'));
  video.addEventListener('waiting', () => setStatus('Carregando stream…'));
  video.addEventListener('pause', () => { if (video.currentSrc) setStatus('Pausado'); });
})();
