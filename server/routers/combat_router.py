import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict
import aiosqlite
from database import get_db
from auth import get_current_player
from config import UNITS
from game_logic import (
    calculate_combat, travel_time, process_resource_tick,
    can_afford, deduct_resources,
)
from ws_manager import manager

router = APIRouter(prefix="/api/combat", tags=["combat"])


class AttackRequest(BaseModel):
    target_id: int
    units: Dict[str, int]


@router.post("/attack")
async def send_attack(
    data: AttackRequest,
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    if data.target_id == player["id"]:
        raise HTTPException(400, "Нельзя атаковать себя")

    total_units = sum(data.units.values())
    if total_units <= 0:
        raise HTTPException(400, "Выберите войска")

    async with db.execute("SELECT map_x, map_y FROM players WHERE id=?", (data.target_id,)) as cur:
        target = await cur.fetchone()
    if not target:
        raise HTTPException(404, "Цель не найдена")

    for utype, count in data.units.items():
        if count <= 0:
            continue
        if utype not in UNITS:
            raise HTTPException(400, f"Неизвестный тип: {utype}")
        async with db.execute(
            "SELECT count FROM units WHERE player_id=? AND unit_type=?",
            (player["id"], utype)
        ) as cur:
            row = await cur.fetchone()
        if not row or row["count"] < count:
            raise HTTPException(400, f"Недостаточно {UNITS[utype]['name']}")

    slowest = min(
        UNITS[utype]["speed"] for utype, count in data.units.items() if count > 0
    )
    travel = travel_time(
        player["map_x"], player["map_y"],
        target["map_x"], target["map_y"],
        slowest
    )

    arrive = (datetime.utcnow() + timedelta(seconds=travel)).isoformat()
    units_json = json.dumps(data.units)

    async with db.execute(
        "INSERT INTO attacks (attacker_id, defender_id, units_sent, arrive_time, status) VALUES (?,?,?,?,?)",
        (player["id"], data.target_id, units_json, arrive, "traveling"),
    ) as cur:
        attack_id = cur.lastrowid

    for utype, count in data.units.items():
        if count > 0:
            await db.execute(
                "UPDATE units SET count = count - ? WHERE player_id=? AND unit_type=?",
                (count, player["id"], utype)
            )

    await db.commit()

    await manager.send(player["id"], {
        "type": "attack_sent",
        "attack_id": attack_id,
        "arrive_time": arrive,
        "travel_seconds": travel,
    })

    return {"ok": True, "attack_id": attack_id, "arrive_time": arrive, "travel_seconds": travel}


@router.get("/my_attacks")
async def my_attacks(
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    async with db.execute(
        """SELECT a.*, p.username as defender_name, p.castle_name as defender_castle
           FROM attacks a JOIN players p ON a.defender_id = p.id
           WHERE a.attacker_id=? AND a.status IN ('traveling', 'returning')
           ORDER BY a.arrive_time""",
        (player["id"],)
    ) as cur:
        attacks = [dict(r) for r in await cur.fetchall()]

    async with db.execute(
        """SELECT a.*, p.username as attacker_name
           FROM attacks a JOIN players p ON a.attacker_id = p.id
           WHERE a.defender_id=? AND a.status = 'traveling'
           ORDER BY a.arrive_time""",
        (player["id"],)
    ) as cur:
        incoming = [dict(r) for r in await cur.fetchall()]

    return {"outgoing": attacks, "incoming": incoming}


@router.get("/history")
async def attack_history(
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    async with db.execute(
        """SELECT a.*,
                  atk.username as attacker_name,
                  def.username as defender_name
           FROM attacks a
           JOIN players atk ON a.attacker_id = atk.id
           JOIN players def ON a.defender_id = def.id
           WHERE (a.attacker_id=? OR a.defender_id=?) AND a.status='completed'
           ORDER BY a.depart_time DESC LIMIT 50""",
        (player["id"], player["id"])
    ) as cur:
        history = [dict(r) for r in await cur.fetchall()]
    return {"history": history}
