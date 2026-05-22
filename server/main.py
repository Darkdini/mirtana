import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import init_db, get_db
from ws_manager import manager
from routers import auth_router, city_router, map_router, combat_router, alliance_router, ranking_router
from game_logic import calculate_combat, process_resource_tick
from config import UNITS

import aiosqlite

DB_PATH = os.path.join(os.path.dirname(__file__), "medieval.db")


async def process_attacks():
    """Background task: resolve arrived attacks every 5 seconds."""
    while True:
        try:
            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                now = datetime.utcnow().isoformat()

                async with db.execute(
                    "SELECT * FROM attacks WHERE status='traveling' AND arrive_time <= ?", (now,)
                ) as cur:
                    arrived = [dict(r) for r in await cur.fetchall()]

                for attack in arrived:
                    await resolve_attack(attack, db)

                async with db.execute(
                    "SELECT * FROM attacks WHERE status='returning' AND return_time <= ?", (now,)
                ) as cur:
                    returning = [dict(r) for r in await cur.fetchall()]

                for attack in returning:
                    await finalize_return(attack, db)

        except Exception as e:
            print(f"[attacks] error: {e}")

        await asyncio.sleep(5)


async def resolve_attack(attack: dict, db: aiosqlite.Connection):
    attacker_id = attack["attacker_id"]
    defender_id = attack["defender_id"]
    units_sent = json.loads(attack["units_sent"])

    async with db.execute(
        "SELECT unit_type, count FROM units WHERE player_id=?", (defender_id,)
    ) as cur:
        defender_units = {r["unit_type"]: r["count"] for r in await cur.fetchall()}

    async with db.execute(
        "SELECT building_type, level FROM buildings WHERE player_id=? AND upgrade_finish IS NULL",
        (defender_id,)
    ) as cur:
        def_buildings = [dict(r) for r in await cur.fetchall()]

    async with db.execute(
        "SELECT tech_id FROM research WHERE player_id=? AND status='completed'", (attacker_id,)
    ) as cur:
        atk_techs = [r["tech_id"] for r in await cur.fetchall()]

    async with db.execute(
        "SELECT tech_id FROM research WHERE player_id=? AND status='completed'", (defender_id,)
    ) as cur:
        def_techs = [r["tech_id"] for r in await cur.fetchall()]

    result = calculate_combat(units_sent, defender_units, def_buildings, atk_techs, def_techs)

    for utype, lost in result["defender_losses"].items():
        await db.execute(
            "UPDATE units SET count = MAX(0, count - ?) WHERE player_id=? AND unit_type=?",
            (lost, defender_id, utype)
        )

    surviving_attackers = {}
    for utype, sent in units_sent.items():
        lost = result["attacker_losses"].get(utype, 0)
        surviving = max(0, sent - lost)
        surviving_attackers[utype] = surviving

    loot = {}
    if result["winner"] == "attacker":
        async with db.execute(
            "SELECT gold, food, wood, stone FROM resources WHERE player_id=?", (defender_id,)
        ) as cur:
            def_res = dict(await cur.fetchone() or {})

        loot_rate = 0.3
        for res in ("gold", "food", "wood", "stone"):
            loot[res] = int(def_res.get(res, 0) * loot_rate)

        if any(v > 0 for v in loot.values()):
            await db.execute(
                "UPDATE resources SET gold=gold-?, food=food-?, wood=wood-?, stone=stone-? WHERE player_id=?",
                (loot.get("gold", 0), loot.get("food", 0), loot.get("wood", 0), loot.get("stone", 0), defender_id)
            )

        await db.execute(
            "UPDATE players SET score = score + 10 WHERE id=?", (attacker_id,)
        )

    from config import MAP_WIDTH, MAP_HEIGHT
    import math
    async with db.execute("SELECT map_x, map_y FROM players WHERE id=?", (attacker_id,)) as cur:
        atk_pos = await cur.fetchone()
    async with db.execute("SELECT map_x, map_y FROM players WHERE id=?", (defender_id,)) as cur:
        def_pos = await cur.fetchone()

    if atk_pos and def_pos:
        from game_logic import travel_time
        slowest = min(
            (UNITS[u]["speed"] for u, c in surviving_attackers.items() if c > 0),
            default=1
        )
        return_sec = travel_time(
            def_pos["map_x"], def_pos["map_y"],
            atk_pos["map_x"], atk_pos["map_y"],
            slowest
        )
        from datetime import timedelta
        return_time = (datetime.utcnow() + timedelta(seconds=return_sec)).isoformat()
    else:
        return_time = datetime.utcnow().isoformat()

    result_json = json.dumps({
        "winner": result["winner"],
        "attacker_losses": result["attacker_losses"],
        "defender_losses": result["defender_losses"],
    }, ensure_ascii=False)

    await db.execute(
        """UPDATE attacks SET status='returning', return_time=?, result=?, loot=?,
           units_sent=? WHERE id=?""",
        (return_time, result_json, json.dumps(loot),
         json.dumps(surviving_attackers), attack["id"])
    )
    await db.commit()

    notify = {
        "type": "battle_result",
        "attack_id": attack["id"],
        "result": result["winner"],
        "attacker_losses": result["attacker_losses"],
        "defender_losses": result["defender_losses"],
        "loot": loot,
        "return_time": return_time,
    }
    await manager.send(attacker_id, notify)
    await manager.send(defender_id, {**notify, "type": "under_attack_result"})


