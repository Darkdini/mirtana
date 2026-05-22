from fastapi import APIRouter, Depends, Query
import aiosqlite
from database import get_db
from auth import get_current_player
from config import MAP_WIDTH, MAP_HEIGHT

router = APIRouter(prefix="/api/map", tags=["map"])


@router.get("/players")
async def get_map_players(
    x1: int = Query(0), y1: int = Query(0),
    x2: int = Query(MAP_WIDTH), y2: int = Query(MAP_HEIGHT),
    db: aiosqlite.Connection = Depends(get_db)
):
    x1 = max(0, x1); y1 = max(0, y1)
    x2 = min(MAP_WIDTH, x2); y2 = min(MAP_HEIGHT, y2)

    async with db.execute(
        """SELECT p.id, p.username, p.castle_name, p.map_x, p.map_y, p.score, p.alliance_id,
                  a.tag as alliance_tag
           FROM players p
           LEFT JOIN alliances a ON p.alliance_id = a.id
           WHERE p.map_x BETWEEN ? AND ? AND p.map_y BETWEEN ? AND ?""",
        (x1, x2, y1, y2)
    ) as cur:
        players = [dict(r) for r in await cur.fetchall()]

    return {"players": players, "width": MAP_WIDTH, "height": MAP_HEIGHT}


@router.get("/player/{player_id}")
async def get_player_info(
    player_id: int,
    viewer=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    async with db.execute(
        """SELECT p.id, p.username, p.castle_name, p.map_x, p.map_y, p.score,
                  p.last_seen, p.alliance_id, a.name as alliance_name, a.tag as alliance_tag
           FROM players p
           LEFT JOIN alliances a ON p.alliance_id = a.id
           WHERE p.id = ?""",
        (player_id,)
    ) as cur:
        p = await cur.fetchone()

    if not p:
        return {"error": "Игрок не найден"}

    p = dict(p)

    async with db.execute(
        "SELECT building_type, level FROM buildings WHERE player_id=? AND upgrade_finish IS NULL",
        (player_id,)
    ) as cur:
        buildings = [dict(r) for r in await cur.fetchall()]

    async with db.execute(
        "SELECT SUM(count) as total FROM units WHERE player_id=?", (player_id,)
    ) as cur:
        army_row = await cur.fetchone()

    p["buildings"] = buildings
    p["army_size"] = army_row["total"] or 0
    return p
