'use strict';
// server.js — СРЕДНЕВЕКОВЬЕ. HTTP + WebSocket + игровой цикл.

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const os     = require('os');
const WS     = require('./ws');
const G      = require('./game');

const PORT       = parseInt(process.env.PORT || '7777', 10);
const STATE_FILE = process.env.STATE_PATH || path.join(__dirname, 'state.json');
const PUBLIC     = path.join(__dirname, 'public');

// ── АДМИНИСТРАТОРЫ ───────────────────────────────────────────────────
const ADMINS = new Set(['Admin']); // встроенный аккаунт всегда админ
try {
  const adminFile = path.join(__dirname, 'admins.txt');
  if (fs.existsSync(adminFile)) {
    fs.readFileSync(adminFile, 'utf8').split('\n')
      .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
      .forEach(u => ADMINS.add(u));
  }
} catch {}
(process.env.ADMIN_USERS || '').split(',').filter(Boolean).forEach(u => ADMINS.add(u.trim()));

// ── СОСТОЯНИЕ ───────────────────────────────────────────────────────
let STATE = { players:{}, world:null, sessions:{}, chat:[], alliances:{}, allianceWars:{} };

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.copyFileSync(STATE_FILE, STATE_FILE + '.backup');
      console.log('[load] Резервная копия сохранена → state.json.backup');
    }
    STATE = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!STATE.world)        { STATE.world=G.createWorldGrid(); G.initProvince(STATE.world); G.initRelics(STATE.world); }
    if (!STATE.chat)          STATE.chat=[];
    if (!STATE.alliances)     STATE.alliances={};
    if (!STATE.allianceWars)  STATE.allianceWars={};
    console.log(`[load] ${Object.keys(STATE.players).length} игроков`);
  } catch {
    console.log('[load] Новая игра');
    STATE.world = G.createWorldGrid();
    G.initProvince(STATE.world);
    G.initRelics(STATE.world);
  }
  ensureAdminAccount();
  fixAdminWorldPos();
}

function ensureAdminAccount() {
  if (STATE.players['Admin']) return;
  const salt = newSalt();
  const admin = G.createPlayer('human', 'Администрация');
  admin.username    = 'Admin';
  admin.passwordSalt = salt;
  admin.passwordHash = hashPw('@1234', salt);
  STATE.players['Admin'] = admin;
  if (STATE.world) admin.worldPos = G.placePlayerOnWorld(STATE.world, 'Admin', 'human');
  console.log('[admin] Создан встроенный аккаунт Admin (@1234)');
}

function fixAdminWorldPos() {
  const admin = STATE.players['Admin'];
  if (admin && !admin.worldPos && STATE.world) {
    admin.worldPos = G.placePlayerOnWorld(STATE.world, 'Admin', 'human');
    console.log('[admin] Admin размещён на карте мира');
  }
}

let _saveTimer = null;
function saveState() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(STATE)); } catch(e) { console.error('[save]', e.message); }
  }, 500);
}

// ── HTTP УТИЛИТЫ ────────────────────────────────────────────────────
const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.ico':'image/x-icon' };