async def finalize_return(attack: dict, db: aiosqlite.Connection):
    attacker_id = attack["attacker_id"]
    surviving = json.loads(attack["units_sent"])
    loot = json.loads(attack["loot"] or "{}")

    for utype, count in surviving.items():
        if count > 0:
            await db.execute(
                """INSERT INTO units (player_id, unit_type, count) VALUES (?,?,?)
                   ON CONFLICT(player_id, unit_type) DO UPDATE SET count = count + excluded.count""",
                (attacker_id, utype, count)
            )

    if loot:
        await db.execute(
            "UPDATE resources SET gold=gold+?, food=food+?, wood=wood+?, stone=stone+? WHERE player_id=?",
            (loot.get("gold", 0), loot.get("food", 0), loot.get("wood", 0), loot.get("stone", 0), attacker_id)
        )

    await db.execute("UPDATE attacks SET status='completed' WHERE id=?", (attack["id"],))
    await db.commit()

    await manager.send(attacker_id, {
        "type": "troops_returned",
        "attack_id": attack["id"],
        "units": surviving,
        "loot": loot,
    })


async def online_broadcast():
    """Broadcast online player count every 30 seconds."""
    while True:
        await asyncio.sleep(30)
        await manager.broadcast({"type": "online_count", "count": manager.online_count()})


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    asyncio.create_task(process_attacks())
    asyncio.create_task(online_broadcast())
    yield


app = FastAPI(title="СРЕДНЕВЕКОВЬЕ", lifespan=lifespan)

app.include_router(auth_router.router)
app.include_router(city_router.router)
app.include_router(map_router.router)
app.include_router(combat_router.router)
app.include_router(alliance_router.router)
app.include_router(ranking_router.router)

CLIENT_DIR = os.path.join(os.path.dirname(__file__), "..", "client")


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    from jose import JWTError, jwt
    from config import SECRET_KEY, ALGORITHM

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        player_id = int(payload["sub"])
    except (JWTError, Exception):
        await ws.close(code=4001)
        return

    await manager.connect(player_id, ws)
    try:
        await manager.send(player_id, {
            "type": "connected",
            "player_id": player_id,
            "online": manager.online_count(),
        })
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
                await handle_ws_message(player_id, msg)
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(player_id)


async def handle_ws_message(player_id: int, msg: dict):
    mtype = msg.get("type")
    if mtype == "ping":
        await manager.send(player_id, {"type": "pong"})
    elif mtype == "chat":
        content = str(msg.get("content", ""))[:200]
        if content:
            async with aiosqlite.connect(DB_PATH) as db:
                db.row_factory = aiosqlite.Row
                async with db.execute("SELECT username FROM players WHERE id=?", (player_id,)) as cur:
                    row = await cur.fetchone()
                username = row["username"] if row else "???"
            await manager.broadcast({
                "type": "chat",
                "player_id": player_id,
                "username": username,
                "content": content,
            })


@app.get("/")
async def index():
    return FileResponse(os.path.join(CLIENT_DIR, "index.html"))


@app.get("/game")
async def game():
    return FileResponse(os.path.join(CLIENT_DIR, "game.html"))


app.mount("/assets", StaticFiles(directory=os.path.join(CLIENT_DIR, "assets")), name="assets")
app.mount("/css", StaticFiles(directory=os.path.join(CLIENT_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(CLIENT_DIR, "js")), name="js")
