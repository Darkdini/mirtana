from fastapi import APIRouter, Depends
import aiosqlite
from database import get_db
from auth import get_current_player

router = APIRouter(prefix="/api/ranking", tags=["ranking"])


@router.get("/players")
async def player_ranking(db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        """SELECT p.id, p.username, p.castle_name, p.score, p.map_x, p.map_y,
                  a.tag as alliance_tag
           FROM players p
           LEFT JOIN alliances a ON p.alliance_id = a.id
           ORDER BY p.score DESC LIMIT 100"""
    ) as cur:
        players = [dict(r) for r in await cur.fetchall()]
    return {"players": players}


@router.get("/alliances")
async def alliance_ranking(db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        """SELECT a.id, a.name, a.tag, SUM(p.score) as total_score, COUNT(p.id) as members
           FROM alliances a
           JOIN players p ON p.alliance_id = a.id
           GROUP BY a.id
           ORDER BY total_score DESC LIMIT 50"""
    ) as cur:
        alliances = [dict(r) for r in await cur.fetchall()]
    return {"alliances": alliances}
