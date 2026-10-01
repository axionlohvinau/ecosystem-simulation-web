(function () {
  'use strict';
  const { World, BIOMES, SYMBOLS, NAMES, isCreature } = Ecosystem;
  const $ = id => document.getElementById(id);
  const map = $('map'), ctx = map.getContext('2d'), chart = $('chart'), graph = chart.getContext('2d');
  const viewport = $('map-viewport');
  let world = new World().initialize(), running = false, timer = null, zoom = 1, selected = -1;
  let cellSize = 18, toastTimer, audio = null, sound = false, lastSound = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let movement = new Map(), animationStart = 0, frame = 0;
  const SAVE_KEY = 'ecosystem-web-save-v1';
  function toast(message) {
    $('toast').textContent = message; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'),3000);
  }
  function sizeCanvas(canvas,w,h,context) {
    const ratio = Math.min(window.devicePixelRatio || 1,2);
    canvas.width = Math.round(w*ratio); canvas.height = Math.round(h*ratio);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    context.setTransform(ratio,0,0,ratio,0,0);
  }
  function resize() {
    cellSize = Math.max(13,(viewport.clientWidth/world.width)*zoom);
    sizeCanvas(map,cellSize*world.width,cellSize*world.height,ctx);
    sizeCanvas(chart,chart.parentElement.clientWidth-parseFloat(getComputedStyle(chart.parentElement).paddingLeft)*2,
      window.innerWidth <= 560 ? 160 : 190,graph);
    drawMap(); drawChart();
  }
  function drawMap(progress = 1) {
    const s = cellSize;
    for (let i = 0; i < world.cells.length; i++) {
      const x = (i%world.width)*s, y = Math.floor(i/world.width)*s;
      ctx.fillStyle = BIOMES[world.biomes[i]].color;
      ctx.fillRect(x,y,s+.5,s+.5);
      ctx.strokeStyle = '#10241e20'; ctx.strokeRect(x,y,s,s);
      if (world.biomes[i] === 4) { ctx.fillStyle = '#9cdae52b'; ctx.fillRect(x+s*.2,y+s*.5,s*.6,1); }
      if (world.biomes[i] === 3 && s >= 15) { ctx.fillStyle = '#c0c9c955'; ctx.beginPath(); ctx.moveTo(x+s*.2,y+s*.8); ctx.lineTo(x+s*.5,y+s*.2); ctx.lineTo(x+s*.8,y+s*.8); ctx.fill(); }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(10,s*.76)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    world.cells.forEach((e,i) => {
      if (!e) return;
      let x = i%world.width, y = Math.floor(i/world.width);
      const old = movement.get(e.id);
      if (old !== undefined && progress < 1) { x = old%world.width+(x-old%world.width)*progress; y = Math.floor(old/world.width)+(y-Math.floor(old/world.width))*progress; }
      if (isCreature(e)) {
        ctx.fillStyle = e.type === 'sheep' ? '#e8f0b42a' : '#ffb99a2e'; ctx.beginPath(); ctx.arc((x+.5)*s,(y+.5)*s,s*.45,0,Math.PI*2); ctx.fill();
      }
      ctx.fillText(SYMBOLS[e.type],(x+.5)*s,(y+.54)*s);
    });
    if (world.time.name.includes('Ночь')) { ctx.fillStyle = '#08163055'; ctx.fillRect(0,0,world.width*s,world.height*s); }
    if (selected >= 0) { ctx.strokeStyle = '#f1ecc0'; ctx.lineWidth = 2; ctx.strokeRect((selected%world.width)*s+1,Math.floor(selected/world.width)*s+1,s-2,s-2); ctx.lineWidth = 1; }
  }
  function animate(now) {
    const p = Math.min(1,(now-animationStart)/Math.min(180,Number($('speed').value)*.7));
    drawMap(p);
    if (p < 1) frame = requestAnimationFrame(animate); else { movement.clear(); frame = 0; }
  }
  function drawChart() {
    const width = parseFloat(chart.style.width), height = parseFloat(chart.style.height);
    if (!width) return;
    graph.clearRect(0,0,width,height);
    const samples = world.history.slice(-160), max = Math.max(10,...samples.flatMap(s => [s.grass,s.sheep,s.wolf]));
    const left = 32, top = 12, bottom = height-24, right = width-8;
    graph.font = '10px system-ui'; graph.lineWidth = 1;
    for (let n = 0; n <= 3; n++) {
      const y = bottom-(bottom-top)*n/3;
      graph.strokeStyle = '#30443a'; graph.beginPath(); graph.moveTo(left,y); graph.lineTo(right,y); graph.stroke();
      graph.fillStyle = '#a9b9ad'; graph.textAlign = 'right'; graph.fillText(Math.round(max*n/3),left-7,y+3);
    }
    for (const [key,color] of [['grass','#7dbbac'],['sheep','#d4e5a1'],['wolf','#efa784']]) {
      graph.strokeStyle = color; graph.lineWidth = 2; graph.beginPath();
      samples.forEach((s,i) => { const x = left+(right-left)*i/Math.max(1,samples.length-1), y = bottom-(bottom-top)*s[key]/max; if (i === 0) graph.moveTo(x,y); else graph.lineTo(x,y); }); graph.stroke();
      if (samples.length === 1) { graph.fillStyle = color; graph.beginPath(); graph.arc(left,bottom-(bottom-top)*samples[0][key]/max,3,0,Math.PI*2); graph.fill(); }
    }
    graph.fillStyle = '#a9b9ad'; graph.textAlign = 'left'; graph.fillText(`Ход ${samples[0]?.turn ?? 0}`,left,height-5);
    graph.textAlign = 'right'; graph.fillText(`Ход ${world.turn}`,right,height-5);
  }
  function inspect() {
    if (selected < 0) { $('cell-title').textContent = 'Выбери клетку'; $('cell-info').textContent = 'У каждого животного есть возраст, здоровье и собственная ДНК.'; return; }
    const e = world.cells[selected], biome = BIOMES[world.biomes[selected]];
    $('cell-title').textContent = e ? `${SYMBOLS[e.type]} ${NAMES[e.type]}` : 'Свободная клетка';
    const info = $('cell-info'); info.replaceChildren();
    const pos = document.createElement('p'); pos.textContent = `${biome.name} · ${selected%world.width+1}, ${Math.floor(selected/world.width)+1}`; info.append(pos);
    if (isCreature(e)) {
      const grid = document.createElement('div'); grid.className = 'cell-data';
      for (const text of [`Здоровье: ${e.hp}/${e.maxHp}`,`Возраст: ${e.age}/${e.maxAge}`,`Голод: ${e.hunger}`,`Скорость: ${e.speed}`,`Поколение: ${e.generation}`,`Атака: ${e.attack}`]) {
        const item = document.createElement('span'); item.textContent = text; grid.append(item);
      }
      info.append(grid); const dna = document.createElement('div'); dna.className = 'dna'; dna.textContent = e.dna; info.append(dna);
    }
  }
  function render() {
    const s = world.stats();
    for (const k of ['turn','sheep','wolf','grass','births','deaths','introduced']) $(k).textContent = s[k];
    $('generation').textContent = s.generation.toFixed(1);
    $('world-time').textContent = `${world.season.name} · ${world.time.name}`;
    $('balance').checked = world.autoBalance;
    drawMap(); drawChart(); inspect();
  }
  function beep(kind) {
    if (!sound || !audio || audio.state !== 'running' || Date.now()-lastSound < 160 || Number($('speed').value) <= 50) return;
    lastSound = Date.now();
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'sine'; osc.frequency.value = { eat: 420, birth: 720, death: 150, attack: 220 }[kind] || 350;
    gain.gain.setValueAtTime(.035,audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);
    osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime+.13);
  }
  function tick() {
    cancelAnimationFrame(frame); movement.clear();
    world.cells.forEach((e,i) => { if (isCreature(e)) movement.set(e.id,i); });
    world.step(); render();
    const event = world.events.at(-1); if (event?.turn === world.turn) beep(event.sound);
    if (!reduced) { animationStart = performance.now(); frame = requestAnimationFrame(animate); }
  }
  function schedule() {
    clearTimeout(timer); timer = null;
    if (running && !document.hidden) timer = setTimeout(() => { tick(); schedule(); },Number($('speed').value));
  }
  function setRunning(value) {
    running = value; document.body.classList.toggle('running',running);
    $('play').textContent = running ? 'Ⅱ Пауза' : '▶ Запустить';
    $('run-state').textContent = running ? 'Мир живёт' : 'На паузе'; $('step').disabled = running; schedule();
  }
  function replaceWorld(next) {
    setRunning(false); cancelAnimationFrame(frame); movement.clear();
    world = next; selected = -1; zoom = 1; $('zoom-label').textContent = '100%'; resize(); render();
  }
  $('play').onclick = () => setRunning(!running);
  $('step').onclick = tick;
  $('speed').onchange = schedule;
  $('balance').onchange = () => { world.autoBalance = $('balance').checked; toast(world.autoBalance ? 'Популяция поддерживается' : 'Естественный режим включён'); };
  $('reset').onclick = () => { if (confirm('Создать новый мир? Текущий прогресс будет сброшен.')) { replaceWorld(new World().initialize()); toast('Новый мир готов'); } };
  $('clear').onclick = () => { if (confirm('Удалить всё, кроме деревьев, и сбросить статистику?')) {
    setRunning(false); cancelAnimationFrame(frame); movement.clear(); world.clear(); selected = -1; render(); toast('Мир очищен. Добавь животных или включи поддержку популяции.');
  } };
  document.querySelectorAll('[data-add]').forEach(button => button.onclick = () => {
    const n = world.add(button.dataset.add); render(); toast(n ? `${NAMES[button.dataset.add]}: добавлено` : 'Нет свободных подходящих клеток');
  });
  let pointerStart = null;
  map.addEventListener('pointerdown',e => { pointerStart = { x: e.clientX, y: e.clientY }; });
  map.addEventListener('pointercancel',() => { pointerStart = null; });
  map.addEventListener('pointerup',e => {
    if (!pointerStart || Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y) > 8) { pointerStart = null; return; }
    pointerStart = null; const r = map.getBoundingClientRect();
    const x = Math.floor((e.clientX-r.left)/cellSize), y = Math.floor((e.clientY-r.top)/cellSize);
    if (x >= 0 && x < world.width && y >= 0 && y < world.height) { selected = y*world.width+x; inspect(); drawMap(); }
  });
  function setZoom(change) { zoom = Math.max(1,Math.min(3,zoom+change)); $('zoom-label').textContent = `${Math.round(zoom*100)}%`; resize(); }
  $('zoom-in').onclick = () => setZoom(.5); $('zoom-out').onclick = () => setZoom(-.5);
  $('save').onclick = () => { try { localStorage.setItem(SAVE_KEY,world.serialize()); toast('Сохранено в этом браузере'); } catch { toast('Не удалось сохранить. Скачай файл сохранения.'); } };
  $('load').onclick = () => {
    try { const json = localStorage.getItem(SAVE_KEY); if (!json) return toast('В этом браузере пока нет сохранения');
      const next = World.restore(json); if (confirm('Загрузить сохранение вместо текущего мира?')) { replaceWorld(next); toast('Сохранение загружено'); }
    } catch { toast('Не удалось загрузить сохранение'); }
  };
  function download(content,type,name) {
    const url = URL.createObjectURL(new Blob([content],{ type }));
    const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url),60000);
  }
  $('download').onclick = () => download(world.serialize(),'application/json','ecosystem-save.json');
  $('import').onclick = () => $('file-input').click();
  $('file-input').onchange = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    if (file.size > 8*1024*1024) return toast('Файл слишком большой (максимум 8 МБ)');
    try { const next = World.restore(await file.text()); if (confirm('Открыть файл вместо текущего мира?')) { replaceWorld(next); toast('Мир загружен из файла'); } }
    catch { toast('Это не сохранение Ecosystem Web или файл повреждён'); }
  };
  $('csv').onclick = () => {
    const keys = ['turn','grass','sheep','wolf','births','deaths','introduced','generation'];
    download(keys.join(',')+'\n'+world.history.map(s => keys.map(k => s[k]).join(',')).join('\n'),'text/csv;charset=utf-8','ecosystem-stats.csv');
  };
  $('sound').onclick = async () => {
    try {
      if (!audio) { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return toast('Браузер не поддерживает звук'); audio = new Audio(); }
      await audio.resume(); sound = !sound;
      $('sound').textContent = `Звук: ${sound ? 'вкл.' : 'выкл.'}`; $('sound').setAttribute('aria-pressed',String(sound)); if (sound) beep('birth');
    } catch { toast('Не удалось включить звук'); }
  };
  document.addEventListener('visibilitychange',() => {
    schedule(); $('run-state').textContent = running ? (document.hidden ? 'Ожидание' : 'Мир живёт') : 'На паузе';
  });
  document.addEventListener('keydown',e => {
    if (/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); setRunning(!running); }
    const key = e.key.toLowerCase(), type = { h: 'sheep', w: 'wolf', g: 'grass', f: 'flower' }[key];
    if (type) { world.add(type); render(); }
  });
  window.addEventListener('resize',resize); resize(); render();
})();
