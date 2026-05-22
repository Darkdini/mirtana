import random
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, constr
from typing import Optional
import aiosqlite
from database import get_db
from auth import hash_password, verify_password, create_token, get_current_player
from config import BUILDINGS, STARTING_RESOURCES, SECRET_KEY, ALGORITHM
from game_logic import building_upgrade_cost
from jose import JWTError, jwt

router = APIRouter(prefix="/api/auth", tags=["auth"])

VALID_RACES = ['orcs', 'humans', 'elves']


class RegisterRequest(BaseModel):
    username: constr(min_length=3, max_length=20)
    password: constr(min_length=6, max_length=50)
    castle_name: constr(min_length=1, max_length=30) = "Мой замок"
    race: str = 'humans'
    captcha_token: str = ''
    captcha_answer: Optional[int] = None


class LoginRequest(BaseModel):
    username: str
    password: str


async def find_free_spot(db: aiosqlite.Connection) -> tuple[int, int]:
    from config import MAP_WIDTH, MAP_HEIGHT
    for _ in range(200):
        x = random.randint(1, MAP_WIDTH - 2)
        y = random.randint(1, MAP_HEIGHT - 2)
        async with db.execute(
            "SELECT id FROM players WHERE map_x=? AND map_y=?", (x, y)
        ) as cur:
            if not await cur.fetchone():
                return x, y
    return random.randint(0, MAP_WIDTH - 1), random.randint(0, MAP_HEIGHT - 1)


@router.get("/captcha")
async def get_captcha():
    """Return a simple math captcha question with a signed JWT token."""
    a = random.randint(1, 15)
    b = random.randint(1, 15)
    answer = a + b
    question = f"{a} + {b} = ?"

    expire = datetime.utcnow() + timedelta(minutes=10)
    token = jwt.encode(
        {"ans": answer, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return {"question": question, "token": token}


@router.post("/register")
async def register(data: RegisterRequest, response: Response, db: aiosqlite.Connection = Depends(get_db)):
    # Validate race
    if data.race not in VALID_RACES:
        raise HTTPException(400, f"Неверная раса. Допустимые: {', '.join(VALID_RACES)}")

    # Validate captcha
    if not data.captcha_token or data.captcha_answer is None:
        raise HTTPException(400, "Капча обязательна")
    try:
        payload = jwt.decode(data.captcha_token, SECRET_KEY, algorithms=[ALGORITHM])
        correct_answer = payload.get("ans")
    except JWTError:
        raise HTTPException(400, "Капча устарела или недействительна. Обновите её")
    if int(data.captcha_answer) != int(correct_answer):
        raise HTTPException(400, "Неверный ответ на капчу")

    async with db.execute("SELECT id FROM players WHERE username=?", (data.username,)) as cur:
        if await cur.fetchone():
            raise HTTPException(400, "Имя занято")

    hashed = hash_password(data.password)
    x, y = await find_free_spot(db)

    async with db.execute(
        "INSERT INTO players (username, password_hash, castle_name, map_x, map_y, race) VALUES (?,?,?,?,?,?)",
        (data.username, hashed, data.castle_name, x, y, data.race),
    ) as cur:
        player_id = cur.lastrowid

    await db.execute(
        "INSERT INTO resources (player_id, gold, food, wood, stone) VALUES (?,?,?,?,?)",
        (player_id, STARTING_RESOURCES["gold"], STARTING_RESOURCES["food"],
         STARTING_RESOURCES["wood"], STARTING_RESOURCES["stone"]),
    )

    castle_config = BUILDINGS["castle"]
    castle_hp = castle_config["base_hp"]
    await db.execute(
        "INSERT INTO buildings (player_id, building_type, level, hp, max_hp, pos_x, pos_y) VALUES (?,?,?,?,?,?,?)",
        (player_id, "castle", 1, castle_hp, castle_hp, 5, 5),
    )

    await db.execute(
        "UPDATE map_tiles SET owner_id=? WHERE x=? AND y=?", (player_id, x, y)
    )
    await db.commit()

    token = create_token(player_id, data.username)
    response.set_cookie("auth_token", token, httponly=True, max_age=60 * 60 * 24 * 7)
    return {"token": token, "player_id": player_id, "username": data.username}


@router.post("/login")
async def login(data: LoginRequest, response: Response, db: aiosqlite.Connection = Depends(get_db)):
    async with db.execute(
        "SELECT id, password_hash FROM players WHERE username=?", (data.username,)
    ) as cur:
        row = await cur.fetchone()

    if not row or not verify_password(data.password, row["password_hash"]):
        raise HTTPException(401, "Неверные данные")

    token = create_token(row["id"], data.username)
    response.set_cookie("auth_token", token, httponly=True, max_age=60 * 60 * 24 * 7)
    return {"token": token, "player_id": row["id"], "username": data.username}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("auth_token")
    return {"ok": True}


@router.get("/me")
async def me(player=Depends(get_current_player)):
    return {
        "id": player["id"],
        "username": player["username"],
        "castle_name": player["castle_name"],
        "map_x": player["map_x"],
        "map_y": player["map_y"],
        "score": player["score"],
        "race": player.get("race", "humans"),
    }
