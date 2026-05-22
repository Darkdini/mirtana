#!/data/data/com.termux/files/usr/bin/bash

cd "$(dirname "$0")"

# ── Цвета и стили ─────────────────────────────────────────
R='\033[0;31m'    # красный
G='\033[0;32m'    # зелёный
Y='\033[1;33m'    # жёлтый (золото)
B='\033[0;34m'    # синий
C='\033[0;36m'    # голубой
M='\033[0;35m'    # фиолетовый
W='\033[1;37m'    # белый жирный
D='\033[2;37m'    # серый dim
NC='\033[0m'      # сброс
BG='\033[48;5;52m'   # тёмно-красный фон
GOLD='\033[38;5;214m' # золотой

clear

# ── Заставка ──────────────────────────────────────────────
echo ""
echo -e "${GOLD}  ╔══════════════════════════════════════════════╗${NC}"
echo -e "${GOLD}  ║${NC}                                              ${GOLD}║${NC}"
echo -e "${GOLD}  ║${NC}   ${Y}███████╗ █████╗ ██████╗ ███████╗ ██████╗ ${GOLD} ║${NC}"
echo -e "${GOLD}  ║${NC}   ${Y}╚══███╔╝██╔══██╗██╔══██╗██╔════╝ ██╔══██╗${GOLD} ║${NC}"
echo -e "${GOLD}  ║${NC}   ${Y}  ███╔╝ ███████║██████╔╝█████╗   ██║  ██║${GOLD} ║${NC}"
echo -e "${GOLD}  ║${NC}   ${Y} ███╔╝  ██╔══██║██╔══██╗██╔══╝   ██║  ██║${GOLD} ║${NC}"
echo -e "${GOLD}  ║${NC}   ${Y}███████╗██║  ██║██║  ██║███████╗ ██████╔╝${GOLD} ║${NC}"
echo -e "${GOLD}  ║${NC}   ${Y}╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ${GOLD}║${NC}"
echo -e "${GOLD}  ║${NC}                                              ${GOLD}║${NC}"
echo -e "${GOLD}  ║${NC}      ${D}⚔   С Р Е Д Н Е В Е К О В Ь Е   ⚔${NC}      ${GOLD}║${NC}"
echo -e "${GOLD}  ║${NC}          ${D}В О Й Н А   К О Р О Л Е Й${NC}          ${GOLD}║${NC}"
echo -e "${GOLD}  ║${NC}                                              ${GOLD}║${NC}"
echo -e "${GOLD}  ╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${Y}  ════════════════════════════════════════════════${NC}"

# ── Анимация загрузки ─────────────────────────────────────
loading() {
  local msg="$1"
  local delay=0.04
  printf "${C}  %-28s${NC} " "$msg"
  for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    printf "${GOLD}▓${NC}"
    sleep $delay
  done
  printf " ${G}✓${NC}\n"
}

echo ""
loading "Инициализация..."
sleep 0.1
loading "Загрузка мира..."
sleep 0.1
loading "Подготовка армий..."
sleep 0.1
loading "Открытие ворот..."
sleep 0.1

echo ""
echo -e "${Y}  ════════════════════════════════════════════════${NC}"

# ── Проверка Node.js ──────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo ""
  echo -e "  ${R}✗ Node.js не найден!${NC}"
  echo ""
  echo -e "  Установи одной командой:"
  echo -e "  ${GOLD}pkg install nodejs -y${NC}"
  echo ""
  exit 1
fi

NODE_VER=$(node --version)
echo ""
echo -e "  ${G}✓${NC} ${W}Node.js${NC} ${D}${NODE_VER}${NC}"

# ── Определяем IP ─────────────────────────────────────────
LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[\d.]+' | head -1)
[ -z "$LOCAL_IP" ] && LOCAL_IP=$(ip addr show wlan0 2>/dev/null | grep -oP '(?<=inet )\d+\.\d+\.\d+\.\d+' | head -1)
[ -z "$LOCAL_IP" ] && LOCAL_IP=$(ifconfig 2>/dev/null | grep -oP '(?<=inet )\d+\.\d+\.\d+\.\d+' | grep -v '127.0.0.1' | head -1)

PORT=${PORT:-7777}

if command -v termux-wake-lock &> /dev/null; then
  termux-wake-lock 2>/dev/null
  echo -e "  ${G}✓${NC} ${W}Экран не заснёт${NC}"
fi

echo ""
echo -e "${Y}  ════════════════════════════════════════════════${NC}"
echo ""

# ── Адреса для входа ──────────────────────────────────────
echo -e "  ${GOLD}🏰 ССЫЛКИ ДЛЯ ВХОДА В ИГРУ:${NC}"
echo ""
echo -e "  ${D}┌─────────────────────────────────────────────┐${NC}"
echo -e "  ${D}│${NC}  ${W}📱 Этот телефон:${NC}"
echo -e "  ${D}│${NC}     ${GOLD}http://localhost:${PORT}${NC}"

if [ -n "$LOCAL_IP" ]; then
  echo -e "  ${D}│${NC}"
  echo -e "  ${D}│${NC}  ${W}🌐 Другие устройства (Wi-Fi):${NC}"
  echo -e "  ${D}│${NC}     ${GOLD}http://${LOCAL_IP}:${PORT}${NC}"
  echo -e "  ${D}│${NC}"
  echo -e "  ${D}│${NC}  ${G}✓ Wi-Fi подключён${NC} ${D}— можно играть вдвоём${NC}"
else
  echo -e "  ${D}│${NC}"
  echo -e "  ${D}│${NC}  ${R}✗ Wi-Fi не найден${NC} ${D}— только одиночная игра${NC}"
fi

echo -e "  ${D}└─────────────────────────────────────────────┘${NC}"
echo ""
echo -e "${Y}  ════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${D}Ctrl+C — остановить сервер${NC}"
echo ""

# ── Запуск ────────────────────────────────────────────────
node server.js
