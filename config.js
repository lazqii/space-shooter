// config.js - Pusat Data 6 Senjata, Skill Tree, Evolusi & Balancing

const GAME_CONFIG = {
    autoRotateEnemies: true,

    player: {
        sprite: 'assets/pesawat-player.png',
        width: 64,
        height: 64,
        speed: 6,
        maxHp: 5,
        invulnDuration: 80 // immune saat terkena hit / naik level
    },

    leveling: {
        baseExpRequired: 100,
        expIncrementPerLvl: 50
    },

    fusionRules: {
        firstFusionMinLevel: 10,  // Minimal Lv.10 untuk memunculkan Fusion ke-1
        secondFusionMinLevel: 20, // Minimal Lv.20 untuk memunculkan Fusion ke-2
        maxActiveFusions: 2       // Batas maksimal Fusion dalam 1 permainan
    },

    drops: {
        heavyHealChance: 0.11
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
    // DATA SKILL TREE (6 SENJATA LENGKAP)
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
                1: { desc: 'Menembakkan sinar laser berkecepatan tinggi.', shotsPerSec: 1.0, branches: 1, spread: 0, speed: 11 },
                2: { desc: 'Meningkatkan kecepatan tembakan', shotsPerSec: 2.0, branches: 1, spread: 0, speed: 11 },
                3: { desc: 'Meningkatkan kecepatan tembakan', shotsPerSec: 3.0, branches: 1, spread: 0, speed: 11 },
                '4a': { name: 'Laser Gun: Scatter', desc: 'Menembakkan 4 laser bercabang', shotsPerSec: 1.0, branches: 4, spread: 0.24, speed: 11 },
                '4b': { name: 'Laser Gun: Rapid Stream', desc: 'Meningkatkan kecepatan tembakan', shotsPerSec: 4.0, branches: 1, spread: 0, speed: 15 },
                '5a': { name: 'Laser Gun: Scatter', desc: 'Menembakkan 5 laser bercabang', shotsPerSec: 1.0, branches: 5, spread: 0.30, speed: 11 },
                '5b': { name: 'Laser Gun: Rapid Stream', desc: 'Meningkatkan kecepatan tembakan', shotsPerSec: 5.0, branches: 1, spread: 0, speed: 16 },
                '6a': { name: 'Laser Gun: Scatter (MAX)', desc: 'Menembakkan 6 laser bercabang', shotsPerSec: 1.0, branches: 6, spread: 0.36, speed: 12 },
                '6b': { name: 'Laser Gun: Rapid Stream (MAX)', desc: 'Meningkatkan kecepatan tembakan secara drastis', shotsPerSec: 6.0, branches: 1, spread: 0, speed: 18 }
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
                1: { desc: 'Tembakan menyebabkan ledakan area (Crit 20% | Dmg 150%)', critRate: 0.20, critDmg: 1.50 },
                2: { desc: 'Meningkatkan Crit Rate +15% & Crit Dmg +10%', critRate: 0.35, critDmg: 1.60 },
                3: { desc: 'Meningkatkan Crit Rate +20% & Crit Dmg +20%', critRate: 0.55, critDmg: 1.80 },
                '4a': {
                    name: 'HE Cannon: Napalm Burn',
                    desc: 'Ledakan menyebabkan efek burn pada target \n(20% ATK/detik selama 3 detik)',
                    critRate: 0.55, critDmg: 1.80,
                    burnPct: 0.20, burnDuration: 3.0
                },
                '4b': {
                    name: 'HE Cannon: Cryo Freeze',
                    desc: 'Ledakan menyebabkan efek freeze pada target \nMengurangi 45% kecepatan gerak dan serangan target selama 3 detik | CD 6 detik)',
                    critRate: 0.55, critDmg: 1.80,
                    freezeSlow: 0.45, freezeDuration: 3.0, freezeCd: 6.0
                },
                '5a': {
                    name: 'HE Cannon: Napalm Burn',
                    desc: 'Meningkatkan efek Burn +15%, Crit Rate +15%, Crit Dmg +45%',
                    critRate: 0.70, critDmg: 2.25,
                    burnPct: 0.35, burnDuration: 3.0
                },
                '5b': {
                    name: 'HE Cannon: Cryo Freeze',
                    desc: 'Meningkatkan durasi Freeze +1.5 detik',
                    critRate: 0.55, critDmg: 1.80,
                    freezeSlow: 0.45, freezeDuration: 4.5, freezeCd: 6.0
                },
                '6a': {
                    name: 'HE Cannon: Napalm Burn (MAX)',
                    desc: 'Meningkatkan efek Burn +20%, Crit Rate +10%, Crit Dmg +65%',
                    critRate: 0.80, critDmg: 2.90,
                    burnPct: 0.55, burnDuration: 3.0
                },
                '6b': {
                    name: 'HE Cannon: Cryo Freeze (MAX)',
                    desc: 'Target yang terkena efek Freeze > 4 dtk memicu 300% ATK True Dmg (CD 5 dtk)',
                    critRate: 0.55, critDmg: 1.80,
                    freezeSlow: 0.45, freezeDuration: 4.5, freezeCd: 6.0,
                    shatterTrueDmgPct: 3.00, shatterCd: 5.0
                }
            }
        },

        // 3. LIGHTNING CHAIN (Optimalisasi)
        lightning: {
            id: 'lightning',
            name: 'Lightning Chain',
            color: '#eab308',
            baseAtk: 2,
            baseCooldown: 12, // Fire rate: 0.2 detik (12 frame pada 60 FPS)
            maxRange: 380,
            chainRadius: 155,
            levels: {
                1: { desc: 'Menyambar musuh terdekat tiap 0.2 detik', atk: 2, chains: 0 },
                2: { desc: 'Damage sambaran +1', atk: 3, chains: 0 },
                3: { desc: 'Damage sambaran +2', atk: 5, chains: 0 },
                '4a': {
                    name: 'Lightning: Overload',
                    desc: 'Damage ke target yang sama +2 tiap 2 detik \nPeningkatan maksimal yang bisa didapat +10/detik)',
                    atk: 5, chains: 0,
                    rampIntervalSec: 2.0, rampBonus: 2, maxBonusPerSec: 10
                },
                '4b': {
                    name: 'Lightning: Arc Storm',
                    desc: 'Damage sambaran +2 \nSekarang tiap serangan bisa menyambar ke musuh di sekitar target utama',
                    atk: 7, chains: 3
                },
                '5a': {
                    name: 'Lightning: Overload',
                    desc: 'Pertambahan Damage ke target yang sama +2/detik',
                    atk: 5, chains: 0,
                    rampIntervalSec: 2.0, rampBonus: 4, maxBonusPerSec: 10
                },
                '5b': {
                    name: 'Lightning: Arc Storm',
                    desc: 'Damage sambaran +3',
                    atk: 10, chains: 3
                },
                '6a': {
                    name: 'Lightning: Overload (MAX)',
                    desc: 'Pertambahan DMG target sama +2/detik',
                    atk: 5, chains: 0,
                    rampIntervalSec: 2.0, rampBonus: 6, maxBonusPerSec: 10
                },
                '6b': {
                    name: 'Lightning: Arc Storm (MAX)',
                    desc: 'Damage sambaran +4 \nMusuh di sekitar target utama yang terkena sambaran +1',
                    atk: 14, chains: 4
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
                1: { desc: 'Tembakan yang mengenai target menerapkan efek Freeze: \nMemberikan efek slow 30% selama 2 detik [coldown 4 detik]', atk: 5, slow: 0.30 },
                2: { desc: 'Damage +2 \nMeningkatkan efek slow >> 35%', atk: 7, slow: 0.35 },
                3: { desc: 'Damage +3, \nMeningkatkan efek slow >> 40%', atk: 10, slow: 0.40 },
                '4a': {
                    name: 'Arctic Bullet: Homing Shard',
                    desc: 'Damage +4 \nSetiap 2 detik menembakkan pecahan es pelacak dengan 150% Damage dan menerapkan efek Freeze ke target)',
                    atk: 14, slow: 0.40,
                    seekerIntervalSec: 2.0, seekerDmgMult: 1.50
                },
                '4b': {
                    name: 'Arctic Bullet: Cryo Aegis',
                    desc: 'Damage +3 \nSetiap 60 detik menciptakan Shield yang bisa menahan 1 serangan',
                    atk: 13, slow: 0.40,
                    shieldIntervalSec: 60.0
                },
                '5a': {
                    name: 'Arctic Bullet: Homing Shard',
                    desc: 'Damage +4 \nMeningkatkan damage pecahan es pelacak >> 160%',
                    atk: 18, slow: 0.40,
                    seekerIntervalSec: 2.0, seekerDmgMult: 1.60
                },
                '5b': {
                    name: 'Arctic Bullet: Cryo Aegis',
                    desc: 'Damage +3 \nMengurangi coldown Shield menjadi 55 detik',
                    atk: 16, slow: 0.40,
                    shieldIntervalSec: 55.0
                },
                '6a': {
                    name: 'Arctic Bullet: Homing Shard (MAX)',
                    desc: 'Damage +4 \nMeningkatkan damage pecahan es pelacak >> 200%',
                    atk: 22, slow: 0.40,
                    seekerIntervalSec: 2.0, seekerDmgMult: 2.0
                },
                '6b': {
                    name: 'Arctic Bullet: Cryo Aegis (MAX)',
                    desc: 'Damage +3 \nMengurangi coldown Shield menjadi 45 detik',
                    atk: 19, slow: 0.40,
                    shieldIntervalSec: 45.0
                }
            }
        },

        // 5. SHOCK WAVE
        shockwave: {
            id: 'shockwave',
            name: 'Shock Wave',
            color: '#c084fc',
            baseAtk: 15,
            baseCooldown: 60, // 1.0 detik
            levels: {
                1: { desc: 'Menembakkan gelombang yang mendorong target', atk: 15, sizeMult: 1.0, knockback: 22, waves: 1 },
                2: { desc: 'Damage +3 \nUkuran gelombang +10%', atk: 18, sizeMult: 1.10, knockback: 23, waves: 1 },
                3: { desc: 'Damage +3 \nUkuran gelombang +10%', atk: 21, sizeMult: 1.20, knockback: 25, waves: 1 },
                '4a': {
                    name: 'Shockwave: Vortex',
                    desc: 'Damage +3 \nMenembakkan pusaran acak dan menarik musuh ke pusatnya',
                    atk: 24, isVortex: true, vortexSize: 1.0, pullRadius: 130, pullPower: 3.8
                },
                '4b': {
                    name: 'Shockwave: Multi Wave',
                    desc: 'Damage +7 \nGelombang yang ditembakkan bertambah menjadi 2',
                    atk: 28, sizeMult: 1.20, knockback: 26, waves: 2
                },
                '5a': {
                    name: 'Shockwave: Vortex',
                    desc: 'Damage pusaran +3',
                    atk: 27, isVortex: true, vortexSize: 1.0, pullRadius: 140, pullPower: 4.5
                },
                '5b': {
                    name: 'Shockwave: Dual Wave',
                    desc: 'Damage gelombang +7 \nSedikit meningkatkan kekuatan dorongan',
                    atk: 35, sizeMult: 1.20, knockback: 28, waves: 2
                },
                '6a': {
                    name: 'Shockwave: Vortex (MAX)',
                    desc: 'Damage pusaran +3 \nMeningkatkan ukuran pusaran 20%',
                    atk: 30, isVortex: true, vortexSize: 1.20, pullRadius: 165, pullPower: 5.6
                },
                '6b': {
                    name: 'Shockwave: Triple Wave (MAX)',
                    desc: 'Gelombang yang ditembakkan bertambah menjadi 2 \nSedikit meningkatkan kekuatan dorongan',
                    atk: 35, sizeMult: 1.20, knockback: 30, waves: 3
                }
            }
        },

        // 6. FLAME THROWER (Senjata Baru)
        flamethrower: {
            id: 'flamethrower',
            name: 'Flame Thrower',
            color: '#fb923c',
            baseAtk: 5,
            baseRange: 165,
            baseSpread: 0.42,
            levels: {
                1: {
                    desc: 'Menyemburkan api dalam jarak pendek dan menerapkan efek Burn\nBurn: Membakar musuh 2 damage/0.5 detik selama 2 detik)',
                    atk: 5, durationSec: 2.0, cooldownSec: 2.0, rangeMult: 1.0, spreadMult: 1.0,
                    burnDmg: 2, burnDurationSec: 2.0
                },
                2: {
                    desc: 'Damage semburan +5 \nEfek Burn meningkat >> 3 dmg/0.5 detik selama 2 detik',
                    atk: 10, durationSec: 2.0, cooldownSec: 2.0, rangeMult: 1.0, spreadMult: 1.0,
                    burnDmg: 3, burnDurationSec: 2.0
                },
                3: {
                    desc: 'Damage semburan +5 \nDurasi efek Burn meningkat >> 3 dmg/0.5 detik selama 2.5 detik',
                    atk: 15, durationSec: 2.0, cooldownSec: 2.0, rangeMult: 1.0, spreadMult: 1.0,
                    burnDmg: 3, burnDurationSec: 2.5
                },
                '4a': {
                    name: 'Flame: Pyro Torrent',
                    desc: 'Area dan durasi semburan meningkat >> 3.5 detik \nJeda antar semburan >> 3 detik',
                    atk: 15, durationSec: 3.5, cooldownSec: 3.0, rangeMult: 1.0, spreadMult: 1.15,
                    burnDmg: 3, burnDurationSec: 2.5
                },
                '4b': {
                    name: 'Flame: Wildfire Jet',
                    desc: 'Area semburan dipersempit, namun jangkauannya diperpanjang \nJeda antar semburan >> 1.5 dtk',
                    atk: 15, durationSec: 2.0, cooldownSec: 1.5, rangeMult: 1.15, spreadMult: 0.52,
                    burnDmg: 3, burnDurationSec: 2.5
                },
                '5a': {
                    name: 'Flame: Pyro Torrent',
                    desc: 'Damage semburan +2 \nEfek Burn meningkat >> 15 damage/0.5 detik',
                    atk: 17, durationSec: 3.5, cooldownSec: 3.0, rangeMult: 1.0, spreadMult: 1.25,
                    burnDmg: 15, burnDurationSec: 2.5
                },
                '5b': {
                    name: 'Flame: Wildfire Jet',
                    desc: 'Damage semburan +5 \nEfek Burn meningkat >> 8 damage/0.5 detik',
                    atk: 20, durationSec: 2.0, cooldownSec: 1.5, rangeMult: 1.25, spreadMult: 0.52,
                    burnDmg: 8, burnDurationSec: 2.5
                },
                '6a': {
                    name: 'Flame: Pyro Torrent (MAX)',
                    desc: 'Damage semburan +5 \nEfek dan durasi Burn meningkat >> 16 damage/0.5 detik selama 3 dtk',
                    atk: 22, durationSec: 3.5, cooldownSec: 3.0, rangeMult: 1.0, spreadMult: 3.0,
                    burnDmg: 16, burnDurationSec: 3.0
                },
                '6b': {
                    name: 'Flame: Wildfire Jet (MAX)',
                    desc: 'Damage semburan +15 \nJangkauan semburan meningkat',
                    atk: 35, durationSec: 2.0, cooldownSec: 1.5, rangeMult: 1.5, spreadMult: 0.4,
                    burnDmg: 8, burnDurationSec: 2.5
                }
            }
        }
    },

    // ==========================================
    // DATA SENJATA FUSION (KEDUA SENJATA WAJIB MAX & MIN. LEVEL 15)
    // ==========================================
    fusions: {
        cryoMachine: {
            id: 'cryoMachine',
            name: 'Cryo Machine',
            req: { laser: '6b', arctic: '6a' },
            reqText: 'Laser: Rapid Stream + Arctic Bullet: Homing Shard',
            title: 'Cryo Machine',
            desc: 'Laser yang ditembakkan berubah menjadi Arctic Bullet \nPecahan es pelacak bertambah menjadi 2',
            color: '#cbd5e1'
        },
        timeStop: {
            id: 'timeStop',
            name: 'Time Stop',
            req: { he: '6b', arctic: '6a' },
            reqText: 'HE Cannon: Cryo Freeze + Arctic Bullet: Homing Shard',
            title: 'Time Stop',
            desc: 'Area ledakan HE Cannon diperluas. Saat mengenai musuh, target akan berhenti 3 detik. Efek ini memiliki coldown 4 detik dan berpengaruh 50% pada boss',
            color: '#cbd5e1'
        },
        doom: {
            id: 'doom',
            name: 'Doom',
            req: { laser: '6a', he: '6a' },
            reqText: 'Laser Gun: Scatter + HE Cannon: Napalm Burn',
            title: 'Doom',
            desc: 'Tembakan laser digantikan dengan HE Cannon: Napalm Burn',
            color: '#cbd5e1'
        },
        inferno: {
            id: 'inferno',
            name: 'Inferno',
            req: { lightning: '6a', flamethrower: '6b' },
            reqText: 'Lightning: Overload + Flame: Wildfire Jet',
            title: 'Inferno',
            desc: 'Sambaran pada target yang sama terus memicu & meningkatkan efek Burn setiap 2 detik',
            color: '#cbd5e1'
        },
        electroDoom: {
            id: 'electroDoom',
            name: 'Electro Doom',
            req: { lightning: '6a', he: '6a' },
            reqText: 'Lightning: Overload + HE Cannon: Napalm Burn',
            title: 'Electro Doom',
            desc: 'Setiap peningkatan Damage dari Lightning: Overload akan memicu ledakan critical HE Cannon',
            color: '#cbd5e1'
        }
    }
};