function send(res, status, data, extra={}) {
  const isJson = typeof data === 'object' && !(data instanceof Buffer);
  res.writeHead(status, { 'Content-Type': isJson ? 'application/json;charset=utf-8' : 'text/html;charset=utf-8', ...extra });
  res.end(isJson ? JSON.stringify(data) : data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 2e6) { req.destroy(); reject(new Error('too large')); } });
    req.on('end',  () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function getCookie(req, name) {
  const m = (req.headers.cookie||'').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? m[1] : null;
}

function getPlayer(req) {
  const sid = getCookie(req, 'sid');
  if (!sid) return null;
  const username = STATE.sessions[sid];
  if (!username) return null;
  return STATE.players[username] || null;
}

function hashPw(pw, salt) { return crypto.createHash('sha256').update(pw + ':' + (salt||'srv_salt_2024')).digest('hex'); }
function newSid()  { return crypto.randomBytes(20).toString('hex'); }
function newSalt() { return crypto.randomBytes(16).toString('hex'); }

// ── СЕРИАЛИЗАЦИЯ ИГРОКА ─────────────────────────────────────────────
function getAllianceInfo(p) {
  if (!p.allianceId || !STATE.alliances) return null;
  const a = STATE.alliances[p.allianceId];
  if (!a) return null;
  return { id: a.id, name: a.name, tag: a.tag, leader: a.leader, memberCount: a.members.length };
}

function serializePlayer(p) {
  return {
    username:        p.username,
    kingdom:         p.kingdom,
    race:            p.race,
    res:             p.res,
    resMax:          p.resMax,
    castle:          p.castle,
    lands:           p.lands,
    queue:           p.queue,
    trainQueue:      p.trainQueue,
    army:            p.army,
    marches:         p.marches,
    reports:         p.reports,
    worldPos:        p.worldPos,
    techs:           p.techs || {},
    alliance:        getAllianceInfo(p),
    rating:          G.calcRating(p),
    avatar:          p.avatar   || null,
    avatarBg:        p.avatarBg || null,
    photo:           p.photo    || null,
    isAdmin:         ADMINS.has(p.username),
    loyalty:         p.loyalty       ?? 100,
    oases:           p.oases         || [],
    protectedUntil:  p.protectedUntil || 0,
    deadGenerals:    p.deadGenerals   || [],
    generals:        p.generals       || {},
    artifacts:       p.artifacts      || [],
    activeArtifacts: p.activeArtifacts || [],
    expedition:      p.expedition     || null,
    relics:          p.relics         || [],
    spyCooldown:     p.spyCooldown    || 0,
    marketOrders:    p.marketOrders   || [],
    quests:          p.quests         || {},
    allianceWars:    p.allianceId ? Object.fromEntries(
      Object.entries(STATE.allianceWars || {}).filter(([k]) => k.includes(p.allianceId))
    ) : {},
  };
}

// ── WEBSOCKET ───────────────────────────────────────────────────────
const wsClients = new Map(); // username -> WSClient

// ── ЗАЩИТА ОТ БРУТФОРСА ─────────────────────────────────────────────
const loginAttempts = new Map(); // ip -> { count, resetAt }
function checkRateLimit(ip, max=15, windowMs=60000) {
  const now = Date.now();
  let e = loginAttempts.get(ip);
  if (!e || now > e.resetAt) { e = { count:0, resetAt:now+windowMs }; loginAttempts.set(ip, e); }
  return ++e.count > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginAttempts) if (now > v.resetAt) loginAttempts.delete(k);
}, 60000);

function push(username, msg) {
  wsClients.get(username)?.send(JSON.stringify(msg));
}
function broadcast(msg) {
  const s = JSON.stringify(msg);
  for (const c of wsClients.values()) try { c.send(s); } catch {}
}

