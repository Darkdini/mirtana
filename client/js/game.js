const Game = {
  currentView: 'city',
  refreshInterval: null,

  async init() {
    API.init();

    const me = await API.get('/api/auth/me').catch(() => null);
    if (!me) { window.location.href = '/'; return; }

    document.getElementById('player-name-display').textContent = me.username;
    document.getElementById('castle-name-display').textContent = me.castle_name;

    WS.connect();

    WS.on('connected', (msg) => {
      document.getElementById('online-count').textContent = `🟢 ${msg.online} онлайн`;
    });
    WS.on('online_count', (msg) => {
      document.getElementById('online-count').textContent = `🟢 ${msg.count} онлайн`;
    });
    WS.on('battle_result', (msg) => {
      const won = msg.result === 'attacker';
      UI.notify(
        won ? `✅ Победа! Добыча получена.` : `❌ Ваша армия потерпела поражение`,
        won ? 'success' : 'error',
        6000
      );
      if (this.currentView === 'combat') Combat.load();
    });
    WS.on('under_attack_result', (msg) => {
      const won = msg.result === 'defender';
      UI.notify(
        won ? `🛡️ Вы отразили атаку!` : `⚠️ Ваш замок был атакован!`,
        won ? 'success' : 'warning',
        8000
      );
      if (this.currentView === 'combat') Combat.load();
    });
    WS.on('troops_returned', (msg) => {
      const loot = msg.loot || {};
      const lootStr = Object.entries(loot).filter(([, v]) => v > 0)
        .map(([k, v]) => `+${v} ${k}`).join(', ');
      UI.notify(`↩️ Войска вернулись!${lootStr ? ' Добыча: ' + lootStr : ''}`, 'info');
      City.load();
    });

    this.bindNavigation();
    Chat.init();
    await this.loadView('city');

    this.refreshInterval = setInterval(() => {
      if (this.currentView === 'city') City.load();
      else if (this.currentView === 'combat') Combat.load();
    }, 30000);

    document.getElementById('btn-logout').addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      localStorage.clear();
      window.location.href = '/';
    });
  },

  bindNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadView(view);
      });
    });
  },

  async loadView(view) {
    this.currentView = view;

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) viewEl.classList.add('active');

    switch (view) {
      case 'city':     await City.load(); break;
      case 'map':      await GameMap.load(); break;
      case 'army':     await Army.load(); break;
      case 'combat':   await Combat.load(); break;
      case 'alliance': await Alliance.load(); break;
      case 'ranking':  await Ranking.load(); break;
      case 'chat':     Chat.load(); break;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => Game.init());
