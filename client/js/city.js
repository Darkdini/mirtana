const City = {
  state: null,

  BUILDING_EMOJI: {
    castle: '🏰', farm: '🌾', sawmill: '🪵', quarry: '⛏️',
    mine: '🪙', barracks: '⚔️', stables: '🐴', archery: '🏹',
    workshop: '🔨', wall: '🧱', tower: '🗼', warehouse: '📦',
    academy: '📚', market: '🏪', tavern: '🍺',
  },

  async load() {
    try {
      this.state = await API.get('/api/city/state');
      this.render();
    } catch (e) {
      UI.notify('Ошибка загрузки города: ' + e.message, 'error');
    }
  },

  render() {
    if (!this.state) return;
    this.renderResources();
    this.renderBuildings();
    this.renderTrainingQueue();
  },

  renderResources() {
    const r = this.state.resources;
    const p = this.state.production;
    const c = this.state.capacity;
    for (const res of ['gold', 'food', 'wood', 'stone']) {
      const el = document.getElementById(`res-${res}`);
      const pe = document.getElementById(`prod-${res}`);
      if (el) el.textContent = UI.formatNumber(r[res]);
      if (pe) {
        const prod = p[res] || 0;
        pe.textContent = prod > 0 ? `+${prod}/мин` : '';
        pe.className = 'res-prod' + (prod < 0 ? ' negative' : '');
      }
    }
  },

  renderBuildings() {
    const grid = document.getElementById('buildings-grid');
    const buildings = this.state.buildings;
    grid.innerHTML = '';

    for (const b of buildings) {
      const card = document.createElement('div');
      card.className = 'building-card' + (b.upgrade_finish ? ' upgrading' : '');
      card.dataset.type = b.building_type;

      const emoji = this.BUILDING_EMOJI[b.building_type] || '🏗️';

      let progressHtml = '';
      if (b.upgrade_finish) {
        progressHtml = `
          <div class="building-progress"><div class="building-progress-bar" style="width:50%"></div></div>
          <div class="building-upgrade-time" data-finish="${b.upgrade_finish}">...</div>
        `;
      }

      card.innerHTML = `
        <span class="building-emoji">${emoji}</span>
        <div class="building-name">${this.getBuildingName(b.building_type)}</div>
        <div class="building-level">Уровень ${b.level}</div>
        ${progressHtml}
      `;

      card.addEventListener('click', () => this.showBuildingInfo(b));
      grid.appendChild(card);

      if (b.upgrade_finish) {
        const timeEl = card.querySelector('.building-upgrade-time');
        if (timeEl) UI.countdown(b.upgrade_finish, timeEl);
      }
    }
  },

  renderTrainingQueue() {
    const container = document.getElementById('training-queue');
    const queue = this.state.training_queue;

    if (!queue.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Очередь пуста</p>';
      return;
    }

    container.innerHTML = queue.map(item => `
      <div class="queue-item">
        <span class="queue-unit">${this.getUnitName(item.unit_type)}</span>
        <span class="queue-count">×${item.count}</span>
        <span class="queue-time" data-finish="${item.finish_time}">...</span>
      </div>
    `).join('');

    container.querySelectorAll('.queue-time').forEach(el => {
      UI.countdown(el.dataset.finish, el);
    });
  },

  getBuildingName(type) {
    const names = {
      castle: 'Замок', farm: 'Ферма', sawmill: 'Лесопилка', quarry: 'Каменоломня',
      mine: 'Золотой рудник', barracks: 'Казармы', stables: 'Конюшня', archery: 'Стрельбище',
      workshop: 'Мастерская', wall: 'Стены', tower: 'Башня', warehouse: 'Склад',
      academy: 'Академия', market: 'Рынок', tavern: 'Таверна',
    };
    return names[type] || type;
  },

  getUnitName(type) {
    const names = {
      swordsman: 'Мечник', pikeman: 'Пикинёр', archer: 'Лучник',
      crossbowman: 'Арбалетчик', knight: 'Рыцарь', horse_archer: 'Конный лучник',
      catapult: 'Катапульта', trebuchet: 'Требушет',
    };
    return names[type] || type;
  },

  showBuildingInfo(building) {
    const emoji = this.BUILDING_EMOJI[building.building_type] || '🏗️';
    UI.showModal(`
      <div class="modal-title">${emoji} ${this.getBuildingName(building.building_type)}</div>
      <p style="color:var(--text-dim);margin-bottom:12px">Уровень ${building.level}</p>
      <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px">
        HP: ${UI.formatNumber(building.hp)} / ${UI.formatNumber(building.max_hp)}
      </p>
      <button class="btn-primary" onclick="City.upgrade('${building.building_type}')">
        ⬆️ Улучшить
      </button>
    `);
  },

  async showBuildMenu() {
    try {
      const data = await API.get('/api/city/buildings/available');
      const items = data.map(b => `
        <div class="build-item ${!b.can_build ? 'disabled' : ''}"
             onclick="${b.can_build ? `City.upgrade('${b.type}')` : ''}">
          <div class="build-item-name">${this.BUILDING_EMOJI[b.type] || '🏗️'} ${b.name}</div>
          <div class="build-item-level">${b.current_level === 0 ? 'Новое здание' : `Ур. ${b.current_level} → ${b.next_level}`}</div>
          <div class="build-item-cost">${UI.formatCost(b.cost)}</div>
          <div class="build-item-time">⏱ ${this.formatSec(b.time_sec)}</div>
          <div class="build-item-desc">${b.description}</div>
          ${!b.can_build ? '<div style="color:var(--red-light);font-size:11px;margin-top:4px">🔒 Требует замок выше</div>' : ''}
        </div>
      `).join('');

      UI.showModal(`
        <div class="modal-title">🏗️ Строительство</div>
        <div class="build-grid">${items}</div>
      `);
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  async upgrade(buildingType) {
    UI.hideModal();
    try {
      const data = await API.post('/api/city/build', { building_type: buildingType });
      UI.notify(`Строительство начато! Готово через ${this.formatSec(data.time_sec)}`, 'success');
      await this.load();
    } catch (e) {
      UI.notify('Ошибка: ' + e.message, 'error');
    }
  },

  // Alias methods called from hex info panel actions
  openUpgrade(buildingType) {
    // Show building info for existing building
    if (this.state) {
      const b = this.state.buildings.find(x => x.building_type === buildingType);
      if (b) { this.showBuildingInfo(b); return; }
    }
    this.upgrade(buildingType);
  },

  openBuild(buildingType) {
    this.showBuildMenu();
  },

  openDetail(buildingType) {
    if (this.state) {
      const b = this.state.buildings.find(x => x.building_type === buildingType);
      if (b) { this.showBuildingInfo(b); return; }
    }
  },

  // Refresh buildings on the hex grid after changes
  async _refreshHexGrid() {
    if (typeof Game !== 'undefined' && Game.me) {
      await Game._loadBuildings();
      Layers.switch('castle', { buildings: Game.buildings });
    }
  },

  formatSec(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}ч ${m}м`;
    if (m > 0) return `${m}м ${sec}с`;
    return `${sec}с`;
  },
};

// Safely bind btn-build if it exists (legacy layout)
const _btnBuild = document.getElementById('btn-build');
if (_btnBuild) _btnBuild.addEventListener('click', () => City.showBuildMenu());
