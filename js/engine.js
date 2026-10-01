/* Browser-independent ecosystem model. No network or DOM dependencies. */
(function (root) {
  'use strict';
  const BIOMES = [
    { name: 'Лес', color: '#274f3e', growth: .5 },
    { name: 'Луг', color: '#507b48', growth: 1.5 },
    { name: 'Пустыня', color: '#bda36a', growth: .2 },
    { name: 'Горы', color: '#78828a', growth: 0 },
    { name: 'Вода', color: '#447e98', growth: 0 }
  ];
  const SEASONS = [
    { name: '🌸 Весна', growth: 1.5, speed: 1 },
    { name: '☀️ Лето', growth: 1, speed: 1 },
    { name: '🍂 Осень', growth: .7, speed: 1 },
    { name: '❄️ Зима', growth: .2, speed: .8 }
  ];
  const TIMES = [
    { name: '☀️ День', sheep: 1, wolf: 1 },
    { name: '🌅 Вечер', sheep: .7, wolf: .8 },
    { name: '🌙 Ночь', sheep: .3, wolf: .4 },
    { name: '🌄 Утро', sheep: .8, wolf: 1 }
  ];
  const SYMBOLS = { sheep: '🐑', wolf: '🐺', grass: '🌱', tree: '🌲', flower: '🌸' };
  const NAMES = { sheep: 'Овца', wolf: 'Волк', grass: 'Трава', tree: 'Дерево', flower: 'Цветок' };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isCreature = e => e && (e.type === 'sheep' || e.type === 'wolf');
  class World {
    constructor(width = 40, height = 25, random = Math.random) {
      this.width = width; this.height = height; this.random = random;
      this.cells = Array(width * height).fill(null);
      this.biomes = this.cells.map(() => {
        const r = this.random();
        return r < .15 ? 0 : r < .35 ? 1 : r < .50 ? 2 : r < .65 ? 3 : r < .80 ? 4 : 1;
      });
      this.turn = 0; this.births = 0; this.deaths = 0; this.introduced = 0;
      this.nextId = 1; this.autoBalance = true; this.events = []; this.history = [];
    }
    get season() { return SEASONS[Math.floor(this.turn / 31) % 4]; }
    get time() { return TIMES[Math.floor(this.turn / 11) % 4]; }
    int(n) { return Math.floor(this.random() * n); }
    passable(i) { return i >= 0 && i < this.cells.length && this.biomes[i] < 3; }
    neighbors(i, diagonals = false) {
      const x = i % this.width, y = Math.floor(i / this.width);
      const dirs = diagonals ? [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]] : [[0,-1],[0,1],[-1,0],[1,0]];
      return dirs.map(([dx,dy]) => [x+dx,y+dy]).filter(([a,b]) => a >= 0 && a < this.width && b >= 0 && b < this.height).map(([a,b]) => b*this.width+a);
    }
    dna() { return Array.from({ length: 10 }, () => 'ACGT'[this.int(4)]).join(''); }
    create(type) {
      const e = { id: this.nextId++, type };
      if (isCreature(e)) Object.assign(e, { hp: type === 'sheep' ? 15 : 20, maxHp: type === 'sheep' ? 15 : 20,
        speed: type === 'sheep' ? 2 : 3, attack: type === 'wolf' ? 5 : 0, hunger: 0,
        age: 0, maxAge: 30 + this.int(20), cooldown: 0, generation: 1, mutation: .1, dna: this.dna() });
      return e;
    }
    add(type, count = 1, suitable = false, introduced = true) {
      const spots = [];
      this.cells.forEach((e,i) => {
        if (!e && this.passable(i) && (!suitable || (type === 'sheep' ? this.biomes[i] === 1 : type === 'wolf' ? this.biomes[i] <= 1 : true))) spots.push(i);
      });
      let placed = 0;
      while (placed < count && spots.length) {
        const n = this.int(spots.length), i = spots[n];
        spots[n] = spots[spots.length-1]; spots.pop();
        this.cells[i] = this.create(type); placed++;
      }
      if (introduced && (type === 'sheep' || type === 'wolf')) this.introduced += placed;
      return placed;
    }
    initialize() {
      for (const [type,n] of [['grass',80],['sheep',15],['wolf',7],['tree',20],['flower',15]]) this.add(type,n,false,false);
      this.record(); return this;
    }
    stats() {
      const s = { turn: this.turn, grass: 0, sheep: 0, wolf: 0, tree: 0, flower: 0, births: this.births, deaths: this.deaths, introduced: this.introduced, generation: 0 };
      let gen = 0;
      for (const e of this.cells) if (e) { s[e.type]++; if (isCreature(e)) gen += e.generation; }
      s.generation = gen / (s.sheep+s.wolf || 1); return s;
    }
    record() { this.history.push(this.stats()); if (this.history.length > 10000) this.history.shift(); }
    log(message, sound = '') { this.events.push({ turn: this.turn, message, sound }); if (this.events.length > 30) this.events.shift(); }
    kill(i, reason) {
      const e = this.cells[i]; if (!isCreature(e)) return;
      this.cells[i] = null; this.deaths++; this.log(`${SYMBOLS[e.type]} ${reason}`, 'death');
    }
    // Breadth-first search: entities block paths unless they are the target food.
    path(start, target) {
      const parents = new Int32Array(this.cells.length).fill(-2);
      parents[start] = -1; const queue = [start];
      for (let q = 0; q < queue.length; q++) {
        const i = queue[q];
        if (i !== start && this.cells[i]?.type === target) {
          const route = []; let p = i;
          while (parents[p] !== -1) { route.push(p); p = parents[p]; }
          return route.reverse();
        }
        for (const n of this.neighbors(i)) if (parents[n] === -2 && this.passable(n) && (!this.cells[n] || this.cells[n].type === target)) {
          parents[n] = i; queue.push(n);
        }
      }
      return [];
    }
    canReproduce(e) { return isCreature(e) && e.hp > e.maxHp*.6 && e.cooldown <= 0 && e.age > 3; }
    mutate(value, min, max, parent) {
      return clamp(value + (this.random() < parent.mutation ? Math.trunc((this.random()-.5)*(parent.type === 'sheep' ? 6 : 4)) : 0), min, max);
    }
    reproduce(i) {
      const e = this.cells[i]; if (!this.canReproduce(e)) return false;
      const around = this.neighbors(i,true);
      const partner = around.map(n => this.cells[n]).find(p => p?.type === e.type && this.canReproduce(p));
      const spot = around.find(n => !this.cells[n] && this.passable(n));
      if (!partner || spot === undefined) return false;
      const s = this.stats();
      const probability = e.type === 'sheep' ? Math.min(.98,.7*1.2 + Math.min(.5,s.grass/40)) : Math.min(.95,.5*1.3 + Math.min(.5,s.sheep/15));
      if (this.random() >= probability) return false;
      const baby = this.create(e.type);
      baby.hp = baby.maxHp = this.mutate(Math.floor((e.hp+partner.hp)/2),8,e.type === 'sheep' ? 30 : 25,e);
      baby.speed = this.mutate(Math.floor((e.speed+partner.speed)/2),e.type === 'sheep' ? 1 : 2,e.type === 'sheep' ? 4 : 5,e);
      if (e.type === 'wolf') baby.attack = this.mutate(Math.floor((e.attack+partner.attack)/2),2,10,e);
      baby.generation = Math.max(e.generation,partner.generation)+1;
      baby.dna = [...e.dna].map((c,n) => this.random() < .5 ? c : partner.dna[n]).join('');
      if (this.random() < e.mutation) { const a = [...baby.dna]; a[this.int(10)] = 'ACGT'[this.int(4)]; baby.dna = a.join(''); }
      baby.mutation = e.mutation; this.cells[spot] = baby;
      e.cooldown = partner.cooldown = 3; e.hp -= 3; partner.hp -= 3;
      this.births++; this.log(`${SYMBOLS[e.type]} Родилось поколение ${baby.generation}`, 'birth'); return true;
    }
    move(i) {
      const e = this.cells[i]; if (!isCreature(e)) return;
      e.age++; e.cooldown = Math.max(0,e.cooldown-1); e.hunger++;
      if (e.hunger > 10) e.hp--;
      if (e.age > e.maxAge || e.hp <= 0 || e.hunger > (e.type === 'sheep' ? 12 : 15)) {
        this.kill(i,e.age > e.maxAge ? 'Умерло от старости' : 'Не пережило голод'); return;
      }
      if (this.random() > this.time[e.type]) return;
      const target = e.type === 'sheep' ? 'grass' : 'sheep';
      const route = this.path(i,target);
      // Unlike the Java version, speed actually limits the number of cells per turn.
      const steps = Math.max(1,Math.floor(e.speed*this.season.speed));
      for (const next of route.slice(0,steps)) {
        const food = this.cells[next];
        if (food?.type === 'sheep') {
          food.hp -= e.attack; e.hunger = 0; this.log('🐺 Волк атакует овцу', 'attack');
          if (food.hp > 0) break; // Do not overwrite a living prey.
          this.kill(next,'Погибло при нападении'); e.hp = Math.min(e.maxHp,e.hp+5);
        } else if (food?.type === 'grass') {
          this.cells[next] = null; e.hp = Math.min(e.maxHp,e.hp+7); e.hunger = 0; this.log('🐑 Овца нашла траву', 'eat');
        } else if (food) break;
        this.cells[next] = e; this.cells[i] = null; i = next;
        if (food) break;
      }
      this.reproduce(i);
    }
    replenish() {
      const s = this.stats();
      const minGrass = Math.floor(20*this.season.growth);
      if (s.grass < minGrass) this.add('grass',Math.max(1,Math.min(minGrass-s.grass+3,Math.floor((this.int(6)+4)*this.season.growth))));
      if (this.autoBalance) {
        if (s.sheep < 8) this.add('sheep',Math.min(8-s.sheep+2,this.int(4)+3),true);
        if (s.wolf < 4) this.add('wolf',Math.min(4-s.wolf+1,this.int(2)+2),true);
      }
    }
    step() {
      this.turn++;
      const actors = this.cells.filter(isCreature);
      this.replenish();
      for (let n = actors.length-1; n > 0; n--) { const j = this.int(n+1); [actors[n],actors[j]] = [actors[j],actors[n]]; }
      // Track references rather than old coordinates: each surviving animal gets one turn.
      for (const actor of actors) { const i = this.cells.indexOf(actor); if (i !== -1) this.move(i); }
      this.record();
    }
    clear() {
      this.cells = this.cells.map(e => e?.type === 'tree' ? e : null);
      this.turn = this.births = this.deaths = this.introduced = 0; this.events = []; this.history = []; this.record();
    }
    serialize() {
      return JSON.stringify({ version: 1, width: this.width, height: this.height, cells: this.cells, biomes: this.biomes,
        turn: this.turn, births: this.births, deaths: this.deaths, introduced: this.introduced,
        nextId: this.nextId, autoBalance: this.autoBalance, history: this.history });
    }
    static restore(json) {
      const d = JSON.parse(json), fail = () => { throw new Error('Некорректный файл сохранения'); };
      const integer = (v,min,max) => Number.isInteger(v) && v >= min && v <= max;
      if (d?.version !== 1 || !integer(d.width,10,80) || !integer(d.height,10,60) ||
        !Array.isArray(d.cells) || d.cells.length !== d.width*d.height || !Array.isArray(d.biomes) || d.biomes.length !== d.cells.length ||
        !d.biomes.every(v => integer(v,0,4)) || typeof d.autoBalance !== 'boolean') fail();
      for (const k of ['turn','births','deaths','introduced']) if (!integer(d[k],0,1e9)) fail();
      if (!integer(d.nextId,1,1e9)) fail();
      const ids = new Set();
      d.cells.forEach((e,i) => {
        if (e === null) return;
        if (!e || !Object.hasOwn(SYMBOLS,e.type) || !integer(e.id,1,d.nextId-1) || ids.has(e.id) || d.biomes[i] >= 3) fail();
        ids.add(e.id);
        if (isCreature(e)) {
          for (const k of ['hp','maxHp','speed','attack','hunger','age','maxAge','cooldown','generation']) if (!integer(e[k],0,100000)) fail();
          if (e.hp < 1 || e.hp > e.maxHp || e.maxHp > 30 || e.speed < 1 || e.speed > 5 || e.attack > 10 || e.generation < 1 ||
            typeof e.dna !== 'string' || !/^[ACGT]{10}$/.test(e.dna) || !Number.isFinite(e.mutation) || e.mutation < 0 || e.mutation > 1) fail();
        }
      });
      if (!Array.isArray(d.history) || d.history.length > 10000) fail();
      let previousTurn = -1;
      for (const s of d.history) {
        if (!s || !integer(s.turn,previousTurn+1,d.turn)) fail(); previousTurn = s.turn;
        for (const k of ['grass','sheep','wolf','tree','flower','births','deaths','introduced']) if (!integer(s[k],0,1e9)) fail();
        if (!Number.isFinite(s.generation) || s.generation < 0) fail();
      }
      const w = new World(d.width,d.height);
      for (const k of ['cells','biomes','turn','births','deaths','introduced','nextId','autoBalance','history']) w[k] = d[k];
      return w;
    }
  }
  const api = { World, BIOMES, SEASONS, TIMES, SYMBOLS, NAMES, isCreature };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Ecosystem = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