// ── HTTP МАРШРУТИЗАЦИЯ ──────────────────────────────────────────────
async function router(req, res) {
  const u = new URL(req.url, 'http://x');
  const pathname = u.pathname;

  // ── Статика ──────────────────────────────────────────────────────
  if (!pathname.startsWith('/api/')) {
    const filePath = pathname === '/'
      ? path.join(PUBLIC, 'index.html')
      : path.join(PUBLIC, pathname);
    if (!filePath.startsWith(PUBLIC)) return send(res, 403, 'Forbidden');
    return fs.readFile(filePath, (err, data) => {
      if (err) return fs.readFile(path.join(PUBLIC, 'index.html'), (e, d) => { if(e) return send(res,404,'Not found'); res.writeHead(200,{'Content-Type':'text/html'}); res.end(d); });
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  }

  // ── Регистрация ──────────────────────────────────────────────────
  if (pathname === '/api/register' && req.method === 'POST') {
    if (checkRateLimit(req.socket.remoteAddress, 5)) return send(res, 429, { error: 'Слишком много попыток. Подождите минуту.' });
    const { username, password, race, kingdom } = await readBody(req);
    if (!username || username.length < 3)  return send(res, 400, { error: 'Логин минимум 3 символа' });
    if (!password || password.length < 4)  return send(res, 400, { error: 'Пароль минимум 4 символа' });
    if (!G.RACES[race])                    return send(res, 400, { error: 'Неверная раса' });
    if (!kingdom || kingdom.length < 2)    return send(res, 400, { error: 'Название королевства минимум 2 символа' });
    if (STATE.players[username])           return send(res, 400, { error: 'Имя занято' });
    const player = G.createPlayer(race, kingdom);
    player.username = username;
    const salt = newSalt();
    player.passwordSalt = salt;
    player.passwordHash = hashPw(password, salt);
    player.worldPos = G.placePlayerOnWorld(STATE.world, username, race);
    STATE.players[username] = player;
    const sid = newSid();
    STATE.sessions[sid] = username;
    saveState();
    return send(res, 200, { ok:true, username, kingdom }, { 'Set-Cookie': `sid=${sid}; Path=/; HttpOnly; Max-Age=2592000` });
  }

  // ── Логин ────────────────────────────────────────────────────────
  if (pathname === '/api/login' && req.method === 'POST') {
    if (checkRateLimit(req.socket.remoteAddress)) return send(res, 429, { error: 'Слишком много попыток. Подождите минуту.' });
    const { username, password } = await readBody(req);
    const player = STATE.players[username];
    if (!player || player.passwordHash !== hashPw(password, player.passwordSalt)) return send(res, 401, { error: 'Неверный логин или пароль' });
    const sid = newSid();
    STATE.sessions[sid] = username;
    saveState();
    return send(res, 200, { ok:true, username }, { 'Set-Cookie': `sid=${sid}; Path=/; HttpOnly; Max-Age=2592000` });
  }

  // ── Далее — нужна авторизация ─────────────────────────────────────
  const p = getPlayer(req);

  if (pathname === '/api/logout' && req.method === 'POST') {
    const sid = getCookie(req, 'sid');
    if (sid) delete STATE.sessions[sid];
    return send(res, 200, { ok:true }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });
  }

  if (!p) return send(res, 401, { error: 'Необходима авторизация' });

  // ── Состояние игрока ─────────────────────────────────────────────
  if (pathname === '/api/state' && req.method === 'GET') {
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    // Краткая инфо об альянсах для карты мира (тег по игроку)
    const worldPlayers = {};
    for (const c of STATE.world) {
      if (c.type === 'player' && c.player && STATE.players[c.player]) {
        const pp = STATE.players[c.player];
        const pa = pp.allianceId && STATE.alliances?.[pp.allianceId];
        worldPlayers[c.player] = { allianceId: pp.allianceId || null, allianceTag: pa?.tag || null };
      }
    }
    return send(res, 200, {
      player:       serializePlayer(p),
      world:        STATE.world,
      worldPlayers,
      alliances:    Object.fromEntries(Object.entries(STATE.alliances || {}).map(([id,a])=>[id,{id,name:a.name,tag:a.tag,leader:a.leader,memberCount:a.members.length}])),
    });
  }

  // ── Строительство ────────────────────────────────────────────────
  if (pathname === '/api/build' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdBuild(p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Снос ─────────────────────────────────────────────────────────
  if (pathname === '/api/demolish' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdDemolish(p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Тренировка ───────────────────────────────────────────────────
  if (pathname === '/api/train' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdTrain(p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Атака ────────────────────────────────────────────────────────
  if (pathname === '/api/attack' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdAttack(p, STATE.world, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Ускорение постройки ──────────────────────────────────────────
  if (pathname === '/api/speed-build' && req.method === 'POST') {
    const { jobIndex } = await readBody(req);
    const job = p.queue[jobIndex];
    if (!job) return send(res, 400, { error: 'Нет такой работы' });
    const rem = Math.max(0, Math.ceil((job.end - Date.now()) / 1000));
    const cost = Math.max(1, Math.ceil(rem / 60) * 2);
    if ((p.res.gold||0) < cost) return send(res, 400, { error: `Нужно ${cost} золота` });
    p.res.gold -= cost;
    job.end = Date.now();
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    saveState();
    return send(res, 200, { ok:true, cost });
  }

  // ── Исследование технологий ──────────────────────────────────────
  if (pathname === '/api/research' && req.method === 'POST') {
    const { tid } = await readBody(req);
    const result = G.cmdResearch(p, { tid });
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Аватар ───────────────────────────────────────────────────────
  if (pathname === '/api/avatar' && req.method === 'POST') {
    const body = await readBody(req);
    if (body.avatar !== undefined) p.avatar   = String(body.avatar||'').slice(0, 8);
    if (body.bg     !== undefined) p.avatarBg = String(body.bg||'').slice(0, 20);
    if (body.photo  !== undefined) {
      if (body.photo === null)     delete p.photo;
      else if (body.photo.length < 250000) p.photo = body.photo;
      else return send(res, 400, { error: 'Фото слишком большое' });
    }
    saveState();
    return send(res, 200, { ok:true });
  }

  // ── Альянсы ──────────────────────────────────────────────────────
  if (pathname === '/api/alliance' && req.method === 'GET') {
    if (!p.allianceId || !STATE.alliances) return send(res, 200, { alliance: null });
    const a = STATE.alliances[p.allianceId];
    if (!a) return send(res, 200, { alliance: null });
    const members = a.members.map(u => {
      const mp = STATE.players[u];
      return { username: u, kingdom: mp?.kingdom, race: mp?.race, rating: mp ? G.calcRating(mp) : 0, isLeader: u === a.leader, allianceId: u };
    });
    const invites = a.invites.map(u => ({ username: u, kingdom: STATE.players[u]?.kingdom }));
    return send(res, 200, { alliance: { ...a, members, invites } });
  }

  if (pathname === '/api/alliances' && req.method === 'GET') {
    if (!STATE.alliances) return send(res, 200, { alliances: [] });
    const list = Object.values(STATE.alliances).map(a => ({
      id: a.id, name: a.name, tag: a.tag, leader: a.leader,
      memberCount: a.members.length, created: a.created,
    })).sort((a, b) => b.memberCount - a.memberCount);
    return send(res, 200, { alliances: list });
  }

  if (pathname === '/api/alliance/create' && req.method === 'POST') {
    const body = await readBody(req);
    if (!STATE.alliances) STATE.alliances = {};
    const result = G.cmdAllianceCreate(STATE, p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState(); return send(res, 200, result);
  }

  if (pathname === '/api/alliance/invite' && req.method === 'POST') {
    const body = await readBody(req);
    const result = G.cmdAllianceInvite(STATE, p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState(); return send(res, 200, result);
  }

  if (pathname === '/api/alliance/join' && req.method === 'POST') {
    const body = await readBody(req);
    const result = G.cmdAllianceJoin(STATE, p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState(); return send(res, 200, result);
  }

  if (pathname === '/api/alliance/leave' && req.method === 'POST') {
    const result = G.cmdAllianceLeave(STATE, p);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState(); return send(res, 200, result);
  }

  if (pathname === '/api/alliance/kick' && req.method === 'POST') {
    const body = await readBody(req);
    const result = G.cmdAllianceKick(STATE, p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState(); return send(res, 200, result);
  }

  if (pathname === '/api/alliance/transfer' && req.method === 'POST') {
    const body = await readBody(req);
    const result = G.cmdAllianceTransfer(STATE, p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState(); return send(res, 200, result);
  }

  // ── Переименование генерала ──────────────────────────────────────
  if (pathname === '/api/rename-general' && req.method === 'POST') {
    const { uid, name } = await readBody(req);
    const result = G.cmdRenameGeneral(p, { uid, name });
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Воскрешение генерала ─────────────────────────────────────────
  if (pathname === '/api/resurrect' && req.method === 'POST') {
    const { idx } = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdResurrectGeneral(p, { idx: idx ?? 0 });
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  if (pathname === '/api/trade' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdSendResources(STATE, p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState(); return send(res, 200, result);
  }

  // ── Разведка ─────────────────────────────────────────────────────
  if (pathname === '/api/scout' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdScout(p, STATE.world, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Подкрепления ─────────────────────────────────────────────────
  if (pathname === '/api/reinforce' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdReinforce(p, STATE.world, STATE, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Экспедиция ───────────────────────────────────────────────────
  if (pathname === '/api/expedition/start' && req.method === 'POST') {
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdStartExpedition(p);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Артефакты ────────────────────────────────────────────────────
  if (pathname === '/api/artifact/activate' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdActivateArtifact(p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  if (pathname === '/api/artifact/deactivate' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdDeactivateArtifact(p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  if (pathname === '/api/artifact/craft-super' && req.method === 'POST') {
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdCraftSuperArtifact(p);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Рейтинг ──────────────────────────────────────────────────────
  if (pathname === '/api/rating' && req.method === 'GET') {
    const top = Object.values(STATE.players)
      .map(pl => ({
        username:  pl.username,
        kingdom:   pl.kingdom,
        race:      pl.race,
        rating:    G.calcRating(pl),
        armySize:  Object.values(pl.army||{}).reduce((a,b)=>a+(+b||0), 0),
        castleLvl: (pl.castle||[]).find(c=>c.bldId==='castle')?.level || 1,
        avatar:    pl.avatar || null,
        avatarBg:  pl.avatarBg || null,
      }))
      .sort((a,b) => b.rating - a.rating)
      .slice(0, 50);
    return send(res, 200, { top });
  }

  // ── История чата ─────────────────────────────────────────────────
  if (pathname === '/api/chat' && req.method === 'GET') {
    return send(res, 200, { messages: STATE.chat.slice(-100) });
  }

  // ── Админ-команды ────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin/') && req.method === 'POST') {
    if (!ADMINS.has(p.username)) return send(res, 403, { error: 'Нет прав администратора' });
    const action = pathname.slice('/api/admin/'.length);
    const body = await readBody(req);
    let result;
    if      (action === 'fill')          result = G.cmdAdminFill(p);
    else if (action === 'complete')      { result = G.cmdAdminComplete(p); G.tickPlayer(p, STATE.world, STATE.players, STATE); }
    else if (action === 'max-buildings') result = G.cmdAdminMaxBuildings(p);
    else if (action === 'full-setup')    { result = G.cmdAdminFullSetup(p); G.tickPlayer(p, STATE.world, STATE.players, STATE); }
    else if (action === 'give-units')    result = G.cmdAdminGiveUnits(p, body);
    else return send(res, 404, { error: 'Unknown admin action' });
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Шпионаж ──────────────────────────────────────────────────────
  if (pathname === '/api/spy' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdSpy(p, STATE.world, STATE.players, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Рынок ────────────────────────────────────────────────────────
  if (pathname === '/api/market/order' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdCreateOrder(p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  if (pathname === '/api/market/fill' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdFillOrder(p, STATE.players, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  if (pathname === '/api/market/cancel' && req.method === 'POST') {
    const body = await readBody(req);
    const result = G.cmdCancelOrder(p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  if (pathname === '/api/market/orders' && req.method === 'GET') {
    const allOrders = [];
    for (const [username, pl] of Object.entries(STATE.players)) {
      for (const order of (pl.marketOrders || [])) {
        allOrders.push({ ...order, seller: username, sellerKingdom: pl.kingdom });
      }
    }
    return send(res, 200, { orders: allOrders });
  }

  // ── Квесты ───────────────────────────────────────────────────────
  if (pathname === '/api/quest/claim' && req.method === 'POST') {
    const body = await readBody(req);
    const result = G.cmdClaimQuest(p, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Войны альянсов ────────────────────────────────────────────────
  if (pathname === '/api/alliance/declare-war' && req.method === 'POST') {
    const body = await readBody(req);
    const result = G.cmdDeclareWar(p, STATE, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  if (pathname === '/api/alliance/peace' && req.method === 'POST') {
    const body = await readBody(req);
    const result = G.cmdPeace(p, STATE, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Обозы ────────────────────────────────────────────────────────
  if (pathname === '/api/caravan/raid' && req.method === 'POST') {
    const body = await readBody(req);
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    const result = G.cmdRaidCaravan(p, STATE.world, STATE.players, body);
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  return send(res, 404, { error: 'Not found' });
}

// ── HTTP СЕРВЕР ─────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  try { await router(req, res); }
  catch (e) { console.error('[http]', e.message); send(res, 500, { error: e.message }); }
});

// ── WEBSOCKET АПГРЕЙД ───────────────────────────────────────────────
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + require('crypto').createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64'),
    '', ''
  ].join('\r\n'));

  const client = new WS.WSClient(socket);
  let username = null;

  // Авторизуем по cookie
  const sid = (req.headers.cookie||'').match(/sid=([a-f0-9]+)/)?.[1];
  if (sid && STATE.sessions[sid]) {
    username = STATE.sessions[sid];
    wsClients.set(username, client);
  }

  client.onMessage = raw => {
    try {
      const m = JSON.parse(raw);
      if (m.type === 'ping') {
        client.send(JSON.stringify({ type:'pong' }));
      } else if (m.type === 'chat' && username) {
        const text = String(m.text||'').trim().slice(0, 200);
        if (!text) return;
        const pl = STATE.players[username];
        const msg = { t:Date.now(), username, race:pl?.race, kingdom:pl?.kingdom, text };
        STATE.chat.push(msg);
        if (STATE.chat.length > 200) STATE.chat.shift();
        broadcast({ type:'chat', msg });
        saveState();
      }
    } catch {}
  };

  client.onClose = () => {
    if (username) wsClients.delete(username);
  };
});

// ── ИГРОВОЙ ЦИК ────────────────────────────────────────────────────
setInterval(() => {
  for (const username of Object.keys(STATE.players)) {
    const p = STATE.players[username];
    const repBefore = p.reports.length;
    G.tickPlayer(p, STATE.world, STATE.players, STATE);
    if (wsClients.has(username)) {
      push(username, { type:'state', player: serializePlayer(p) });
      if (p.reports.length > repBefore) {
        push(username, { type:'reports', items: p.reports.slice(repBefore) });
      }
    }
  }
}, 1000);

setInterval(() => saveState(), 15000);

// ── БАНДИТЫ: возрождение и атаки на игроков ──────────────────────────
setInterval(() => {
  G.respawnBandits(STATE.world);
  G.tickBandits(STATE.world, STATE.players);
  saveState();
}, 5 * 60 * 1000);

// ── ОБОЗЫ: появление каждые 30 минут ────────────────────────────────
setInterval(() => {
  G.spawnCaravan(STATE.world);
  saveState();
}, 30 * 60 * 1000);
// Первый спавн при старте
setTimeout(() => { G.spawnCaravan(STATE.world); saveState(); }, 5000);

// ── ЗАПУСК ───────────────────────────────────────────────────────────
loadState();
if (ADMINS.size) console.log(`[admin] Администраторы: ${[...ADMINS].join(', ')}`);
else console.log('[admin] admins.txt не найден — без администраторов');

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips  = Object.values(nets).flat().filter(n=>n.family==='IPv4'&&!n.internal).map(n=>n.address);

  console.log(`[server] Сервер запущен на порту ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\nСохраняю и выхожу...');
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(STATE)); } catch {}
  process.exit(0);
});
