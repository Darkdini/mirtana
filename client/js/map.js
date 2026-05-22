const GameMap = {
  canvas: null,
  ctx: null,
  players: [],
  myX: 0, myY: 0,
  viewX: 0, viewY: 0,
  tileSize: 14,
  dragging: false,
  dragStart: null,
  viewStart: null,

  COLORS: {
    grass: '#1a3a1a',
    castle: '#d4a017',
    mine: '#aaa',
    water: '#1a2a4a',
    forest: '#0a2a0a',
    mountain: '#3a3a3a',
  },

  async load() {
    this.canvas = document.getElementById('map-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    await this.fetchPlayers();
    this.centerOnMe();
    this.draw();
    this.bindEvents();

    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.draw();
    });
  },

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  },

  async fetchPlayers() {
    try {
      const data = await API.get('/api/map/players');
      this.players = data.players;
    } catch {}
  },

  centerOnMe() {
    const pid = parseInt(localStorage.getItem('player_id'));
    const me = this.players.find(p => p.id === pid);
    if (me) {
      this.myX = me.map_x;
      this.myY = me.map_y;
    }
    this.viewX = this.myX * this.tileSize - this.canvas.width / 2;
    this.viewY = this.myY * this.tileSize - this.canvas.height / 2;
  },

  draw() {
    const ctx = this.ctx;
    const ts = this.tileSize;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.fillStyle = this.COLORS.grass;
    ctx.fillRect(0, 0, W, H);

    const startX = Math.max(0, Math.floor(this.viewX / ts));
    const startY = Math.max(0, Math.floor(this.viewY / ts));
    const endX = Math.min(50, startX + Math.ceil(W / ts) + 2);
    const endY = Math.min(50, startY + Math.ceil(H / ts) + 2);

    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        const sx = x * ts - this.viewX;
        const sy = y * ts - this.viewY;
        const noise = (Math.sin(x * 0.7 + y * 1.3) + 1) / 2;
        if (noise < 0.05) ctx.fillStyle = this.COLORS.water;
        else if (noise > 0.92) ctx.fillStyle = this.COLORS.mountain;
        else if (noise > 0.82) ctx.fillStyle = this.COLORS.forest;
        else ctx.fillStyle = this.COLORS.grass;
        ctx.fillRect(sx, sy, ts - 1, ts - 1);
      }
    }

    const myId = parseInt(localStorage.getItem('player_id'));
    for (const p of this.players) {
      const sx = p.map_x * ts - this.viewX;
      const sy = p.map_y * ts - this.viewY;
      if (sx < -ts || sx > W + ts || sy < -ts || sy > H + ts) continue;

      const isMe = p.id === myId;
      ctx.fillStyle = isMe ? '#d4a017' : '#e74c3c';
      ctx.fillRect(sx + 1, sy + 1, ts - 2, ts - 2);

      if (ts >= 12) {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(10, ts - 2)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏰', sx + ts / 2, sy + ts / 2 + 3);
      }

      if (ts >= 14) {
        ctx.fillStyle = isMe ? '#ffd700' : '#fff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.username.slice(0, 6), sx + ts / 2, sy - 2);
      }
    }

    ctx.strokeStyle = '#1a3a1a';
    ctx.lineWidth = 0.5;
    for (let x = startX; x <= endX; x++) {
      const sx = x * ts - this.viewX;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
    }
    for (let y = startY; y <= endY; y++) {
      const sy = y * ts - this.viewY;
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    }

    document.getElementById('map-coords').textContent =
      `${Math.round(this.myX)}:${Math.round(this.myY)}`;
  },

  bindEvents() {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.viewStart = { x: this.viewX, y: this.viewY };
    });

    canvas.addEventListener('mousemove', (e) => {
      const ts = this.tileSize;
      const tileX = Math.floor((e.offsetX + this.viewX) / ts);
      const tileY = Math.floor((e.offsetY + this.viewY) / ts);
      const player = this.players.find(p => p.map_x === tileX && p.map_y === tileY);

      const tooltip = document.getElementById('map-tooltip');
      if (player) {
        tooltip.style.display = 'block';
        tooltip.style.left = (e.offsetX + 12) + 'px';
        tooltip.style.top = (e.offsetY + 12) + 'px';
        tooltip.innerHTML = `
          <strong>${player.castle_name}</strong><br>
          👤 ${player.username}<br>
          🏆 Очки: ${player.score}
          ${player.alliance_tag ? `<br>🤝 [${player.alliance_tag}]` : ''}
        `;
      } else {
        tooltip.style.display = 'none';
      }

      if (this.dragging) {
        this.viewX = this.viewStart.x - (e.clientX - this.dragStart.x);
        this.viewY = this.viewStart.y - (e.clientY - this.dragStart.y);
        this.draw();
        tooltip.style.display = 'none';
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!this.dragging) return;
      const moved = Math.abs(e.clientX - this.dragStart.x) + Math.abs(e.clientY - this.dragStart.y);
      this.dragging = false;
      if (moved < 5) {
        const tileX = Math.floor((e.offsetX + this.viewX) / this.tileSize);
        const tileY = Math.floor((e.offsetY + this.viewY) / this.tileSize);
        const player = this.players.find(p => p.map_x === tileX && p.map_y === tileY);
        if (player) this.showPlayerInfo(player);
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      const newSize = Math.max(8, Math.min(32, this.tileSize + delta));
      const ratio = newSize / this.tileSize;
      this.tileSize = newSize;
      this.viewX = (this.viewX + this.canvas.width / 2) * ratio - this.canvas.width / 2;
      this.viewY = (this.viewY + this.canvas.height / 2) * ratio - this.canvas.height / 2;
      this.draw();
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.dragging = true;
      this.dragStart = { x: t.clientX, y: t.clientY };
      this.viewStart = { x: this.viewX, y: this.viewY };
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.dragging) return;
      const t = e.touches[0];
      this.viewX = this.viewStart.x - (t.clientX - this.dragStart.x);
      this.viewY = this.viewStart.y - (t.clientY - this.dragStart.y);
      this.draw();
    }, { passive: false });

    canvas.addEventListener('touchend', () => { this.dragging = false; });

    document.getElementById('btn-map-home').addEventListener('click', () => {
      this.centerOnMe();
      this.draw();
    });
  },

  async showPlayerInfo(player) {
    try {
      const data = await API.get(`/api/map/player/${player.id}`);
      const myId = parseInt(localStorage.getItem('player_id'));
      const isMe = player.id === myId;

      const buildingsList = (data.buildings || [])
        .map(b => `<span style="background:var(--bg-dark);padding:2px 6px;border-radius:4px;font-size:12px;margin:2px;display:inline-block">
          ${b.building_type} ур.${b.level}
        </span>`)
        .join('');

      UI.setRightPanel(`
        <div class="player-info-card">
          <div class="player-info-header">
            <div class="player-avatar">🏰</div>
            <div>
              <div class="player-info-name">${data.castle_name}</div>
              <div class="player-info-castle">👤 ${data.username}</div>
            </div>
          </div>
          <div class="player-info-row">🏆 Очки: <strong>${data.score}</strong></div>
          <div class="player-info-row">📍 ${data.map_x}:${data.map_y}</div>
          <div class="player-info-row">⚔️ Армия: ~${data.army_size}</div>
          ${data.alliance_name ? `<div class="player-info-row">🤝 ${data.alliance_name}</div>` : ''}
          <div style="margin-top:10px">${buildingsList}</div>
          ${!isMe ? `<button class="btn-danger" style="width:100%;margin-top:14px" onclick="Combat.openAttackModal(${data.id},'${data.username}')">⚔️ Атаковать!</button>` : ''}
        </div>
      `);
    } catch {}
  },
};
