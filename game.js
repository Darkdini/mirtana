'use strict';
// game.js — игровая логика СРЕДНЕВЕКОВЬЕ

// ─── РАСЫ ───────────────────────────────────────────────────────────
const RACES = {
  human: { name: 'Люди',  bonus: 'Железо +20%', color: '#c8a060' },
  elf:   { name: 'Эльфы', bonus: 'Дерево +20%', color: '#60c860' },
  dwarv: { name: 'Гномы', bonus: 'Камень +20%', color: '#a0a0c0' },
  orc:   { name: 'Орки',  bonus: 'Атака ×2, защита слабее', color: '#60a060' },
};

const RES       = ['gold','wood','stone','food','iron','people'];
const RES_LABEL = { gold:'Золото', wood:'Дерево', stone:'Камень', food:'Еда', iron:'Железо', people:'Люди' };
const RES_IMG   = { gold:'res/gold.png', wood:'res/wood.png', stone:'res/stone.png', food:'res/food.png', iron:'res/iron.png', people:'res/people.png' };

// ─── ЗДАНИЯ ЗАМКА ───────────────────────────────────────────────────
const BUILDINGS = {
  castle:     { name:'Ратуша',          img:'build/castle.png',     unique:true,              cost:{wood:200,stone:200,iron:50},  time:120, max:10 },
  storage:    { name:'Склад',           img:'build/storage.png',                              cost:{wood:80,stone:120,iron:0},   time:60,  max:49 },
  market:     { name:'Рынок',           img:'build/market.png',     unique:true, req:{castle:2}, cost:{wood:120,stone:60,iron:0},  time:90,  max:15 },
  treasury:   { name:'Сокровищница',    img:'build/reasury.png',    unique:true, req:{castle:5}, cost:{wood:100,stone:200,iron:80}, time:180 },
  commerce:   { name:'Торговый центр',  img:'build/commerce.png',   unique:true, req:{market:3}, cost:{wood:200,stone:100,iron:50}, time:200, max:15 },
  barracks:   { name:'Казарма',         img:'build/baraks.png',     unique:true, req:{castle:2}, cost:{wood:80,stone:120,iron:60},  time:120, max:20 },
  stables:    { name:'Конюшня',         img:'build/stables.png',    unique:true, req:{castle:3}, cost:{wood:140,stone:80,iron:60},  time:160, max:20 },
  smithy:     { name:'Кузница',         img:'build/smith.png',      unique:true, req:{castle:3}, cost:{wood:60,stone:120,iron:80},  time:120, max:20 },
  workshop:   { name:'Мастерская',      img:'build/workshop.png',   unique:true, req:{castle:3}, cost:{wood:80,stone:160,iron:40},  time:120, max:20 },
  guard_tower:{ name:'Сторож.башня',    img:'build/guard_tower.png',unique:true, req:{castle:3}, cost:{wood:120,stone:160,iron:60}, time:200, max:20 },
  university: { name:'Университет',     img:'build/university.png', unique:true, req:{castle:5}, cost:{wood:200,stone:200,iron:100},time:300, max:15 },
  magscool:   { name:'Акад.магов',      img:'build/magscool.png',   unique:true, req:{castle:5}, cost:{wood:300,stone:200,iron:100},time:360, max:15 },
  magtower:   { name:'Башня арт.',      img:'build/magtower.png',   unique:true, req:{castle:5}, cost:{wood:150,stone:300,iron:100},time:300, max:15 },
  alchimia:   { name:'Алхимик',         img:'build/alchimia.png',   unique:true, req:{castle:4}, cost:{wood:60,stone:120,iron:80},  time:180 },
  temple:     { name:'Храм',            img:'build/temple.png',     unique:true, req:{castle:4}, cost:{wood:200,stone:300,iron:50},  time:240, max:20,
                desc:'Лояльность +5/ч за уровень. Строй больше Храмов!' },
  beer:       { name:'Пивоварня',       img:'build/beer.png',       unique:true, req:{castle:3}, cost:{wood:100,stone:60,iron:0},   time:120, max:20,
                desc:'Лояльность +2/ч за уровень.' },
  secret:     { name:'Тайник',          img:'build/secret.png',     unique:true, req:{castle:2}, cost:{wood:120,stone:60,iron:30},  time:90  },
  wisdom:     { name:'Дом мудрецов',    img:'build/wisdom_house.png',unique:true,req:{castle:3}, cost:{wood:80,stone:60,iron:30},   time:120 },
  gendel:     { name:'Гильдия',         img:'build/gendel.png',     unique:true, req:{castle:4}, cost:{wood:120,stone:80,iron:60},  time:180 },
  resident:   { name:'Шпионаж',         img:'build/resident.png',   unique:true, req:{castle:5}, cost:{wood:100,stone:100,iron:50}, time:180 },
  diplomat:   { name:'Дипломатия',      img:'build/diplomat.png',   unique:true, req:{castle:4}, cost:{wood:80,stone:80,iron:40},   time:150, max:20,
                desc:'Уровень × 2 = максимум участников альянса (до 40). Ур.3+ для вступления.' },
  spycentr:   { name:'Центр разведки',  img:'build/spycentr.png',   unique:true, req:{resident:3},cost:{wood:150,stone:100,iron:80},time:220 },
  expedition: { name:'Лагерь арх.',     img:'build/expedition.png', unique:true, req:{castle:4}, cost:{wood:160,stone:80,iron:0},   time:200,
                desc:'Запускай экспедиции (500 золота, 10 мин) для поиска артефактов.' },
  portal:     { name:'Портал',          img:'build/portal.png',     unique:true, req:{castle:7}, cost:{wood:300,stone:300,iron:200},time:600 },
  traveler:   { name:'Дом путеш.',      img:'build/traveler.png',   unique:true, req:{castle:6}, cost:{wood:200,stone:200,iron:100},time:300 },
  arhcamp:    { name:'Лагерь героя',    img:'build/arhcamp.png',    unique:true, req:{castle:5}, cost:{wood:180,stone:120,iron:100},time:250 },
  // ── Третий мир: Война Королей ─────────────────────────────────────
  wall:       { name:'Стена',           img:'build/mbases.png',     unique:true, req:{castle:2}, cost:{wood:80,stone:200,iron:60},  time:180, max:20,
                desc:'Каждый уровень повышает защиту замка на 5%. Макс. ур.20 = +100%' },
  trap:       { name:'Капканщик',       img:'build/chip.png',       unique:true, req:{castle:3}, cost:{wood:120,stone:60,iron:80},  time:150, max:10,
                desc:'Строит ловушки трёх типов (простые→ур.3, элитные→ур.7, универсальные→ур.10). Перехватывает часть атакующих.' },
  prison:     { name:'Темница',         img:'build/secret.png',     unique:true, req:{trap:3},   cost:{wood:100,stone:200,iron:60},  time:200, max:5,
                desc:'Держит пленных, захваченных ловушками. +50 пленных/уровень.' },
  watchtower: { name:'Дозорная башня',  img:'build/guard_tower.png',unique:true, req:{castle:4}, cost:{wood:160,stone:200,iron:80},  time:220, max:10,
                desc:'Раннее обнаружение врага. Каждый уровень увеличивает время предупреждения на 5 мин.' },
  magicschool:{ name:'Школа магии',     img:'build/magtower.png',   unique:true, req:{castle:5}, cost:{wood:200,stone:200,iron:100}, time:300, max:20,
                desc:'Каждый уровень повышает маг.атаку и маг.защиту войск на 2%.' },
  kazenotos:  { name:'Каменотёс',       img:'build/storage.png',    unique:true, req:{castle:3}, cost:{wood:60,stone:180,iron:80},   time:150, max:20,
                desc:'Повышает прочность зданий. Каждый уровень снижает шанс разрушения здания на 5%.' },
  military_hq:{ name:'Военный штаб',    img:'build/baraks.png',     unique:true, req:{castle:2}, cost:{wood:100,stone:80,iron:60},   time:120, max:10,
                desc:'Управление армиями, подкреплениями и походами. Здесь воскрешают павших генералов.' },
};

// ─── ЗДАНИЯ ЗЕМЕЛЬ ──────────────────────────────────────────────────
const LAND_BUILDINGS = {
  farm_small:   { name:'Ферма',        img:'build/farm_small.png',   terrain:'grass', produces:'food',   basePerHour:80,  lvlImg:['build/farm_small.png','build/farm_avg.png','build/farm_big.png'] },
  sawmill_small:{ name:'Лесопилка',    img:'build/sawmill_small.png',terrain:'forest',produces:'wood',   basePerHour:60,  lvlImg:['build/sawmill_small.png','build/sawmill_avg.png','build/sawmill_big.png'] },
  stone_small:  { name:'Каменоломня',  img:'build/stone_small.png',  terrain:'stone', produces:'stone',  basePerHour:60,  lvlImg:['build/stone_small.png','build/stone_avg.png','build/stone_big.png'] },
  iron_small:   { name:'Жел.рудник',   img:'build/iron_small.png',   terrain:'stone', produces:'iron',   basePerHour:50,  lvlImg:['build/iron_small.png','build/iron_avg.png','build/iron_big.png'] },
  house_small:  { name:'Дом',          img:'build/house_small.png',  terrain:'grass', produces:'people', basePerHour:8,   capacity:50, lvlImg:['build/house_small.png','build/house_avg.png','build/house_big.png'] },
};

