import math
import json
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import aiosqlite
from config import BUILDINGS, UNITS, TECHNOLOGIES, BASE_STORAGE, TICK_INTERVAL


def building_upgrade_cost(building_type: str, current_level: int) -> Dict:
    b = BUILDINGS[building_type]
    mult = b["level_cost_mult"] ** current_level
    return {res: math.ceil(amount * mult) for res, amount in b["base_cost"].items()}


def building_upgrade_time(building_type: str, current_level: int) -> int:
    base_times = {
        "castle": 600, "farm": 120, "sawmill": 120, "quarry": 120,
        "mine": 180, "barracks": 240, "stables": 300, "archery": 240,
        "workshop": 360, "wall": 480, "tower": 300, "warehouse": 180,
        "academy": 360, "market": 240, "tavern": 180,
    }
    base = base_times.get(building_type, 300)
    return int(base * (1.5 ** current_level))


def resource_production(buildings: List[Dict]) -> Dict:
    production = {"gold": 0, "food": 0, "wood": 0, "stone": 0}
    for b in buildings:
        b_config = BUILDINGS.get(b["building_type"], {})
        for res, base_amount in b_config.get("produces", {}).items():
            production[res] += base_amount * b["level"]
    return production


def storage_capacity(buildings: List[Dict]) -> Dict:
    capacity = {**BASE_STORAGE}
    for b in buildings:
        if b["building_type"] == "warehouse":
            bonus = BUILDINGS["warehouse"].get("storage_bonus", 0) * b["level"]
            for res in capacity:
                capacity[res] += bonus
    return capacity


def can_afford(resources: Dict, cost: Dict) -> bool:
    for res, amount in cost.items():
        if resources.get(res, 0) < amount:
            return False
    return True


def deduct_resources(resources: Dict, cost: Dict) -> Dict:
    result = dict(resources)
    for res, amount in cost.items():
        result[res] = result.get(res, 0) - amount
    return result


def unit_train_cost(unit_type: str, count: int) -> Dict:
    u = UNITS[unit_type]
    return {res: amount * count for res, amount in u["cost"].items()}


def unit_train_time(unit_type: str, count: int, barracks_level: int) -> int:
    base = UNITS[unit_type]["train_time"]
    speed_bonus = 1 - (barracks_level * 0.02)
    return max(10, int(base * count * max(0.5, speed_bonus)))


def calculate_combat(
    attacker_units: Dict,
    defender_units: Dict,
    defender_buildings: List[Dict],
    attacker_techs: List[str],
    defender_techs: List[str],
) -> Dict:
    def unit_power(units: Dict, techs: List[str], role: str) -> float:
        total_atk = 0.0
        total_def = 0.0
        total_hp = 0.0
        for utype, count in units.items():
            if count <= 0:
                continue
            u = UNITS.get(utype)
            if not u:
                continue
            atk_mult = 1.0
            def_mult = 1.0
            if "iron_weapons" in techs:
                atk_mult += 0.1
            if "steel_armor" in techs:
                def_mult += 0.1
            total_atk += u["attack"] * atk_mult * count
            total_def += u["defense"] * def_mult * count
            total_hp += u["hp"] * count
        return total_atk, total_def, total_hp

    atk_atk, atk_def, atk_hp = unit_power(attacker_units, attacker_techs, "attacker")
    def_atk, def_def, def_hp = unit_power(defender_units, defender_techs, "defender")

    wall_bonus = 1.0
    for b in defender_buildings:
        if b["building_type"] in ("wall", "tower"):
            bonus = BUILDINGS[b["building_type"]].get("defense_bonus", 0)
            wall_bonus += bonus * b["level"] * 0.1
    if "fortification" in defender_techs:
        wall_bonus += 0.2

    effective_def_atk = def_atk * wall_bonus
    effective_def_def = def_def * wall_bonus

    if atk_hp <= 0:
        return {"winner": "defender", "attacker_losses": attacker_units, "defender_losses": {}, "loot": {}}

    atk_ratio = atk_atk / max(1, effective_def_def + def_hp * 0.1)
    def_ratio = effective_def_atk / max(1, atk_def + atk_hp * 0.1)

    winner = "attacker" if atk_ratio > def_ratio else "defender"

    attacker_losses = {}
    defender_losses = {}

    if winner == "attacker":
        loss_rate_atk = min(0.8, def_ratio / atk_ratio * 0.6)
        loss_rate_def = min(1.0, atk_ratio / def_ratio * 0.9)
    else:
        loss_rate_atk = min(1.0, def_ratio / atk_ratio * 0.9)
        loss_rate_def = min(0.8, atk_ratio / def_ratio * 0.6)

    for utype, count in attacker_units.items():
        attacker_losses[utype] = min(count, int(count * loss_rate_atk + random.uniform(0, count * 0.1)))

    for utype, count in defender_units.items():
        defender_losses[utype] = min(count, int(count * loss_rate_def + random.uniform(0, count * 0.1)))

    loot = {}
    if winner == "attacker":
        loot_rate = 0.3
        loot = {"gold": 0, "food": 0, "wood": 0, "stone": 0}

    return {
        "winner": winner,
        "attacker_losses": attacker_losses,
        "defender_losses": defender_losses,
        "loot": loot,
    }


