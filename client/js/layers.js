/**
 * Layers — manages the three game layers (castle / field / world)
 * and generates hex data for each.
 */

// ── Building → image mapping ──────────────────────────────────────────────────
const BUILDING_IMAGES = {
  castle:    '/assets/buildings/castlekeep_14.png',
  barracks:  '/assets/buildings/castlekeep_05.png',
  wall:      '/assets/buildings/castlekeep_07.png',
  tower:     '/assets/buildings/tower_04a.png',
  archery:   '/assets/buildings/tower_01a.png',
  farm:      '/assets/buildings/field_12a.png',
  sawmill:   '/assets/buildings/windmill_04a.png',
  mine:      '/assets/buildings/cairn_01b.png',
  quarry:    '/assets/buildings/cairn_01b.png',
  stables:   '/assets/buildings/barn_07b.png',
  warehouse: '/assets/buildings/barn_07b.png',
  workshop:  '/assets/buildings/house_06a.png',
  academy:   '/assets/buildings/manor_01a.png',
  market:    '/assets/buildings/market_04a.png',
  tavern:    '/assets/buildings/shop_5a.png',
};

// Preload all building images immediately
_preloadImages(Object.values(BUILDING_IMAGES));

const Layers = {
  current: 'castle',
  grid: null,         // current HexGrid instance
  _canvas: null,
  _onHexClick: null,

  // ── Init ─────────────────────────────────────────────────────────────────

  init(canvas, onHexClick) {
    this._canvas    = canvas;
    this._onHexClick = onHexClick;

    this.grid = new HexGrid(canvas, {
      size: 44,
      onHexClick: (hex) => {
        if (onHexClick) onHexClick(hex, this.current);
      },
      onHexHover: (hex) => {
        // Subtle tooltip or future use
      },
    });

    this.switch('castle');
  },

  // ── Layer switching ───────────────────────────────────────────────────────

  switch(layerName, extraData = {}) {
    this.current = layerName;

    let hexes = [];
    switch (layerName) {
      case 'castle':
        hexes = this.getCastleHexes(extraData.buildings || []);
        this.grid.options.size = 44;
        break;
      case 'field':
        hexes = this.getFieldHexes();
        this.grid.options.size = 36;
        break;
      case 'world':
        hexes = this.getWorldHexes(extraData.players || [], extraData.myPos || { x: 25, y: 25 });
        this.grid.options.size = 30;
        break;
    }

    this.grid.loadData(hexes);

    // Centre on Ратуша for castle, (0,0) otherwise
    if (layerName === 'castle') {
      this.grid.centerOn(0, 0);
      this.grid.zoom = 1.0;
    } else if (layerName === 'field') {
      this.grid.centerOn(0, 0);
      this.grid.zoom = 0.9;
    } else {
      this.grid.centerOn(0, 0);
      this.grid.zoom = 0.75;
    }
  },

  // ── Castle layer ──────────────────────────────────────────────────────────

  getCastleHexes(buildings) {
    // Build lookup from building_type → building object
    const bldMap = {};
    for (const b of buildings) bldMap[b.building_type] = b;

    const hexes = [];

    // ─ Centre: Ратуша (Town Hall)
    hexes.push({
      q: 0, r: 0,
      icon: '🏛️', label: 'Ратуша',
      image: BUILDING_IMAGES['castle'],
      color: '#4A2E10',
      type: 'building', building_type: 'castle',
      built: true,
      level: bldMap['castle'] ? bldMap['castle'].level : 1,
      desc: 'Главное здание замка. Определяет уровень развития.',
    });

    // ─ Ring 1 (6 hexes) — primary buildings
    const ring1 = [
      { q:  1, r:  0, icon: '⚔️',  label: 'Казармы',   type: 'barracks',  color: '#4A3020' },
      { q:  0, r:  1, icon: '🌾',  label: 'Ферма',     type: 'farm',      color: '#2A4020' },
      { q: -1, r:  1, icon: '🪵',  label: 'Лесопилка', type: 'sawmill',   color: '#2A3A20' },
      { q: -1, r:  0, icon: '⛏️',  label: 'Каменоломня',type:'quarry',    color: '#3A3028' },
      { q:  0, r: -1, icon: '🪙',  label: 'Рудник',    type: 'mine',      color: '#4A3728' },
      { q:  1, r: -1, icon: '🐴',  label: 'Конюшня',   type: 'stables',   color: '#3A2A18' },
    ];
    for (const h of ring1) {
      const bld = bldMap[h.type];
      hexes.push({
        q: h.q, r: h.r,
        icon:  bld ? h.icon : '🔧',
        label: h.label,
        image: bld ? BUILDING_IMAGES[h.type] : null,
        color: bld ? h.color : '#141008',
        type:  'building', building_type: h.type,
        level: bld ? bld.level : 0,
        built: !!bld,
        desc:  bld ? `Уровень ${bld.level}` : 'Пустой участок',
      });
    }

    // ─ Ring 2 (12 hexes) — secondary buildings
    const ring2Defs = [
      { q:  2, r:  0, icon: '🏹', label: 'Стрельбище', type: 'archery',   color: '#3A2818' },
      { q:  2, r: -1, icon: '🔨', label: 'Мастерская', type: 'workshop',  color: '#3A2A18' },
      { q:  1, r: -2, icon: '🧱', label: 'Стены',      type: 'wall',      color: '#483828' },
      { q:  0, r: -2, icon: '🗼', label: 'Башня',      type: 'tower',     color: '#4A3020' },
      { q: -1, r: -1, icon: '📦', label: 'Склад',      type: 'warehouse', color: '#3A2818' },
      { q: -2, r:  0, icon: '📚', label: 'Академия',   type: 'academy',   color: '#2A2840' },
      { q: -2, r:  1, icon: '🏪', label: 'Рынок',      type: 'market',    color: '#3A2820' },
      { q: -1, r:  2, icon: '🍺', label: 'Таверна',    type: 'tavern',    color: '#3A2418' },
      { q:  0, r:  2, icon: '🏗️', label: 'Стройка',   type: null,        color: '#1A1208' },
      { q:  1, r:  1, icon: '🏗️', label: 'Стройка',   type: null,        color: '#1A1208' },
      { q:  2, r: -2, icon: '🏗️', label: 'Стройка',   type: null,        color: '#1A1208' },
      { q: -2, r:  2, icon: '🏗️', label: 'Стройка',   type: null,        color: '#1A1208' },
    ];
    for (const h of ring2Defs) {
      const bld = h.type ? bldMap[h.type] : null;
      hexes.push({
        q: h.q, r: h.r,
        icon:  bld ? h.icon : (h.type ? '🔧' : '🏗️'),
        label: h.label,
        image: (bld && h.type) ? BUILDING_IMAGES[h.type] : null,
        color: bld ? h.color : '#141008',
        type:  'building',
        building_type: h.type,
        level: bld ? bld.level : 0,
        built: !!bld,
        desc:  bld ? `Уровень ${bld.level}` : 'Пустой участок',
      });
    }

    // ─ Ring 3 (18 hexes) — outer decorative / empty
    const ring3Coords = Layers._ringCoords(3);
    const terrainIcons = ['🌿','🌿','🌲','🌿','⛰️','🌿','🌿','🌲','🌿'];
    for (let i = 0; i < ring3Coords.length; i++) {
      const { q, r } = ring3Coords[i];
      hexes.push({
        q, r,
        icon: terrainIcons[i % terrainIcons.length],
        label: '',
        color: '#1C2418',
        type: 'outer',
        desc: 'Внешние рубежи замка',
      });
    }

    return hexes;
  },

  // ── Field layer ───────────────────────────────────────────────────────────

  getFieldHexes() {
    const hexes = [];
    const radius = 7;

    // Terrain definitions
    const terrainTypes = [
      { type: 'grass',    color: '#2D4A20', icon: '🌿', label: 'Луг',       desc: 'Мирные луга' },
      { type: 'forest',   color: '#1A3A15', icon: '🌲', label: 'Лес',       desc: 'Густой лес, богатый деревом' },
      { type: 'water',    color: '#1A2A4A', icon: '💧', label: 'Вода',      desc: 'Озеро или река' },
      { type: 'mountain', color: '#3A3028', icon: '⛰️', label: 'Горы',      desc: 'Горная гряда' },
      { type: 'mine',     color: '#4A3728', icon: '⛏️', label: 'Рудник',    desc: 'Заброшенный рудник' },
      { type: 'farm',     color: '#3A4820', icon: '🌾', label: 'Поля',      desc: 'Плодородные поля' },
    ];

    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        if (q === 0 && r === 0) {
          hexes.push({
            q, r,
            icon: '🏰', label: 'Мой замок',
            image: BUILDING_IMAGES['castle'],
            color: '#4A3010',
            type: 'my_castle',
            built: true,
            desc: 'Ваш замок',
          });
          continue;
        }

        // Procedural terrain using wave functions
        const noiseVal = (
          Math.sin(q * 0.7 + r * 0.5) * 0.3 +
          Math.cos(q * 0.4 - r * 0.9) * 0.3 +
          Math.sin((q + r) * 0.6 + q * 0.3) * 0.4
        );

        let tIdx;
        if (noiseVal < -0.5)       tIdx = 2; // water
        else if (noiseVal < -0.15) tIdx = 1; // forest
        else if (noiseVal < 0.1)   tIdx = 0; // grass
        else if (noiseVal < 0.3)   tIdx = 5; // farm
        else if (noiseVal < 0.5)   tIdx = 4; // mine
        else                       tIdx = 3; // mountain

        // Occasional resource pockets
        const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q-r));
        const resource = ((Math.abs(q * 13 + r * 7) % 11) === 0 && dist > 2) ? 4 : null; // mine node

        const terrain = terrainTypes[resource !== null ? resource : tIdx];
        hexes.push({
          q, r,
          icon:  terrain.icon,
          label: dist <= 2 ? terrain.label : '',
          color: terrain.color,
          type:  terrain.type,
          desc:  terrain.desc,
        });
      }
    }

    return hexes;
  },

  // ── World layer ───────────────────────────────────────────────────────────

  getWorldHexes(players, myPos) {
    const hexes = [];
    const radius = 9;

    // Build a player position lookup (map_x, map_y → player)
    const playerMap = {};
    for (const p of players) {
      // Map world coordinates to axial offsets relative to myPos
      const dq = p.map_x - myPos.x;
      const dr = p.map_y - myPos.y;
      // Simple offset mapping (not perfect hex grid, but functional for world)
      playerMap[`${dq},${dr}`] = p;
    }

    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        // Background terrain (world-scale)
        const noiseVal = (
          Math.sin(q * 0.5 + r * 0.3) * 0.4 +
          Math.cos(q * 0.3 - r * 0.6) * 0.3 +
          Math.sin((q + r) * 0.4) * 0.3
        );

        let color, bgIcon;
        if (noiseVal < -0.3)      { color = '#1A2A4A'; bgIcon = '💧'; }
        else if (noiseVal < 0.0)  { color = '#1A3A15'; bgIcon = '🌲'; }
        else if (noiseVal < 0.3)  { color = '#2D4A20'; bgIcon = '🌿'; }
        else                      { color = '#3A3028'; bgIcon = '⛰️'; }

        // My castle at center
        if (q === 0 && r === 0) {
          const me = players.find(p => p.is_me);
          hexes.push({
            q, r,
            icon: '🏰', label: me ? me.username : 'Вы',
            image: BUILDING_IMAGES['castle'],
            color: '#4A3010',
            type: 'my_castle',
            built: true,
            desc: me ? `${me.castle_name || 'Замок'}` : 'Ваш замок',
            player: me,
          });
          continue;
        }

        // Check for other player
        const otherPlayer = playerMap[`${q},${r}`];
        if (otherPlayer) {
          hexes.push({
            q, r,
            icon: '🏰', label: otherPlayer.username,
            image: BUILDING_IMAGES['castle'],
            color: '#3A1010',
            type: 'enemy_castle',
            built: true,
            desc: otherPlayer.castle_name || `Замок ${otherPlayer.username}`,
            player: otherPlayer,
          });
          continue;
        }

        hexes.push({
          q, r,
          icon:  bgIcon,
          label: '',
          color,
          type:  'terrain',
          desc:  'Территория',
        });
      }
    }

    return hexes;
  },

  // ── Hex click handler (called by game.js) ─────────────────────────────────

  handleHexClick(hex, layer, showInfoPanel) {
    if (!hex) {
      showInfoPanel(null);
      return;
    }

    const info = {
      icon:     hex.icon   || '❓',
      title:    hex.label  || 'Неизвестно',
      subtitle: hex.desc   || '',
      actions:  [],
      stats:    [],
    };

    if (layer === 'castle') {
      if (hex.type === 'building') {
        info.title = hex.label || hex.building_type;
        if (hex.built) {
          info.subtitle = `Уровень ${hex.level}`;
          info.stats.push({ label: 'Уровень', value: hex.level });
          info.actions.push({ label: 'Улучшить', action: 'upgrade', data: hex.building_type });
          info.actions.push({ label: 'Подробнее', action: 'detail', data: hex.building_type });
        } else {
          info.subtitle = 'Пустой участок';
          if (hex.building_type) {
            info.actions.push({ label: '+ Построить', action: 'build', data: hex.building_type });
          }
        }
      }
    } else if (layer === 'field') {
      if (hex.type === 'my_castle') {
        info.actions.push({ label: 'Перейти в замок', action: 'goto_castle' });
      } else if (hex.type === 'mine') {
        info.actions.push({ label: 'Разведать', action: 'scout', data: hex });
      }
    } else if (layer === 'world') {
      if (hex.type === 'enemy_castle' && hex.player) {
        info.actions.push({ label: 'Атаковать', action: 'attack', data: hex.player });
        info.actions.push({ label: 'Профиль', action: 'profile', data: hex.player });
      } else if (hex.type === 'my_castle') {
        info.actions.push({ label: 'Мой замок', action: 'goto_castle' });
      }
    }

    showInfoPanel(info);
  },

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Generate axial coordinates for ring N around (0,0). */
  _ringCoords(n) {
    const results = [];
    let q = n, r = -n, s = 0;
    // Directions for cube-coordinate ring traversal
    const dirs = [
      [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0]
    ];
    for (const [dq, dr] of dirs) {
      for (let i = 0; i < n; i++) {
        results.push({ q, r });
        q += dq;
        r += dr;
      }
    }
    return results;
  },
};
