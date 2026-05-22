#!/data/data/com.termux/files/usr/bin/bash
# ╔══════════════════════════════════════╗
# ║   СРЕДНЕВЕКОВЬЕ — скрипт запуска    ║
# ╚══════════════════════════════════════╝

cd "$(dirname "$0")"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # сброс цвета

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║    ⚔  СРЕДНЕВЕКОВЬЕ  ⚔               ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════╝${NC}"
echo ""

# Проверяем Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js не установлен!${NC}"
  echo ""
  echo "Установите командой:"
  echo -e "${CYAN}  pkg install nodejs -y${NC}"
  exit 1
fi

NODE_VER=$(node --version)
echo -e "${GREEN}✓ Node.js ${NODE_VER}${NC}"

# Определяем IP
LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[\d.]+' | head -1)
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP=$(ip addr show wlan0 2>/dev/null | grep -oP '(?<=inet )\d+\.\d+\.\d+\.\d+' | head -1)
fi
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP=$(ifconfig 2>/dev/null | grep -oP '(?<=inet )\d+\.\d+\.\d+\.\d+' | grep -v '127.0.0.1' | head -1)
fi

PORT=${PORT:-7777}

echo ""
if [ -n "$LOCAL_IP" ]; then
  echo -e "${GREEN}✓ Wi-Fi IP: ${LOCAL_IP}${NC}"
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  На этом телефоне:${NC}"
  echo -e "${GREEN}  👉 http://localhost:${PORT}${NC}"
  echo ""
  echo -e "${CYAN}  Жена / другие устройства (Wi-Fi):${NC}"
  echo -e "${GREEN}  📱 http://${LOCAL_IP}:${PORT}${NC}"
  echo ""
  echo -e "${CYAN}  Внешний IP (если настроен проброс):${NC}"
  echo -e "${BLUE}  🌐 http://128.71.88.77:${PORT}${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
  echo -e "${RED}⚠  Wi-Fi не подключён${NC}"
  echo ""
  echo -e "${CYAN}  На этом телефоне:${NC}"
  echo -e "${GREEN}  👉 http://localhost:${PORT}${NC}"
  echo ""
  echo "  Подключитесь к Wi-Fi чтобы играть вдвоём"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
fi

echo ""
echo -e "${CYAN}Запускаю сервер... (Ctrl+C для остановки)${NC}"
echo ""

# Не засыпать (если есть termux-wake-lock)
if command -v termux-wake-lock &> /dev/null; then
  termux-wake-lock
  echo -e "${GREEN}✓ Блокировка сна активирована${NC}"
fi

# Запускаем
node server.js
