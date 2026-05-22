import json
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, WebSocket] = {}

    async def connect(self, player_id: int, ws: WebSocket):
        await ws.accept()
        if player_id in self.active:
            try:
                await self.active[player_id].close()
            except Exception:
                pass
        self.active[player_id] = ws

    def disconnect(self, player_id: int):
        self.active.pop(player_id, None)

    async def send(self, player_id: int, data: dict):
        ws = self.active.get(player_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data, ensure_ascii=False))
            except Exception:
                self.disconnect(player_id)

    async def broadcast(self, data: dict, exclude: Set[int] = None):
        exclude = exclude or set()
        dead = []
        for pid, ws in self.active.items():
            if pid in exclude:
                continue
            try:
                await ws.send_text(json.dumps(data, ensure_ascii=False))
            except Exception:
                dead.append(pid)
        for pid in dead:
            self.disconnect(pid)

    def online_count(self) -> int:
        return len(self.active)

    def is_online(self, player_id: int) -> bool:
        return player_id in self.active


manager = ConnectionManager()
