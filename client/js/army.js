const Army = {
  UNIT_CONFIG: {
    swordsman: { name: 'Мечник', emoji: '⚔️', type: 'Пехота' },
    pikeman:   { name: 'Пикинёр', emoji: '🗡️', type: 'Пехота' },
    archer:    { name: 'Лучник', emoji: '🏹', type: 'Дальний бой' },
    crossbowman: { name: 'Арбалетчик', emoji: '🎯', type: 'Дальний бой' },
    knight:      { name: 'Рыцарь', emoji: '🐴', type: 'Кавалерия' },
    horse_archer: { name: 'Конный лучник', emoji: '🏇', type: 'Кавалерия' },
    catapult:   { name: 'Катапульта', emoji: '💣', type: 'Осада' },
    trebuchet:  { name: 'Требушет', emoji: '🏰', type: 'Осада' },
  },

  async load() {
    try {
      const state = await API.get('/api/city/state');
      this.render(state);
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  render(state) {
    this.renderUnits(state.units);
    this.renderTrainOptions(state.buildings);
  },

  renderUnits(units) {
    const grid = document.getElementById('units-grid');
    const allTypes = Object.keys(this.UNIT_CONFIG);
    const items = allTypes.map(utype => {
      const cfg = this.UNIT_CONFIG[utype];
      const count = units[utype] || 0;
      if (count === 0) return '';
      return `
        <div class="unit-card">
          <span class="unit-emoji">${cfg.emoji}</span>
          <div class="unit-name">${cfg.name}</div>
          <div class="unit-count">${UI.formatNumber(count)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${cfg.type}</div>
        </div>
      `;
    }).join('');

    grid.innerHTML = items || '<p style="color:var(--text-muted)">Нет войск. Обучите первых воинов!</p>';
  },

  renderTrainOptions(buildings) {
    const grid = document.getElementById('train-grid');
    const builtMap = {};
    buildings.forEach(b => { builtMap[b.building_type] = b.level; });

    const UNIT_COSTS = {
      swordsman: { gold: 50, food: 20 }, pikeman: { gold: 80, wood: 20, food: 30 },
      archer: { gold: 60, wood: 30, food: 20 }, crossbowman: { gold: 100, wood: 50, food: 30 },
      knight: { gold: 150, food: 50 }, horse_archer: { gold: 120, wood: 20, food: 40 },
      catapult: { gold: 300, wood: 200, stone: 100 }, trebuchet: { gold: 500, wood: 350, stone: 200 },
    };

    const UNIT_REQS = {
      swordsman: ['barracks', 1], pikeman: ['barracks', 3],
      archer: ['archery', 1], crossbowman: ['archery', 5],
      knight: ['stables', 1], horse_archer: ['stables', 3],
      catapult: ['workshop', 1], trebuchet: ['workshop', 5],
    };

    const UNIT_STATS = {
      swordsman: 'Атк:15 Защ:10 HP:100',
      pikeman:   'Атк:12 Защ:18 HP:120 (×2 vs конница)',
      archer:    'Атк:18 Защ:6 HP:80 Дальний',
      crossbowman: 'Атк:28 Защ:8 HP:90 Дальний',
      knight:    'Атк:25 Защ:20 HP:200',
      horse_archer: 'Атк:20 Защ:12 HP:150 Дальний',
      catapult:  'Атк:60 HP:150 (×3 vs здания)',
      trebuchet: 'Атк:100 HP:120 (×5 vs здания)',
    };

    const cards = Object.entries(this.UNIT_CONFIG).map(([utype, cfg]) => {
      const [reqBuilding, reqLevel] = UNIT_REQS[utype];
      const curLevel = builtMap[reqBuilding] || 0;
      const available = curLevel >= reqLevel;
      const cost = UNIT_COSTS[utype] || {};

      if (!available) {
        return `
          <div class="train-card" style="opacity:0.5">
            <div class="train-card-name">${cfg.emoji} ${cfg.name}</div>
            <div class="train-card-stats">${UNIT_STATS[utype] || ''}</div>
            <div style="font-size:12px;color:var(--red-light)">
              🔒 Требует здание (ур.${reqLevel})
            </div>
          </div>
        `;
      }

      return `
        <div class="train-card">
          <div class="train-card-name">${cfg.emoji} ${cfg.name}</div>
          <div class="train-card-stats">${UNIT_STATS[utype] || ''}</div>
          <div class="train-card-stats">${UI.formatCost(cost)}</div>
          <div class="train-row">
            <input type="number" id="train-${utype}" min="1" max="500" value="10" placeholder="Кол-во">
            <button class="btn-primary btn-sm" onclick="Army.train('${utype}')">Обучить</button>
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = cards;
  },

  async train(unitType) {
    const input = document.getElementById(`train-${unitType}`);
    const count = parseInt(input?.value || 10);
    if (!count || count < 1) return;

    try {
      const data = await API.post('/api/city/train', { unit_type: unitType, count });
      UI.notify(`Обучение ${count} ${this.UNIT_CONFIG[unitType]?.name} начато!`, 'success');
      await this.load();
      City.load();
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },
};
