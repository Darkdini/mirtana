# СРЕДНЕВЕКОВЬЕ — Браузерная стратегия

## Что это

**СРЕДНЕВЕКОВЬЕ** — многопользовательская браузерная стратегия в жанре «замок и армия».
Стройте здания, собирайте ресурсы, обучайте войска и атакуйте замки других игроков на гексагональной карте мира.
Игра работает целиком в браузере: бэкенд на FastAPI, фронтенд на чистом JS без сборщиков.

---

## Установка в Termux (Android)

### 1. Обновите пакеты и установите зависимости системы

```bash
pkg update && pkg upgrade -y
pkg install -y git python clang libffi openssl python-cryptography
```

> `clang` нужен для компиляции `bcrypt`, `python-cryptography` — готовая сборка криптобиблиотеки (без Rust).

### 2. Клонируйте репозиторий

```bash
git clone https://github.com/Darkdini/mirtana.git
cd mirtana
```

### 3. Установите Python-зависимости

```bash
pip install -r server/requirements.txt
```

Список библиотек:

| Библиотека | Назначение |
|---|---|
| `fastapi` | Веб-фреймворк для построения REST API и WebSocket эндпоинтов |
| `uvicorn[standard]` | ASGI-сервер — запускает FastAPI-приложение |
| `websockets` | Поддержка WebSocket (real-time обновления ресурсов и боёв) |
| `python-multipart` | Разбор form-data, загрузка файлов |
| `passlib[bcrypt]` | Хэширование паролей пользователей через bcrypt |
| `python-jose[cryptography]` | Генерация и проверка JWT-токенов авторизации |
| `aiosqlite` | Асинхронная работа с базой данных SQLite |

---

## Первый запуск

```bash
./start.sh
```

Или вручную:

```bash
cd server && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Откройте в браузере: **http://localhost:8000**

> На Android откройте браузер (Chrome/Firefox) и введите `http://127.0.0.1:8000`

---

## Обновление игры

```bash
git pull origin main
# Зависимости переустанавливать не нужно, если requirements.txt не изменился.
./start.sh
```

Если `requirements.txt` обновился (увидите это в выводе `git pull`):

```bash
pip install -r server/requirements.txt
./start.sh
```

---

## Если порт занят

Убить процесс uvicorn:

```bash
pkill -f uvicorn
```

Или найти PID вручную и убить:

```bash
lsof -i :8000
kill -9 <PID>
```

---

## Структура проекта

```
mirtana/
├── server/              # FastAPI бэкенд
│   ├── main.py          # Точка входа, создание приложения
│   ├── config.py        # Здания, юниты, игровые настройки
│   ├── database.py      # SQLite схема и инициализация БД
│   ├── game_logic.py    # Боевая система, добыча ресурсов
│   └── routers/         # API маршруты (auth, buildings, battles…)
├── client/              # Фронтенд (HTML/CSS/JS)
│   ├── index.html       # Заставка и форма авторизации/регистрации
│   ├── game.html        # Основной экран игры (три слоя карты)
│   ├── assets/
│   │   └── buildings/   # Графика зданий (PNG)
│   ├── css/             # Стили интерфейса
│   └── js/              # Логика игры (hex.js, layers.js, game.js…)
└── start.sh             # Скрипт быстрого запуска сервера
```

---

## Игровые расы и их бонусы

| Раса | Бонус |
|---|---|
| 🐉 Орки | +20% к атаке пехоты |
| ⚔️ Люди | +10% ко всем характеристикам |
| 🏹 Эльфы | +30% к эффективности дальнобойных юнитов |

---

## Требования

- **Python** 3.9 или новее
- **Свободное место** ~100 МБ
- **Браузер** любой современный (Chrome, Firefox, Safari, Brave)
- **Termux** (Android): пакеты `git` и `python` из `pkg`
