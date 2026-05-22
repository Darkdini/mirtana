#!/bin/bash
# СРЕДНЕВЕКОВЬЕ — запуск сервера (Termux / Linux)

cd "$(dirname "$0")/server"

echo "=== СРЕДНЕВЕКОВЬЕ ==="
echo ""

# Установка зависимостей если нужно
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "Установка зависимостей..."
  pip3 install -r requirements.txt
fi

# Инициализация карты
if [ ! -f "medieval.db" ]; then
  echo "Первый запуск — генерирую карту..."
  python3 init_map.py
fi

echo ""
echo "Сервер запускается на http://localhost:8000"
echo "Откройте в браузере: http://localhost:8000"
echo ""
echo "Ctrl+C для остановки"
echo ""

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
