/**
 * Game — main controller for the three-layer hex game.
 * Manages layer switching, resource display, hex info panel,
 * secondary menus, and WS events.
 */
const Game = {
  me: null,
  resources: null,
  buildings: [],
  mapPlayers: [],
  _resourcesOpen:   false,
  _layerPopupOpen:  false,
  _menuOpen:        false,
  _activeView:      null,
  _refreshInterval: null,

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  async init() {
    API.init();

    // Auth check
    this.me = await API.get('/api/auth/me').catch(() => null);
    if (!this.me) { window.location.href = '/'; return; }

    // Display player info
    document.getElementById('player-name-display').textContent = this.me.username;
    document.getElementById('castle-name-display').textContent = this.me.castle_name || 'Замок';

    // Initialize hex grid + layers
    const canvas = document.getElementById('hex-canvas');
    this._resizeCanvas(canvas);
    window.addEventListener('resize', () => this._resizeCanvas(canvas));

    Layers.init(canvas, (hex, layer) => this._onHexClick(hex, layer));

    // Load initial data
    await this._loadResources();
    await this._loadBuildings();

    // Switch to castle layer with buildings loaded (Ратуша visible center)
    Layers.switch('castle', { buildings: this.buildings });

    // Connect WebSocket
    WS.connect();
    this._bindWS();

    // Bind UI controls
    this._bindUI();

    // Refresh resources every 30s
    this._refreshInterval = setInterval(() => this._loadResources(), 30000);

    // Load secondary modules
    Chat.init();
  },

  // ── Canvas sizing ─────────────────────────────────────────────────────────

  _resizeCanvas(canvas) {
    const parent = canvas.parentElement;
    canvas.width  = parent.clientWidth  || window.innerWidth;
    canvas.height = parent.clientHeight || (window.innerHeight - 52);
    canvas.style.width  = '100%';
    canvas.style.height = '100%';
  },

  // ── Data loading ──────────────────────────────────────────────────────────

  async _loadResources() {
    try {
      const data = await API.get('/api/city/state');
      this.resources = data;
      this._updateResourcesDisplay(data);
      // Also refresh buildings if state loaded
      if (data.buildings) {
        this.buildings = data.buildings;
      }
    } catch { /* silent */ }
  },

  async _loadBuildings() {
    try {
      const data = await API.get('/api/city/state');
      this.buildings = data.buildings || [];
      // Also update resources display from the same call
      if (data.resources) this._updateResourcesDisplay(data);
    } catch { this.buildings = []; }
  },

  async _loadMapPlayers() {
    try {
      const data = await API.get('/api/map/players');
      const players = Array.isArray(data) ? data : (data.players || []);
      this.mapPlayers = players.map(p => ({
        ...p,
        is_me: p.id === this.me.id,
      }));
    } catch { this.mapPlayers = []; }
  },

  // ── Resource display ──────────────────────────────────────────────────────

  _updateResourcesDisplay(data) {
    const fmt = (n) => n >= 10000 ? `${Math.floor(n/1000)}k` : Math.floor(n).toLocaleString();
    const fmtRate = (n) => {
      const r = Math.round(n * 60); // per hour
      return r >= 0 ? `+${r}/ч` : `${r}/ч`;
    };

    const resources = data.resources || data || {};
    const rates     = data.production || {};

    // Top bar compact
    document.getElementById('res-gold-compact').textContent  = fmt(resources.gold  || 0);
    document.getElementById('res-food-compact').textContent  = fmt(resources.food  || 0);
    document.getElementById('res-wood-compact').textContent  = fmt(resources.wood  || 0);
    document.getElementById('res-stone-compact').textContent = fmt(resources.stone || 0);

    // Resources popup
    document.getElementById('popup-gold').textContent   = Math.floor(resources.gold  || 0).toLocaleString();
    document.getElementById('popup-food').textContent   = Math.floor(resources.food  || 0).toLocaleString();
    document.getElementById('popup-wood').textContent   = Math.floor(resources.wood  || 0).toLocaleString();
    document.getElementById('popup-stone').textContent  = Math.floor(resources.stone || 0).toLocaleString();

    const setRate = (id, rate) => {
      const el = document.getElementById(id);
      const r  = Math.round((rate || 0) * 60);
      el.textContent = r >= 0 ? `+${r}/ч` : `${r}/ч`;
      el.className = 'res-popup-rate' + (r < 0 ? ' negative' : '');
    };
    setRate('popup-gold-rate',  rates.gold  || 0);
    setRate('popup-food-rate',  rates.food  || 0);
    setRate('popup-wood-rate',  rates.wood  || 0);
    setRate('popup-stone-rate', rates.stone || 0);
  },

  // ── Hex click handler ─────────────────────────────────────────────────────

  _onHexClick(hex, layer) {
    Layers.handleHexClick(hex, layer, (info) => this._showHexInfoPanel(info));
  },

  _showHexInfoPanel(info) {
    const panel = document.getElementById('hex-info-panel');
    if (!info) {
      panel.classList.remove('open');
      return;
    }

    document.getElementById('hex-info-icon').textContent     = info.icon     || '❓';
    document.getElementById('hex-info-title').textContent    = info.title    || '';
    document.getElementById('hex-info-subtitle').textContent = info.subtitle || '';

    const descEl = document.getElementById('hex-info-desc');
    descEl.textContent = info.desc || '';

    const statsEl = document.getElementById('hex-info-stats');
    statsEl.innerHTML = (info.stats || []).map(s =>
      `<div class="hex-stat-pill"><strong>${s.label}:</strong> ${s.value}</div>`
    ).join('');

    const actionsEl = document.getElementById('hex-info-actions');
    actionsEl.innerHTML = (info.actions || []).map(a =>
      `<button class="hex-action-btn" data-action="${a.action}">${a.label}</button>`
    ).join('');

    // Bind action buttons
    actionsEl.querySelectorAll('.hex-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const actionDef = info.actions.find(a => a.action === action);
        this._handleHexAction(action, actionDef ? actionDef.data : null);
      });
    });

    panel.classList.add('open');
  },

  _handleHexAction(action, data) {
    switch (action) {
      case 'upgrade':
        if (typeof City !== 'undefined') City.openUpgrade(data);
        break;
      case 'build':
        if (typeof City !== 'undefined') City.openBuild(data);
        break;
      case 'detail':
        if (typeof City !== 'undefined') City.openDetail(data);
        break;
      case 'attack':
        if (typeof Combat !== 'undefined') Combat.openAttack(data);
        break;
      case 'profile':
        UI.notify(`Игрок: ${data.username}`, 'info');
        break;
      case 'goto_castle':
        this._switchLayer('castle');
        break;
      case 'scout':
        UI.notify('Разведка отправлена', 'info');
        break;
    }
  },

  // ── Layer switching ───────────────────────────────────────────────────────

  async _switchLayer(layerName) {
    // Close popups
    this._closeLayerPopup();
    document.getElementById('hex-info-panel').classList.remove('open');

    if (layerName === 'world') {
      await this._loadMapPlayers();
    }

    // Update layer popup active state
    document.querySelectorAll('.layer-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.layer === layerName);
    });

    Layers.switch(layerName, {
      buildings: this.buildings,
      players:   this.mapPlayers,
      myPos:     { x: this.me.map_x, y: this.me.map_y },
    });
  },

  // ── WebSocket ─────────────────────────────────────────────────────────────

  _bindWS() {
    WS.on('connected', (msg) => {
      // Online count not shown in new layout but can be used elsewhere
    });
    WS.on('online_count', () => {});

    WS.on('battle_result', (msg) => {
      const won = msg.result === 'attacker';
      UI.notify(
        won ? '✅ Победа! Добыча получена.' : '❌ Ваша армия потерпела поражение.',
        won ? 'success' : 'error',
        6000
      );
    });

    WS.on('under_attack_result', (msg) => {
      const won = msg.result === 'defender';
      UI.notify(
        won ? '🛡️ Вы отразили атаку!' : '⚠️ Ваш замок был атакован!',
        won ? 'success' : 'warning',
        8000
      );
    });

    WS.on('troops_returned', (msg) => {
      const loot = msg.loot || {};
      const lootStr = Object.entries(loot)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `+${v} ${k}`)
        .join(', ');
      UI.notify(`↩️ Войска вернулись!${lootStr ? ' Добыча: ' + lootStr : ''}`, 'info');
      this._loadResources();
    });
  },

  // ── UI binding ────────────────────────────────────────────────────────────

  _bindUI() {
    // Resources button
    const resBtn   = document.getElementById('btn-resources');
    const resPopup = document.getElementById('resources-popup');
    resBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._resourcesOpen = !this._resourcesOpen;
      resPopup.classList.toggle('open', this._resourcesOpen);
      // Close other popups
      this._closeLayerPopup();
    });

    // Layer switcher button
    const layerBtn   = document.getElementById('layer-switcher-btn');
    const layerPopup = document.getElementById('layer-popup');
    layerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._layerPopupOpen = !this._layerPopupOpen;
      layerPopup.classList.toggle('open', this._layerPopupOpen);
      // Close other popups
      resPopup.classList.remove('open');
      this._resourcesOpen = false;
    });

    // Layer options
    document.querySelectorAll('.layer-option').forEach(opt => {
      opt.addEventListener('click', () => {
        this._switchLayer(opt.dataset.layer);
      });
    });

    // Hex info close
    document.getElementById('hex-info-close').addEventListener('click', () => {
      document.getElementById('hex-info-panel').classList.remove('open');
    });

    // Hamburger menu
    const menuBtn     = document.getElementById('btn-menu');
    const menuPanel   = document.getElementById('secondary-menu');
    const menuOverlay = document.getElementById('menu-overlay');

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._menuOpen = !this._menuOpen;
      menuPanel.classList.toggle('open',   this._menuOpen);
      menuOverlay.classList.toggle('open', this._menuOpen);
    });

    menuOverlay.addEventListener('click', () => this._closeMenu());

    // Secondary menu items
    document.querySelectorAll('.secondary-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this._closeMenu();
        this._openSecondaryView(view);
      });
    });

    // Secondary view close buttons
    document.querySelectorAll('.secondary-view-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.close;
        document.getElementById(`view-${view}`).classList.remove('open');
        this._activeView = null;
      });
    });

    // Ranking tabs
    document.querySelectorAll('[data-rtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-rtab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.rtab;
        document.getElementById('ranking-players').classList.toggle('hidden',   tab !== 'players');
        document.getElementById('ranking-alliances').classList.toggle('hidden', tab !== 'alliances');
        if (tab === 'alliances' && typeof Ranking !== 'undefined') Ranking.loadAlliances();
      });
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      localStorage.clear();
      window.location.href = '/';
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', () => {
      document.getElementById('modal-overlay').classList.add('hidden');
    });
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
      }
    });

    // Close popups on outside click
    document.addEventListener('click', () => {
      this._closeLayerPopup();
      resPopup.classList.remove('open');
      this._resourcesOpen = false;
    });
  },

  _openSecondaryView(viewName) {
    // Close any previously open view
    if (this._activeView && this._activeView !== viewName) {
      const prev = document.getElementById(`view-${this._activeView}`);
      if (prev) prev.classList.remove('open');
    }

    const viewEl = document.getElementById(`view-${viewName}`);
    if (!viewEl) return;

    viewEl.classList.add('open');
    this._activeView = viewName;

    // Load data for the view
    switch (viewName) {
      case 'army':     if (typeof Army     !== 'undefined') Army.load();     break;
      case 'combat':   if (typeof Combat   !== 'undefined') Combat.load();   break;
      case 'alliance': if (typeof Alliance !== 'undefined') Alliance.load(); break;
      case 'ranking':  if (typeof Ranking  !== 'undefined') Ranking.load();  break;
      case 'chat':     if (typeof Chat     !== 'undefined') Chat.load();     break;
    }
  },

  _closeMenu() {
    this._menuOpen = false;
    document.getElementById('secondary-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
  },

  _closeLayerPopup() {
    this._layerPopupOpen = false;
    document.getElementById('layer-popup').classList.remove('open');
  },
};

document.addEventListener('DOMContentLoaded', () => Game.init());
