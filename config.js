// config.js - Pusat Data 4 Senjata, Skill Tree, Evolusi & Balancing

const GAME_CONFIG = {
    autoRotateEnemies: true,

    player: {
        sprite: 'assets/pesawat-player.png',
        width: 64,
        height: 64,
        speed: 6,
        maxHp: 5,
        invulnDuration: 75
    },

    leveling: {
        baseExpRequired: 100,
        expIncrementPerLvl: 50
    },

    drops: {
        heavyHealChance: 0.18
    },

    wave: {
        durationSeconds: 60,
        baseEnemyQuota: 20,
        quotaIncrement: 10,
        maxEnemiesOnScreen: 6
    },

    enemies: {
        scout: {
            sprite: 'assets/enemy-lvl0.5.png',
            width: 48,
            height: 48,
            baseHp: 15,
            hpIncrementPerWave: 10,
            baseSpeedY: 2.5,
            speedIncrement: 0.2,
            speedX: 0,
            score: 100,
            expReward: 15,
            canShoot: false
        },
        heavy: {
            sprite: 'assets/enemy-lvl1.png',
            width: 62,
            height: 62,
            baseHp: 30,
            hpIncrementPerWave: 20,
            baseSpeedY: 1.7,
            speedIncrement: 0.15,
            speedX: 0.85,
            score: 250,
            expReward: 35,
            canShoot: true,
            shootCooldown: 115,
            bulletSpeed: 4.0
        }
    },

    boss: {
        defaultSprite: 'assets/boss-wave.png',
        baseWidth: 175,
        baseHeight: 155,
        sizeIncrementPerWave: 10,
        maxSizeBonus: 45,

        baseHp: 250,
        hpIncrementPerWave: 200,

        baseSpeedX: 1.4,
        speedIncrementPerWave: 0.1,
        baseScore: 1500,
        expReward: 150,

        bulletSpeed: 3.6,
        bulletSpeedIncrement: 0.22,
        attackCooldown: 80,
        enrageCooldown: 55
    },

    // ==========================================
    // DATA SKILL TREE (4 SENJATA LENGKAP)
    // ==========================================
    weapons: {
        // 1. LASER GUN
        laser: {
            id: 'laser',
            name: 'Laser Gun',
            color: '#38bdf8',
            baseAtk: 10,
            baseCooldown: 60, // 1.0 detik
            levels: {
                1: { desc: '1 laser lurus per detik', shotsPerSec: 1.0, branches: 1, spread: 0, speed: 11 },
                2: { desc: '2 laser beruntun per detik', shotsPerSec: 2.0, branches: 1, spread: 0, speed: 11 },
                3: { desc: '3 laser beruntun per detik', shotsPerSec: 3.0, branches: 1, spread: 0, speed: 11 },
                '4a': { name: 'Laser: Scatter (4A)', desc: '3 laser bercabang melebar per detik', shotsPerSec: 1.0, branches: 3, spread: 0.24, speed: 11 },
                '4b': { name: 'Laser: Rapid Stream (4B)', desc: '4 laser lurus beruntun cepat per detik', shotsPerSec: 4.0, branches: 1, spread: 0, speed: 15 },
                '5a': { name: 'Laser: Scatter (5A)', desc: '4 laser bercabang melebar per detik', shotsPerSec: 1.0, branches: 4, spread: 0.30, speed: 11 },
                '5b': { name: 'Laser: Rapid Stream (5B)', desc: '5 laser lurus beruntun cepat per detik', shotsPerSec: 5.0, branches: 1, spread: 0, speed: 16 },
                '6a': { name: 'Laser: Nova Fan (MAX)', desc: '5 laser bercabang penuh per detik', shotsPerSec: 1.0, branches: 5, spread: 0.36, speed: 12 },
                '6b': { name: 'Laser: Hyper Stream (MAX)', desc: '6 laser lurus beruntun super cepat', shotsPerSec: 6.0, branches: 1, spread: 0, speed: 18 }
            }
        },

        // 2. HE CANNON
        he: {
            id: 'he',
            name: 'HE Cannon',
            color: '#f97316',
            baseAtk: 35,
            baseCooldown: 120, // 2.0 detik
            explosionRadius: 72,
            levels: {
                1: { desc: 'Ledakan area (Crit 20% | Dmg 150%)', critRate: 0.20, critDmg: 1.50 },
                2: { desc: 'Crit Rate +15% & Crit Dmg +10%', critRate: 0.35, critDmg: 1.60 },
                3: { desc: 'Crit Rate +20% & Crit Dmg +20%', critRate: 0.55, critDmg: 1.80 },
                '4a': {
                    name: 'HE: Napalm Burn (4A)',
                    desc: 'Ledakan membakar musuh (20% ATK/dtk selama 3 dtk)',
                    critRate: 0.55, critDmg: 1.80,
                    burnPct: 0.20, burnDuration: 3.0
                },
                '4b': {
                    name: 'HE: Cryo Freeze (4B)',
                    desc: 'Membekukan musuh (-45% gerak & serang 3 dtk, CD 6 dtk)',
                    critRate: 0.55, critDmg: 1.80,
                    freezeSlow: 0.45, freezeDuration: 3.0, freezeCd: 6.0
                },
                '5a': {
                    name: 'HE: Napalm Burn (5A)',
                    desc: 'Burn +15%, Crit Rate +15%, Crit Dmg +45%',
                    critRate: 0.70, critDmg: 2.25,
                    burnPct: 0.35, burnDuration: 3.0
                },
                '5b': {
                    name: 'HE: Cryo Freeze (5B)',
                    desc: 'Durasi Freeze +1.5 detik (Total 4.5 detik)',
                    critRate: 0.55, critDmg: 1.80,
                    freezeSlow: 0.45, freezeDuration: 4.5, freezeCd: 6.0
                },
                '6a': {
                    name: 'HE: Hellfire (MAX)',
                    desc: 'Burn +20%, Crit Rate +10%, Crit Dmg +65%',
                    critRate: 0.80, critDmg: 2.90,
                    burnPct: 0.55, burnDuration: 3.0
                },
                '6b': {
                    name: 'HE: Absolute Zero (MAX)',
                    desc: 'Freeze > 4 dtk memicu 300% ATK True Dmg (CD 5 dtk)',
                    critRate: 0.55, critDmg: 1.80,
                    freezeSlow: 0.45, freezeDuration: 4.5, freezeCd: 6.0,
                    shatterTrueDmgPct: 3.00, shatterCd: 5.0
                }
            }
        },

        // 3. LIGHTNING CHAIN
        lightning: {
            id: 'lightning',
            name: 'Lightning Chain',
            color: '#eab308',
            baseAtk: 2,
            baseCooldown: 12, // 0.2 detik (12 frame pada 60 FPS)
            maxRange: 380,
            chainRadius: 150,
            levels: {
                1: { desc: 'Otomatis menyambar musuh terdekat tiap 0.2 dtk', atk: 2, chains: 0 },
                2: { desc: 'DMG +1 (Total 3 ATK)', atk: 3, chains: 0 },
                3: { desc: 'DMG +2 (Total 5 ATK)', atk: 5, chains: 0 },
                // Percabangan Evolusi Level 4
                '4a': {
                    name: 'Lightning: Overload (4A)',
                    desc: 'DMG ke target yang sama +2 setiap 2 detik',
                    atk: 5, chains: 0,
                    rampIntervalSec: 2.0, rampBonus: 2
                },
                '4b': {
                    name: 'Lightning: Arc Storm (4B)',
                    desc: 'Petir menyambar ke musuh di sekitar target utama',
                    atk: 5, chains: 3
                },
                '5a': {
                    name: 'Lightning: Overload (5A)',
                    desc: 'Pertambahan DMG target sama +2/detik (Total +4/dtk)',
                    atk: 5, chains: 0,
                    rampIntervalSec: 1.0, rampBonus: 4
                },
                '5b': {
                    name: 'Lightning: Arc Storm (5B)',
                    desc: 'DMG sambaran +4 (Total 9 ATK)',
                    atk: 9, chains: 3
                },
                '6a': {
                    name: 'Lightning: Singularity (MAX)',
                    desc: 'Pertambahan DMG target sama +2/detik (Total +6/dtk)',
                    atk: 5, chains: 0,
                    rampIntervalSec: 1.0, rampBonus: 6
                },
                '6b': {
                    name: 'Lightning: Tempest (MAX)',
                    desc: 'DMG sambaran +4 (Total 13 ATK)',
                    atk: 13, chains: 4
                }
            }
        },

        // 4. ARCTIC BULLET
        arctic: {
            id: 'arctic',
            name: 'Arctic Bullet',
            color: '#67e8f9',
            baseAtk: 5,
            baseCooldown: 60, // 1.0 detik
            freezeDuration: 2.0,
            freezeCd: 4.0,
            levels: {
                1: { desc: 'Freeze: slow gerak 30% selama 2 dtk (CD 4 dtk)', atk: 5, slow: 0.30 },
                2: { desc: 'ATK +2, efek slow Freeze +5% (35%)', atk: 7, slow: 0.35 },
                3: { desc: 'ATK +3, efek slow Freeze +5% (40%)', atk: 10, slow: 0.40 },
                // Percabangan Evolusi Level 4
                '4a': {
                    name: 'Arctic: Homing Shard (4A)',
                    desc: 'ATK +4. Tiap 2 dtk tembak es pelacak (150% DMG + Freeze)',
                    atk: 14, slow: 0.40,
                    seekerIntervalSec: 2.0, seekerDmgMult: 1.50
                },
                '4b': {
                    name: 'Arctic: Cryo Aegis (4B)',
                    desc: 'ATK +3. Tiap 60 dtk ciptakan Shield penahan 1 serangan',
                    atk: 13, slow: 0.40,
                    shieldIntervalSec: 60.0
                },
                '5a': {
                    name: 'Arctic: Homing Shard (5A)',
                    desc: 'ATK +4, DMG projectile es pelacak naik ke 160%',
                    atk: 18, slow: 0.40,
                    seekerIntervalSec: 2.0, seekerDmgMult: 1.60
                },
                '5b': {
                    name: 'Arctic: Cryo Aegis (5B)',
                    desc: 'ATK +3 (Total 16 ATK) + Shield penahan serangan',
                    atk: 16, slow: 0.40,
                    shieldIntervalSec: 60.0
                },
                '6a': {
                    name: 'Arctic: Glacial Seeker (MAX)',
                    desc: 'ATK +4, DMG projectile es pelacak naik ke 175%',
                    atk: 22, slow: 0.40,
                    seekerIntervalSec: 2.0, seekerDmgMult: 1.75
                },
                '6b': {
                    name: 'Arctic: Absolute Aegis (MAX)',
                    desc: 'ATK +3, Cooldown Shield dipercepat menjadi 50 detik',
                    atk: 19, slow: 0.40,
                    shieldIntervalSec: 50.0
                }
            }
        }
    }
};