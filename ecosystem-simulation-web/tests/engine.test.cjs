const test = require('node:test');
const assert = require('node:assert/strict');
const { World, isCreature } = require('../js/engine.js');
function seeded(seed) { return () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; }; }
function empty() { const w = new World(10,10,() => 0); w.biomes.fill(1); w.autoBalance = false; return w; }
test('BFS avoids mountains and blocking entities',() => {
  const w = empty(); w.cells[0] = w.create('sheep'); w.cells[2] = w.create('grass'); w.biomes[1] = 3;
  assert.deepEqual(w.path(0,'grass'),[10,11,12,2]); w.cells[10] = w.create('tree'); assert.deepEqual(w.path(0,'grass'),[]);
});
test('a wolf must not overwrite prey that survived an attack',() => {
  const w = empty(); w.cells[0] = w.create('wolf'); w.cells[1] = w.create('sheep');
  const prey = w.cells[1], predator = w.cells[0]; w.move(0);
  assert.equal(w.cells[0],predator); assert.equal(w.cells[1],prey); assert.equal(prey.hp,10); assert.equal(w.deaths,0);
  w.move(0); w.move(0); assert.equal(w.cells[1],predator); assert.equal(w.cells[0],null); assert.equal(w.deaths,1);
});
test('speed affects distance and each animal ages once per turn',() => {
  const w = empty(); w.cells[0] = w.create('sheep'); w.cells[5] = w.create('grass'); const sheep = w.cells[0]; w.replenish = () => {};
  w.step(); assert.equal(sheep.age,1); assert.equal(w.cells[2],sheep);
});
test('reproduction inherits DNA and does not put newborns in water',() => {
  const w = empty(); const a = w.create('sheep'), b = w.create('sheep');
  a.age = b.age = 5; a.dna = 'AAAAAAAAAA'; b.dna = 'CCCCCCCCCC'; w.cells[11] = a; w.cells[12] = b; w.biomes[1] = 4;
  assert.equal(w.reproduce(11),true); const baby = w.cells.find(e => isCreature(e) && e !== a && e !== b);
  assert.equal(baby.generation,2); assert.equal(w.births,1); assert.equal(a.cooldown,3);
  assert.match(baby.dna,/^[ACGT]{10}$/); assert.equal(w.cells[1],null);
});
test('save roundtrip preserves every field and rejects invalid saves',() => {
  const w = new World(40,25,seeded(5)).initialize(); for(let i=0;i<20;i++) w.step();
  assert.equal(World.restore(w.serialize()).serialize(),w.serialize());
  const invalid = JSON.parse(w.serialize()); invalid.cells[0] = { type:'sheep',id:1 }; assert.throws(() => World.restore(JSON.stringify(invalid)));
  const badBiome = JSON.parse(w.serialize()); badBiome.biomes[0] = 9; assert.throws(() => World.restore(JSON.stringify(badBiome)));
});
test('long runs maintain occupancy, age, population and accounting invariants',() => {
  for (const seed of [1,42,99]) {
    const w = new World(40,25,seeded(seed)).initialize();
    for(let n=0;n<500;n++) {
      const ages = new Map(w.cells.filter(isCreature).map(e => [e.id,e.age]));
      w.step(); const ids = new Set(); let creatures = 0;
      w.cells.forEach((e,i) => {
        if(!e) return; assert.ok(w.passable(i)); assert.ok(!ids.has(e.id)); ids.add(e.id);
        if(isCreature(e)) { creatures++; assert.ok(e.hp > 0 && e.hp <= e.maxHp); if(ages.has(e.id)) assert.equal(e.age,ages.get(e.id)+1); }
      });
      assert.equal(creatures,22+w.births+w.introduced-w.deaths);
    }
    assert.equal(World.restore(w.serialize()).serialize(),w.serialize());
  }
});
