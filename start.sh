#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

# ── Цвета ─────────────────────────────────────────────────
GOLD='\033[38;5;214m'
GOLD2='\033[38;5;220m'
G='\033[0;32m'
R='\033[0;31m'
C='\033[0;36m'
W='\033[1;37m'
D='\033[2;37m'
DIM='\033[38;5;240m'
NC='\033[0m'

clear

echo ""
echo -e "${GOLD}   ╔════════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}   ║${GOLD2}                                                ${GOLD}║${NC}"
echo -e "${GOLD}   ║${GOLD2}        ⚔   С Р Е Д Н Е В Е К О В Ь Е   ⚔    ${GOLD}║${NC}"
echo -e "${GOLD}   ║${GOLD2}             В О Й Н А   К О Р О Л Е Й         ${GOLD}║${NC}"
echo -e "${GOLD}   ║${GOLD2}                                                ${GOLD}║${NC}"
echo -e "${GOLD}   ╚════════════════════════════════════════════════╝${NC}"
echo ""

# ── Функция полоски загрузки ───────────────────────────────
bar() {
  local msg="$1"
  printf "   ${C}%-26s${NC} ${DIM}[${NC}" "$msg"
  for i in $(seq 1 20); do
    printf "${GOLD}▪${NC}"
    sleep 0.03
  done
  printf "${DIM}]${NC} ${G}✓${NC}\n"
}

# ── Функция спиннер (для git pull) ────────────────────────
spin() {
  local pid=$1 msg="$2"
  local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r   ${GOLD}${frames[$i]}${NC}  ${C}%s${NC}..." "$msg"
    i=$(( (i+1) % ${#frames[@]} ))
    sleep 0.1
  done
  printf "\r   ${G}✓${NC}  ${W}%s${NC}             \n" "$msg"
}

# ── Проверка Node.js ──────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "   ${R}✗ Node.js не найден!${NC}"
  echo -e "   Установи: ${GOLD}pkg install nodejs -y${NC}"
  echo ""
  exit 1
fi
NODE_VER=$(node --version)

# ── Git pull ──────────────────────────────────────────────
echo -e "   ${DIM}────────────────────────────────────────────────${NC}"
echo ""
if git remote -v &>/dev/null; then
  git pull origin main --quiet &>/tmp/git_pull_log &
  GPID=$!
  spin $GPID "Обновление из репозитория"
  wait $GPID
  STATUS=$?
  if [ $STATUS -ne 0 ]; then
    echo -e "   ${D}(нет сети — запуск текущей версии)${NC}"
  fi
else
  echo -e "   ${D}(git не найден — пропуск обновления)${NC}"
fi

# ── Анимация загрузки ─────────────────────────────────────
echo ""
bar "Инициализация сервера"
bar "Загрузка игрового мира"
bar "Подготовка армий"
bar "Открытие ворот замка"
echo ""

# ── Wakee lock ────────────────────────────────────────────
WAKE_OK=false
if command -v termux-wake-lock &>/dev/null; then
  termux-wake-lock 2>/dev/null && WAKE_OK=true
fi

# ── Порт ──────────────────────────────────────────────────
PORT=${PORT:-7777}

# ── Итоговый баннер ───────────────────────────────────────
echo -e "   ${DIM}────────────────────────────────────────────────${NC}"
echo ""
echo -e "   ${G}✓${NC}  Node.js ${D}${NODE_VER}${NC}"
$WAKE_OK && echo -e "   ${G}✓${NC}  Экран не заснёт"
echo ""
echo -e "   ${GOLD}🏰  Открой в браузере:${NC}"
echo ""
echo -e "   ${W}  ➜  http://localhost:${PORT}${NC}"
echo ""
echo -e "   ${DIM}────────────────────────────────────────────────${NC}"
echo ""
echo -e "   ${D}Ctrl+C — остановить сервер${NC}"
echo ""

# ── Запуск ────────────────────────────────────────────────
node server.js
