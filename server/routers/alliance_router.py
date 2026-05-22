from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, constr
import aiosqlite
from database import get_db
from auth import get_current_player

router = APIRouter(prefix="/api/alliance", tags=["alliance"])


class CreateAllianceRequest(BaseModel):
    name: constr(min_length=3, max_length=40)
    tag: constr(min_length=2, max_length=6)
    description: str = ""


@router.post("/create")
async def create_alliance(
    data: CreateAllianceRequest,
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    if player["alliance_id"]:
        raise HTTPException(400, "Вы уже в альянсе")

    try:
        async with db.execute(
            "INSERT INTO alliances (name, tag, leader_id, description) VALUES (?,?,?,?)",
            (data.name, data.tag.upper(), player["id"], data.description)
        ) as cur:
            alliance_id = cur.lastrowid
    except Exception:
        raise HTTPException(400, "Название или тег уже заняты")

    await db.execute("UPDATE players SET alliance_id=? WHERE id=?", (alliance_id, player["id"]))
    await db.commit()
    return {"ok": True, "alliance_id": alliance_id}


@router.post("/leave")
async def leave_alliance(
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    if not player["alliance_id"]:
        raise HTTPException(400, "Вы не в альянсе")

    async with db.execute("SELECT leader_id FROM alliances WHERE id=?", (player["alliance_id"],)) as cur:
        a = await cur.fetchone()

    if a and a["leader_id"] == player["id"]:
        async with db.execute(
            "SELECT id FROM players WHERE alliance_id=? AND id != ?",
            (player["alliance_id"], player["id"])
        ) as cur:
            members = await cur.fetchall()

        if members:
            new_leader = members[0]["id"]
            await db.execute("UPDATE alliances SET leader_id=? WHERE id=?", (new_leader, player["alliance_id"]))
        else:
            await db.execute("DELETE FROM alliances WHERE id=?", (player["alliance_id"],))

    await db.execute("UPDATE players SET alliance_id=NULL WHERE id=?", (player["id"],))
    await db.commit()
    return {"ok": True}


@router.get("/list")
async def list_alliances(db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        """SELECT a.id, a.name, a.tag, a.description, a.created_at,
                  p.username as leader_name,
                  COUNT(m.id) as member_count
           FROM alliances a
           JOIN players p ON a.leader_id = p.id
           LEFT JOIN players m ON m.alliance_id = a.id
           GROUP BY a.id
           ORDER BY member_count DESC LIMIT 50"""
    ) as cur:
        alliances = [dict(r) for r in await cur.fetchall()]
    return {"alliances": alliances}


@router.get("/{alliance_id}")
async def get_alliance(alliance_id: int, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute("SELECT * FROM alliances WHERE id=?", (alliance_id,)) as cur:
        a = await cur.fetchone()
    if not a:
        raise HTTPException(404, "Альянс не найден")

    async with db.execute(
        "SELECT id, username, score, map_x, map_y FROM players WHERE alliance_id=?",
        (alliance_id,)
    ) as cur:
        members = [dict(r) for r in await cur.fetchall()]

    return {**dict(a), "members": members}


@router.post("/join/{alliance_id}")
async def join_alliance(
    alliance_id: int,
    player=Depends(get_current_player),
    db: aiosqlite.Connection = Depends(get_db)
):
    if player["alliance_id"]:
        raise HTTPException(400, "Вы уже в альянсе")

    async with db.execute("SELECT id FROM alliances WHERE id=?", (alliance_id,)) as cur:
        if not await cur.fetchone():
            raise HTTPException(404, "Альянс не найден")

    await db.execute("UPDATE players SET alliance_id=? WHERE id=?", (alliance_id, player["id"]))
    await db.commit()
    return {"ok": True}
