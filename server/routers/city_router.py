from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import aiosqlite
from database import get_db
from auth import get_current_player
from config import BUILDINGS, UNITS
from game_logic import (
    building_upgrade_cost, building_upgrade_time, resource_production,
    storage_capacity, can_afford, deduct_resources, unit_train_cost,
    unit_train_time, process_resource_tick, process_finished_training,
    process_finished_upgrades,
)

router = APIRouter(prefix="/api/city", tags=["city"])


async def get_player_state(player_id: int, db: aiosqlite.Connection):
    await process_resource_tick(player_id, db)
    await process_finished_training(player_id, db)
    await process_finished_upgrades(player_id, db)

    async with db.execute("SELECT * FROM resources WHERE player_id=?", (player_id,)) as cur:
        res = dict(await cur.fetchone())

    async with db.execute("SELECT * FROM buildings WHERE player_id=?", (player_id,)) as cur:
        buildings = [dict(r) for r in await cur.fetchall()]

    async with db.execute("SELECT unit_type, count FROM units WHERE player_id=?", (player_id,)) as cur:
        units = {r["unit_type"]: r["count"] for r in await cur.fetchall()}

    async with db.execute(
        "SELECT unit_type, count, finish_time FROM training_queue WHERE player_id=? ORDER BY finish_time",
        (player_id,)
    ) as cur:
        training = [dict(r) for r in await cur.fetchall()]

    production = resource_production(buildings)
    capacity = storage_capacity(buildings)

    return {
        "resources": res,
        "buildings": buildings,
        "units": units,
        "training_queue": training,
        "production": production,
        "capacity": capacity,
    }


@router.get("/state")
async def city_state(
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    return await get_player_state(player["id"], db)


@router.get("/buildings/available")
async def available_buildings(
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    async with db.execute(
        "SELECT building_type, level FROM buildings WHERE player_id=?", (player["id"],)
    ) as cur:
        existing = {r["building_type"]: r["level"] for r in await cur.fetchall()}

    result = []
    castle_level = existing.get("castle", 1)

    build_requirements = {
        "farm": 1, "sawmill": 1, "mine": 1, "quarry": 1,
        "barracks": 2, "wall": 2, "tower": 3,
        "archery": 3, "stables": 4, "warehouse": 2,
        "workshop": 5, "academy": 5, "market": 4, "tavern": 6,
    }

    for btype, bconfig in BUILDINGS.items():
        current_level = existing.get(btype, 0)
        required_castle = build_requirements.get(btype, 1)
        can_build = castle_level >= required_castle

        if current_level >= bconfig["max_level"]:
            continue

        next_level = current_level + 1
        cost = building_upgrade_cost(btype, current_level)
        time_sec = building_upgrade_time(btype, current_level)

        result.append({
            "type": btype,
            "name": bconfig["name"],
            "current_level": current_level,
            "next_level": next_level,
            "max_level": bconfig["max_level"],
            "cost": cost,
            "time_sec": time_sec,
            "can_build": can_build,
            "description": bconfig.get("description", ""),
        })

    return result


class BuildRequest(BaseModel):
    building_type: str


@router.post("/build")
async def build_or_upgrade(
    data: BuildRequest,
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    btype = data.building_type
    if btype not in BUILDINGS:
        raise HTTPException(400, "Неизвестное здание")

    await process_resource_tick(player["id"], db)

    async with db.execute(
        "SELECT id, level, upgrade_finish FROM buildings WHERE player_id=? AND building_type=?",
        (player["id"], btype)
    ) as cur:
        building = await cur.fetchone()

    if building and building["upgrade_finish"]:
        raise HTTPException(400, "Здание уже улучшается")

    current_level = building["level"] if building else 0
    if current_level >= BUILDINGS[btype]["max_level"]:
        raise HTTPException(400, "Максимальный уровень")

    cost = building_upgrade_cost(btype, current_level)
    time_sec = building_upgrade_time(btype, current_level)

    async with db.execute("SELECT gold, food, wood, stone FROM resources WHERE player_id=?", (player["id"],)) as cur:
        res = dict(await cur.fetchone())

    if not can_afford(res, cost):
        raise HTTPException(400, "Недостаточно ресурсов")

    new_res = deduct_resources(res, cost)
    await db.execute(
        "UPDATE resources SET gold=?, food=?, wood=?, stone=? WHERE player_id=?",
        (new_res["gold"], new_res["food"], new_res["wood"], new_res["stone"], player["id"])
    )

    finish = (datetime.utcnow() + timedelta(seconds=time_sec)).isoformat()

    if building:
        await db.execute(
            "UPDATE buildings SET upgrade_finish=? WHERE id=?",
            (finish, building["id"])
        )
    else:
        bconfig = BUILDINGS[btype]
        hp = bconfig["base_hp"]
        await db.execute(
            "INSERT INTO buildings (player_id, building_type, level, hp, max_hp, upgrade_finish) VALUES (?,?,?,?,?,?)",
            (player["id"], btype, 0, hp, hp, finish)
        )

    await db.commit()
    return {"ok": True, "finish_time": finish, "cost": cost, "time_sec": time_sec}


class TrainRequest(BaseModel):
    unit_type: str
    count: int


@router.post("/train")
async def train_units(
    data: TrainRequest,
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    utype = data.unit_type
    count = data.count

    if utype not in UNITS:
        raise HTTPException(400, "Неизвестный тип войска")
    if count < 1 or count > 1000:
        raise HTTPException(400, "Количество от 1 до 1000")

    u = UNITS[utype]
    required_building = u["building"]
    min_level = u["min_building_level"]

    async with db.execute(
        "SELECT level, upgrade_finish FROM buildings WHERE player_id=? AND building_type=?",
        (player["id"], required_building)
    ) as cur:
        b = await cur.fetchone()

    if not b or b["level"] < min_level:
        raise HTTPException(400, f"Требуется {BUILDINGS[required_building]['name']} уровня {min_level}")
    if b["upgrade_finish"]:
        raise HTTPException(400, "Здание на улучшении")

    cost = unit_train_cost(utype, count)
    await process_resource_tick(player["id"], db)

    async with db.execute("SELECT gold, food, wood, stone FROM resources WHERE player_id=?", (player["id"],)) as cur:
        res = dict(await cur.fetchone())

    if not can_afford(res, cost):
        raise HTTPException(400, "Недостаточно ресурсов")

    new_res = deduct_resources(res, cost)
    await db.execute(
        "UPDATE resources SET gold=?, food=?, wood=?, stone=? WHERE player_id=?",
        (new_res["gold"], new_res["food"], new_res["wood"], new_res["stone"], player["id"])
    )

    time_sec = unit_train_time(utype, count, b["level"])
    finish = (datetime.utcnow() + timedelta(seconds=time_sec)).isoformat()

    await db.execute(
        "INSERT INTO training_queue (player_id, unit_type, count, finish_time) VALUES (?,?,?,?)",
        (player["id"], utype, count, finish)
    )
    await db.commit()
    return {"ok": True, "finish_time": finish, "time_sec": time_sec, "cost": cost}