// ─── ЮНИТЫ ──────────────────────────────────────────────────────────
const UNITS = {
  // Люди
  human_swordman:  { name:'Мечник',    race:'human',img:'units/human/swordman.png',  simg:'smallunits/human/swordman.png',  atk:30, def:35, hp:40, speed:18,carry:60, upkeep:2,building:'barracks', trainTime:60, reqLvl:1,cost:{wood:50,iron:80,food:30},people:1 },
  human_javelineer:{ name:'Копейщик',  race:'human',img:'units/human/javelineer.png',simg:'smallunits/human/javelineer.png',atk:20, def:50, hp:35, speed:22,carry:50, upkeep:2,building:'barracks', trainTime:50, reqLvl:1,cost:{wood:80,iron:30,food:30},people:1 },
  human_scout:     { name:'Разведчик', race:'human',img:'units/human/scout.png',     simg:'smallunits/human/scout.png',     atk:15, def:15, hp:20, speed:8, carry:30, upkeep:1,building:'barracks', trainTime:40, reqLvl:1,cost:{wood:40,iron:20,food:20},people:1 },
  human_knight:    { name:'Рыцарь',    race:'human',img:'units/human/knight.png',    simg:'smallunits/human/knight.png',    atk:80, def:60, hp:80, speed:8, carry:100,upkeep:5,building:'stables',  trainTime:200,reqLvl:1,cost:{wood:60,iron:140,food:80},people:1 },
  human_paladin:   { name:'Паладин',   race:'human',img:'units/human/paladin.png',   simg:'smallunits/human/paladin.png',   atk:90, def:80, hp:100,speed:10,carry:80, upkeep:6,building:'stables',  trainTime:280,reqLvl:3,cost:{wood:80,iron:160,food:100},people:1 },
  human_mage:      { name:'Маг',       race:'human',img:'units/human/mage.png',      simg:'smallunits/human/mage.png',      atk:90, def:20, hp:35, speed:12,carry:30, upkeep:4,building:'magscool', trainTime:240,reqLvl:1,cost:{wood:30,iron:30,food:60},people:1 },
  human_general:   { name:'Генерал',   race:'human',img:'units/human/general.png',   simg:'smallunits/human/general.png',   atk:150,def:120,hp:200,speed:12,carry:150,upkeep:10,building:'university',trainTime:600,reqLvl:5,cost:{wood:200,iron:300,food:200},people:1 },
  // Эльфы
  elf_fighter:     { name:'Воин',      race:'elf',  img:'units/elf/fighter.png',     simg:'smallunits/elf/fighter.png',     atk:25, def:30, hp:35, speed:16,carry:50, upkeep:2,building:'barracks', trainTime:55, reqLvl:1,cost:{wood:60,iron:50,food:30},people:1 },
  elf_archer:      { name:'Лучник',    race:'elf',  img:'units/elf/archer.png',      simg:'smallunits/elf/archer.png',      atk:50, def:15, hp:25, speed:14,carry:40, upkeep:2,building:'barracks', trainTime:75, reqLvl:1,cost:{wood:80,iron:20,food:30},people:1 },
  elf_scout:       { name:'Разведчик', race:'elf',  img:'units/elf/scout.png',       simg:'smallunits/elf/scout.png',       atk:18, def:18, hp:22, speed:7, carry:35, upkeep:1,building:'barracks', trainTime:38, reqLvl:1,cost:{wood:50,iron:15,food:20},people:1 },
  elf_kenaur:      { name:'Кентавр',   race:'elf',  img:'units/elf/kenaur.png',      simg:'smallunits/elf/kenaur.png',      atk:70, def:55, hp:75, speed:7, carry:90, upkeep:5,building:'stables',  trainTime:190,reqLvl:1,cost:{wood:100,iron:60,food:80},people:1 },
  elf_edinorog:    { name:'Единорог',  race:'elf',  img:'units/elf/edinorog.png',    simg:'smallunits/elf/edinorog.png',    atk:80, def:70, hp:90, speed:8, carry:80, upkeep:6,building:'stables',  trainTime:250,reqLvl:3,cost:{wood:120,iron:40,food:100},people:1 },
  elf_ent:         { name:'Энт',       race:'elf',  img:'units/elf/ent.png',         simg:'smallunits/elf/ent.png',         atk:100,def:120,hp:150,speed:25,carry:120,upkeep:7,building:'magscool', trainTime:350,reqLvl:1,cost:{wood:200,iron:0,food:100},people:1 },
  elf_create:      { name:'Созидатель',race:'elf',  img:'units/elf/create.png',      simg:'smallunits/elf/create.png',      atk:85, def:25, hp:40, speed:11,carry:35, upkeep:4,building:'magscool', trainTime:230,reqLvl:1,cost:{wood:80,iron:40,food:80},people:1 },
  elf_general:     { name:'Генерал',   race:'elf',  img:'units/elf/general.png',     simg:'smallunits/elf/general.png',     atk:140,def:110,hp:180,speed:11,carry:140,upkeep:9,building:'university',trainTime:580,reqLvl:5,cost:{wood:200,iron:200,food:200},people:1 },
  // Гномы
  dwarv_fighter:   { name:'Воин',      race:'dwarv',img:'units/dwarv/fighter.png',   simg:'smallunits/dwarv/fighter.png',   atk:35, def:45, hp:50, speed:20,carry:70, upkeep:3,building:'barracks', trainTime:65, reqLvl:1,cost:{wood:40,iron:100,food:30},people:1 },
  dwarv_defender:  { name:'Защитник',  race:'dwarv',img:'units/dwarv/defender.png',  simg:'smallunits/dwarv/defender.png',  atk:20, def:70, hp:60, speed:25,carry:60, upkeep:3,building:'barracks', trainTime:70, reqLvl:1,cost:{wood:30,iron:120,food:30},people:1 },
  dwarv_arbalet:   { name:'Арбалетчик',race:'dwarv',img:'units/dwarv/arbalet.png',   simg:'smallunits/dwarv/arbalet.png',   atk:55, def:20, hp:30, speed:16,carry:45, upkeep:2,building:'barracks', trainTime:85, reqLvl:2,cost:{wood:60,iron:80,food:30},people:1 },
  dwarv_revolver:  { name:'Пушкарь',   race:'dwarv',img:'units/dwarv/revolver.png',  simg:'smallunits/dwarv/revolver.png',  atk:100,def:30, hp:45, speed:20,carry:50, upkeep:4,building:'stables',  trainTime:220,reqLvl:1,cost:{wood:60,iron:180,food:60},people:1 },
  dwarv_gryphon:   { name:'Грифон',    race:'dwarv',img:'units/dwarv/gryphon.png',   simg:'smallunits/dwarv/gryphon.png',   atk:90, def:65, hp:85, speed:9, carry:95, upkeep:6,building:'stables',  trainTime:260,reqLvl:3,cost:{wood:80,iron:120,food:100},people:1 },
  dwarv_yeti:      { name:'Йети',      race:'dwarv',img:'units/dwarv/yeti.png',      simg:'smallunits/dwarv/yeti.png',      atk:110,def:100,hp:130,speed:22,carry:110,upkeep:7,building:'magscool', trainTime:320,reqLvl:1,cost:{wood:100,iron:60,food:120},people:1 },
  dwarv_elder:     { name:'Старейшина',race:'dwarv',img:'units/dwarv/elder.png',     simg:'smallunits/dwarv/elder.png',     atk:80, def:40, hp:50, speed:14,carry:40, upkeep:4,building:'magscool', trainTime:210,reqLvl:1,cost:{wood:60,iron:60,food:80},people:1 },
  dwarv_general:   { name:'Генерал',   race:'dwarv',img:'units/dwarv/general.png',   simg:'smallunits/dwarv/general.png',   atk:160,def:130,hp:210,speed:13,carry:160,upkeep:10,building:'university',trainTime:620,reqLvl:5,cost:{wood:200,iron:350,food:200},people:1 },
  // Орки — агрессивная раса: атака ×2, защита слабее
  orc_marauder:  { name:'Мародёр',    race:'orc',  img:'units/unical/shadow.png',    simg:'smallunits/unical/shadow.png',   atk:40, def:10, hp:30, speed:11,carry:101,upkeep:2,building:'barracks', trainTime:45, reqLvl:1,cost:{wood:30,iron:60,food:20},people:1 },
  orc_brawler:   { name:'Бугай',      race:'orc',  img:'units/unical/giant.png',     simg:'smallunits/unical/giant.png',    atk:50, def:15, hp:35, speed:4, carry:60, upkeep:3,building:'barracks', trainTime:70, reqLvl:3,cost:{wood:40,iron:80,food:30},people:1 },
  orc_scout:     { name:'Загонщик',   race:'orc',  img:'units/unical/oko.png',       simg:'smallunits/unical/oko.png',      atk:20, def:10, hp:20, speed:15,carry:40, upkeep:1,building:'barracks', trainTime:35, reqLvl:1,cost:{wood:30,iron:20,food:15},people:1 },
  orc_tyrant:    { name:'Тиран',      race:'orc',  img:'units/unical/valkiriya.png', simg:'smallunits/unical/valkiriya.png',atk:120,def:25, hp:60, speed:7, carry:80, upkeep:6,building:'stables',  trainTime:240,reqLvl:3,cost:{wood:80,iron:160,food:80},people:1 },
  orc_catapult:  { name:'Катапульта', race:'orc',  img:'units/unical/katapulta.png', simg:'smallunits/unical/katapulta.png',atk:200,def:5,  hp:40, speed:3, carry:10, upkeep:8,building:'workshop', trainTime:400,reqLvl:1,cost:{wood:300,iron:150,food:50},people:2 },
  orc_ram:       { name:'Таран',      race:'orc',  img:'units/unical/taran.png',     simg:'smallunits/unical/taran.png',    atk:150,def:10, hp:50, speed:4, carry:20, upkeep:6,building:'workshop', trainTime:350,reqLvl:1,cost:{wood:250,iron:100,food:40},people:2 },
  orc_shaman:    { name:'Шаман',      race:'orc',  img:'units/dwarv/elder.png',      simg:'smallunits/dwarv/elder.png',     atk:130,def:30, hp:80, speed:6, carry:50, upkeep:8,building:'magscool', trainTime:450,reqLvl:1,cost:{wood:100,iron:100,food:150},people:1 },
  orc_general:   { name:'Генерал',    race:'orc',  img:'units/dwarv/general.png',    simg:'smallunits/dwarv/general.png',   atk:300,def:80, hp:250,speed:8, carry:200,upkeep:12,building:'university',trainTime:700,reqLvl:5,cost:{wood:250,iron:400,food:250},people:1 },
};

// ─── ТЕХНОЛОГИИ ─────────────────────────────────────────────────────
const TECHS = {
  iron_working: { name:'Обработка железа', cat:'mil',  req:{ smithy:2 },      cost:{ gold:500,  wood:200,  iron:300         }, effect:'Урон войск +10%'              },
  horse_breed:  { name:'Коневодство',      cat:'mil',  req:{ stables:2 },     cost:{ gold:400,  food:300,  iron:100         }, effect:'Скорость конницы +20%'        },
  siege_eng:    { name:'Осадное дело',     cat:'mil',  req:{ workshop:3 },    cost:{ gold:800,  wood:500,  iron:400         }, effect:'Открывает осадные орудия'     },
  alchemy:      { name:'Алхимия',          cat:'sci',  req:{ alchimia:2 },    cost:{ gold:600,  stone:300, iron:200         }, effect:'Производство всех ресурсов +15%'},
  magic_shield: { name:'Магический щит',   cat:'sci',  req:{ magscool:2 },    cost:{ gold:700,  stone:400               }, effect:'Потери в бою -20%'            },
  trade_routes: { name:'Торговые пути',    cat:'econ', req:{ market:2 },      cost:{ gold:300,  wood:200                }, effect:'Базовое золото +50/ч'         },
  agriculture:  { name:'Агрикультура',     cat:'econ', req:{               }, cost:{ gold:400,  food:500                }, effect:'Производство еды +20%'        },
  architecture: { name:'Архитектура',      cat:'inf',  req:{ castle:4 },      cost:{ gold:500,  stone:400, wood:300     }, effect:'Время строительства -20%'     },
  cartography:  { name:'Картография',      cat:'dip',  req:{ expedition:1 },  cost:{ gold:400,  wood:100                }, effect:'Радар мира +5'                },
  espionage:    { name:'Шпионаж',          cat:'dip',  req:{ resident:2 },    cost:{ gold:600,  iron:200               }, effect:'Разведка +50%'                },
};

// ─── АРТЕФАКТЫ ──────────────────────────────────────────────────────
const ARTIFACTS = {
  sword_of_power:    { name:'Меч силы',           desc:'Атака +15%',                 atkBonus:0.15 },
  shield_of_faith:   { name:'Щит веры',           desc:'Защита +15%',                defBonus:0.15 },
  horn_of_plenty:    { name:'Рог изобилия',       desc:'Все ресурсы +10%',           resBonus:0.10 },
  ring_of_speed:     { name:'Кольцо скорости',    desc:'Скорость войск +20%',        speedBonus:0.20 },
  crown_of_loyalty:  { name:'Корона лояльности',  desc:'Лояльность +20',             loyaltyBonus:20 },
  tome_of_magic:     { name:'Фолиант магии',      desc:'Маг.атака +20%',             magAtkBonus:0.20 },
  builders_hammer:   { name:'Молот зодчего',      desc:'Строительство -20% времени', buildTimeBonus:-0.20 },
  crown_of_kings:    { name:'Корона Королей',     desc:'Все бонусы +10%',            allBonus:0.10, superArtifact:true },
};

// ─── РЕЛИКВИИ ────────────────────────────────────────────────────────
const RELICS = {
  relic_1:  'Меч Хаоса',
  relic_2:  'Щит Света',
  relic_3:  'Кубок Судьбы',
  relic_4:  'Посох Бурь',
  relic_5:  'Сердце Дракона',
  relic_6:  'Перо Феникса',
  relic_7:  'Камень Вечности',
  relic_8:  'Книга Теней',
  relic_9:  'Горн Войны',
  relic_10: 'Чаша Исцеления',
  relic_11: 'Кольцо Силы',
  relic_12: 'Корона Тьмы',
};

// ─── РЕЙТИНГ ────────────────────────────────────────────────────────
const RATING_WEIGHTS = {
  castle:10, barracks:6, stables:6, smithy:5, university:8,
  magscool:7, magtower:7, market:5, treasury:6, temple:4,
  storage:3, workshop:4, guard_tower:4, alchimia:5, beer:3,
  secret:3, diplomat:5, resident:5, expedition:4, commerce:6,
  wisdom:3, gendel:4, spycentr:5, portal:15, traveler:8, arhcamp:6,
  wall:8, trap:5, prison:4, watchtower:6, magicschool:7, kazenotos:5, military_hq:8,
  farm_small:2, sawmill_small:2, stone_small:2, iron_small:2, house_small:2,
};

function calcRating(p) {
  let pts = 0;
  for (const c of [...(p.castle || []), ...(p.lands || [])]) {
    if (!c.bldId || !c.level) continue;
    const w = RATING_WEIGHTS[c.bldId] || 1;
    for (let lv = 1; lv <= c.level; lv++) pts += Math.round(w * lv * 1.5);
  }
  for (const uid in (p.army || {})) pts += Math.floor((p.army[uid] || 0) * 0.5);
  pts += Object.keys(p.techs || {}).length * 20;
  return pts;
}

function ratingDelta(bldId, toLvl) {
  return Math.round((RATING_WEIGHTS[bldId] || 1) * toLvl * 1.5);
}

// ─── РАЗМЕРЫ КАРТ ───────────────────────────────────────────────────
const CASTLE_COLS = 7, CASTLE_ROWS = 7;
const LANDS_COLS  = 10, LANDS_ROWS = 10;
const WORLD_COLS  = 20, WORLD_ROWS = 20;
const MAX_PLAYERS_PER_PROVINCE = 10;
const OASES_PER_PROVINCE = 3;

function isCastleWall(col, row) { return col===0||row===0||col===CASTLE_COLS-1||row===CASTLE_ROWS-1; }
function isLandsWall(col, row)  { return col===0||row===0||col===LANDS_COLS-1||row===LANDS_ROWS-1; }

