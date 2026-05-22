MAP_WIDTH = 50
MAP_HEIGHT = 50
TICK_INTERVAL = 60  # seconds between resource ticks

BUILDINGS = {
    "castle": {
        "name": "Замок",
        "max_level": 20,
        "base_hp": 5000,
        "base_cost": {"gold": 0, "wood": 0, "stone": 0},
        "level_cost_mult": 1.5,
        "produces": {},
        "description": "Главное здание. Открывает другие постройки."
    },
    "farm": {
        "name": "Ферма",
        "max_level": 20,
        "base_hp": 500,
        "base_cost": {"gold": 100, "wood": 50, "stone": 0},
        "level_cost_mult": 1.4,
        "produces": {"food": 10},
        "description": "Производит еду для армии."
    },
    "sawmill": {
        "name": "Лесопилка",
        "max_level": 20,
        "base_hp": 500,
        "base_cost": {"gold": 100, "food": 50, "stone": 0},
        "level_cost_mult": 1.4,
        "produces": {"wood": 10},
        "description": "Производит дерево."
    },
    "quarry": {
        "name": "Каменоломня",
        "max_level": 20,
        "base_hp": 500,
        "base_cost": {"gold": 150, "wood": 80, "food": 0},
        "level_cost_mult": 1.4,
        "produces": {"stone": 8},
        "description": "Добывает камень."
    },
    "mine": {
        "name": "Золотой рудник",
        "max_level": 20,
        "base_hp": 600,
        "base_cost": {"wood": 200, "stone": 100, "food": 0},
        "level_cost_mult": 1.5,
        "produces": {"gold": 5},
        "description": "Добывает золото."
    },
    "barracks": {
        "name": "Казармы",
        "max_level": 20,
        "base_hp": 800,
        "base_cost": {"gold": 200, "wood": 150, "stone": 50},
        "level_cost_mult": 1.5,
        "produces": {},
        "description": "Обучает пехоту."
    },
    "stables": {
        "name": "Конюшня",
        "max_level": 20,
        "base_hp": 700,
        "base_cost": {"gold": 300, "wood": 200, "stone": 100},
        "level_cost_mult": 1.5,
        "produces": {},
        "description": "Обучает кавалерию."
    },
    "archery": {
        "name": "Стрельбище",
        "max_level": 20,
        "base_hp": 600,
        "base_cost": {"gold": 250, "wood": 200, "stone": 50},
        "level_cost_mult": 1.5,
        "produces": {},
        "description": "Обучает лучников."
    },
    "workshop": {
        "name": "Мастерская",
        "max_level": 20,
        "base_hp": 700,
        "base_cost": {"gold": 400, "wood": 300, "stone": 200},
        "level_cost_mult": 1.6,
        "produces": {},
        "description": "Строит осадные орудия."
    },
    "wall": {
        "name": "Крепостные стены",
        "max_level": 20,
        "base_hp": 10000,
        "base_cost": {"gold": 300, "stone": 500, "wood": 100},
        "level_cost_mult": 1.6,
        "produces": {},
        "defense_bonus": 0.2,
        "description": "Защищает замок."
    },
    "tower": {
        "name": "Сторожевая башня",
        "max_level": 20,
        "base_hp": 3000,
        "base_cost": {"gold": 200, "stone": 300, "wood": 100},
        "level_cost_mult": 1.5,
        "produces": {},
        "defense_bonus": 0.1,
        "description": "Усиливает оборону."
    },
    "warehouse": {
        "name": "Склад",
        "max_level": 20,
        "base_hp": 400,
        "base_cost": {"gold": 150, "wood": 300, "stone": 100},
        "level_cost_mult": 1.4,
        "produces": {},
        "storage_bonus": 500,
        "description": "Увеличивает хранилище ресурсов."
    },
    "academy": {
        "name": "Академия",
        "max_level": 20,
        "base_hp": 600,
        "base_cost": {"gold": 500, "wood": 300, "stone": 300},
        "level_cost_mult": 1.6,
        "produces": {},
        "description": "Изучает технологии."
    },
    "market": {
        "name": "Рынок",
        "max_level": 20,
        "base_hp": 500,
        "base_cost": {"gold": 400, "wood": 200, "stone": 100},
        "level_cost_mult": 1.5,
        "produces": {},
        "description": "Торговля ресурсами с другими игроками."
    },
    "tavern": {
        "name": "Таверна",
        "max_level": 10,
        "base_hp": 400,
        "base_cost": {"gold": 300, "wood": 200, "stone": 50},
        "level_cost_mult": 1.5,
        "produces": {},
        "description": "Нанимает героев."
    },
}