def travel_time(x1: int, y1: int, x2: int, y2: int, slowest_speed: int) -> int:
    distance = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    base_seconds_per_tile = 60
    return max(30, int(distance * base_seconds_per_tile / max(1, slowest_speed)))


async def process_resource_tick(player_id: int, db: aiosqlite.Connection):
    async with db.execute(
        "SELECT gold, food, wood, stone, last_tick FROM resources WHERE player_id = ?",
        (player_id,)
    ) as cur:
        res_row = await cur.fetchone()
    if not res_row:
        return

    last_tick = datetime.fromisoformat(res_row["last_tick"])
    now = datetime.utcnow()
    elapsed = (now - last_tick).total_seconds()
    ticks = elapsed / TICK_INTERVAL

    if ticks < 0.01:
        return

    async with db.execute(
        "SELECT building_type, level FROM buildings WHERE player_id = ? AND upgrade_finish IS NULL",
        (player_id,)
    ) as cur:
        buildings = [dict(r) for r in await cur.fetchall()]

    production = resource_production(buildings)
    capacity = storage_capacity(buildings)

    new_resources = {}
    for res in ("gold", "food", "wood", "stone"):
        current = res_row[res]
        earned = production[res] * ticks
        new_resources[res] = min(capacity[res], current + earned)

    await db.execute(
        """UPDATE resources SET gold=?, food=?, wood=?, stone=?, last_tick=datetime('now')
           WHERE player_id=?""",
        (new_resources["gold"], new_resources["food"], new_resources["wood"],
         new_resources["stone"], player_id)
    )
    await db.commit()


async def process_finished_training(player_id: int, db: aiosqlite.Connection):
    now = datetime.utcnow().isoformat()
    async with db.execute(
        "SELECT id, unit_type, count FROM training_queue WHERE player_id=? AND finish_time <= ?",
        (player_id, now)
    ) as cur:
        finished = [dict(r) for r in await cur.fetchall()]

    for item in finished:
        await db.execute(
            """INSERT INTO units (player_id, unit_type, count) VALUES (?, ?, ?)
               ON CONFLICT(player_id, unit_type) DO UPDATE SET count = count + excluded.count""",
            (player_id, item["unit_type"], item["count"])
        )
        await db.execute("DELETE FROM training_queue WHERE id=?", (item["id"],))

    if finished:
        await db.commit()
    return finished


async def process_finished_upgrades(player_id: int, db: aiosqlite.Connection):
    now = datetime.utcnow().isoformat()
    async with db.execute(
        "SELECT id, building_type, level FROM buildings WHERE player_id=? AND upgrade_finish <= ?",
        (player_id, now)
    ) as cur:
        finished = [dict(r) for r in await cur.fetchall()]

    for b in finished:
        new_level = b["level"] + 1
        new_hp = BUILDINGS[b["building_type"]]["base_hp"] * new_level
        await db.execute(
            "UPDATE buildings SET level=?, hp=?, max_hp=?, upgrade_finish=NULL WHERE id=?",
            (new_level, new_hp, new_hp, b["id"])
        )

    if finished:
        await db.commit()
    return finished