function mulberry32(a) {
  return () => { let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
}
function strHash(s) { let h=5381; for (const ch of s) h=((h<<5)+h+ch.charCodeAt(0))|0; return h>>>0; }
function gridDist(a,b) { return Math.abs(a.col-b.col)+Math.abs(a.row-b.row); }

// ─── СОЗДАНИЕ КАРТ ──────────────────────────────────────────────────
function createCastleGrid() {
  const grid = [];
  for (let row=0; row<CASTLE_ROWS; row++)
    for (let col=0; col<CASTLE_COLS; col++) {
      const wall = isCastleWall(col, row);
      const center = (col===3 && row===3);
      grid.push({ col, row, type: wall?'wall':'inner', bldId: center?'castle':null, level: center?1:0 });
    }
  return grid;
}

function createLandsGrid(seed) {
  const rng = mulberry32(seed || 12345);
  const grid = [];
  for (let row=0; row<LANDS_ROWS; row++)
    for (let col=0; col<LANDS_COLS; col++) {
      const wall = isLandsWall(col, row);
      let type = 'grass';
      if (!wall) { const r=rng(); if(r<0.25) type='forest'; else if(r<0.45) type='stone'; }
      grid.push({ col, row, type: wall?'wall':type, bldId:null, level:0 });
    }
  const farm = grid.find(c=>!isLandsWall(c.col,c.row)&&c.type==='grass');
  if (farm) { farm.bldId='farm_small'; farm.level=1; }
  return grid;
}

function createWorldGrid() {
  const rng = mulberry32(99999);
  return Array.from({length:WORLD_ROWS}, (_,row) =>
    Array.from({length:WORLD_COLS}, (_,col) => {
      const r = rng();
      const type = r<0.08 ? 'bandit' : 'empty';
      return { col, row, type, power: type==='bandit'?50+Math.floor(rng()*250):0, player:null, race:null, lvl:1, resource:null, relic:null };
    })
  ).flat();
}

// Инициализация 12 реликвий на случайных bandit-клетках
function initRelics(world) {
  const bandits = world.filter(c => c.type === 'bandit');
  const rng = mulberry32(55555);
  const relicKeys = Object.keys(RELICS);
  const chosen = [];
  const pool = [...bandits];
  for (let i = 0; i < Math.min(12, pool.length); i++) {
    const idx = Math.floor(rng() * pool.length);
    const cell = pool.splice(idx, 1)[0];
    cell.relic = relicKeys[i % relicKeys.length];
    chosen.push(cell);
  }
}

function initProvince(world) {
  const empties = world.filter(c=>c.type==='empty');
  const rng = mulberry32(77777);
  const oasisRes = ['wood','stone','iron','food'];
  for (let i=0; i<OASES_PER_PROVINCE; i++) {
    if (!empties.length) break;
    const idx = Math.floor(rng()*empties.length);
    const cell = empties.splice(idx, 1)[0];
    cell.type = 'oasis'; cell.resource = oasisRes[i%oasisRes.length];
  }
}

function createPlayer(race, kingdom) {
  const now = Date.now();
  return {
    race, kingdom, ts: now, created: now,
    res:    { gold:8000, wood:6000, stone:6000, food:5000, iron:3000, people:150 },
    resMax: { gold:20000,wood:10000,stone:10000,food:10000,iron:8000, people:500 },
    castle: createCastleGrid(),
    lands:  createLandsGrid(strHash(kingdom)),
    queue: [], trainQueue: [], army: {}, marches: [],
    reports: [{ t:now, txt:'Добро пожаловать! У вас есть 3 дня защиты от атак.', kind:'info' }],
    worldPos: null,
    techs: {},
    avatar: null, avatarBg: null, photo: null,
    // ── TWWK механики ─────────────────────────────────────────────
    loyalty: 100,                                       // лояльность 0–100
    oases: [],                                          // захваченные оазисы [{resource,col,row}]
    protectedUntil: now + 3 * 24 * 3600 * 1000,        // 3 дня защиты новичка
    deadGenerals: [],                                   // [{uid, count, diedAt, resurrectCost}]
    // ── Генералы ──────────────────────────────────────────────────
    generals: {},                                       // {uid: {xp, level}}
    generalNames: {},                                   // {uid: 'Кастомное имя'}
    // ── Артефакты ─────────────────────────────────────────────────
    artifacts: [],                                      // артефакты в инвентаре
    activeArtifacts: [],                                // активированные (макс. 5)
    expedition: null,                                   // {startedAt, duration}
    // ── Реликвии ──────────────────────────────────────────────────
    relics: [],                                         // собранные реликвии
    // ── Шпионаж ───────────────────────────────────────────────────
    spyCooldown: 0,                                     // timestamp окончания кулдауна
    // ── Рынок ─────────────────────────────────────────────────────
    marketOrders: [],                                   // [{id,type,res,amount,price,createdAt}]
    // ── Квесты ────────────────────────────────────────────────────
    quests: {},                                         // { questId: {progress, done, claimed} }
  };
}

function placePlayerOnWorld(world, username, race) {
  const free = world.filter(c=>c.type==='empty');
  if (!free.length) return null;
  const idx = strHash(username) % free.length;
  const cell = free[idx];
  cell.type='player'; cell.player=username; cell.race=race; cell.lvl=1;
  return { col:cell.col, row:cell.row };
}

// ─── БАЛАНС ─────────────────────────────────────────────────────────
function buildingProduction(bldId, level, race, techs) {
  const b = LAND_BUILDINGS[bldId]; if (!b || !b.produces) return 0;
  let p = b.basePerHour * Math.pow(1.3, level-1);
  if (race==='human' && b.produces==='iron')  p *= 1.2;
  if (race==='elf'   && b.produces==='wood')  p *= 1.2;
  if (race==='dwarv' && b.produces==='stone') p *= 1.2;
  if (race==='orc'   && b.produces==='food')  p *= 1.3;
  if (techs) {
    if (techs.agriculture && b.produces==='food') p *= 1.2;
    if (techs.alchemy)                            p *= 1.15;
  }
  return Math.round(p);
}

// Уровень дипломатического центра
function getDiplomatLevel(p) {
  for (const c of (p.castle||[])) if (c.bldId==='diplomat' && c.level>0) return c.level;
  return 0;
}

// ─── СИСТЕМА ГЕНЕРАЛОВ ───────────────────────────────────────────────
// Возвращает бонусы генерала по его уровню
// level 1: cmdAtk=5%, cmdDef=3%, medicine=0%
// каждый уровень: +3% cmdAtk, +2% cmdDef, +1% medicine
function getGeneralBonus(p, uid) {
  const g = (p.generals || {})[uid];
  const level = g ? g.level : 1;
  return {
    cmdAtk:   (2 + level * 3) / 100,   // level1=5%, level2=8%, ...
    cmdDef:   (1 + level * 2) / 100,   // level1=3%, level2=5%, ...
    medicine: (level - 1) / 100,        // level1=0%, level2=1%, ...
  };
}

// Начисление XP генералу и проверка левелапа
function awardGeneralXP(p, uid, win) {
  if (!uid || !uid.endsWith('_general')) return;
  if (!p.generals) p.generals = {};
  if (!p.generals[uid]) p.generals[uid] = { xp: 0, level: 1 };
  const g = p.generals[uid];
  g.xp += win ? 50 : 20;
  const xpNeed = 100 * Math.pow(g.level, 2);
  if (g.xp >= xpNeed) {
    g.xp -= xpNeed;
    g.level += 1;
    const genName = UNITS[uid]?.name || uid;
    addReport(p, `⭐ Генерал «${genName}» достиг уровня ${g.level}!`, 'info');
  }
}

// Возвращает боевые бонусы из построенных зданий и артефактов
function getCombatBonuses(p) {
  let smithyLvl=0, magSchoolLvl=0, wallLvl=0, trapLvl=0, kazenotosLvl=0;
  for (const c of p.castle) {
    if (c.bldId==='smithy')      smithyLvl    = Math.max(smithyLvl,    c.level);
    if (c.bldId==='magicschool') magSchoolLvl = Math.max(magSchoolLvl, c.level);
    if (c.bldId==='wall')        wallLvl      = Math.max(wallLvl,      c.level);
    if (c.bldId==='trap')        trapLvl      = Math.max(trapLvl,      c.level);
    if (c.bldId==='kazenotos')   kazenotosLvl = Math.max(kazenotosLvl, c.level);
  }
  // Типы ловушек по уровню: 1-3=простые, 4-6=элитные, 7-10=универсальные
  const trapType = trapLvl >= 7 ? 'universal' : trapLvl >= 4 ? 'elite' : 'simple';
  let atkMul = 1, defMul = 1, magMul = 1;
  // Бонусы артефактов
  for (const artId of (p.activeArtifacts || [])) {
    const art = ARTIFACTS[artId];
    if (!art) continue;
    if (art.atkBonus)    atkMul *= (1 + art.atkBonus);
    if (art.defBonus)    defMul *= (1 + art.defBonus);
    if (art.magAtkBonus) magMul *= (1 + art.magAtkBonus);
    if (art.allBonus)  { atkMul *= (1 + art.allBonus); defMul *= (1 + art.allBonus); magMul *= (1 + art.allBonus); }
  }
  return {
    atkBonus:       (1 + smithyLvl    * 0.03) * atkMul,
    defBonus:       (1 + smithyLvl    * 0.02) * defMul,
    magBonus:       (1 + magSchoolLvl * 0.02) * magMul,
    wallBonus:      1 + wallLvl      * 0.05,   // +5% защиты замка/уровень
    trapPower:      trapLvl * 30,              // урон ловушек
    trapType,
    buildingDefense: kazenotosLvl * 0.05,     // снижение разрушения зданий
  };
}

// Бонус +10% атаки если у p война с альянсом цели
function getAllianceWarAtkBonus(p, targetUsername, state) {
  if (!p.allianceId || !state || !state.allianceWars) return 1;
  const tp = state.players?.[targetUsername];
  if (!tp || !tp.allianceId) return 1;
  const warKey = [p.allianceId, tp.allianceId].sort().join('_vs_');
  if (state.allianceWars[warKey]) return 1.10;
  return 1;
}

function nextBuildCost(bldId, lv) {
  const def = BUILDINGS[bldId] || LAND_BUILDINGS[bldId]; if (!def) return null;
  const c = def.cost || {};
  const m = Math.pow(1.6, lv);
  return { wood:Math.round((c.wood||0)*m), stone:Math.round((c.stone||0)*m), iron:Math.round((c.iron||0)*m), food:Math.round((c.food||0)*m) };
}

function nextBuildTime(bldId, lv, clvl=1, techs={}) {
  const def = BUILDINGS[bldId] || LAND_BUILDINGS[bldId]; if (!def) return 60;
  const baseTime = def.time || 30;
  const t = Math.max(5, Math.round(baseTime * Math.pow(1.4,lv) * Math.pow(0.92,clvl-1)));
  return techs.architecture ? Math.max(5, Math.round(t * 0.8)) : t;
}

function getCastleLevel(p) { const c=(p.castle||[]).find(x=>x.bldId==='castle'); return c?c.level:1; }

function reqMet(p, bldId) {
  const def = BUILDINGS[bldId]; if (!def?.req) return true;
  for (const k in def.req) {
    let lv=0; for (const c of p.castle) if(c.bldId===k) lv=Math.max(lv,c.level);
    if (lv < def.req[k]) return false;
  }
  return true;
}

function hasUnique(p, bldId) { if (!BUILDINGS[bldId]?.unique) return false; return p.castle.some(c=>c.bldId===bldId&&c.level>0); }
function canAfford(p, cost)  { for (const k in cost) if ((p.res[k]||0)<cost[k]) return false; return true; }
function payCost(p, cost)    { for (const k in cost) { p.res[k] -= cost[k]; } if (cost.gold) p.reputation = (p.reputation||0) + Math.floor((cost.gold||0)/10); }

function computeRates(p) {
  const techs = p.techs || {};
  const r = { gold:50, wood:0, stone:0, food:0, iron:0, people:0 };
  if (techs.trade_routes) r.gold += 50;
  for (const c of p.lands) {
    if (!c.bldId) continue;
    const def = LAND_BUILDINGS[c.bldId]; if (!def?.produces) continue;
    r[def.produces] += buildingProduction(c.bldId, c.level, p.race, techs);
  }
  for (const uid in p.army) {
    const n=p.army[uid]; if (!n) continue;
    const u=UNITS[uid]; if (u?.upkeep) r.food -= n * u.upkeep;
  }
  // Оазисы: каждый даёт +25% к производству данного ресурса
  const oasisBonus = {};
  for (const o of (p.oases||[])) oasisBonus[o.resource] = (oasisBonus[o.resource]||0) + 0.25;
  for (const res in oasisBonus) if (r[res] > 0) r[res] = Math.round(r[res] * (1 + oasisBonus[res]));
  // Бонус артефакта "Рог изобилия" и короны
  let resBonus = 0;
  for (const artId of (p.activeArtifacts || [])) {
    const art = ARTIFACTS[artId];
    if (!art) continue;
    if (art.resBonus)  resBonus += art.resBonus;
    if (art.allBonus)  resBonus += art.allBonus;
  }
  if (resBonus > 0) {
    for (const res of ['gold','wood','stone','food','iron']) {
      if (r[res] > 0) r[res] = Math.round(r[res] * (1 + resBonus));
    }
  }
  return r;
}

function recomputeMaxes(p) {
  if (p.unlimitedRes) return; // admin mode — caps already set to 999999
  p.resMax = { gold:10000, wood:3000, stone:3000, food:3000, iron:3000, people:100 };
  for (const c of p.castle) {
    if (c.bldId==='storage' && c.level>0) { const cap=500*Math.pow(1.5,c.level-1); p.resMax.wood+=cap; p.resMax.stone+=cap; p.resMax.iron+=cap; p.resMax.food+=cap; }
    if (c.bldId==='treasury' && c.level>0) p.resMax.gold += 500*Math.pow(1.6,c.level-1);
  }
  for (const c of p.lands) if (c.bldId==='house_small' && c.level>0) p.resMax.people += 50*Math.pow(1.4,c.level-1);
  for (const k of RES) if (p.res[k] > p.resMax[k]) p.res[k] = p.resMax[k];
}

function addReport(p, txt, kind='info', data=null) {
  const rep = { t:Date.now(), txt, kind };
  if (data) rep.data = data;
  p.reports.push(rep);
  if (p.reports.length > 100) p.reports.shift();
}

// ─── РАЗВЕДКА ────────────────────────────────────────────────────────
// Отправляет разведчиков к цели — не бой, а получение информации
function cmdScout(p, world, { targetCol, targetRow, units }) {
  const cell = world.find(c => c.col === targetCol && c.row === targetRow);
  if (!cell) return err('Цель не найдена');
  if (!['player', 'bandit', 'oasis'].includes(cell.type)) return err('Нельзя разведать эту клетку');
  // Проверяем наличие scout-юнитов
  let scoutCount = 0;
  const scoutUnits = {};
  for (const uid in units) {
    const n = Math.floor(units[uid] || 0);
    if (!n) continue;
    if (!UNITS[uid]) return err('Неизвестный юнит: ' + uid);
    if (!uid.includes('scout')) return err('Только разведчики (scout) могут вести разведку');
    if ((p.army[uid] || 0) < n) return err('Недостаточно ' + uid);
    scoutCount += n;
    scoutUnits[uid] = n;
  }
  if (scoutCount < 1) return err('Нужен хотя бы 1 разведчик');
  for (const uid in scoutUnits) {
    p.army[uid] -= scoutUnits[uid];
    if (p.army[uid] <= 0) delete p.army[uid];
  }
  const pos = p.worldPos || { col: 0, row: 0 };
  const dist = Math.max(1, gridDist(pos, { col: targetCol, row: targetRow }));
  const slowest = Math.max(...Object.keys(scoutUnits).map(uid => UNITS[uid]?.speed || 8));
  const travelMs = slowest * dist * 1000;
  const now = Date.now();
  p.marches.push({
    type: 'scout',
    target: { col: targetCol, row: targetRow },
    units: scoutUnits,
    startAt: now,
    arriveAt: now + travelMs,
    phase: 'going',
  });
  addReport(p, `Разведчики отправлены (${scoutCount} ед.) — прибудут через ${Math.ceil(travelMs / 1000)}с`, 'march');
  updateQuestProgress(p, 'scout');
  return ok({ travelMs });
}

// ─── ПОДКРЕПЛЕНИЯ ────────────────────────────────────────────────────
// Отправляет войска на помощь союзнику
function cmdReinforce(p, world, state, { targetUsername, units }) {
  if (!p.allianceId) return err('Подкрепления можно отправлять только союзникам');
  const a = state.alliances?.[p.allianceId];
  if (!a) return err('Альянс не найден');
  const tp = state.players[targetUsername];
  if (!tp) return err('Игрок не найден');
  if (tp.allianceId !== p.allianceId) return err('Этот игрок не из вашего альянса');
  if (targetUsername === p.username) return err('Нельзя отправить подкрепление самому себе');
  if (!tp.worldPos) return err('Союзник не размещён на карте');
  let total = 0;
  const sendUnits = {};
  for (const uid in units) {
    const n = Math.floor(units[uid] || 0);
    if (!n) continue;
    if (!UNITS[uid]) return err('Неизвестный юнит');
    if ((p.army[uid] || 0) < n) return err('Недостаточно ' + (UNITS[uid]?.name || uid));
    total += n;
    sendUnits[uid] = n;
  }
  if (!total) return err('Нет войск');
  for (const uid in sendUnits) {
    p.army[uid] -= sendUnits[uid];
    if (p.army[uid] <= 0) delete p.army[uid];
  }
  const pos = p.worldPos || { col: 0, row: 0 };
  const dist = Math.max(1, gridDist(pos, tp.worldPos));
  const slowest = Math.max(...Object.keys(sendUnits).map(uid => UNITS[uid]?.speed || 8));
  const travelMs = slowest * dist * 1000;
  const now = Date.now();
  p.marches.push({
    type: 'reinforce',
    target: tp.worldPos,
    targetUsername,
    units: sendUnits,
    startAt: now,
    arriveAt: now + travelMs,
    phase: 'going',
  });
  addReport(p, `Подкрепление ${targetUsername}: ${total} воинов (${Math.ceil(travelMs / 1000)}с в пути)`, 'march');
  addReport(tp, `${p.username} отправил подкрепление: ${total} воинов`, 'info');
  return ok({ travelMs });
}

// ─── БОЙ ────────────────────────────────────────────────────────────
// battleType: 'raid' — набег (лёгкие потери, только грабёж)
//             'attack' — нападение (полный бой, разрушает 1 здание)
//             'assault' — штурм (тяжёлый бой, разрушает 2+ здания, двойной грабёж)
function resolveBattle(p, world, march, allPlayers, state) {
  const battleType = march.type || 'attack';
  const techs = p.techs || {};
  const bonuses = getCombatBonuses(p);
  let atkMult = bonuses.atkBonus * (1 + (techs.iron_working ? 0.10 : 0));
  if (p.race === 'orc') atkMult *= 2.0; // орки: двойная атака
  if (battleType === 'raid') atkMult *= 0.65; // набег — меньше напора

  // Бонус генерала из уровня прокачки
  let genBonus = 0;
  for (const uid in march.units) {
    if (uid.endsWith('_general') && march.units[uid] > 0) {
      const gb = getGeneralBonus(p, uid);
      genBonus = Math.min(genBonus + gb.cmdAtk, 0.30);
    }
  }
  atkMult *= (1 + genBonus);

  // Бонус из активных артефактов
  if (!p.activeArtifacts) p.activeArtifacts = [];
  for (const artId of p.activeArtifacts) {
    const art = ARTIFACTS[artId];
    if (!art) continue;
    if (art.atkBonus) atkMult *= (1 + art.atkBonus);
    if (art.allBonus) atkMult *= (1 + art.allBonus);
  }

  let atkPow = 0;
  for (const uid in march.units) atkPow += (march.units[uid]||0) * (UNITS[uid]?.atk||0);
  atkPow = Math.round(atkPow * atkMult);

  const cell = world.find(c=>c.col===march.target.col&&c.row===march.target.row);
  if (!cell) return { win:false, survivors:{}, losses:march.units, lossesTxt:'цель не найдена', loot:null };

  // Бонус войны альянсов +10%
  if (cell.type === 'player' && state) {
    atkPow = Math.round(atkPow * getAllianceWarAtkBonus(p, cell.player, state));
  }

  let defPow=0, trapDamage=0;
  let lootMult = battleType==='assault' ? 0.6 : battleType==='raid' ? 0.5 : 0.3;

  if (cell.type==='bandit') {
    defPow = cell.power||100;
  } else if (cell.type==='oasis') {
    defPow = (cell.owner ? 80 : 30);
  } else if (cell.type==='player') {
    const defender = allPlayers?.[cell.player];
    // Проверка защиты новичка
    if (defender && (defender.protectedUntil||0) > Date.now()) {
      return { win:false, survivors:march.units, losses:{}, lossesTxt:'цель под защитой', loot:null, protected:true };
    }
    defPow = (cell.lvl||1) * 200;
    if (defender) {
      const db = getCombatBonuses(defender);
      defPow = Math.round(defPow * db.wallBonus * db.defBonus);
      trapDamage = db.trapPower;
      // Элитные ловушки бьют сильнее по кавалерии
      if (db.trapType === 'elite' || db.trapType === 'universal') trapDamage = Math.round(trapDamage * 1.5);
    }
  }

  // Ловушки снижают атаку ДО боя
  if (trapDamage > 0 && cell.type==='player') {
    const reduction = Math.min(0.35, trapDamage / Math.max(1, atkPow));
    atkPow = Math.round(atkPow * (1 - reduction));
  }

  const win = atkPow > defPow * 0.9;
  const lossK = battleType==='raid' ? 0.6 : 1.0;
  const baseLr = win
    ? Math.min(0.6,  defPow / Math.max(1,atkPow) * 0.5 * lossK)
    : Math.min(0.95, defPow / Math.max(1,atkPow) * 0.8 * lossK);
  const lr = techs.magic_shield ? baseLr * 0.80 : baseLr;

  const survivors={}, losses={};
  for (const uid in march.units) {
    const start=march.units[uid], lost=Math.min(start,Math.round(start*lr)), surv=start-lost;
    if (surv>0) survivors[uid]=surv;
    if (lost>0) losses[uid]=lost;
  }
  // Генералы не погибают насовсем — они попадают в список «павших» для воскрешения
  if (!p.deadGenerals) p.deadGenerals=[];
  for (const uid of Object.keys(losses)) {
    if (uid.endsWith('_general')) {
      const genAtk = UNITS[uid]?.atk || 150;
      const cost = Math.max(500, genAtk * 5);
      p.deadGenerals.push({ uid, count:losses[uid], diedAt:Date.now(), resurrectCost:cost });
      delete losses[uid]; // убираем из обычных потерь — генерал «ранен», не убит
      addReport(p, `⚰ Генерал «${UNITS[uid]?.name||uid}» пал в бою! Воскресите его в Военном штабе за ${cost} 🪙`, 'battle-loss');
    }
  }
  const lossesTxt = Object.entries(losses).map(([u,n])=>`${UNITS[u]?.name||u}×${n}`).join(', ')||'нет';

  // Начисляем XP генералам в отряде
  for (const uid in march.units) {
    if (uid.endsWith('_general') && march.units[uid] > 0) {
      awardGeneralXP(p, uid, win);
    }
  }

  let loot=null, destroyedBuildings=[], captured=false;

  if (win) {
    if (cell.type==='bandit') {
      const t=(cell.power||100)*3;
      loot={gold:Math.round(t*.4),wood:Math.round(t*.2),stone:Math.round(t*.2),food:Math.round(t*.2)};
      // Реликвия!
      if (cell.relic) {
        const relicId = cell.relic;
        const relicName = RELICS[relicId] || relicId;
        if (!p.relics) p.relics = [];
        // Если в альянсе — реликвия достаётся альянсу (добавляем в p.relics)
        p.relics.push(relicId);
        addReport(p, `⚡ Реликвия «${relicName}» захвачена!`, 'info');
        cell.relic = null;
        updateQuestProgress(p, 'relic');
      }
      cell.type='empty'; cell.power=0;
    } else if (cell.type==='oasis') {
      // Оазис даёт постоянный +25% к ресурсу (не одноразовый)
      if (!p.oases) p.oases=[];
      const maxOases=3;
      const prevOwner = cell.owner && allPlayers?.[cell.owner];
      if (prevOwner?.oases) prevOwner.oases = prevOwner.oases.filter(o=>!(o.col===cell.col&&o.row===cell.row));
      if (p.oases.length < maxOases) {
        p.oases.push({ resource:cell.resource, col:cell.col, row:cell.row });
        cell.owner = p.username;
        addReport(p, `🌿 Захвачен оазис ${RES_LABEL[cell.resource]||cell.resource} (+25% производства)`, 'capture');
      } else {
        loot = { [cell.resource]: 500 };
        addReport(p, `Оазис ${RES_LABEL[cell.resource]||cell.resource} захвачен, но лимит 3 оазиса достигнут — получен разовый ресурс`, 'info');
      }
    } else if (cell.type==='player') {
      const t=(cell.lvl||1)*300*lootMult;
      loot={gold:Math.round(t*.5),wood:Math.round(t*.2),stone:Math.round(t*.15),iron:Math.round(t*.15)};
      const defender = allPlayers?.[cell.player];
      const db = defender ? getCombatBonuses(defender) : {};
      // Набег — только грабёж, зданий не трогает
      if (battleType !== 'raid' && defender) {
        const buildable = defender.castle.filter(c=>c.bldId&&c.bldId!=='castle'&&c.level>0);
        const destroyCount = battleType==='assault' ? 2 : 1;
        for (let i=0; i<destroyCount && buildable.length; i++) {
          if (Math.random() < (1 - (db.buildingDefense||0))) {
            const ri = Math.floor(Math.random()*buildable.length);
            const bc = buildable.splice(ri,1)[0];
            bc.level = Math.max(0, bc.level-1);
            const bname = BUILDINGS[bc.bldId]?.name || bc.bldId;
            if (bc.level===0) bc.bldId=null;
            destroyedBuildings.push(bname);
            if (defender) addReport(defender,`🔥 Здание «${bname}» повреждено в бою!`,'battle-loss');
          }
        }
        // Штурм при подавляющем превосходстве — двойной грабёж
        if (battleType==='assault' && atkPow > defPow*1.5) {
          for (const k in loot) loot[k] = Math.round(loot[k]*1.8);
        }
        // Снижение лояльности обороняющегося
        if (defender && 'loyalty' in defender) {
          defender.loyalty = Math.max(0, defender.loyalty - (battleType==='assault'?20:10));
        }
        addReport(defender, `⚔️ Нападение ${p.username} [${battleType==='assault'?'штурм':'атака'}]! Потери врага: ${lossesTxt}`, 'battle-loss');
      } else if (battleType==='raid' && defender) {
        addReport(defender, `🏃 Набег ${p.username}! Похищены ресурсы.`, 'battle-loss');
      }
    }
    // Ограничение грабежа вместимостью войска
    if (loot) {
      let cap=0;
      for (const uid in survivors) cap += survivors[uid]*(UNITS[uid]?.carry||50);
      const tl=Object.values(loot).reduce((a,b)=>a+b,0);
      if (tl>cap) { const k2=cap/tl; for(const r in loot) loot[r]=Math.floor(loot[r]*k2); }
    }
  } else {
    // Поражение: небольшой штраф лояльности атакующего
    if ('loyalty' in p) p.loyalty = Math.max(0, p.loyalty - 5);
    if (cell.type==='player') {
      const defender = allPlayers?.[cell.player];
      if (defender) addReport(defender, `✅ Атака ${p.username} отражена! Потери врага: ${lossesTxt}`, 'battle-win');
    }
  }

  // Подробный боевой отчёт
  const attackerUnits = {};
  for (const uid in march.units) {
    attackerUnits[uid] = { sent: march.units[uid] || 0, lost: losses[uid] || 0 };
  }
  const defenderUnits = {};
  if (cell.type === 'player') {
    const defender2 = allPlayers?.[cell.player];
    if (defender2) {
      for (const uid in (defender2.army || {})) {
        const hadCount = (defender2.army[uid] || 0) + (win ? Math.round((defender2.army[uid] || 0) * lr) : 0);
        const lostCount = win ? Math.round(hadCount * 0.2) : 0;
        defenderUnits[uid] = { had: hadCount, lost: lostCount };
      }
    }
  }
  const generalXP = (win ? 50 : 20) * Object.keys(march.units).filter(u => u.endsWith('_general') && march.units[u] > 0).length;
  const battleLog = {
    win,
    attacker: { username: p.username || '', race: p.race || '' },
    defender: cell.type === 'player' ? { username: cell.player || '', race: cell.race || '' } : { username: 'бандиты', race: 'bandit' },
    attackerUnits,
    defenderUnits,
    atkBonus: Math.round((atkMult - 1) * 100),
    defBonus: 0,
    loot: loot || {},
    destroyed: destroyedBuildings,
    generalXP,
  };

  return { win, survivors, losses, lossesTxt, loot, trapDamage, destroyedBuildings, captured, battleType, battleLog };
}

// ─── АРТЕФАКТЫ — КОМАНДЫ ────────────────────────────────────────────
// Запустить экспедицию (10 мин, стоит 500 gold, требует expedition здание)
function cmdStartExpedition(p) {
  const hasExpedition = p.castle.some(c => c.bldId === 'expedition' && c.level > 0);
  if (!hasExpedition) return err('Требуется «Лагерь арх.» (expedition)');
  if (p.expedition && (p.expedition.startedAt + p.expedition.duration) > Date.now()) {
    return err('Экспедиция уже идёт');
  }
  if ((p.res.gold || 0) < 500) return err('Нужно 500 золота');
  p.res.gold -= 500; p.reputation = (p.reputation||0) + 50;
  p.expedition = { startedAt: Date.now(), duration: 10 * 60 * 1000 };
  addReport(p, '🗺 Экспедиция запущена! Вернётся через 10 минут.', 'info');
  return ok();
}

// Активировать артефакт из инвентаря
function cmdActivateArtifact(p, { idx }) {
  if (!p.artifacts) p.artifacts = [];
  if (!p.activeArtifacts) p.activeArtifacts = [];
  const hasMagtower = p.castle.some(c => c.bldId === 'magtower' && c.level > 0);
  if (!hasMagtower) return err('Требуется «Башня арт.» (magtower)');
  if (p.activeArtifacts.length >= 5) return err('Максимум 5 активных артефактов');
  const artId = p.artifacts[idx];
  if (!artId) return err('Артефакт не найден');
  if (!ARTIFACTS[artId]) return err('Неизвестный артефакт');
  p.artifacts.splice(idx, 1);
  p.activeArtifacts.push(artId);
  const artName = ARTIFACTS[artId]?.name || artId;
  addReport(p, `✨ Артефакт «${artName}» активирован!`, 'info');
  return ok({ name: artName });
}

// Деактивировать артефакт
function cmdDeactivateArtifact(p, { idx }) {
  if (!p.activeArtifacts) p.activeArtifacts = [];
  if (!p.artifacts) p.artifacts = [];
  const artId = p.activeArtifacts[idx];
  if (!artId) return err('Артефакт не найден');
  p.activeArtifacts.splice(idx, 1);
  p.artifacts.push(artId);
  const artName = ARTIFACTS[artId]?.name || artId;
  addReport(p, `Артефакт «${artName}» деактивирован.`, 'info');
  return ok({ name: artName });
}

// Крафт суперартефакта — требует 5 любых активных артефактов
function cmdCraftSuperArtifact(p) {
  if (!p.activeArtifacts) p.activeArtifacts = [];
  if (p.activeArtifacts.length < 5) return err('Нужно 5 активных артефактов для крафта Короны Королей');
  const hasMagtower = p.castle.some(c => c.bldId === 'magtower' && c.level > 0);
  if (!hasMagtower) return err('Требуется «Башня арт.» (magtower)');
  // Убираем 5 артефактов из активных
  p.activeArtifacts.splice(0, 5);
  p.activeArtifacts.push('crown_of_kings');
  addReport(p, '👑 Корона Королей скована! Величайший артефакт теперь в вашем распоряжении!', 'info');
  return ok({ name: ARTIFACTS.crown_of_kings.name });
}

// ─── ТИК ────────────────────────────────────────────────────────────
function tickPlayer(p, world, allPlayers, state) {
  const now=Date.now(), dt=Math.max(0,(now-p.ts)/1000); p.ts=now; if(!dt) return;
  const rates=computeRates(p);
  for (const r of RES) if (rates[r]) p.res[r]=Math.max(0,Math.min(p.resMax[r]||9e9,p.res[r]+rates[r]*dt/3600));

  // ── Лояльность (система TWWK) ──────────────────────────────────────
  if (!('loyalty' in p)) p.loyalty = 100;
  let loyaltyRate = 0;
  for (const c of p.castle) {
    if (c.bldId==='temple' && c.level>0) loyaltyRate += c.level * 5;  // Храм: +5/ч/ур
    if (c.bldId==='beer'   && c.level>0) loyaltyRate += c.level * 2;  // Пивоварня: +2/ч/ур
  }
  if (rates.food < -20) loyaltyRate -= 8; // голод снижает лояльность
  else if (rates.food >= 0) loyaltyRate += 1; // сытость немного поднимает
  // Бонус артефакта "Корона лояльности"
  let loyaltyArtBonus = 0;
  for (const artId of (p.activeArtifacts || [])) {
    const art = ARTIFACTS[artId];
    if (!art) continue;
    if (art.loyaltyBonus) loyaltyArtBonus += art.loyaltyBonus;
    if (art.allBonus) loyaltyArtBonus += art.allBonus * 10;
  }
  p.loyalty = Math.max(0, Math.min(100, p.loyalty + loyaltyRate * dt / 3600));
  if (loyaltyArtBonus > 0 && p.loyalty < 100) {
    p.loyalty = Math.min(100, p.loyalty + loyaltyArtBonus * dt / 3600);
  }
  // Восстание при лояльности ниже 20%
  if (p.loyalty < 20 && !p._rebellionCooldown || p._rebellionCooldown && now > p._rebellionCooldown) {
    const armyTotal = Object.values(p.army||{}).reduce((a,b)=>a+(+b||0),0);
    if (armyTotal > 0 && p.loyalty < 20) {
      for (const uid in p.army) p.army[uid] = Math.max(0, Math.floor(p.army[uid]*0.5));
      addReport(p,'⚠️ ВОССТАНИЕ! Лояльность упала — половина армии дезертировала! Стройте Храмы и Пивоварни.','danger');
      p.loyalty = 25;
      p._rebellionCooldown = now + 2*3600*1000;
    }
  }
  // Инициализация новых полей для старых saves
  if (!p.artifacts)       p.artifacts = [];
  if (!p.activeArtifacts) p.activeArtifacts = [];
  if (!p.relics)          p.relics = [];
  if (!p.generals)        p.generals = {};
  if (!p.deadGenerals)    p.deadGenerals = [];
  if (!p.spyCooldown)     p.spyCooldown = 0;
  if (!p.marketOrders)    p.marketOrders = [];
  if (!p.quests)          p.quests = {};

  // Истечение обозов на карте
  if (world) {
    const now2 = Date.now();
    for (const c of world) {
      if (c.type === 'caravan' && c.expiresAt && c.expiresAt < now2) {
        c.type = 'empty';
        delete c.reward; delete c.spawnedAt; delete c.expiresAt;
      }
    }
  }

  // ── Экспедиция: завершение ────────────────────────────────────────
  if (p.expedition) {
    const exp = p.expedition;
    if ((exp.startedAt + exp.duration) <= now) {
      p.expedition = null;
      const artKeys = Object.keys(ARTIFACTS).filter(k => !ARTIFACTS[k].superArtifact);
      updateQuestProgress(p, 'expedition');
      if (Math.random() < 0.60) {
        const artId = artKeys[Math.floor(Math.random() * artKeys.length)];
        p.artifacts.push(artId);
        const artName = ARTIFACTS[artId]?.name || artId;
        addReport(p, `🗺 Экспедиция вернулась! Найден артефакт: «${artName}»!`, 'info');
      } else {
        addReport(p, '🗺 Экспедиция вернулась с пустыми руками...', 'info');
      }
    }
  }

  // Постройки
  for (let i=p.queue.length-1; i>=0; i--) {
    const j=p.queue[i]; if (now<j.end) continue;
    const cells=j.loc==='castle'?p.castle:p.lands;
    const c=cells.find(x=>x.col===j.col&&x.row===j.row);
    if (c) { c.bldId=j.bldId; c.level=j.toLvl; }
    p.queue.splice(i,1);
    addReport(p,`«${(BUILDINGS[j.bldId]||LAND_BUILDINGS[j.bldId])?.name}» ур.${j.toLvl} построено`,'build');
  }
  // Тренировка
  for (let i=p.trainQueue.length-1; i>=0; i--) {
    const j=p.trainQueue[i];
    while (j.count>0&&now>=j.nextDone) { p.army[j.uid]=(p.army[j.uid]||0)+1; j.count--; j.totalDone=(j.totalDone||0)+1; if(j.count>0) j.nextDone+=j.batchTime*1000; }
    if (j.count<=0) { p.trainQueue.splice(i,1); addReport(p,`Тренировка: ${j.totalDone}× ${UNITS[j.uid]?.name}`,'train'); }
  }
  // Походы
  for (let i=p.marches.length-1; i>=0; i--) {
    const m=p.marches[i];
    // ── Разведка ──────────────────────────────────────────────────
    if (m.type === 'scout') {
      if (m.phase === 'going' && now >= m.arriveAt) {
        const cell = world.find(c => c.col === m.target.col && c.row === m.target.row);
        let reportTxt = 'Разведка (неизвестная клетка)';
        if (cell) {
          if (cell.type === 'player') {
            const defender = allPlayers?.[cell.player];
            let armyEst = 0, powerEst = 0;
            if (defender) {
              for (const uid in defender.army) {
                const n = defender.army[uid] || 0;
                armyEst += n;
                powerEst += n * (UNITS[uid]?.atk || 0);
              }
            }
            const rnd = 0.8 + Math.random() * 0.4; // ±20%
            reportTxt = `🔭 Разведка (${m.target.col},${m.target.row}) — Игрок ${cell.player}: армия ~${Math.round(armyEst * rnd)} воинов, сила ~${Math.round(powerEst * rnd)}`;
          } else if (cell.type === 'bandit') {
            reportTxt = `🔭 Разведка (${m.target.col},${m.target.row}) — Лагерь бандитов, сила ${cell.power}${cell.relic ? ' ⚡ РЕЛИКВИЯ!' : ''}`;
          } else if (cell.type === 'oasis') {
            reportTxt = `🔭 Разведка (${m.target.col},${m.target.row}) — Оазис ресурса ${RES_LABEL[cell.resource] || cell.resource}`;
          } else {
            reportTxt = `🔭 Разведка (${m.target.col},${m.target.row}) — Пустые земли`;
          }
        }
        addReport(p, reportTxt, 'info');
        // Разведчики сразу возвращаются
        m.phase = 'returning';
        m.returnAt = now + (m.arriveAt - m.startAt);
      } else if (m.phase === 'returning' && now >= m.returnAt) {
        for (const uid in m.units) p.army[uid] = (p.army[uid] || 0) + m.units[uid];
        p.marches.splice(i, 1);
        addReport(p, '🔭 Разведчики вернулись.', 'info');
      }
      continue;
    }
    // ── Подкрепления ────────────────────────────────────────────
    if (m.type === 'reinforce') {
      if (m.phase === 'going' && now >= m.arriveAt) {
        const tp = allPlayers?.[m.targetUsername];
        if (tp) {
          for (const uid in m.units) tp.army[uid] = (tp.army[uid] || 0) + m.units[uid];
          const total = Object.values(m.units).reduce((a, b) => a + b, 0);
          addReport(tp, `✅ Подкрепление от ${p.username} прибыло: ${total} воинов`, 'info');
          addReport(p, `✅ Подкрепление ${m.targetUsername} доставлено (${total} воинов)`, 'info');
        } else {
          // Союзник не найден — возвращаем войска
          for (const uid in m.units) p.army[uid] = (p.army[uid] || 0) + m.units[uid];
          addReport(p, '⚠️ Союзник не найден — войска вернулись', 'info');
        }
        p.marches.splice(i, 1);
      }
      continue;
    }
    // ── Обычный бой ──────────────────────────────────────────────
    if (m.phase==='going'&&now>=m.arriveAt) {
      const result=resolveBattle(p,world,m,allPlayers,state);
      m.phase='returning'; m.returnAt=now+(m.arriveAt-m.startAt); m.battleResult=result; m.units=result.survivors; m.loot=result.loot;
      if (!Object.values(result.survivors).reduce((a,b)=>a+b,0)) { p.marches.splice(i,1); addReport(p,`Войско уничтожено`,'battle-loss'); }
    } else if (m.phase==='returning'&&now>=m.returnAt) {
      for (const uid in m.units) p.army[uid]=(p.army[uid]||0)+m.units[uid];
      if (m.loot) for (const k in m.loot) p.res[k]=Math.min(p.resMax[k]||9e9,(p.res[k]||0)+m.loot[k]);
      p.marches.splice(i,1);
      const r=m.battleResult, lt=r.loot?Object.entries(r.loot).filter(([,v])=>v).map(([k,v])=>`${k}+${v}`).join(' '):'';
      const reportTxt = `${r.win?'🏆 Победа':'⚔ Поражение'} · потери: ${r.lossesTxt}${lt?' · добыча: '+lt:''}`;
      addReport(p, reportTxt, r.win?'battle-win':'battle-loss', r.battleLog || null);
      // Обновляем квесты
      if (m.battleTarget === 'bandit' && r.win) updateQuestProgress(p, 'bandit_kill');
      if (r.win) updateQuestProgress(p, 'attack');
    }
  }
  recomputeMaxes(p);
}

// ─── КОМАНДЫ ────────────────────────────────────────────────────────
function cmdBuild(p, { loc, col, row, bldId }) {
  const isCastle=loc==='castle', cells=isCastle?p.castle:p.lands;
  const cell=cells.find(c=>c.col===col&&c.row===row); if (!cell) return err('cell not found');
  if (cell.type==='wall') return err('cannot build on wall');
  const defs=isCastle?BUILDINGS:LAND_BUILDINGS, def=defs[bldId]; if (!def) return err('unknown building');
  if (!isCastle&&def.terrain&&def.terrain!==cell.type) return err('wrong terrain');
  if (cell.bldId&&cell.bldId!==bldId) return err('cell occupied');
  const curLvl=cell.bldId===bldId?cell.level:0;
  if (curLvl>=(def.max||10)) return err('max level');
  if (isCastle&&def.unique&&hasUnique(p,bldId)&&cell.bldId!==bldId) return err('unique already built');
  if (isCastle&&!reqMet(p,bldId)) return err('requirements not met');
  // Параллельное строительство: 2 слота если замок >= 5, иначе 1
  const castleLvl = getCastleLevel(p);
  const maxQueues = castleLvl >= 5 ? 2 : 1;
  const activeInLoc = p.queue.filter(j => j.loc === loc && j.active !== false).length;
  if (activeInLoc >= maxQueues) return err('queue full');
  const cost=nextBuildCost(bldId,curLvl); if (!canAfford(p,cost)) return err('not enough resources');
  payCost(p,cost);
  const t=Date.now(), time=nextBuildTime(bldId,curLvl,getCastleLevel(p),p.techs||{});
  p.queue.push({ loc, col, row, bldId, toLvl:curLvl+1, start:t, end:t+time*1000, active:true });
  updateQuestProgress(p, 'build');
  return ok({ time });
}

function cmdDemolish(p, { loc, col, row }) {
  const cells=loc==='castle'?p.castle:p.lands;
  const cell=cells.find(c=>c.col===col&&c.row===row);
  if (!cell||!cell.bldId) return err('nothing here');
  if (cell.bldId==='castle') return err('cannot demolish castle');
  cell.bldId=null; cell.level=0; recomputeMaxes(p); return ok();
}

function cmdTrain(p, { bldCol, bldRow, uid, count }) {
  const u=UNITS[uid]; if (!u) return err('unknown unit');
  if (u.race!==p.race) return err('wrong race');
  const bc=p.castle.find(c=>c.col===bldCol&&c.row===bldRow);
  if (!bc||bc.bldId!==u.building) return err('wrong building');
  if (bc.level<u.reqLvl) return err('building level too low');
  if (p.trainQueue.length>=4) return err('train queue full');
  count=Math.max(1,Math.floor(count));
  let max=count;
  for (const k of ['wood','stone','iron','food']) if ((u.cost[k]||0)>0) max=Math.min(max,Math.floor((p.res[k]||0)/u.cost[k]));
  max=Math.min(max,Math.floor((p.res.people||0)/u.people));
  if (max<=0) return err('not enough resources or people');
  count=Math.min(count,max);
  const tc={wood:(u.cost.wood||0)*count,stone:(u.cost.stone||0)*count,iron:(u.cost.iron||0)*count,food:(u.cost.food||0)*count};
  payCost(p,tc); p.res.people-=u.people*count;
  const now=Date.now();
  p.trainQueue.push({ uid, count, batchTime:u.trainTime, nextDone:now+u.trainTime*1000, startedAt:now });
  addReport(p,`Начат найм: ${count}× ${u.name}`,'train');
  updateQuestProgress(p, 'train', count);
  return ok({ count });
}

function cmdAttack(p, world, { targetCol, targetRow, units, battleType }) {
  if (!['raid','attack','assault'].includes(battleType)) battleType='attack';
  const cell=world.find(c=>c.col===targetCol&&c.row===targetRow); if (!cell) return err('target not found');
  if (!['bandit','oasis','player'].includes(cell.type)) return err('cannot attack this');
  // Проверяем защиту новичка сразу
  if (cell.type==='player' && cell.protectedUntil && cell.protectedUntil > Date.now())
    return err('Игрок под защитой новичка');
  let total=0, slowest=0;
  for (const uid in units) {
    const n=Math.floor(units[uid]||0); if (!n) continue;
    if (!UNITS[uid]) return err('unknown unit');
    if ((p.army[uid]||0)<n) return err('not enough '+uid);
    total+=n; slowest=Math.max(slowest,UNITS[uid].speed);
  }
  if (!total) return err('no units');
  // Набег требует хотя бы 1 разведчика или быстрого юнита
  // Штурм требует мощную армию
  for (const uid in units) { p.army[uid]-=(units[uid]||0); if (p.army[uid]<=0) delete p.army[uid]; }
  const pos=p.worldPos||{col:0,row:0}, dist=Math.max(1,gridDist(pos,{col:targetCol,row:targetRow}));
  const travelMs=slowest*dist*1000, now=Date.now();
  const typeLabel = battleType==='raid'?'Набег':battleType==='assault'?'Штурм':'Нападение';
  p.marches.push({ type:battleType, target:{col:targetCol,row:targetRow}, units:Object.fromEntries(Object.entries(units).filter(([,v])=>v>0)), startAt:now, arriveAt:now+travelMs, phase:'going', battleTarget: cell.type });
  addReport(p,`${typeLabel} отправлен (${total} воинов)`,'march');
  updateQuestProgress(p, 'attack');
  return ok({ travelMs });
}

const ok  = (e={}) => ({ ok:true,  ...e });
const err = (m)    => ({ ok:false, error:m });

// ─── ИССЛЕДОВАНИЕ ТЕХНОЛОГИЙ ────────────────────────────────────────
function cmdResearch(p, { tid }) {
  const tech = TECHS[tid];
  if (!tech) return err('Неизвестная технология');
  if (!p.techs) p.techs = {};
  if (p.techs[tid]) return err('Уже изучено');
  for (const [bldId, minLvl] of Object.entries(tech.req || {})) {
    const allCells = [...(p.castle||[]), ...(p.lands||[])];
    if (!allCells.some(c => c.bldId === bldId && c.level >= minLvl)) {
      const bldName = (BUILDINGS[bldId] || LAND_BUILDINGS[bldId])?.name || bldId;
      return err(`Требуется: ${bldName} ур.${minLvl}`);
    }
  }
  if (!canAfford(p, tech.cost)) return err('Недостаточно ресурсов');
  payCost(p, tech.cost);
  p.techs[tid] = true;
  return ok({ name: tech.name });
}

// ─── ВОЗРОЖДЕНИЕ БАНДИТОВ ────────────────────────────────────────────
function respawnBandits(world) {
  const bandits = world.filter(c => c.type === 'bandit').length;
  if (bandits >= 20) return;
  const empty = world.filter(c => c.type === 'empty');
  const toSpawn = Math.min(5, 20 - bandits, empty.length);
  for (let i = 0; i < toSpawn; i++) {
    const idx = Math.floor(Math.random() * empty.length);
    const cell = empty.splice(idx, 1)[0];
    cell.type = 'bandit';
    cell.power = 50 + Math.floor(Math.random() * 300);
  }
}

// ─── АЛЬЯНСЫ ────────────────────────────────────────────────────────
function cmdAllianceCreate(state, p, { name, tag }) {
  if (!name || name.trim().length < 2 || name.trim().length > 30) return err('Название 2–30 символов');
  const cleanTag = String(tag||'').trim().toUpperCase().replace(/[^A-ZА-ЯЁ0-9]/gi,'');
  if (cleanTag.length < 2 || cleanTag.length > 4) return err('Тег 2–4 символа');
  if (p.allianceId) return err('Вы уже в альянсе');
  const diplomLvl = getDiplomatLevel(p);
  if (diplomLvl < 1) return err('Требуется Дипломатический центр ур.1 для создания альянса');
  if (!state.alliances) state.alliances = {};
  for (const a of Object.values(state.alliances)) {
    if (a.tag.toUpperCase() === cleanTag) return err('Тег уже занят');
    if (a.name.toLowerCase() === name.trim().toLowerCase()) return err('Название уже занято');
  }
  const maxMembers = Math.max(5, diplomLvl * 2); // уровень диплом.центра × 2 = макс.участников
  const id = 'a' + Date.now().toString(36);
  state.alliances[id] = {
    id, name: name.trim(), tag: cleanTag,
    leader: p.username, members: [p.username],
    invites: [], created: Date.now(), description: '',
    maxMembers,
  };
  p.allianceId = id;
  addReport(p, `Создан альянс [${cleanTag}] ${name.trim()} (макс. ${maxMembers} участников)`, 'info');
  updateQuestProgress(p, 'alliance');
  return ok({ id, name: name.trim(), tag: cleanTag });
}

function cmdAllianceInvite(state, p, { target }) {
  if (!p.allianceId) return err('Вы не в альянсе');
  const a = state.alliances?.[p.allianceId];
  if (!a) return err('Альянс не найден');
  if (a.leader !== p.username) return err('Только лидер может приглашать');
  if (a.members.length >= 20) return err('Альянс заполнен (макс. 20)');
  const tp = state.players[target];
  if (!tp) return err('Игрок не найден');
  if (tp.allianceId) return err('Игрок уже в альянсе');
  if (a.invites.includes(target)) return err('Уже приглашён');
  a.invites.push(target);
  addReport(tp, `Вас приглашают в альянс [${a.tag}] ${a.name}`, 'info');
  return ok();
}

function cmdAllianceJoin(state, p, { allianceId }) {
  if (p.allianceId) return err('Вы уже в альянсе');
  const diplomLvl = getDiplomatLevel(p);
  if (diplomLvl < 3) return err('Требуется Дипломатический центр ур.3 для вступления в альянс');
  const a = state.alliances?.[allianceId];
  if (!a) return err('Альянс не найден');
  if (!a.invites.includes(p.username)) return err('Нет приглашения');
  // Макс. участников = уровень дипломат.центра лидера × 2
  const leader = state.players[a.leader];
  if (leader) a.maxMembers = Math.max(5, getDiplomatLevel(leader) * 2);
  const maxM = a.maxMembers || 20;
  if (a.members.length >= maxM) return err(`Альянс заполнен (макс. ${maxM})`);
  a.invites = a.invites.filter(u => u !== p.username);
  a.members.push(p.username);
  p.allianceId = allianceId;
  addReport(p, `Вступили в альянс [${a.tag}] ${a.name}`, 'info');
  updateQuestProgress(p, 'alliance');
  for (const m of a.members) {
    if (m !== p.username && state.players[m])
      addReport(state.players[m], `${p.username} вступил в альянс`, 'info');
  }
  return ok({ name: a.name, tag: a.tag });
}

function cmdAllianceLeave(state, p) {
  if (!p.allianceId) return err('Вы не в альянсе');
  const a = state.alliances?.[p.allianceId];
  if (!a) { p.allianceId = null; return ok(); }
  if (a.leader === p.username && a.members.length > 1) return err('Передайте лидерство перед выходом');
  a.members = a.members.filter(u => u !== p.username);
  p.allianceId = null;
  if (a.members.length === 0) {
    delete state.alliances[a.id];
  } else if (a.leader === p.username) {
    a.leader = a.members[0];
  }
  addReport(p, 'Вы вышли из альянса', 'info');
  return ok();
}

function cmdAllianceKick(state, p, { target }) {
  if (!p.allianceId) return err('Вы не в альянсе');
  const a = state.alliances?.[p.allianceId];
  if (!a) return err('Альянс не найден');
  if (a.leader !== p.username) return err('Только лидер может исключать');
  if (target === p.username) return err('Нельзя исключить себя');
  if (!a.members.includes(target)) return err('Не в альянсе');
  a.members = a.members.filter(u => u !== target);
  const tp = state.players[target];
  if (tp) { tp.allianceId = null; addReport(tp, `Вас исключили из альянса [${a.tag}]`, 'info'); }
  return ok();
}

function cmdAllianceTransfer(state, p, { target }) {
  if (!p.allianceId) return err('Вы не в альянсе');
  const a = state.alliances?.[p.allianceId];
  if (!a) return err('Альянс не найден');
  if (a.leader !== p.username) return err('Только лидер может передавать власть');
  if (!a.members.includes(target)) return err('Не в альянсе');
  a.leader = target;
  addReport(p, `Лидерство передано: ${target}`, 'info');
  if (state.players[target]) addReport(state.players[target], `Вы стали лидером альянса [${a.tag}]`, 'info');
  return ok();
}

function cmdSendResources(state, p, { targetUsername, resources }) {
  if (!p.allianceId) return err('Только союзники могут отправлять ресурсы');
  const a = state.alliances?.[p.allianceId];
  if (!a) return err('Альянс не найден');
  const tp = state.players[targetUsername];
  if (!tp) return err('Игрок не найден');
  if (tp.allianceId !== p.allianceId) return err('Можно отправлять только союзникам');
  for (const k in resources) {
    const v = Math.floor(resources[k] || 0);
    if (v <= 0) continue;
    if ((p.res[k] || 0) < v) return err(`Не хватает ${k}`);
    p.res[k] -= v;
    tp.res[k] = Math.min(tp.resMax[k] || 9e9, (tp.res[k] || 0) + v);
  }
  const sent = Object.entries(resources).filter(([,v])=>v>0).map(([k,v])=>`${k}:${v}`).join(' ');
  addReport(p, `Отправлено союзнику ${targetUsername}: ${sent}`, 'info');
  addReport(tp, `Получено от ${p.username}: ${sent}`, 'info');
  return ok();
}

// ─── ПЕРЕИМЕНОВАНИЕ ГЕНЕРАЛА ─────────────────────────────────────────
function cmdRenameGeneral(p, { uid, name }) {
  if (!uid || !uid.endsWith('_general')) return err('Не генерал');
  const trimmed = (name || '').trim().slice(0, 24);
  if (!trimmed) return err('Имя не может быть пустым');
  if (!p.generalNames) p.generalNames = {};
  p.generalNames[uid] = trimmed;
  return ok({ name: trimmed });
}

// ─── ВОСКРЕШЕНИЕ ГЕНЕРАЛА ────────────────────────────────────────────
function cmdResurrectGeneral(p, { idx }) {
  const hq = p.castle.find(c => c.bldId==='military_hq' && c.level>0);
  if (!hq) return err('Требуется Военный штаб');
  if (!p.deadGenerals) p.deadGenerals=[];
  const entry = p.deadGenerals[idx];
  if (!entry) return err('Генерал не найден');
  if ((p.res.gold||0) < entry.resurrectCost) return err(`Нужно ${entry.resurrectCost} 🪙 золота`);
  p.res.gold -= entry.resurrectCost; p.reputation = (p.reputation||0) + Math.floor(entry.resurrectCost/10);
  p.army[entry.uid] = (p.army[entry.uid]||0) + entry.count;
  p.deadGenerals.splice(idx, 1);
  addReport(p, `✅ Генерал «${UNITS[entry.uid]?.name||entry.uid}» воскрешён!`, 'info');
  return ok({ name: UNITS[entry.uid]?.name||entry.uid });
}

// ─── БАНДИТЫ НАПАДАЮТ НА ИГРОКОВ ────────────────────────────────────
// Периодически вызывается сервером: бандиты вблизи игроков могут атаковать
function tickBandits(world, allPlayers) {
  const bandits = world.filter(c => c.type === 'bandit');
  const playerCells = world.filter(c => c.type === 'player');
  for (const bandit of bandits) {
    if (Math.random() > 0.12) continue; // ~12% шанс атаки за тик
    for (const pc of playerCells) {
      const dist = Math.abs(bandit.col-pc.col) + Math.abs(bandit.row-pc.row);
      if (dist <= 2 && pc.player && allPlayers[pc.player]) {
        const p = allPlayers[pc.player];
        if ((p.protectedUntil||0) > Date.now()) continue; // защита новичка
        if ('loyalty' in p) p.loyalty = Math.max(0, p.loyalty - 2);
        const power = bandit.power || 50;
        addReport(p, `⚔️ Банда разбойников (силой ${power}) напала на окрестности! Усильте оборону.`, 'battle-loss');
        bandit.power = Math.max(20, Math.round(bandit.power * 0.9)); // бандиты немного слабеют
        break;
      }
    }
  }
}

// ─── ADMIN-КОМАНДЫ ──────────────────────────────────────────────────
function cmdAdminGiveUnits(p, { amount } = {}) {
  const n = Math.max(1, Math.min(99999, parseInt(amount) || 500));
  for (const uid in UNITS) {
    if (UNITS[uid].race !== p.race) continue;
    if (uid.endsWith('_general')) {
      // Генерал — только 1, + запись XP если нет
      p.army[uid] = Math.max(p.army[uid] || 0, 1);
      if (!p.generals) p.generals = {};
      if (!p.generals[uid]) p.generals[uid] = { xp: 0, level: 1 };
    } else {
      p.army[uid] = (p.army[uid] || 0) + n;
    }
  }
  addReport(p, `⚔ Выдано ${n} каждого юнита расы ${p.race}.`, 'info');
  return ok();
}

function cmdAdminFill(p) {
  for (const k of RES) { p.res[k] = 999999; p.resMax[k] = 999999; }
  for (const tid of Object.keys(TECHS)) p.techs[tid] = true;
  return ok();
}

function cmdAdminComplete(p) {
  const now = Date.now() - 1;
  for (const j of p.queue) j.end = now;
  for (const j of p.trainQueue) {
    j.totalDone = (j.totalDone || 0) + j.count;
    p.army[j.uid] = (p.army[j.uid] || 0) + j.count;
    j.count = 0;
    j.nextDone = now;
  }
  // Fast-forward expedition
  if (p.expedition) p.expedition.startedAt = now - p.expedition.duration - 1;
  // Fast-forward marches
  for (const m of (p.marches || [])) { m.arriveAt = now; if (m.returnAt) m.returnAt = now; }
  return ok();
}

function cmdAdminMaxBuildings(p) {
  for (const c of [...(p.castle||[]), ...(p.lands||[])]) {
    if (c.bldId && c.level > 0) c.level = Math.min(10, c.level + 5);
  }
  recomputeMaxes(p);
  return ok();
}

function cmdAdminFullSetup(p) {
  // 1. Технологии и базовые флаги
  if (!p.techs) p.techs = {};
  for (const tid of Object.keys(TECHS)) p.techs[tid] = true;
  p.loyalty = 100;
  p.protectedUntil = 0; // снимаем защиту новичка для тестирования атак

  // 2. Все здания замка — расставляем по пустым клеткам
  const castleCell = p.castle.find(c => c.bldId === 'castle');
  if (castleCell) castleCell.level = 10;

  const wantBuildings = [
    'barracks','stables','smithy','workshop','magscool','university',
    'market','commerce','treasury','guard_tower','magtower',
    'temple','beer','secret','wisdom','gendel','diplomat',
    'wall','trap','military_hq','expedition','storage',
    'resident','magicschool','kazenotos',
  ];
  // Очищаем старые здания (кроме замка), чтобы освободить все слоты
  const innerCells = p.castle.filter(c => c.type==='inner' && c.bldId!=='castle');
  for (const c of innerCells) { c.bldId = null; c.level = 0; }
  let ci = 0;
  for (const bldId of wantBuildings) {
    if (ci >= innerCells.length) break;
    innerCells[ci].bldId = bldId;
    innerCells[ci].level = Math.min(BUILDINGS[bldId]?.max||10, 10);
    ci++;
  }

  // 3. Все земельные здания — по одному на каждый тип
  for (const bldId in LAND_BUILDINGS) {
    const existing = p.lands.find(c => c.bldId===bldId);
    if (existing) { existing.level = 5; continue; }
    const def = LAND_BUILDINGS[bldId];
    const freeCell = p.lands.find(c => !isLandsWall(c.col,c.row) && !c.bldId &&
      (!def.terrain || c.type===def.terrain));
    if (freeCell) { freeCell.bldId=bldId; freeCell.level=5; }
  }

  // 4. Генерал своей расы в армии
  const genUid = p.race + '_general';
  if (UNITS[genUid]) p.army[genUid] = Math.max(p.army[genUid]||0, 1);

  // 5. 3 оазиса всех типов
  if (!p.oases) p.oases = [];
  p.oases = [];
  const oasisRes = ['wood','stone','food'];
  for (let i=0; i<oasisRes.length; i++) {
    p.oases.push({ resource:oasisRes[i], col:0, row:i });
  }

  // Ресурсы без лимитов для тестирования
  p.unlimitedRes = true;
  for (const k of RES) { p.resMax[k] = 999999; p.res[k] = 999999; }
  if (!p.deadGenerals) p.deadGenerals = [];
  // Добавить запись XP для генерала своей расы
  if (!p.generals) p.generals = {};
  const genKey = p.race + '_general';
  if (!p.generals[genKey]) p.generals[genKey] = { xp:0, level:1 };
  addReport(p, '🚀 Полный тестовый набор активирован: все здания, генерал, оазисы, технологии.', 'info');
  return ok();
}

// ─── КВЕСТЫ ─────────────────────────────────────────────
const QUESTS = {
  build_5:        { name:'Строитель',    desc:'Построй 5 зданий',         goal:{type:'build',count:5},       reward:{gold:500} },
  train_20:       { name:'Командир',     desc:'Натренируй 20 юнитов',     goal:{type:'train',count:20},      reward:{gold:300,iron:100} },
  attack_3:       { name:'Завоеватель',  desc:'Атакуй 3 раза',            goal:{type:'attack',count:3},      reward:{gold:400} },
  raid_bandits:   { name:'Охотник',      desc:'Разгроми 5 бандитов',      goal:{type:'bandit_kill',count:5}, reward:{gold:600,wood:200} },
  scout_5:        { name:'Разведчик',    desc:'Проведи 5 разведок',       goal:{type:'scout',count:5},       reward:{gold:200,iron:50} },
  collect_relic:  { name:'Искатель',     desc:'Захвати реликвию',         goal:{type:'relic',count:1},       reward:{gold:1000} },
  alliance_member:{ name:'Дипломат',     desc:'Вступи в альянс',          goal:{type:'alliance',count:1},    reward:{gold:300} },
  expedition_done:{ name:'Путешественник',desc:'Заверши 3 экспедиции',    goal:{type:'expedition',count:3},  reward:{gold:700} },
};

function updateQuestProgress(p, type, amount) {
  if (!p.quests) p.quests = {};
  amount = amount || 1;
  for (const [qid, qdef] of Object.entries(QUESTS)) {
    if (qdef.goal.type !== type) continue;
    if (!p.quests[qid]) p.quests[qid] = { progress: 0, done: false, claimed: false };
    const q = p.quests[qid];
    if (q.done) continue;
    q.progress = (q.progress || 0) + amount;
    if (q.progress >= qdef.goal.count) {
      q.progress = qdef.goal.count;
      q.done = true;
      addReport(p, `📜 Задание «${qdef.name}» выполнено! Заберите награду.`, 'info');
    }
  }
}

function cmdClaimQuest(p, { questId }) {
  if (!p.quests) p.quests = {};
  const q = p.quests[questId];
  if (!q) return err('Задание не найдено или не начато');
  if (!q.done) return err('Задание ещё не выполнено');
  if (q.claimed) return err('Награда уже получена');
  const qdef = QUESTS[questId];
  if (!qdef) return err('Неизвестное задание');
  q.claimed = true;
  for (const [res, amt] of Object.entries(qdef.reward)) {
    p.res[res] = Math.min(p.resMax[res] || 9e9, (p.res[res] || 0) + amt);
  }
  const rewardStr = Object.entries(qdef.reward).map(([k,v]) => `${RES_LABEL[k]||k}+${v}`).join(' ');
  addReport(p, `🎁 Награда за «${qdef.name}»: ${rewardStr}`, 'info');
  return ok({ reward: qdef.reward });
}

// ─── ШПИОНАЖ ────────────────────────────────────────────
function cmdSpy(p, world, allPlayers, { targetUsername, action }) {
  const hasResident = p.castle.some(c => c.bldId === 'resident' && c.level > 0);
  if (!hasResident) return err('Требуется здание «Шпионаж» (resident)');
  const now = Date.now();
  if (p.spyCooldown && p.spyCooldown > now) {
    const rem = Math.ceil((p.spyCooldown - now) / 1000);
    return err(`Шпионы отдыхают. Ещё ${Math.ceil(rem/60)} мин.`);
  }
  if (!['steal','sabotage','assassinate'].includes(action)) return err('Неизвестное действие');
  if ((p.res.gold || 0) < 200) return err('Нужно 200 золота');
  if ((p.res.iron || 0) < 50) return err('Нужно 50 железа');
  const target = allPlayers[targetUsername];
  if (!target) return err('Игрок не найден');
  if (targetUsername === p.username) return err('Нельзя шпионить за собой');

  p.res.gold -= 200;
  p.res.iron -= 50;
  p.spyCooldown = now + 10 * 60 * 1000;

  const residentLvl = (() => { for (const c of p.castle) if (c.bldId === 'resident') return c.level; return 1; })();
  const baseChance = 0.35 + residentLvl * 0.05; // 40–85%
  const success = Math.random() < baseChance;

  if (!success) {
    addReport(target, `🕵 Обнаружена шпионская вылазка от ${p.username}!`, 'info');
    addReport(p, `🕵 Операция провалилась — шпион раскрыт у ${targetUsername}`, 'battle-loss');
    return ok({ success: false });
  }

  let resultTxt = '';
  if (action === 'steal') {
    const pct = 0.05 + Math.random() * 0.10; // 5–15%
    const stolen = {};
    for (const res of ['gold','wood','stone','food','iron']) {
      const amt = Math.floor((target.res[res] || 0) * pct);
      if (amt > 0) {
        target.res[res] = Math.max(0, (target.res[res] || 0) - amt);
        p.res[res] = Math.min(p.resMax[res] || 9e9, (p.res[res] || 0) + amt);
        stolen[res] = amt;
      }
    }
    resultTxt = 'Украдено: ' + Object.entries(stolen).map(([k,v]) => `${RES_LABEL[k]||k}:${v}`).join(' ');
    addReport(p, `🕵 Кража у ${targetUsername} успешна! ${resultTxt}`, 'battle-win');
    addReport(target, `🕵 Обнаружена кража ресурсов!`, 'battle-loss');
  } else if (action === 'sabotage') {
    const buildable = target.castle.filter(c => c.bldId && c.bldId !== 'castle' && c.level > 0);
    if (buildable.length > 0) {
      const ri = Math.floor(Math.random() * buildable.length);
      const bc = buildable[ri];
      bc.level = Math.max(0, bc.level - 1);
      const bname = BUILDINGS[bc.bldId]?.name || bc.bldId;
      if (bc.level === 0) bc.bldId = null;
      resultTxt = `Повреждено здание: ${bname}`;
      addReport(p, `🕵 Диверсия у ${targetUsername} успешна! ${resultTxt}`, 'battle-win');
      addReport(target, `🕵 Диверсия! Здание «${bname}» повреждено.`, 'battle-loss');
    } else {
      resultTxt = 'Нет зданий для повреждения';
      addReport(p, `🕵 Диверсия у ${targetUsername}: нет подходящих зданий.`, 'info');
    }
  } else if (action === 'assassinate') {
    const armyUids = Object.keys(target.army || {}).filter(uid => (target.army[uid] || 0) > 0);
    if (armyUids.length > 0) {
      const pct = 0.05 + Math.random() * 0.05; // 5–10%
      let totalKilled = 0;
      for (const uid of armyUids) {
        const killed = Math.floor((target.army[uid] || 0) * pct);
        if (killed > 0) {
          target.army[uid] = Math.max(0, (target.army[uid] || 0) - killed);
          totalKilled += killed;
        }
      }
      resultTxt = `Уничтожено ${totalKilled} воинов`;
      addReport(p, `🕵 Убийство у ${targetUsername} успешно! ${resultTxt}`, 'battle-win');
      addReport(target, `🕵 Наёмные убийцы уничтожили ${totalKilled} воинов!`, 'battle-loss');
    } else {
      resultTxt = 'Армия пуста';
      addReport(p, `🕵 Убийство у ${targetUsername}: армия пуста.`, 'info');
    }
  }

  return ok({ success: true, action, result: resultTxt });
}

// ─── РЫНОК ──────────────────────────────────────────────
function cmdCreateOrder(p, { type, res, amount, price }) {
  const hasMarket = p.castle.some(c => c.bldId === 'market' && c.level > 0);
  if (!hasMarket) return err('Требуется здание «Рынок» (market)');
  if (!['buy','sell'].includes(type)) return err('Неверный тип ордера');
  if (!RES.includes(res) || res === 'people') return err('Неверный ресурс');
  amount = Math.floor(amount || 0);
  price = Math.floor(price || 0);
  if (amount <= 0) return err('Количество должно быть > 0');
  if (price <= 0) return err('Цена должна быть > 0');
  if (!p.marketOrders) p.marketOrders = [];
  if (p.marketOrders.length >= 5) return err('Максимум 5 активных ордеров');
  if (type === 'sell') {
    if ((p.res[res] || 0) < amount) return err(`Не хватает ${RES_LABEL[res]||res}`);
    p.res[res] -= amount;
  } else {
    const totalGold = price * amount;
    if ((p.res.gold || 0) < totalGold) return err(`Нужно ${totalGold} золота`);
    p.res.gold -= totalGold;
  }
  const order = {
    id: 'o' + Date.now().toString(36) + Math.floor(Math.random()*1000),
    type, res, amount, price,
    seller: p.username,
    createdAt: Date.now(),
  };
  p.marketOrders.push(order);
  addReport(p, `📦 Ордер создан: ${type==='sell'?'Продажа':'Покупка'} ${amount} ${RES_LABEL[res]||res} по ${price}/ед.`, 'info');
  return ok({ order });
}

function cmdFillOrder(p, allPlayers, { sellerId, orderId }) {
  const seller = allPlayers[sellerId];
  if (!seller) return err('Продавец не найден');
  if (sellerId === p.username) return err('Нельзя исполнять свои ордера');
  if (!seller.marketOrders) return err('Ордер не найден');
  const idx = seller.marketOrders.findIndex(o => o.id === orderId);
  if (idx === -1) return err('Ордер не найден');
  const order = seller.marketOrders[idx];
  if (order.type === 'sell') {
    // Покупатель платит gold, получает res
    const totalGold = order.price * order.amount;
    if ((p.res.gold || 0) < totalGold) return err(`Нужно ${totalGold} золота`);
    p.res.gold -= totalGold;
    p.res[order.res] = Math.min(p.resMax[order.res] || 9e9, (p.res[order.res] || 0) + order.amount);
    seller.res.gold = Math.min(seller.resMax.gold || 9e9, (seller.res.gold || 0) + totalGold);
    addReport(p, `📦 Куплено: ${order.amount} ${RES_LABEL[order.res]||order.res} за ${totalGold} золота у ${sellerId}`, 'info');
    addReport(seller, `📦 Продано: ${order.amount} ${RES_LABEL[order.res]||order.res} игроку ${p.username} за ${totalGold} золота`, 'info');
  } else {
    // Ордер на покупку: продавец получает gold, покупатель (теперь исполнитель) отдаёт res
    if ((p.res[order.res] || 0) < order.amount) return err(`Не хватает ${RES_LABEL[order.res]||order.res}`);
    const totalGold = order.price * order.amount;
    p.res[order.res] -= order.amount;
    p.res.gold = Math.min(p.resMax.gold || 9e9, (p.res.gold || 0) + totalGold);
    seller.res[order.res] = Math.min(seller.resMax[order.res] || 9e9, (seller.res[order.res] || 0) + order.amount);
    addReport(p, `📦 Продано: ${order.amount} ${RES_LABEL[order.res]||order.res} игроку ${sellerId} за ${totalGold} золота`, 'info');
    addReport(seller, `📦 Куплено: ${order.amount} ${RES_LABEL[order.res]||order.res} у ${p.username} за ${totalGold} золота`, 'info');
  }
  seller.marketOrders.splice(idx, 1);
  return ok({ filled: true });
}

function cmdCancelOrder(p, { orderId }) {
  if (!p.marketOrders) return err('Ордер не найден');
  const idx = p.marketOrders.findIndex(o => o.id === orderId);
  if (idx === -1) return err('Ордер не найден');
  const order = p.marketOrders[idx];
  // Возврат ресурсов
  if (order.type === 'sell') {
    p.res[order.res] = Math.min(p.resMax[order.res] || 9e9, (p.res[order.res] || 0) + order.amount);
  } else {
    const totalGold = order.price * order.amount;
    p.res.gold = Math.min(p.resMax.gold || 9e9, (p.res.gold || 0) + totalGold);
  }
  p.marketOrders.splice(idx, 1);
  addReport(p, `📦 Ордер отменён. Ресурсы возвращены.`, 'info');
  return ok();
}

// ─── ВОЙНЫ АЛЬЯНСОВ ─────────────────────────────────────
function cmdDeclareWar(p, state, { targetAlliance }) {
  if (!p.allianceId) return err('Вы не в альянсе');
  const a = state.alliances?.[p.allianceId];
  if (!a) return err('Ваш альянс не найден');
  if (a.leader !== p.username) return err('Только лидер альянса может объявлять войну');
  const diplomatLvl = getDiplomatLevel(p);
  if (diplomatLvl < 5) return err('Требуется Дипломатия ур.5 для объявления войны');
  const targetA = state.alliances?.[targetAlliance];
  if (!targetA) return err('Альянс-цель не найден');
  if (targetAlliance === p.allianceId) return err('Нельзя объявить войну самому себе');
  if (!state.allianceWars) state.allianceWars = {};
  const warKey = [p.allianceId, targetAlliance].sort().join('_vs_');
  if (state.allianceWars[warKey]) return err('Война уже идёт');
  // Проверка cooldown мира
  const peaceCooldownKey = 'peace_' + warKey;
  if (state[peaceCooldownKey] && state[peaceCooldownKey] > Date.now()) {
    const rem = Math.ceil((state[peaceCooldownKey] - Date.now()) / 3600000);
    return err(`Перемирие действует ещё ${rem} ч.`);
  }
  state.allianceWars[warKey] = { attacker: p.allianceId, defender: targetAlliance, startedAt: Date.now() };
  // Уведомление всем участникам
  const notifyAlliance = (alId, msg) => {
    const al = state.alliances[alId];
    if (!al) return;
    for (const m of al.members) {
      if (state.players[m]) addReport(state.players[m], msg, 'battle-loss');
    }
  };
  notifyAlliance(p.allianceId, `⚔ Война объявлена! [${a.tag}] vs [${targetA.tag}]`);
  notifyAlliance(targetAlliance, `⚔ Альянс [${a.tag}] объявил войну вашему альянсу [${targetA.tag}]!`);
  return ok({ warKey });
}

function cmdPeace(p, state, { targetAlliance }) {
  if (!p.allianceId) return err('Вы не в альянсе');
  const a = state.alliances?.[p.allianceId];
  if (!a) return err('Альянс не найден');
  if (a.leader !== p.username) return err('Только лидер может заключать мир');
  if (!state.allianceWars) return err('Войн нет');
  const warKey = [p.allianceId, targetAlliance].sort().join('_vs_');
  if (!state.allianceWars[warKey]) return err('Войны с этим альянсом нет');
  delete state.allianceWars[warKey];
  // Cooldown 24 часа
  state['peace_' + warKey] = Date.now() + 24 * 3600 * 1000;
  const targetA = state.alliances?.[targetAlliance];
  const notifyAlliance2 = (alId, msg) => {
    const al = state.alliances?.[alId];
    if (!al) return;
    for (const m of al.members) {
      if (state.players[m]) addReport(state.players[m], msg, 'info');
    }
  };
  notifyAlliance2(p.allianceId, `🕊 Мир заключён с [${targetA?.tag||targetAlliance}]`);
  notifyAlliance2(targetAlliance, `🕊 Мир заключён с [${a.tag}]`);
  return ok();
}

// ─── ОБОЗЫ НА КАРТЕ ─────────────────────────────────────
function spawnCaravan(world) {
  const caravans = world.filter(c => c.type === 'caravan');
  if (caravans.length >= 3) return;
  const empties = world.filter(c => c.type === 'empty');
  const toSpawn = Math.min(3 - caravans.length, empties.length);
  const now = Date.now();
  for (let i = 0; i < toSpawn; i++) {
    if (!empties.length) break;
    const idx = Math.floor(Math.random() * empties.length);
    const cell = empties.splice(idx, 1)[0];
    cell.type = 'caravan';
    cell.reward = { gold: 200 + Math.floor(Math.random() * 200), wood: 50 + Math.floor(Math.random() * 100), iron: 20 + Math.floor(Math.random() * 60) };
    cell.spawnedAt = now;
    cell.expiresAt = now + 30 * 60 * 1000;
  }
}

function cmdRaidCaravan(p, world, allPlayers, { col, row }) {
  const cell = world.find(c => c.col === col && c.row === row);
  if (!cell) return err('Клетка не найдена');
  if (cell.type !== 'caravan') return err('На этой клетке нет обоза');
  const totalArmy = Object.values(p.army || {}).reduce((a, b) => a + (b || 0), 0);
  if (totalArmy < 10) return err('Нужно минимум 10 юнитов для ограбления обоза');
  const reward = cell.reward || { gold: 300, wood: 100, iron: 50 };
  for (const [res, amt] of Object.entries(reward)) {
    p.res[res] = Math.min(p.resMax[res] || 9e9, (p.res[res] || 0) + amt);
  }
  const rewardStr = Object.entries(reward).map(([k,v]) => `${RES_LABEL[k]||k}:${v}`).join(' ');
  addReport(p, `🚚 Обоз ограблен! Получено: ${rewardStr}`, 'info');
  // Уведомить соседей в радиусе 5 клеток
  const pos = { col, row };
  for (const [username, pl] of Object.entries(allPlayers)) {
    if (username === p.username || !pl.worldPos) continue;
    const dist = Math.abs(pl.worldPos.col - col) + Math.abs(pl.worldPos.row - row);
    if (dist <= 5) {
      addReport(pl, `🚚 Обоз разграблен игроком ${p.username} в (${col},${row})`, 'info');
    }
  }
  cell.type = 'empty';
  delete cell.reward;
  delete cell.spawnedAt;
  delete cell.expiresAt;
  return ok({ reward });
}

module.exports = {
  RACES, RES, RES_LABEL, RES_IMG,
  BUILDINGS, LAND_BUILDINGS, UNITS, TECHS,
  ARTIFACTS, RELICS,
  RATING_WEIGHTS, calcRating, ratingDelta,
  CASTLE_COLS, CASTLE_ROWS, LANDS_COLS, LANDS_ROWS, WORLD_COLS, WORLD_ROWS,
  MAX_PLAYERS_PER_PROVINCE, OASES_PER_PROVINCE,
  isCastleWall, isLandsWall,
  createPlayer, createWorldGrid, initProvince, initRelics, placePlayerOnWorld,
  tickPlayer, recomputeMaxes, computeRates,
  cmdBuild, cmdDemolish, cmdTrain, cmdAttack, cmdResearch, cmdResurrectGeneral, cmdRenameGeneral, respawnBandits, tickBandits,
  cmdScout, cmdReinforce,
  cmdStartExpedition, cmdActivateArtifact, cmdDeactivateArtifact, cmdCraftSuperArtifact,
  cmdAdminFill, cmdAdminComplete, cmdAdminMaxBuildings, cmdAdminFullSetup, cmdAdminGiveUnits,
  cmdAllianceCreate, cmdAllianceInvite, cmdAllianceJoin, cmdAllianceLeave,
  cmdAllianceKick, cmdAllianceTransfer, cmdSendResources,
  nextBuildCost, nextBuildTime, getCastleLevel, reqMet, hasUnique,
  getDiplomatLevel, getCombatBonuses, getGeneralBonus, awardGeneralXP,
  gridDist, strHash,
  QUESTS, updateQuestProgress, cmdClaimQuest,
  cmdSpy,
  cmdCreateOrder, cmdFillOrder, cmdCancelOrder,
  cmdDeclareWar, cmdPeace,
  spawnCaravan, cmdRaidCaravan,
};
