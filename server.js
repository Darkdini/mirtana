'use strict';
// server.js — СРЕДНЕВЕКОВЬЕ. HTTP + WebSocket + игровой цикл.

const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const os     = require('os');
const WS     = require('./ws');
const G      = require('./game');

const PORT       = parseInt(process.env.PORT || '7777', 10);
const STATE_FILE = process.env.STATE_PATH || path.join(__dirname, 'state.json');
const PUBLIC     = path.join(__dirname, 'public');

// ── TELEGRAM BOT ─────────────────────────────────────────────────────
let BOT_CFG = { botToken:'', botUsername:'', webhookUrl:'' };
try {
  const cfgPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(cfgPath)) BOT_CFG = { ...BOT_CFG, ...JSON.parse(fs.readFileSync(cfgPath, 'utf8')) };
} catch {}

// Пакеты пополнения: [stars, gold, label]
const GOLD_PACKS = [
  { stars:30,  gold:90,   label:'30 ⭐ → 90 🪙'   },
  { stars:100, gold:300,  label:'100 ⭐ → 300 🪙'  },
  { stars:300, gold:900,  label:'300 ⭐ → 900 🪙'  },
  { stars:1000,gold:3000, label:'1000 ⭐ → 3000 🪙' },
];

function tgApi(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_CFG.botToken}/${method}`,
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

async function setTgWebhook(url) {
  if (!BOT_CFG.botToken || !url) return;
  const r = await tgApi('setWebhook', { url: url + '/tg-webhook', allowed_updates: ['message','pre_checkout_query','successful_payment'] });
  console.log('[tg] Webhook:', r.ok ? 'OK → ' + url : r.description);
  // Получаем username бота
  const me = await tgApi('getMe', {});
  if (me.ok) { BOT_CFG.botUsername = me.result.username; console.log('[tg] Bot: @' + me.result.username); }
}

if (BOT_CFG.botToken) {
  // Получаем username бота при каждом запуске
  tgApi('getMe', {}).then(me => {
    if (me.ok) {
      BOT_CFG.botUsername = me.result.username;
      console.log('[tg] Bot: @' + me.result.username);
    }
  }).catch(() => {});
  if (BOT_CFG.webhookUrl) {
    setTgWebhook(BOT_CFG.webhookUrl).catch(console.error);
  }
}

async function handleTgUpdate(upd) {
  if (!STATE.tgLinks) STATE.tgLinks = {};

  // /start payload — payload формат: USERNAME или USERNAME_STARS
  if (upd.message?.text?.startsWith('/start')) {
    const chatId = upd.message.chat.id;
    const args = upd.message.text.split(' ').slice(1).join('').trim();

    // Парсим формат USERNAME_STARS (прямо из игры с конкретным пакетом)
    const match = args.match(/^(.+)_(\d+)$/);
    const username = match ? match[1] : args;
    const directStars = match ? parseInt(match[2]) : null;

    if (username && STATE.players[username]) {
      STATE.tgLinks[chatId] = username;
      saveState();

      if (directStars) {
        // Сразу шлём инвойс на нужный пакет
        const pack = GOLD_PACKS.find(p => p.stars === directStars);
        if (pack) {
          await tgApi('sendMessage', { chat_id: chatId, text: `✅ Аккаунт *${username}* привязан! Отправляю счёт...`, parse_mode:'Markdown' });
          await tgApi('sendInvoice', {
            chat_id: chatId,
            title: `${pack.gold} 🪙 Золото`,
            description: `Пополнение золота в Средневековье для игрока ${username}`,
            payload: JSON.stringify({ username, gold: pack.gold, stars: pack.stars }),
            currency: 'XTR',
            prices: [{ label: `${pack.gold} золота`, amount: pack.stars }]
          });
          return;
        }
      }

      // Показываем меню пакетов
      const kb = GOLD_PACKS.map(p => ([{ text: p.label, callback_data: 'buy_' + p.stars }]));
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `✅ Аккаунт *${username}* привязан!\n\nВыбери пакет пополнения:\n_(1 ⭐ ≈ 1 руб = 3 🪙)_`,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: kb }
      });
    } else {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: username ? `❌ Игрок *${username}* не найден. Проверь ник в игре.` : `👋 Нажми кнопку пополнения в игре (Казна) чтобы начать.`,
        parse_mode: 'Markdown'
      });
    }
  }

  // Нажатие на кнопку пакета
  if (upd.callback_query) {
    const chatId = upd.callback_query.message.chat.id;
    const data = upd.callback_query.data;
    await tgApi('answerCallbackQuery', { callback_query_id: upd.callback_query.id });
    if (data.startsWith('buy_')) {
      const stars = parseInt(data.replace('buy_', ''));
      const pack = GOLD_PACKS.find(p => p.stars === stars);
      if (!pack) return;
      const username = STATE.tgLinks[chatId];
      if (!username) {
        await tgApi('sendMessage', { chat_id: chatId, text: '❌ Сначала привяжи аккаунт: /start ТвойНик' });
        return;
      }
      await tgApi('sendInvoice', {
        chat_id: chatId,
        title: `${pack.gold} 🪙 Золото`,
        description: `Пополнение золота в игре Средневековье для игрока ${username}`,
        payload: JSON.stringify({ username, gold: pack.gold, stars: pack.stars }),
        currency: 'XTR',
        prices: [{ label: `${pack.gold} золота`, amount: pack.stars }]
      });
    }
  }

  // Подтверждение платежа
  if (upd.pre_checkout_query) {
    await tgApi('answerPreCheckoutQuery', {
      pre_checkout_query_id: upd.pre_checkout_query.id,
      ok: true
    });
  }

  // Успешная оплата — начисляем золото
  if (upd.message?.successful_payment) {
    const chatId = upd.message.chat.id;
    const pay = upd.message.successful_payment;
    try {
      const payload = JSON.parse(pay.invoice_payload);
      const p = STATE.players[payload.username];
      if (p) {
        p.res.gold = Math.min(p.resMax?.gold || 99999, (p.res.gold || 0) + payload.gold);
        saveState();
        push(payload.username, { type: 'state', player: serializePlayer(p) });
        await tgApi('sendMessage', {
          chat_id: chatId,
          text: `✅ Зачислено *${payload.gold} 🪙 золота* игроку *${payload.username}*!\n\nХорошей игры! ⚔`,
          parse_mode: 'Markdown'
        });
        console.log(`[tg] Пополнение: ${payload.username} +${payload.gold} gold`);
      }
    } catch (e) { console.error('[tg] payment error:', e.message); }
  }
}

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
let STATE = { players:{}, world:null, sessions:{}, chat:[], alliances:{}, allianceWars:{}, tgLinks:{} };

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.copyFileSync(STATE_FILE, STATE_FILE + '.backup');
      console.log('[load] Резервная копия сохранена → state.json.backup');
    }
    STATE = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!STATE.world || STATE.world.length !== G.WORLD_COLS * G.WORLD_ROWS) {
      console.log('[load] Размер мира изменился — пересоздаём карту');
      STATE.world = G.createWorldGrid(); G.initProvince(STATE.world); G.initRelics(STATE.world);
      for (const [uname, p] of Object.entries(STATE.players||{})) {
        p.worldPos = G.placePlayerOnWorld(STATE.world, uname, p.race||'human');
      }
    }
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
    reputation:      p.reputation || 0,
    avatar:          p.avatar   || null,
    avatarBg:        p.avatarBg || null,
    photo:           p.photo    || null,
    rulerName:       p.rulerName || p.username,
    isAdmin:         ADMINS.has(p.username),
    isModerator:     p.isModerator  || false,
    banned:          p.banned       || false,
    chatBanned:      p.chatBanned   || false,
    loyalty:         p.loyalty       ?? 100,
    oases:           p.oases         || [],
    protectedUntil:  p.protectedUntil || 0,
    deadGenerals:    p.deadGenerals   || [],
    generals:        p.generals       || {},
    generalNames:    p.generalNames   || {},
    commanderUid:    p.commanderUid   || null,
    armies:          p.armies         || [],
    mailUnread:      (p.mail||[]).filter(m=>!m.read).length,
    artifacts:       p.artifacts      || [],
    activeArtifacts: p.activeArtifacts || [],
    expedition:      p.expedition     || null,
    relics:          p.relics         || [],
    spyCooldown:     p.spyCooldown    || 0,
    marketOrders:    p.marketOrders   || [],
    quests:          p.quests         || {},
    diplomacy:       p.diplomacy      || {},
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

// ── КАПЧА ────────────────────────────────────────────────────────────
const loginFailures = new Map(); // ip -> { count, resetAt }
const captchaStore  = new Map(); // id  -> { answer, expires }

function trackLoginFail(ip) {
  const now = Date.now();
  let e = loginFailures.get(ip) || { count:0, resetAt: now + 15*60*1000 };
  if (now > e.resetAt) e = { count:0, resetAt: now + 15*60*1000 };
  e.count++;
  loginFailures.set(ip, e);
  return e.count;
}
function resetLoginFail(ip) { loginFailures.delete(ip); }
function getLoginFails(ip) {
  const e = loginFailures.get(ip);
  if (!e || Date.now() > e.resetAt) return 0;
  return e.count;
}
setInterval(() => {
  const now = Date.now();
  for (const [k,v] of loginFailures) if (now > v.resetAt) loginFailures.delete(k);
  for (const [k,v] of captchaStore)  if (now > v.expires)  captchaStore.delete(k);
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

  // ── Telegram Webhook ─────────────────────────────────────────────
  if (pathname === '/tg-webhook' && req.method === 'POST') {
    const upd = await readBody(req).catch(() => null);
    if (upd) handleTgUpdate(upd).catch(console.error);
    return send(res, 200, { ok: true });
  }

  // ── Установка Webhook (только для админа) ────────────────────────
  if (pathname === '/api/admin/set-webhook' && req.method === 'POST') {
    const p = getPlayer(req);
    if (!p || !ADMINS.has(p.username)) return send(res, 403, { error: 'Нет доступа' });
    const { url } = await readBody(req);
    if (!url) return send(res, 400, { error: 'Укажи url' });
    BOT_CFG.webhookUrl = url;
    await setTgWebhook(url);
    return send(res, 200, { ok: true, botUsername: BOT_CFG.botUsername });
  }

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
  if (pathname === '/api/bot-info' && req.method === 'GET') {
    if (!BOT_CFG.botUsername && BOT_CFG.botToken) {
      try {
        const me = await tgApi('getMe', {});
        if (me.ok) BOT_CFG.botUsername = me.result.username;
      } catch {}
    }
    return send(res, 200, { botUsername: BOT_CFG.botUsername || '' });
  }

  if (pathname === '/api/register' && req.method === 'POST') {
    if (checkRateLimit(req.socket.remoteAddress, 5)) return send(res, 429, { error: 'Слишком много попыток. Подождите минуту.' });
    const { username, password, race, kingdom, rulerName } = await readBody(req);
    if (!username || username.length < 3)  return send(res, 400, { error: 'Логин минимум 3 символа' });
    if (!password || password.length < 4)  return send(res, 400, { error: 'Пароль минимум 4 символа' });
    if (!G.RACES[race])                    return send(res, 400, { error: 'Неверная раса' });
    if (!kingdom || kingdom.length < 2)    return send(res, 400, { error: 'Название королевства минимум 2 символа' });
    if (!rulerName || rulerName.length < 2) return send(res, 400, { error: 'Имя правителя минимум 2 символа' });
    const rulerTaken = Object.values(STATE.players).some(p => (p.rulerName||p.username).toLowerCase() === rulerName.toLowerCase());
    if (rulerTaken) return send(res, 400, { error: 'Имя правителя уже занято' });
    if (STATE.players[username])           return send(res, 400, { error: 'Имя занято' });
    const player = G.createPlayer(race, kingdom);
    player.username = username;
    player.rulerName = rulerName;
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

  // ── Капча ────────────────────────────────────────────────────────
  if (pathname === '/api/captcha' && req.method === 'GET') {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const id = crypto.randomBytes(8).toString('hex');
    captchaStore.set(id, { answer: a + b, expires: Date.now() + 5 * 60 * 1000 });
    return send(res, 200, { id, question: `${a} + ${b}` });
  }

  // ── Логин ────────────────────────────────────────────────────────
  if (pathname === '/api/login' && req.method === 'POST') {
    if (checkRateLimit(req.socket.remoteAddress)) return send(res, 429, { error: 'Слишком много попыток. Подождите минуту.' });
    const ip = req.socket.remoteAddress;
    const body = await readBody(req);
    const { username, password, captchaId, captchaAnswer } = body;
    const fails = getLoginFails(ip);

    if (fails >= 3) {
      const cap = captchaId && captchaStore.get(captchaId);
      if (!cap || Date.now() > cap.expires || parseInt(captchaAnswer) !== cap.answer) {
        if (captchaId) captchaStore.delete(captchaId);
        return send(res, 401, { error: cap ? '❌ Неверный ответ капчи' : '🔒 Требуется капча', captchaRequired: true });
      }
      captchaStore.delete(captchaId);
    }

    const player = STATE.players[username];
    if (!player || player.passwordHash !== hashPw(password, player.passwordSalt)) {
      const count = trackLoginFail(ip);
      return send(res, 401, { error: 'Неверный логин или пароль', captchaRequired: count >= 3 });
    }
    if (player.banned) return send(res, 403, { error: '⛔ Ваш аккаунт заблокирован администратором.' });
    resetLoginFail(ip);
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
        worldPlayers[c.player] = { allianceId: pp.allianceId || null, allianceTag: pa?.tag || null, protectedUntil: pp.protectedUntil || 0, rulerName: pp.rulerName || pp.username };
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
    p.res.gold -= cost; p.reputation = (p.reputation||0) + Math.floor(cost/10);
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
      const mRating = mp ? G.calcRating(mp) : 0;
      const mRep = mp?.reputation || 0;
      return { username: u, kingdom: mp?.kingdom, race: mp?.race, rating: mRating, reputation: mRep, power: mRating + mRep, isLeader: u === a.leader };
    });
    const alliancePower = members.reduce((s, m) => s + m.power, 0);
    const invites = a.invites.map(u => ({ username: u, kingdom: STATE.players[u]?.kingdom }));
    return send(res, 200, { alliance: { ...a, members, invites, alliancePower } });
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

  // ── Публичный профиль игрока ─────────────────────────────────────
  if (pathname.startsWith('/api/player/') && req.method === 'GET') {
    const name = decodeURIComponent(pathname.slice('/api/player/'.length));
    const tp = STATE.players[name];
    if (!tp) return send(res, 404, { error: 'Игрок не найден' });
    const pa = tp.allianceId && STATE.alliances?.[tp.allianceId];
    const castleCell = (tp.castle || []).find(c => c.bldId === 'castle');
    const power = Object.entries(tp.army || {}).reduce((s,[uid,n])=>{
      const u = G.UNITS[uid]; return s + n*(u?(u.atk+u.def):10);
    },0);
    return send(res, 200, {
      username:    tp.username,
      rulerName:   tp.rulerName || tp.username,
      kingdom:     tp.kingdom || tp.username,
      race:        tp.race,
      avatar:      tp.avatar || null,
      avatarBg:    tp.avatarBg || null,
      photo:       tp.photo || null,
      allianceTag: pa?.tag || null,
      allianceName:pa?.name || null,
      castleLevel: castleCell?.level || 1,
      rating:      G.calcRating(tp),
      reputation:  tp.reputation || 0,
      power:       power,
      armySize:    Object.values(tp.army||{}).reduce((a,b)=>a+(+b||0), 0),
      worldPos:    tp.worldPos || null,
      isModerator: tp.isModerator || false,
      chatBanned:  tp.chatBanned  || false,
    });
  }

  // ── Письма ───────────────────────────────────────────────────────
  if (pathname === '/api/mail' && req.method === 'GET') {
    if (!p.mail) p.mail = [];
    return send(res, 200, { mail: p.mail });
  }
  if (pathname === '/api/mail/send' && req.method === 'POST') {
    const { to, text } = await readBody(req);
    if (!to || !text) return send(res, 400, { error: 'Укажи получателя и текст' });
    const target = STATE.players[to];
    if (!target) return send(res, 404, { error: 'Игрок не найден' });
    if (to === p.username) return send(res, 400, { error: 'Нельзя писать самому себе' });
    const msg = { from: p.username, text: String(text).slice(0, 500), time: Date.now(), read: false };
    if (!target.mail) target.mail = [];
    target.mail.push(msg);
    if (target.mail.length > 100) target.mail = target.mail.slice(-100);
    const sent = { to, text: String(text).slice(0, 500), time: msg.time };
    if (!p.sentMail) p.sentMail = [];
    p.sentMail.push(sent);
    if (p.sentMail.length > 200) p.sentMail = p.sentMail.slice(-200);
    saveState();
    push(to, { type: 'state', player: serializePlayer(target) });
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/mail/sent' && req.method === 'GET') {
    return send(res, 200, { sentMail: p.sentMail || [] });
  }
  if (pathname === '/api/mail/thread' && req.method === 'GET') {
    const partner = u.searchParams.get('with');
    if (!partner) return send(res, 400, { error: 'Укажи собеседника' });
    const inbox = (p.mail || []).filter(m => m.from === partner).map(m => ({...m, dir: 'in'}));
    const sentArr = (p.sentMail || []).filter(m => m.to === partner).map(m => ({...m, dir: 'out'}));
    const thread = [...inbox, ...sentArr].sort((a, b) => a.time - b.time);
    if (p.mail) p.mail.forEach(m => { if (m.from === partner) m.read = true; });
    saveState();
    return send(res, 200, { thread });
  }
  if (pathname === '/api/mail/read' && req.method === 'POST') {
    if (!p.mail) p.mail = [];
    p.mail.forEach(m => m.read = true);
    saveState();
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/reports/read' && req.method === 'POST') {
    if (!p.reports) p.reports = [];
    p.reports.forEach(r => r.read = true);
    saveState();
    return send(res, 200, { ok: true });
  }
  if (pathname === '/api/mail/delete' && req.method === 'POST') {
    const { idx } = await readBody(req);
    if (!p.mail) p.mail = [];
    if (idx >= 0 && idx < p.mail.length) p.mail.splice(idx, 1);
    saveState();
    return send(res, 200, { ok: true });
  }

  // ── Дипломатия ──────────────────────────────────────────────────
  if (pathname === '/api/diplomacy' && req.method === 'GET') {
    return send(res, 200, { diplomacy: p.diplomacy || {} });
  }

  if (pathname === '/api/diplomacy/propose' && req.method === 'POST') {
    const { target, action } = await readBody(req);
    if (!target || !action) return send(res, 400, { error: 'Укажи цель и действие' });
    const tp = STATE.players[target];
    if (!tp) return send(res, 404, { error: 'Игрок не найден' });
    if (target === p.username) return send(res, 400, { error: 'Нельзя' });
    if (!p.diplomacy) p.diplomacy = {};
    if (!tp.diplomacy) tp.diplomacy = {};

    if (action === 'war') {
      p.diplomacy[target] = 'war';
      tp.diplomacy[p.username] = 'war';
      if (!tp.mail) tp.mail = [];
      tp.mail.push({ from: 'Система', text: `⚔ ${p.username} объявил вам войну!`, time: Date.now(), read: false });
      push(target, { type: 'state', player: serializePlayer(tp) });
    } else if (action === 'ally') {
      if (tp.diplomacy[p.username] === 'ally_request') {
        p.diplomacy[target] = 'ally';
        tp.diplomacy[p.username] = 'ally';
        if (!tp.mail) tp.mail = [];
        tp.mail.push({ from: 'Система', text: `🤝 ${p.username} принял ваш союз!`, time: Date.now(), read: false });
        push(target, { type: 'state', player: serializePlayer(tp) });
      } else {
        p.diplomacy[target] = 'ally_request';
        tp.diplomacy[p.username] = 'ally_request';
        if (!tp.mail) tp.mail = [];
        tp.mail.push({ from: 'Система', text: `🤝 ${p.username} предлагает союз. Открой его профиль чтобы ответить.`, time: Date.now(), read: false });
        push(target, { type: 'state', player: serializePlayer(tp) });
      }
    } else if (action === 'peace') {
      p.diplomacy[target] = 'neutral';
      tp.diplomacy[p.username] = 'neutral';
      if (!tp.mail) tp.mail = [];
      tp.mail.push({ from: 'Система', text: `☮ ${p.username} предлагает мир.`, time: Date.now(), read: false });
      push(target, { type: 'state', player: serializePlayer(tp) });
    }

    saveState();
    return send(res, 200, { ok: true, diplomacy: p.diplomacy });
  }

  // ── Смена пароля ────────────────────────────────────────────────
  if (pathname === '/api/notes' && req.method === 'GET') {
    return send(res, 200, { notes: p.notes || '' });
  }
  if (pathname === '/api/notes' && req.method === 'POST') {
    const { notes } = await readBody(req);
    p.notes = String(notes || '').slice(0, 2000);
    saveState();
    return send(res, 200, { ok: true });
  }

  if (pathname === '/api/change-password' && req.method === 'POST') {
    const { oldPassword, newPassword } = await readBody(req);
    if (!oldPassword || !newPassword) return send(res, 400, { error: 'Заполни все поля' });
    if (newPassword.length < 4) return send(res, 400, { error: 'Пароль минимум 4 символа' });
    if (hashPw(oldPassword, p.passwordSalt) !== p.passwordHash)
      return send(res, 403, { error: 'Неверный текущий пароль' });
    const salt = newSalt();
    p.passwordSalt = salt;
    p.passwordHash = hashPw(newPassword, salt);
    saveState();
    return send(res, 200, { ok: true });
  }

  // ── Смена ника ──────────────────────────────────────────────────
  if (pathname === '/api/change-username' && req.method === 'POST') {
    const { newUsername, password } = await readBody(req);
    if (!newUsername || !password) return send(res, 400, { error: 'Заполни все поля' });
    const clean = newUsername.trim();
    if (clean.length < 2 || clean.length > 20) return send(res, 400, { error: 'Ник: 2–20 символов' });
    if (!/^[a-zA-Zа-яА-ЯёЁ0-9_\- ]+$/.test(clean)) return send(res, 400, { error: 'Недопустимые символы' });
    if (hashPw(password, p.passwordSalt) !== p.passwordHash)
      return send(res, 403, { error: 'Неверный пароль' });
    if ((p.res.gold || 0) < 200) return send(res, 400, { error: 'Нужно 200 🪙 золота' });
    if (STATE.players[clean] && clean !== p.username) return send(res, 400, { error: 'Ник уже занят' });
    const oldName = p.username;
    // перенос данных на новый ник
    p.username = clean;
    p.res.gold -= 200;
    STATE.players[clean] = p;
    delete STATE.players[oldName];
    // обновить сессию
    const sid = getCookie(req, 'sid');
    if (sid) STATE.sessions[sid] = clean;
    // обновить позицию на карте мира
    if (STATE.world) {
      STATE.world.forEach(c => { if (c.player === oldName) c.player = clean; });
    }
    saveState();
    return send(res, 200, { ok: true });
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

  // ── Назначение командующего (генерала в штаб) ────────────────────
  if (pathname === '/api/set-commander' && req.method === 'POST') {
    const { uid } = await readBody(req);
    if (uid && !uid.endsWith('_general')) return send(res, 400, { error: 'Не генерал' });
    if (uid && (!p.army[uid] || p.army[uid] < 1)) return send(res, 400, { error: 'Генерал не в армии' });
    p.commanderUid = uid || null;
    saveState();
    push(p.username, { type: 'state', player: serializePlayer(p) });
    return send(res, 200, { ok: true });
  }

  // ── Управление именованными армиями ──────────────────────────────
  if (pathname === '/api/armies' && req.method === 'POST') {
    const { action, id, name, units } = await readBody(req);
    if (!p.armies) p.armies = [];
    if (action === 'create') {
      const newId = Date.now().toString();
      const safeUnits = {};
      for (const uid in (units || {})) {
        const available = (p.army[uid] || 0);
        const inOtherArmies = p.armies.reduce((s, a) => s + (a.units[uid] || 0), 0);
        const free = available - inOtherArmies;
        const req2 = Math.min(units[uid] || 0, free);
        if (req2 > 0) safeUnits[uid] = req2;
      }
      if (Object.keys(safeUnits).length === 0) return send(res, 400, { error: 'Нет свободных войск' });
      p.armies.push({ id: newId, name: String(name || 'Армия').slice(0, 30), units: safeUnits });
    } else if (action === 'dissolve') {
      p.armies = p.armies.filter(a => a.id !== id);
    } else if (action === 'rename') {
      const arm = p.armies.find(a => a.id === id);
      if (arm) arm.name = String(name || 'Армия').slice(0, 30);
    } else {
      return send(res, 400, { error: 'Unknown action' });
    }
    saveState();
    push(p.username, { type: 'state', player: serializePlayer(p) });
    return send(res, 200, { ok: true, armies: p.armies });
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
    const allPlayers = Object.values(STATE.players);
    const top = allPlayers
      .map(pl => ({
        username:   pl.username,
        kingdom:    pl.kingdom,
        race:       pl.race,
        rating:     G.calcRating(pl),
        reputation: pl.reputation || 0,
        armySize:   Object.values(pl.army||{}).reduce((a,b)=>a+(+b||0), 0),
        castleLvl:  (pl.castle||[]).find(c=>c.bldId==='castle')?.level || 1,
        avatar:     pl.avatar || null,
        avatarBg:   pl.avatarBg || null,
        photo:      pl.photo   || null,
      }))
      .sort((a,b) => b.rating - a.rating)
      .slice(0, 50);
    return send(res, 200, { top, total: allPlayers.length });
  }

  // ── Онлайн-лидерборд ─────────────────────────────────────────────
  if (pathname === '/api/online-leaderboard' && req.method === 'GET') {
    const now = Date.now();
    const ym = currentYearMonth();
    const ranked = Object.values(STATE.players)
      .map(pl => {
        let time = pl.onlineTime || 0;
        if (pl.sessionStart && pl.onlineMonth === ym) time += Math.round((now - pl.sessionStart) / 1000);
        return { username: pl.username, rulerName: pl.rulerName || pl.username, race: pl.race, time };
      })
      .filter(x => x.time > 0)
      .sort((a, b) => b.time - a.time);
    return send(res, 200, { ranked, month: ym, myUsername: p?.username || null });
  }

  // ── Репутация-лидерборд ───────────────────────────────────────────
  if (pathname === '/api/rep-leaderboard' && req.method === 'GET') {
    const ym = currentYearMonth();
    const ranked = Object.values(STATE.players)
      .map(pl => {
        const start = (pl.repMonth === ym) ? (pl.repMonthStart || 0) : (pl.repMonthStart ?? pl.reputation ?? 0);
        const gain = Math.max(0, (pl.reputation || 0) - start);
        return { username: pl.username, rulerName: pl.rulerName || pl.username, race: pl.race, gain, total: pl.reputation || 0 };
      })
      .filter(x => x.gain > 0)
      .sort((a, b) => b.gain - a.gain);
    return send(res, 200, { ranked, month: ym, myUsername: p?.username || null });
  }

  // ── Развитие-лидерборд ────────────────────────────────────────────
  if (pathname === '/api/dev-leaderboard' && req.method === 'GET') {
    const ym = currentYearMonth();
    const ranked = Object.values(STATE.players)
      .map(pl => {
        const cur = G.calcRating(pl);
        const start = (pl.ratingMonth === ym) ? (pl.ratingMonthStart ?? cur) : (pl.ratingMonthStart ?? cur);
        const gain = Math.max(0, cur - start);
        return { username: pl.username, rulerName: pl.rulerName || pl.username, race: pl.race, gain, total: cur };
      })
      .filter(x => x.gain > 0)
      .sort((a, b) => b.gain - a.gain);
    return send(res, 200, { ranked, month: ym, myUsername: p?.username || null });
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
    else if (action === 'give-gold') {
      const target = STATE.players[body.username];
      if (!target) return send(res, 404, { error: 'Игрок не найден' });
      const amount = Math.max(1, parseInt(body.amount) || 0);
      target.res.gold = Math.min(target.resMax?.gold || 99999, (target.res.gold || 0) + amount);
      if (!target.mail) target.mail = [];
      target.mail.push({ from: 'Администрация', text: `🪙 Вам пополнена казна на ${amount} монет. Ваш баланс: ${target.res.gold}🪙`, time: Date.now(), read: false });
      if (target.mail.length > 100) target.mail = target.mail.slice(-100);
      saveState();
      push(body.username, { type: 'state', player: serializePlayer(target) });
      return send(res, 200, { ok: true, gold: target.res.gold });
    }
    else if (action === 'give-resources') {
      const target = STATE.players[body.username];
      if (!target) return send(res, 404, { error: 'Игрок не найден' });
      const RES_NAMES = { wood:'🪵 Дерево', stone:'🪨 Камень', iron:'⚙ Железо', food:'🌾 Еда', people:'👥 Население' };
      const amount = Math.max(1, parseInt(body.amount) || 0);
      const resKey = body.resource;
      if (!RES_NAMES[resKey]) return send(res, 400, { error: 'Неверный ресурс' });
      target.res[resKey] = Math.min(target.resMax?.[resKey] || 99999, (target.res[resKey] || 0) + amount);
      if (!target.mail) target.mail = [];
      target.mail.push({ from: 'Администрация', text: `${RES_NAMES[resKey]} +${amount} зачислено в вашу казну.`, time: Date.now(), read: false });
      if (target.mail.length > 100) target.mail = target.mail.slice(-100);
      saveState();
      push(body.username, { type: 'state', player: serializePlayer(target) });
      return send(res, 200, { ok: true });
    }
    else if (action === 'ban') {
      const target = STATE.players[body.username];
      if (!target) return send(res, 404, { error: 'Игрок не найден' });
      if (ADMINS.has(body.username)) return send(res, 400, { error: 'Нельзя заблокировать администратора' });
      target.banned = !target.banned;
      if (target.banned) {
        const wsc = wsClients.get(body.username);
        if (wsc) { try { wsc.socket?.destroy(); } catch {} }
        wsClients.delete(body.username);
        for (const [sid, u] of Object.entries(STATE.sessions)) { if (u === body.username) delete STATE.sessions[sid]; }
      }
      if (!target.mail) target.mail = [];
      target.mail.push({ from: 'Администрация', text: target.banned ? '⛔ Ваш аккаунт заблокирован.' : '✅ Блокировка аккаунта снята.', time: Date.now(), read: false });
      saveState();
      return send(res, 200, { ok: true, banned: target.banned });
    }
    else if (action === 'set-moderator') {
      const target = STATE.players[body.username];
      if (!target) return send(res, 404, { error: 'Игрок не найден' });
      target.isModerator = !target.isModerator;
      if (!target.mail) target.mail = [];
      target.mail.push({ from: 'Администрация', text: target.isModerator ? '🛡 Вы назначены модератором форума.' : 'Полномочия модератора сняты.', time: Date.now(), read: false });
      saveState();
      push(body.username, { type: 'state', player: serializePlayer(target) });
      return send(res, 200, { ok: true, isModerator: target.isModerator });
    }
    else return send(res, 404, { error: 'Unknown admin action' });
    if (!result.ok) return send(res, 400, { error: result.error });
    saveState();
    return send(res, 200, result);
  }

  // ── Модератор: бан чата ───────────────────────────────────────────
  if (pathname === '/api/mod/chat-ban' && req.method === 'POST') {
    if (!p?.isModerator && !ADMINS.has(p?.username)) return send(res, 403, { error: 'Нет прав модератора' });
    const body = await readBody(req);
    const target = STATE.players[body.username];
    if (!target) return send(res, 404, { error: 'Игрок не найден' });
    if (ADMINS.has(body.username) || target.isModerator) return send(res, 400, { error: 'Нельзя забанить модератора или администратора' });
    target.chatBanned = !target.chatBanned;
    if (!target.mail) target.mail = [];
    target.mail.push({ from: 'Модерация', text: target.chatBanned ? '⛔ Вы заблокированы в чате за нарушение правил.' : '✅ Блокировка чата снята.', time: Date.now(), read: false });
    saveState();
    push(body.username, { type: 'state', player: serializePlayer(target) });
    return send(res, 200, { ok: true, chatBanned: target.chatBanned });
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

  if (pathname === '/api/reputation/gift' && req.method === 'POST') {
    const body = await readBody(req);
    const gold = Math.max(1, parseInt(body.gold) || 0);
    const target = (body.target || '').trim();
    if (gold < 1) return send(res, 400, { error: 'Укажи количество золота' });
    if ((p.res.gold || 0) < gold) return send(res, 400, { error: 'Недостаточно золота' });
    const rep = gold * 3;
    p.res.gold -= gold;
    if (!target || target === p.username) {
      p.reputation = (p.reputation || 0) + rep;
      G.addReport(p, `⭐ +${rep} репутации (потрачено ${gold}🪙)`, 'info');
    } else {
      const tp = STATE.players[target];
      if (!tp) return send(res, 404, { error: 'Игрок не найден' });
      tp.reputation = (tp.reputation || 0) + rep;
      G.addReport(p, `⭐ Подарено +${rep} реп. игроку ${target} за ${gold}🪙`, 'info');
      G.addReport(tp, `⭐ +${rep} репутации — подарок от ${p.username} (${gold}🪙)`, 'info');
    }
    saveState();
    return send(res, 200, { ok: true, rep, gold });
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
    const wp = STATE.players[username];
    if (wp) {
      const ym = currentYearMonth();
      if (wp.onlineMonth !== ym) { wp.onlineTime = 0; wp.onlineMonth = ym; }
      wp.sessionStart = Date.now();
    }
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
        if (pl?.chatBanned) return;
        const msg = { t:Date.now(), username, race:pl?.race, kingdom:pl?.kingdom, text };
        STATE.chat.push(msg);
        if (STATE.chat.length > 200) STATE.chat.shift();
        broadcast({ type:'chat', msg });
        saveState();
      }
    } catch {}
  };

  client.onClose = () => {
    if (username) {
      const wp = STATE.players[username];
      if (wp && wp.sessionStart) {
        wp.onlineTime = (wp.onlineTime || 0) + Math.round((Date.now() - wp.sessionStart) / 1000);
        delete wp.sessionStart;
      }
      wsClients.delete(username);
    }
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

// ── ЕЖЕМЕСЯЧНЫЙ РЕЙТИНГ ОНЛАЙН ──────────────────────────────────────
function currentYearMonth() { const d = new Date(); return d.getFullYear() * 100 + (d.getMonth() + 1); }

function giveMonthlyGold(p, gold, place, category, extra) {
  p.res.gold = Math.min(p.resMax?.gold || 99999, (p.res.gold || 0) + gold);
  if (!p.mail) p.mail = [];
  p.mail.push({ from: 'Администрация', text: `🏅 Поздравляем! По итогам месяца вы заняли ${place} место в рейтинге «${category}» (${extra}) и получаете ${gold}🪙!`, time: Date.now(), read: false });
  push(p.username, { type: 'state', player: serializePlayer(p) });
}

function checkMonthlyOnlineAward() {
  const ym = currentYearMonth();
  if (STATE.lastMonthlyAward === ym) return;

  // ── Онлайн топ-3: 300/200/100 ──
  const onlineRanked = Object.values(STATE.players)
    .filter(p => (p.onlineTime || 0) > 0)
    .sort((a, b) => (b.onlineTime || 0) - (a.onlineTime || 0));
  [300, 200, 100].forEach((gold, i) => {
    const p = onlineRanked[i];
    if (!p) return;
    const hours = Math.round((p.onlineTime || 0) / 360) / 10;
    giveMonthlyGold(p, gold, i + 1, 'Онлайн', `${hours}ч`);
  });

  // ── Репутация топ-3: 400/300/200 ──
  const repRanked = Object.values(STATE.players)
    .map(p => ({ p, gain: (p.reputation || 0) - (p.repMonthStart || 0) }))
    .filter(x => x.gain > 0)
    .sort((a, b) => b.gain - a.gain);
  [400, 300, 200].forEach((gold, i) => {
    const x = repRanked[i];
    if (!x) return;
    giveMonthlyGold(x.p, gold, i + 1, 'Репутация', `+${x.gain}⭐`);
  });

  // ── Развитие топ-3: 300/200/100 ──
  const devRanked = Object.values(STATE.players)
    .map(p => ({ p, gain: Math.max(0, G.calcRating(p) - (p.ratingMonthStart || 0)) }))
    .filter(x => x.gain > 0)
    .sort((a, b) => b.gain - a.gain);
  [300, 200, 100].forEach((gold, i) => {
    const x = devRanked[i];
    if (!x) return;
    giveMonthlyGold(x.p, gold, i + 1, 'Развитие', `+${x.gain} рейтинга`);
  });

  // ── Сброс счётчиков ──
  for (const p of Object.values(STATE.players)) {
    p.onlineTime = 0;
    p.onlineMonth = ym;
    if (p.sessionStart) p.sessionStart = Date.now();
    p.repMonthStart = p.reputation || 0;
    p.repMonth = ym;
    p.ratingMonthStart = G.calcRating(p);
    p.ratingMonth = ym;
  }
  STATE.lastMonthlyAward = ym;
  saveState();
  console.log(`[monthly] Награды за месяц ${ym}: онлайн ${Math.min(3, onlineRanked.length)}, реп ${Math.min(3, repRanked.length)}`);
}

setInterval(checkMonthlyOnlineAward, 60 * 60 * 1000);
setTimeout(checkMonthlyOnlineAward, 15000);

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