UNITS = {
    "swordsman": {
        "name": "Мечник",
        "building": "barracks",
        "min_building_level": 1,
        "cost": {"gold": 50, "food": 20},
        "train_time": 60,
        "attack": 15,
        "defense": 10,
        "hp": 100,
        "speed": 3,
        "carry": 20,
        "type": "infantry",
        "description": "Базовая пехота."
    },
    "pikeman": {
        "name": "Пикинёр",
        "building": "barracks",
        "min_building_level": 3,
        "cost": {"gold": 80, "wood": 20, "food": 30},
        "train_time": 90,
        "attack": 12,
        "defense": 18,
        "hp": 120,
        "speed": 2,
        "carry": 15,
        "type": "infantry",
        "anti_cavalry": 2.0,
        "description": "Эффективен против конницы."
    },
    "archer": {
        "name": "Лучник",
        "building": "archery",
        "min_building_level": 1,
        "cost": {"gold": 60, "wood": 30, "food": 20},
        "train_time": 80,
        "attack": 18,
        "defense": 6,
        "hp": 80,
        "speed": 3,
        "carry": 15,
        "type": "ranged",
        "range": 2,
        "description": "Дальнобойная пехота."
    },
    "crossbowman": {
        "name": "Арбалетчик",
        "building": "archery",
        "min_building_level": 5,
        "cost": {"gold": 100, "wood": 50, "food": 30},
        "train_time": 120,
        "attack": 28,
        "defense": 8,
        "hp": 90,
        "speed": 2,
        "carry": 15,
        "type": "ranged",
        "range": 3,
        "description": "Мощный дальнобойный боец."
    },
    "knight": {
        "name": "Рыцарь",
        "building": "stables",
        "min_building_level": 1,
        "cost": {"gold": 150, "food": 50},
        "train_time": 150,
        "attack": 25,
        "defense": 20,
        "hp": 200,
        "speed": 5,
        "carry": 30,
        "type": "cavalry",
        "description": "Тяжёлая конница."
    },
    "horse_archer": {
        "name": "Конный лучник",
        "building": "stables",
        "min_building_level": 3,
        "cost": {"gold": 120, "wood": 20, "food": 40},
        "train_time": 130,
        "attack": 20,
        "defense": 12,
        "hp": 150,
        "speed": 6,
        "carry": 25,
        "type": "cavalry",
        "range": 2,
        "description": "Быстрый и манёвренный."
    },
    "catapult": {
        "name": "Катапульта",
        "building": "workshop",
        "min_building_level": 1,
        "cost": {"gold": 300, "wood": 200, "stone": 100},
        "train_time": 300,
        "attack": 60,
        "defense": 5,
        "hp": 150,
        "speed": 1,
        "carry": 0,
        "type": "siege",
        "vs_buildings": 3.0,
        "description": "Разрушает здания."
    },
    "trebuchet": {
        "name": "Требушет",
        "building": "workshop",
        "min_building_level": 5,
        "cost": {"gold": 500, "wood": 350, "stone": 200},
        "train_time": 600,
        "attack": 100,
        "defense": 3,
        "hp": 120,
        "speed": 1,
        "carry": 0,
        "type": "siege",
        "vs_buildings": 5.0,
        "description": "Мощнейшее осадное орудие."
    },
}

TECHNOLOGIES = {
    "iron_weapons": {
        "name": "Железное оружие",
        "cost": {"gold": 500, "stone": 200},
        "research_time": 3600,
        "effect": {"attack_bonus": 0.1},
        "requires": [],
        "academy_level": 1,
    },
    "steel_armor": {
        "name": "Стальная броня",
        "cost": {"gold": 800, "stone": 300},
        "research_time": 7200,
        "effect": {"defense_bonus": 0.1},
        "requires": ["iron_weapons"],
        "academy_level": 3,
    },
    "siege_mastery": {
        "name": "Осадное мастерство",
        "cost": {"gold": 1000, "wood": 500, "stone": 500},
        "research_time": 10800,
        "effect": {"siege_bonus": 0.3},
        "requires": ["iron_weapons"],
        "academy_level": 5,
    },
    "cavalry_tactics": {
        "name": "Конная тактика",
        "cost": {"gold": 700, "food": 300},
        "research_time": 5400,
        "effect": {"cavalry_bonus": 0.15},
        "requires": [],
        "academy_level": 2,
    },
    "fortification": {
        "name": "Фортификация",
        "cost": {"gold": 600, "stone": 400, "wood": 200},
        "research_time": 7200,
        "effect": {"wall_bonus": 0.2},
        "requires": [],
        "academy_level": 2,
    },
}

STARTING_RESOURCES = {
    "gold": 500,
    "food": 300,
    "wood": 300,
    "stone": 200,
}

BASE_STORAGE = {
    "gold": 2000,
    "food": 2000,
    "wood": 2000,
    "stone": 2000,
}

SECRET_KEY = "medieval_secret_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
