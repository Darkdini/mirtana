# СРЕДНЕВЕКОВЬЕ — Война Королей

---

## Запуск на телефоне (Termux)

1. Установи **Termux** из [F-Droid](https://f-droid.org) (не из Play Store — там старая версия)
2. Открой Termux и выполни один раз:

```bash
pkg update -y && pkg upgrade -y && pkg install nodejs git -y
```

3. Скачай проект:

```bash
cd ~ && git clone https://github.com/Darkdini/mirtana.git && echo "✓ Готово!"
```

4. Запускай каждый раз:

```bash
cd ~/mirtana && git pull origin main && bash start.sh
```

Открой браузер: `http://localhost:7777`

---

## Хостинг в интернете (играют все)

Чтобы в игру могли заходить с любого устройства в мире — нужен VPS-сервер.

### Вариант 1 — Railway (бесплатно, проще всего)

1. Зарегистрируйся на [railway.app](https://railway.app)
2. Нажми **New Project → Deploy from GitHub repo**
3. Выбери репозиторий `Darkdini/mirtana`
4. Railway сам найдёт Node.js и запустит `node server.js`
5. Зайди в настройки проекта → **Variables** → добавь:
   ```
   PORT = 3000
   ```
6. Во вкладке **Settings → Networking** → нажми **Generate Domain**
7. Готово — игра доступна по ссылке вида `https://mirtana-xxx.up.railway.app`

> ⚠️ На бесплатном тарифе Railway даёт ~500 часов в месяц. Прогресс игры (`state.json`) **сбрасывается** при каждом деплое — для постоянного хранения нужен Volume (платно) или VPS.

---

### Вариант 2 — VPS (рекомендуется для постоянной игры)

Самый дешёвый VPS: **Hetzner** ~300 руб/мес, **DigitalOcean** ~400 руб/мес.

#### Установка на VPS (Ubuntu 22.04)

```bash
# Подключись по SSH
ssh root@ВАШ_IP

# Установи Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# Скачай проект
cd /opt && git clone https://github.com/Darkdini/mirtana.git
cd mirtana

# Запусти в фоне (не закрывается при выходе из SSH)
npm install -g pm2
pm2 start server.js --name medieval
pm2 save && pm2 startup

# Открой порт
ufw allow 7777
```

Игра доступна по адресу: `http://ВАШ_IP:7777`

#### Обновление на VPS

```bash
cd /opt/mirtana && git pull origin main && pm2 restart medieval
```

---

### Что видят игроки, а что нет

| Файл | Виден игрокам? |
|------|---------------|
| `public/index.html` | ✅ Да — это и есть игра в браузере |
| `server.js` | ❌ Нет — работает на сервере |
| `game.js` | ❌ Нет — работает на сервере |
| `state.json` | ❌ Нет — база данных на сервере |
| `admins.txt` | ❌ Нет — только на сервере |

Игровая логика, балансировка, пароли и прогресс игроков — **полностью скрыты**.

---

## Настройка администратора

1. Открой файл `admins.txt`
2. Добавь свой ник (один на строку), сохрани
3. Перезапусти сервер
4. Войди в игру → открой профиль 👑 → увидишь панель администратора

Встроенный аккаунт: логин `Admin`, пароль `@1234`

---

## Сброс прогресса

```bash
rm state.json
```

---

## Структура проекта

```
mirtana/
  server.js      — HTTP + WebSocket сервер
  game.js        — игровая логика (расы, здания, юниты, бой)
  ws.js          — WebSocket протокол
  start.sh       — скрипт запуска для Termux
  admins.txt     — список администраторов
  state.json     — сохранение игры (создаётся автоматически)
  public/
    index.html   — клиент игры (всё что видит браузер)
    build/       — картинки зданий
    units/       — картинки юнитов
    smallunits/  — миниатюры юнитов
    res/         — иконки ресурсов
    ground/      — текстуры карты
```

