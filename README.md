# СРЕДНЕВЕКОВЬЕ — Война Королей

---

## Установка Termux (один раз)

1. Установи **Termux** из [F-Droid](https://f-droid.org) (не из Play Store — там старая версия)
2. Открой Termux и выполни:

```bash
pkg update -y && pkg upgrade -y && pkg install nodejs wget unzip -y && termux-setup-storage
```

3. Появится запрос разрешения на доступ к файлам — нажми **Разрешить**

---

## Скачать / обновить проект

Выполни в Termux одной командой:

```bash
cd ~ && rm -rf proekt sreda-main sreda-main.zip && wget -O sreda-main.zip https://github.com/darkdini/sreda/archive/refs/heads/main.zip && unzip sreda-main.zip && mv sreda-main proekt && rm sreda-main.zip && echo "✓ Готово!"
```

---

## Запустить сервер

```bash
cd ~/proekt && bash start.sh
```

После запуска в консоли появятся адреса для подключения.

- **На этом телефоне:** `http://localhost:7777`
- **Другие устройства (Wi-Fi):** адрес появится в консоли автоматически
- Останови сервер: **Ctrl+C**

---

## Настройка администратора

1. Открой файл `~/proekt/admins.txt`
2. Добавь свой ник (один на строку), сохрани
3. Перезапусти сервер
4. Войди в игру → открой профиль 👑 → увидишь панель администратора

---

## Откат на предыдущую версию

Если обновление сломало что-то — скачай конкретную версию по её коду (SHA):

```bash
# Замени SHA на нужный из таблицы ниже
SHA=0c422c5
cd ~ && rm -rf proekt sreda-${SHA}.zip && wget -O sreda-${SHA}.zip https://github.com/darkdini/sreda/archive/${SHA}.zip && unzip sreda-${SHA}.zip && mv sreda-${SHA:0:7}* proekt && rm sreda-${SHA}.zip && echo "✓ Откат выполнен!"
```

### Таблица версий

| Версия | SHA | Что изменилось |
|--------|-----|----------------|
| **v1** | `0c422c5` | Первая версия: базовая игра, технологии, система администратора |
| **v2** | `0d7c0ce` | Изометрическая графика, Орки, Альянсы, новые здания |

> Когда выходит новая стабильная версия — SHA добавляется сюда.

---

## Сброс прогресса игры

```bash
rm ~/proekt/state.json
```

---

## Структура проекта

```
proekt/
  server.js      — HTTP + WebSocket сервер
  game.js        — игровая логика (расы, здания, юниты, бой)
  ws.js          — WebSocket протокол
  start.sh       — скрипт запуска
  admins.txt     — список администраторов
  public/
    index.html   — клиент игры (браузер)
    build/       — картинки зданий
    units/       — картинки юнитов
    smallunits/  — миниатюры юнитов
    res/         — иконки ресурсов
    ground/      — текстуры карты
    border/      — элементы рамок UI
```
