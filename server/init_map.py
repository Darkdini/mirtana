"""Generate initial map tiles. Run once before starting the server."""
import asyncio
import math
import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "medieval.db")
MAP_W = 50
MAP_H = 50


def noise(x, y):
    return (math.sin(x * 0.7 + y * 1.3) + 1) / 2


async def main():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS map_tiles (
                x INTEGER NOT NULL, y INTEGER NOT NULL,
                tile_type TEXT DEFAULT 'grass',
                resource_type TEXT DEFAULT NULL,
                resource_amount INTEGER DEFAULT 0,
                owner_id INTEGER DEFAULT NULL,
                PRIMARY KEY(x, y)
            )
        """)
        tiles = []
        for x in range(MAP_W):
            for y in range(MAP_H):
                n = noise(x, y)
                if n < 0.05:
                    tile = 'water'
                    res = None
                elif n > 0.92:
                    tile = 'mountain'
                    res = 'stone'
                elif n > 0.82:
                    tile = 'forest'
                    res = 'wood'
                else:
                    tile = 'grass'
                    res = None
                tiles.append((x, y, tile, res, 100 if res else 0))

        await db.executemany(
            "INSERT OR IGNORE INTO map_tiles (x,y,tile_type,resource_type,resource_amount) VALUES (?,?,?,?,?)",
            tiles
        )
        await db.commit()
    print(f"Map generated: {MAP_W}x{MAP_H} = {MAP_W*MAP_H} tiles")


if __name__ == '__main__':
    asyncio.run(main())
