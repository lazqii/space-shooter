// game.js - Engine Utama dengan 4 Senjata, Evolusi, Homing, Lightning Chain & Shield

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ==========================================
// 1. ASSET LOADER
// ==========================================
const assets = {};
function loadSprite(key, src) {
    const img = new Image();
    img.src = src;
    img.loaded = false;
    img.onload = () => { img.loaded = true; };
    assets[key] = img;
}
loadSprite('player', GAME_CONFIG.player.sprite);
loadSprite('scout', GAME_CONFIG.enemies.scout.sprite);
loadSprite('heavy', GAME_CONFIG.enemies.heavy.sprite);
loadSprite('boss', GAME_CONFIG.boss.defaultSprite);

// ==========================================
// 2. STATE GAME, WAVE & 4 SENJATA PLAYER
// ==========================================
let gameState = 'START'; // START, WAVE_MINIONS, BOSS_WARNING, BOSS_FIGHT, SKILL_SELECT, GAME_OVER
let previousState = 'WAVE_MINIONS';
let frameCount = 0;
let score = 0;
let highScore = Number(localStorage.getItem('space_shooter_hi')) || 0;

let wave = 1;
let waveTimerFrames = GAME_CONFIG.wave.durationSeconds * 60;
let enemiesSpawnedThisWave = 0;
let enemyQuotaThisWave = GAME_CONFIG.wave.baseEnemyQuota;
let spawnIntervalFrames = 150;
let warningTimer = 0;
let screenShake = 0;

let playerLevel = 1;
let currentExp = 0;
let expToNextLevel = GAME_CONFIG.leveling.baseExpRequired;
let pendingLevelUps = 0;

// Level masing-masing dari 5 senjata (null jika belum dibuka)
let playerSkills = {
    laser: '1',
    he: null,
    lightning: null,
    arctic: null,
    shockwave: null
};

let weaponTimers = {
    laser: 0,
    he: 0,
    lightning: 0,
    arctic: 0,
    arcticSeeker: 0,
    arcticShield: 0,
    shockwave: 0
};

// Status 3 Senjata Fusion (aktif jika true)
let playerFusions = {
    cryoMachine: false, // Laser 6B + Arctic 6A
    timeStop: false,    // HE 6B + Arctic 6A
    doom: false         // Laser 6A + HE 6A
};

// State khusus Lightning Overload (Cabang A) & visual petir
let lightningState = {
    lockedTarget: null,
    lockFrames: 0,
    visualBolts: [] // Menyimpan garis petir sementara untuk digambar di canvas
};

let skillChoices = [];

const pSpeed = GAME_CONFIG.player.speed;

const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: GAME_CONFIG.player.width,
    height: GAME_CONFIG.player.height,
    speed: pSpeed,
    hp: GAME_CONFIG.player.maxHp,
    hasShield: false, // Shield dari Arctic Bullet cabang B
    invulnTimer: 0
};

let boss = null;
let projectiles = [];
let enemies = [];
let enemyBullets = [];
let drops = [];
let particles = [];
let floatingTexts = [];
let stars = [];

for (let i = 0; i < 70; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() < 0.6 ? 1.5 : 2.5,
        speed: 0.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.7
    });
}

// ==========================================
// 3. SISTEM EXP & SKILL TREE (4 SENJATA)
// ==========================================
function addExp(amount) {
    currentExp += amount;
    while (currentExp >= expToNextLevel) {
        currentExp -= expToNextLevel;
        playerLevel++;
        expToNextLevel = GAME_CONFIG.leveling.baseExpRequired + (playerLevel - 1) * GAME_CONFIG.leveling.expIncrementPerLvl;
        pendingLevelUps++;
        // Immune 1 detik (60 frame) saat naik level
        player.invulnTimer = 60;
    }

    if (pendingLevelUps > 0 && gameState !== 'SKILL_SELECT' && gameState !== 'GAME_OVER') {
        triggerSkillSelection();
    }
}

function getAvailableSkillUpgrades() {
    const pool = [];
    const weaponKeys = ['laser', 'he', 'lightning', 'arctic', 'shockwave'];

    // 1. Cek Senjata Fusion:
    // Syarat: kedua senjata harus MAX & player minimal level 15
    const fusionCards = [];
    if (GAME_CONFIG.fusions && playerLevel >= 15) {
        for (const fKey in GAME_CONFIG.fusions) {
            const fData = GAME_CONFIG.fusions[fKey];
            if (!playerFusions[fKey]) {
                let eligible = true;
                for (const rW in fData.req) {
                    if (playerSkills[rW] !== fData.req[rW]) {
                        eligible = false;
                        break;
                    }
                }
                if (eligible) {
                    fusionCards.push({
                        isFusion: true,
                        fusionKey: fKey,
                        title: `★ FUSION: ${fData.name}`,
                        desc: fData.desc,
                        reqText: fData.reqText,
                        color: fData.color
                    });
                }
            }
        }
    }

    // 2. Kumpulkan upgrade senjata normal
    for (const wKey of weaponKeys) {
        const wCfg = GAME_CONFIG.weapons[wKey];
        if (!wCfg) continue;
        const curLvl = playerSkills[wKey];

        if (!curLvl) {
            pool.push({
                weapon: wKey,
                nextLvl: '1',
                title: `Unlock: ${wCfg.name}`,
                desc: wCfg.levels['1'].desc,
                color: wCfg.color
            });
        } else if (curLvl === '1' || curLvl === '2') {
            const next = String(Number(curLvl) + 1);
            pool.push({
                weapon: wKey,
                nextLvl: next,
                title: `${wCfg.name} Lv.${next}`,
                desc: wCfg.levels[next].desc,
                color: wCfg.color
            });
        } else if (curLvl === '3') {
            // Percabangan Evolusi Level 4
            pool.push({
                weapon: wKey,
                nextLvl: '4a',
                title: wCfg.levels['4a'].name,
                desc: wCfg.levels['4a'].desc,
                color: wCfg.color,
                isEvo: true
            });
            pool.push({
                weapon: wKey,
                nextLvl: '4b',
                title: wCfg.levels['4b'].name,
                desc: wCfg.levels['4b'].desc,
                color: wCfg.color,
                isEvo: true
            });
        } else if (curLvl === '4a' || curLvl === '5a') {
            const next = curLvl === '4a' ? '5a' : '6a';
            pool.push({
                weapon: wKey,
                nextLvl: next,
                title: wCfg.levels[next].name,
                desc: wCfg.levels[next].desc,
                color: wCfg.color
            });
        } else if (curLvl === '4b' || curLvl === '5b') {
            const next = curLvl === '4b' ? '5b' : '6b';
            pool.push({
                weapon: wKey,
                nextLvl: next,
                title: wCfg.levels[next].name,
                desc: wCfg.levels[next].desc,
                color: wCfg.color
            });
        }
    }

    // Prioritaskan kartu Fusion di posisi paling utama (paling atas)
    const shuffledNormal = pool.sort(() => Math.random() - 0.5);
    const combined = [...fusionCards, ...shuffledNormal];

    if (combined.length === 0) {
        combined.push({ weapon: 'heal', nextLvl: null, title: 'Emergency Repair', desc: 'Pulihkan +2 HP Pesawat', color: '#22c55e' });
        combined.push({ weapon: 'bonus', nextLvl: null, title: 'Overcharge Core', desc: '+1000 Bonus Score', color: '#facc15' });
    }

    // Tampilkan hingga 3 kartu pilihan
    return combined.slice(0, 3);
}

function triggerSkillSelection() {
    pendingLevelUps--;
    skillChoices = getAvailableSkillUpgrades();
    previousState = gameState;
    gameState = 'SKILL_SELECT';
}

function applySkillChoice(choice) {
    if (choice.isFusion) {
        playerFusions[choice.fusionKey] = true;
        spawnFloatingText(player.x, player.y - 45, `FUSION: ${choice.title.replace('★ FUSION: ', '')}!`, choice.color, 16);
        createExplosion(player.x, player.y, [choice.color, '#ffffff', '#facc15'], 36);
        screenShake = 16;
    } else if (choice.weapon === 'heal') {
        player.hp = Math.min(GAME_CONFIG.player.maxHp, player.hp + 2);
    } else if (choice.weapon === 'bonus') {
        score += 1000;
    } else {
        playerSkills[choice.weapon] = choice.nextLvl;
        // Langsung aktifkan Shield pertama kali saat pemain memilih Arctic 4B
        if (choice.weapon === 'arctic' && choice.nextLvl === '4b') {
            player.hasShield = true;
            weaponTimers.arcticShield = Math.round(GAME_CONFIG.weapons.arctic.levels['4b'].shieldIntervalSec * 60);
        }
    }

    if (pendingLevelUps > 0) {
        triggerSkillSelection();
    } else {
        // Berikan immune 1 detik saat pemain kembali dari menu skill
        player.invulnTimer = Math.max(player.invulnTimer, 60);
        gameState = previousState;
    }
}

// ==========================================
// 4. KONTROL INPUT
// ==========================================
const keys = {};
const isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

const joystick = {
    active: false,
    touchId: null,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
    maxRadius: 52,
    dx: 0,
    dy: 0
};

function toCanvasXY(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function handleMenuAction(x, y) {
    if (gameState === 'START' || gameState === 'GAME_OVER') {
        startGame();
        return true;
    }
    if (gameState === 'SKILL_SELECT') {
        for (let idx = 0; idx < skillChoices.length; idx++) {
            const cardY = 230 + idx * 125;
            if (x >= 40 && x <= canvas.width - 40 && y >= cardY && y <= cardY + 105) {
                applySkillChoice(skillChoices[idx]);
                break;
            }
        }
        return true;
    }
    return false;
}

function updateAnalogDrag(x, y) {
    const diffX = x - joystick.baseX;
    const diffY = y - joystick.baseY;
    const dist = Math.hypot(diffX, diffY);

    if (dist > joystick.maxRadius) {
        const angle = Math.atan2(diffY, diffX);
        joystick.knobX = joystick.baseX + Math.cos(angle) * joystick.maxRadius;
        joystick.knobY = joystick.baseY + Math.sin(angle) * joystick.maxRadius;
    } else {
        joystick.knobX = x;
        joystick.knobY = y;
    }

    joystick.dx = dist > 6 ? (joystick.knobX - joystick.baseX) / joystick.maxRadius : 0;
    joystick.dy = dist > 6 ? (joystick.knobY - joystick.baseY) / joystick.maxRadius : 0;
}

function resetJoystick() {
    joystick.active = false;
    joystick.touchId = null;
    joystick.dx = 0;
    joystick.dy = 0;
}

// Keyboard (PC)
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'Enter') && (gameState === 'START' || gameState === 'GAME_OVER')) {
        startGame();
    }
    if (gameState === 'SKILL_SELECT') {
        if (e.code === 'Digit1' && skillChoices[0]) applySkillChoice(skillChoices[0]);
        if (e.code === 'Digit2' && skillChoices[1]) applySkillChoice(skillChoices[1]);
        if (e.code === 'Digit3' && skillChoices[2]) applySkillChoice(skillChoices[2]);
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Mouse (PC)
canvas.addEventListener('mousedown', (e) => {
    const pos = toCanvasXY(e.clientX, e.clientY);
    if (handleMenuAction(pos.x, pos.y)) return;

    joystick.active = true;
    joystick.touchId = 'mouse';
    joystick.baseX = pos.x;
    joystick.baseY = pos.y;
    joystick.knobX = pos.x;
    joystick.knobY = pos.y;
    joystick.dx = 0;
    joystick.dy = 0;
});

window.addEventListener('mousemove', (e) => {
    if (joystick.active && joystick.touchId === 'mouse') {
        const pos = toCanvasXY(e.clientX, e.clientY);
        updateAnalogDrag(pos.x, pos.y);
    }
});

window.addEventListener('mouseup', () => {
    if (joystick.touchId === 'mouse') resetJoystick();
});

// Touch (HP / Mobile)
canvas.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;

    const pos = toCanvasXY(touch.clientX, touch.clientY);
    if (handleMenuAction(pos.x, pos.y)) return;

    if (!joystick.active) {
        joystick.active = true;
        joystick.touchId = touch.identifier;
        joystick.baseX = pos.x;
        joystick.baseY = pos.y;
        joystick.knobX = pos.x;
        joystick.knobY = pos.y;
        joystick.dx = 0;
        joystick.dy = 0;
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (e.cancelable) e.preventDefault();
    if (!joystick.active) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystick.touchId) {
            const pos = toCanvasXY(touch.clientX, touch.clientY);
            updateAnalogDrag(pos.x, pos.y);
            break;
        }
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystick.touchId) {
            resetJoystick();
            break;
        }
    }
});

window.addEventListener('touchcancel', resetJoystick);

// ==========================================
// 5. SETUP WAVE & LOGIKA PENEMBAKAN 4 SENJATA
// ==========================================
function setupWave(waveNum) {
    wave = waveNum;
    waveTimerFrames = GAME_CONFIG.wave.durationSeconds * 60;
    enemiesSpawnedThisWave = 0;
    enemyQuotaThisWave = GAME_CONFIG.wave.baseEnemyQuota + (wave - 1) * GAME_CONFIG.wave.quotaIncrement;

    const activeSpawnFrames = Math.max(600, (GAME_CONFIG.wave.durationSeconds - 8) * 60);
    spawnIntervalFrames = Math.max(22, Math.floor(activeSpawnFrames / enemyQuotaThisWave));
    gameState = 'WAVE_MINIONS';
}

function startGame() {
    score = 0;
    playerLevel = 1;
    currentExp = 0;
    expToNextLevel = GAME_CONFIG.leveling.baseExpRequired;
    pendingLevelUps = 0;

    playerSkills = { laser: '1', he: null, lightning: null, arctic: null, shockwave: null };
    weaponTimers = { laser: 0, he: 0, lightning: 0, arctic: 0, arcticSeeker: 0, arcticShield: 0, shockwave: 0 };
    playerFusions = { cryoMachine: false, timeStop: false, doom: false };
    lightningState = { lockedTarget: null, lockFrames: 0, visualBolts: [] };

    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.hp = GAME_CONFIG.player.maxHp;
    player.hasShield = false;
    player.invulnTimer = 0;

    boss = null;
    projectiles = [];
    enemies = [];
    enemyBullets = [];
    drops = [];
    particles = [];
    floatingTexts = [];

    resetJoystick();
    setupWave(1);
}

function getAllActiveTargets() {
    const list = enemies.filter(e => e.y > -20 && e.hp > 0);
    if (boss && boss.hp > 0) list.push(boss);
    return list;
}

function findNearestTarget(fromX, fromY, excludeList = [], maxDist = Infinity) {
    let nearest = null;
    let bestDist = maxDist;
    for (const t of getAllActiveTargets()) {
        if (excludeList.includes(t)) continue;
        const d = Math.hypot(t.x - fromX, t.y - fromY);
        if (d < bestDist) {
            bestDist = d;
            nearest = t;
        }
    }
    return nearest;
}

function fireActiveWeapons() {
    // 1. LASER GUN (Termasuk Fusion: DOOM & CRYO MACHINE)
    if (playerSkills.laser && weaponTimers.laser <= 0) {
        const wCfg = GAME_CONFIG.weapons.laser;
        const lvlData = wCfg.levels[playerSkills.laser];

        // FUSION 3: DOOM (Laser 6A + HE Cannon 6A)
        // Sekarang laser yang ditembakkan digantikan dengan HE Gun Nova Fan (5 meriam HE bercabang)
        if (playerFusions.doom) {
            const heCfg = GAME_CONFIG.weapons.he;
            const heLvl = heCfg.levels['6a'];
            const branches = 5;
            const spread = 0.36;
            const speed = 9.2;

            for (let i = 0; i < branches; i++) {
                const angle = -Math.PI / 2 + (i - (branches - 1) / 2) * (spread / (branches - 1) * 2);
                projectiles.push({
                    kind: 'he',
                    isDoom: true,
                    x: player.x,
                    y: player.y - 28,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    atk: heCfg.baseAtk * 1.15,
                    radius: heCfg.explosionRadius * 1.1,
                    lvlData: heLvl,
                    color: '#ef4444'
                });
            }
            weaponTimers.laser = Math.max(1, Math.round(wCfg.baseCooldown / lvlData.shotsPerSec));
        }
        // FUSION 1: CRYO MACHINE (Laser 6B + Arctic Bullet 6A)
        // Laser yang ditembakkan berubah menjadi Arctic Bullet beruntun cepat
        else if (playerFusions.cryoMachine) {
            const branches = lvlData.branches;
            const spread = lvlData.spread;
            const speed = lvlData.speed;
            const arcCfg = GAME_CONFIG.weapons.arctic;
            const arcLvl = arcCfg.levels['6a'];

            for (let i = 0; i < branches; i++) {
                let vx = 0;
                let vy = -speed;
                if (branches > 1 && spread > 0) {
                    const angle = -Math.PI / 2 + (i - (branches - 1) / 2) * (spread / (branches - 1) * 2);
                    vx = Math.cos(angle) * speed;
                    vy = Math.sin(angle) * speed;
                }
                projectiles.push({
                    kind: 'arctic',
                    isCryoMachine: true,
                    x: player.x,
                    y: player.y - 28,
                    vx,
                    vy,
                    atk: wCfg.baseAtk + 5,
                    slow: arcLvl.slow,
                    duration: arcCfg.freezeDuration,
                    cd: arcCfg.freezeCd,
                    color: '#38bdf8'
                });
            }
            weaponTimers.laser = Math.max(1, Math.round(wCfg.baseCooldown / lvlData.shotsPerSec));
        }
        // Laser Normal
        else {
            const branches = lvlData.branches;
            const spread = lvlData.spread;
            const speed = lvlData.speed;

            for (let i = 0; i < branches; i++) {
                let vx = 0;
                let vy = -speed;
                if (branches > 1 && spread > 0) {
                    const angle = -Math.PI / 2 + (i - (branches - 1) / 2) * (spread / (branches - 1) * 2);
                    vx = Math.cos(angle) * speed;
                    vy = Math.sin(angle) * speed;
                }
                projectiles.push({
                    kind: 'laser',
                    x: player.x,
                    y: player.y - 28,
                    vx,
                    vy,
                    atk: wCfg.baseAtk,
                    color: wCfg.color
                });
            }
            weaponTimers.laser = Math.max(1, Math.round(wCfg.baseCooldown / lvlData.shotsPerSec));
        }
    }

    // 2. HE CANNON
    if (playerSkills.he && weaponTimers.he <= 0) {
        const wCfg = GAME_CONFIG.weapons.he;
        const lvlData = wCfg.levels[playerSkills.he];
        projectiles.push({
            kind: 'he',
            x: player.x,
            y: player.y - 30,
            vx: 0,
            vy: -8.5,
            atk: wCfg.baseAtk,
            radius: wCfg.explosionRadius,
            lvlData,
            color: playerFusions.timeStop ? '#60a5fa' : wCfg.color
        });
        weaponTimers.he = wCfg.baseCooldown;
    }

    // 3. LIGHTNING CHAIN (Otomatis menyambar musuh terdekat setiap 0.2 detik)
    if (playerSkills.lightning && weaponTimers.lightning <= 0) {
        const wCfg = GAME_CONFIG.weapons.lightning;
        const lvlData = wCfg.levels[playerSkills.lightning];
        const primary = findNearestTarget(player.x, player.y, [], wCfg.maxRange);

        if (primary) {
            let finalAtk = lvlData.atk;

            // Evolusi Cabang A: Overload (DMG meningkat jika terus menyambar target yang sama)
            if (lvlData.rampIntervalSec) {
                if (lightningState.lockedTarget === primary) {
                    lightningState.lockFrames += wCfg.baseCooldown;
                    const stacks = Math.floor(lightningState.lockFrames / (lvlData.rampIntervalSec * 60));
                    finalAtk += stacks * lvlData.rampBonus;
                } else {
                    lightningState.lockedTarget = primary;
                    lightningState.lockFrames = 0;
                }
            }

            applyDamageToTarget(primary, finalAtk, '#fde047', false);
            createExplosion(primary.x, primary.y, ['#eab308', '#fef08a'], 4);
            lightningState.visualBolts.push({
                x1: player.x, y1: player.y - 24,
                x2: primary.x, y2: primary.y,
                life: 6
            });

            // Evolusi Cabang B: Arc Storm (Menyambar musuh di sekitar target utama)
            if (lvlData.chains > 0) {
                const hitTargets = [primary];
                let lastNode = primary;
                for (let c = 0; c < lvlData.chains; c++) {
                    const nextNode = findNearestTarget(lastNode.x, lastNode.y, hitTargets, wCfg.chainRadius);
                    if (!nextNode) break;
                    hitTargets.push(nextNode);
                    applyDamageToTarget(nextNode, finalAtk, '#facc15', false);
                    createExplosion(nextNode.x, nextNode.y, ['#eab308', '#ffffff'], 3);
                    lightningState.visualBolts.push({
                        x1: lastNode.x, y1: lastNode.y,
                        x2: nextNode.x, y2: nextNode.y,
                        life: 6
                    });
                    lastNode = nextNode;
                }
            }

            weaponTimers.lightning = wCfg.baseCooldown;
        } else {
            lightningState.lockedTarget = null;
            lightningState.lockFrames = 0;
        }
    }

    // 4. ARCTIC BULLET (Peluru Es Utama + Cabang A Homing Seeker + Cabang B Shield + Cryo Machine 2 Seeker)
    if (playerSkills.arctic) {
        const wCfg = GAME_CONFIG.weapons.arctic;
        const lvlData = wCfg.levels[playerSkills.arctic];

        // Peluru es lurus setiap 1.0 detik
        if (weaponTimers.arctic <= 0) {
            projectiles.push({
                kind: 'arctic',
                x: player.x,
                y: player.y - 28,
                vx: 0,
                vy: -10,
                atk: lvlData.atk,
                slow: lvlData.slow,
                duration: wCfg.freezeDuration,
                cd: wCfg.freezeCd,
                color: wCfg.color
            });
            weaponTimers.arctic = wCfg.baseCooldown;
        }

        // Cabang A: Homing Ice Shard (Fusion Cryo Machine: bertambah menjadi 2 projectile pelacak)
        if (lvlData.seekerIntervalSec && weaponTimers.arcticSeeker <= 0) {
            const seekerCount = playerFusions.cryoMachine ? 2 : 1;
            const allTargets = getAllActiveTargets().sort((a, b) => 
                Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)
            );

            for (let k = 0; k < seekerCount; k++) {
                const target = allTargets[k] || allTargets[0];
                if (target) {
                    const baseAngle = Math.atan2(target.y - (player.y - 24), target.x - player.x);
                    const angleOffset = seekerCount > 1 ? (k === 0 ? -0.22 : 0.22) : 0;
                    const finalAngle = baseAngle + angleOffset;
                    const speed = 9.5;
                    projectiles.push({
                        kind: 'arctic_seeker',
                        target,
                        speed,
                        x: player.x + (k === 0 ? -10 : 10),
                        y: player.y - 24,
                        vx: Math.cos(finalAngle) * speed,
                        vy: Math.sin(finalAngle) * speed,
                        atk: lvlData.atk * lvlData.seekerDmgMult,
                        slow: lvlData.slow,
                        duration: wCfg.freezeDuration,
                        cd: wCfg.freezeCd,
                        color: playerFusions.cryoMachine ? '#38bdf8' : '#22d3ee'
                    });
                }
            }
            weaponTimers.arcticSeeker = Math.round(lvlData.seekerIntervalSec * 60);
        }

        // Cabang B: Regenerasi Shield setiap 60 / 50 detik (tidak menumpuk, me-refresh)
        if (lvlData.shieldIntervalSec) {
            if (weaponTimers.arcticShield <= 0) {
                player.hasShield = true;
                weaponTimers.arcticShield = Math.round(lvlData.shieldIntervalSec * 60);
                spawnFloatingText(player.x, player.y - 38, 'SHIELD READY', '#67e8f9', 12);
                createExplosion(player.x, player.y, ['#67e8f9', '#ffffff'], 14);
            }
        }
    }

    // 5. SHOCK WAVE (Kipas dorong musuh atau Pusaran tarik musuh ke pusat)
    if (playerSkills.shockwave && weaponTimers.shockwave <= 0) {
        const swCfg = GAME_CONFIG.weapons.shockwave;
        const swLvl = swCfg.levels[playerSkills.shockwave];

        if (swLvl.isVortex) {
            // Evolusi Cabang A: Pusaran acak menerjang ke depan & menarik musuh
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.72;
            const speed = 4.2;
            projectiles.push({
                kind: 'shockwave_vortex',
                x: player.x,
                y: player.y - 24,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                atk: swLvl.atk,
                vortexSize: swLvl.vortexSize || 1.0,
                radius: 40 * (swLvl.vortexSize || 1.0),
                pullRadius: swLvl.pullRadius || 135,
                pullPower: swLvl.pullPower || 3.8,
                life: 140,
                damageTimer: 0,
                spinAngle: 0,
                color: swCfg.color
            });
            createExplosion(player.x, player.y - 20, ['#c084fc', '#d8b4fe'], 6);
        } else {
            // Gelombang Kipas (Level 1-3: 1 gelombang, Level 4B & 5B: 2 gelombang, Level 6B: 3 gelombang)
            const waveCount = swLvl.waves || 1;
            const spreadAngles = waveCount === 1 ? [0] : (waveCount === 2 ? [-0.15, 0.15] : [-0.25, 0, 0.25]);

            for (let w = 0; w < waveCount; w++) {
                const angle = -Math.PI / 2 + spreadAngles[w];
                const speed = 8.5;
                projectiles.push({
                    kind: 'shockwave_fan',
                    x: player.x,
                    y: player.y - 22,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    atk: swLvl.atk,
                    sizeMult: swLvl.sizeMult || 1.0,
                    knockback: swLvl.knockback || 22,
                    arcWidth: 74 * (swLvl.sizeMult || 1.0),
                    hitTargets: [],
                    life: 65,
                    color: swCfg.color
                });
            }
            createExplosion(player.x, player.y - 20, ['#c084fc', '#e879f9', '#ffffff'], 8);
        }
        weaponTimers.shockwave = swCfg.baseCooldown;
    }
}

// ==========================================
// 6. EFEK STATUS (FREEZE, BURN, SHATTER)
// ==========================================
function spawnFloatingText(x, y, text, color = '#ffffff', size = 13) {
    floatingTexts.push({
        x: x + (Math.random() - 0.5) * 16,
        y,
        text,
        color,
        size,
        life: 40
    });
}

function applyDamageToTarget(target, amount, color = '#ffffff', isCrit = false) {
    // Boss kebal terhadap semua damage selama 3 detik awal (animasi masuk)
    if (target === boss && boss && boss.introTimer > 0) {
        target.hitFlash = 3;
        spawnFloatingText(target.x, target.y - 20, 'IMMUNE', '#facc15', 13);
        createExplosion(target.x, target.y, ['#facc15', '#ffffff'], 4);
        return;
    }

    target.hp -= amount;
    target.hitFlash = 4;
    const label = isCrit ? `${Math.round(amount)}!` : `${Math.round(amount)}`;
    spawnFloatingText(target.x, target.y - 15, label, color, isCrit ? 16 : 12);
}

function applyFreezeToTarget(target, slowAmount, durationSec, cdSec) {
    if (target === boss && boss && boss.introTimer > 0) return;
    if (!target.status) updateStatusEffects(target);
    if (target.status.freezeCdTimer <= 0) {
        target.status.slowFactor = Math.max(target.status.slowFactor || 0, slowAmount);
        target.status.freezeTimer = Math.round(durationSec * 60);
        target.status.freezeCdTimer = Math.round(cdSec * 60);
        spawnFloatingText(target.x, target.y - 28, 'FROZEN', '#67e8f9', 12);
    }
}

function updateStatusEffects(target) {
    if (!target.status) {
        target.status = {
            burnTimer: 0,
            burnTickTimer: 0,
            burnDps: 0,
            freezeTimer: 0,
            freezeAccumulated: 0,
            freezeCdTimer: 0,
            shatterCdTimer: 0,
            slowFactor: 0,
            timeStopTimer: 0,
            timeStopCdTimer: 0
        };
    }
    const st = target.status;

    if (st.freezeCdTimer > 0) st.freezeCdTimer--;
    if (st.shatterCdTimer > 0) st.shatterCdTimer--;
    if (st.timeStopCdTimer > 0) st.timeStopCdTimer--;
    if (st.timeStopTimer > 0) st.timeStopTimer--;

    if (st.burnTimer > 0) {
        st.burnTimer--;
        st.burnTickTimer++;
        if (st.burnTickTimer >= 60) {
            st.burnTickTimer = 0;
            applyDamageToTarget(target, st.burnDps, '#fb923c', false);
            createExplosion(target.x, target.y, ['#f97316', '#facc15'], 6);
        }
    }

    if (st.freezeTimer > 0) {
        st.freezeTimer--;
        st.freezeAccumulated += 1 / 60;

        // Sinergi HE Cannon 6B: jika musuh beku > 4 detik (termasuk dari Arctic Bullet)
        const heLvl = playerSkills.he;
        if (heLvl === '6b' && st.freezeAccumulated > 4.0 && st.shatterCdTimer <= 0) {
            const trueDmg = GAME_CONFIG.weapons.he.baseAtk * GAME_CONFIG.weapons.he.levels['6b'].shatterTrueDmgPct;
            applyDamageToTarget(target, trueDmg, '#22d3ee', true);
            spawnFloatingText(target.x, target.y - 34, 'SHATTER!', '#67e8f9', 14);
            createExplosion(target.x, target.y, ['#22d3ee', '#ffffff'], 20);
            st.shatterCdTimer = GAME_CONFIG.weapons.he.levels['6b'].shatterCd * 60;
            st.freezeAccumulated = 0;
        }

        if (st.freezeTimer <= 0) {
            st.slowFactor = 0;
            st.freezeAccumulated = 0;
        }
    }
}

function triggerHeExplosion(proj, directTarget) {
    const lvl = proj.lvlData;
    const isTimeStop = playerFusions.timeStop;
    const blastRadius = isTimeStop ? proj.radius * 1.55 : proj.radius;

    if (proj.isDoom) {
        createExplosion(proj.x, proj.y, ['#ef4444', '#f97316', '#facc15', '#ffffff'], 28);
        screenShake = Math.max(screenShake, 7);
    } else if (isTimeStop) {
        createExplosion(proj.x, proj.y, ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff'], 30);
        screenShake = Math.max(screenShake, 7);
    } else {
        createExplosion(proj.x, proj.y, ['#f97316', '#facc15', '#ef4444'], 22);
        screenShake = Math.max(screenShake, 5);
    }

    for (const target of getAllActiveTargets()) {
        const dist = Math.hypot(target.x - proj.x, target.y - proj.y);
        const hitRange = blastRadius + (target.width * 0.35);

        if (target === directTarget || dist <= hitRange) {
            const isCrit = Math.random() < lvl.critRate;
            const finalDmg = isCrit ? proj.atk * lvl.critDmg : proj.atk;
            applyDamageToTarget(target, finalDmg, isCrit ? '#facc15' : '#fdba74', isCrit);

            if (!target.status) updateStatusEffects(target);

            // FUSION 2: TIME STOP (HE 6B + Arctic 6A)
            // Ledakan berarea luas menghentikan musuh 3 detik (boss 1.5 detik), CD 4 detik
            if (isTimeStop && target.status.timeStopCdTimer <= 0) {
                const isBoss = (target === boss);
                const durationSec = isBoss ? 1.5 : 3.0;
                target.status.timeStopTimer = Math.round(durationSec * 60);
                target.status.timeStopCdTimer = Math.round(4.0 * 60);
                spawnFloatingText(target.x, target.y - 32, isBoss ? 'TIME STOP (1.5s)!' : 'TIME STOP (3s)!', '#60a5fa', 14);
            }

            if (lvl.burnPct) {
                target.status.burnDps = proj.atk * lvl.burnPct;
                target.status.burnTimer = Math.round(lvl.burnDuration * 60);
            }

            if (lvl.freezeSlow) {
                applyFreezeToTarget(target, lvl.freezeSlow, lvl.freezeDuration, lvl.freezeCd);
            }
        }
    }
}

// ==========================================
// 7. SPAWN & UPDATE LOOP
// ==========================================
function spawnEnemy() {
    if (enemiesSpawnedThisWave >= enemyQuotaThisWave) return;

    enemiesSpawnedThisWave++;
    const heavyChance = Math.min(0.65, 0.25 + wave * 0.08);
    const typeKey = Math.random() < heavyChance ? 'heavy' : 'scout';
    const cfg = GAME_CONFIG.enemies[typeKey];
    const maxHp = cfg.baseHp + (wave - 1) * cfg.hpIncrementPerWave;

    enemies.push({
        type: typeKey,
        cfg,
        x: 45 + Math.random() * (canvas.width - 90),
        y: -50,
        width: cfg.width,
        height: cfg.height,
        vy: cfg.baseSpeedY + (wave - 1) * cfg.speedIncrement,
        vx: cfg.speedX ? (Math.random() < 0.5 ? -cfg.speedX : cfg.speedX) : 0,
        hp: maxHp,
        maxHp,
        shootTimer: 60 + Math.floor(Math.random() * 60),
        hitFlash: 0,
        status: null
    });
}

function spawnBoss() {
    const bCfg = GAME_CONFIG.boss;
    const totalHp = bCfg.baseHp + (wave - 1) * bCfg.hpIncrementPerWave;
    const sizeBonus = Math.min(bCfg.maxSizeBonus, (wave - 1) * bCfg.sizeIncrementPerWave);

    boss = {
        x: canvas.width / 2,
        y: -130,
        targetY: 155,
        width: bCfg.baseWidth + sizeBonus,
        height: bCfg.baseHeight + sizeBonus,
        vx: bCfg.baseSpeedX + (wave - 1) * bCfg.speedIncrementPerWave,
        hp: totalHp,
        maxHp: totalHp,
        attackTimer: 180, // Mulai serang setelah animasi masuk 3 detik
        patternIndex: 0,
        hitFlash: 0,
        status: null,
        introTimer: 180 // Immune terhadap semua damage pada 3 detik awal (180 frame)
    };
}

function createExplosion(x, y, colors, count = 16) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 22 + Math.random() * 18
        });
    }
}

function damagePlayer() {
    if (player.godMode || player.invulnTimer > 0) return;

    // Cek Shield dari Arctic Bullet Cabang B terlebih dahulu
    if (player.hasShield) {
        player.hasShield = false;
        player.invulnTimer = 60; // 1.0 detik immune
        screenShake = 6;
        spawnFloatingText(player.x, player.y - 30, 'BLOCKED!', '#67e8f9', 14);
        createExplosion(player.x, player.y, ['#67e8f9', '#ffffff'], 22);
        return;
    }

    player.hp--;
    player.invulnTimer = 60; // 1.0 detik immune terhadap semua damage
    screenShake = 12;
    createExplosion(player.x, player.y, ['#38bdf8', '#facc15', '#ffffff'], 20);
    if (player.hp <= 0) {
        gameState = 'GAME_OVER';
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('space_shooter_hi', highScore);
        }
    }
}

function handleProjectileImpact(proj, target) {
    if (proj.kind === 'he') {
        triggerHeExplosion(proj, target);
    } else if (proj.kind === 'arctic' || proj.kind === 'arctic_seeker') {
        const isSeeker = proj.kind === 'arctic_seeker';
        applyDamageToTarget(target, proj.atk, isSeeker ? '#22d3ee' : '#a5f3fc', isSeeker);
        applyFreezeToTarget(target, proj.slow, proj.duration, proj.cd);
        createExplosion(proj.x, proj.y, ['#67e8f9', '#ffffff'], isSeeker ? 12 : 6);
    } else {
        applyDamageToTarget(target, proj.atk, '#bae6fd', false);
        createExplosion(proj.x, proj.y, ['#38bdf8', '#ffffff'], 4);
    }
}

function update() {
    frameCount++;
    if (screenShake > 0) screenShake--;

    for (const s of stars) {
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
    }

    // Kurangi umur visual petir
    for (let i = lightningState.visualBolts.length - 1; i >= 0; i--) {
        lightningState.visualBolts[i].life--;
        if (lightningState.visualBolts[i].life <= 0) lightningState.visualBolts.splice(i, 1);
    }

    if (gameState === 'START' || gameState === 'GAME_OVER' || gameState === 'SKILL_SELECT') return;

    // Gerak Keyboard (PC)
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= pSpeed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += pSpeed;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= pSpeed;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += pSpeed;

    // Gerak Virtual Analog (Mobile)
    if (joystick.active) {
        player.x += joystick.dx * pSpeed;
        player.y += joystick.dy * pSpeed;
    }

    player.x = Math.max(32, Math.min(canvas.width - 32, player.x));
    player.y = Math.max(68, Math.min(canvas.height - 32, player.y));

    if (player.invulnTimer > 0) player.invulnTimer--;
    if (weaponTimers.laser > 0) weaponTimers.laser--;
    if (weaponTimers.he > 0) weaponTimers.he--;
    if (weaponTimers.lightning > 0) weaponTimers.lightning--;
    if (weaponTimers.arctic > 0) weaponTimers.arctic--;
    if (weaponTimers.arcticSeeker > 0) weaponTimers.arcticSeeker--;
    if (weaponTimers.arcticShield > 0) weaponTimers.arcticShield--;
    if (weaponTimers.shockwave > 0) weaponTimers.shockwave--;

    fireActiveWeapons();

    // Progresi Wave
    if (gameState === 'WAVE_MINIONS') {
        waveTimerFrames--;
        if (
            enemiesSpawnedThisWave < enemyQuotaThisWave &&
            frameCount % spawnIntervalFrames === 0 &&
            enemies.length < GAME_CONFIG.wave.maxEnemiesOnScreen
        ) {
            spawnEnemy();
        }

        const isQuotaCleared = (enemiesSpawnedThisWave >= enemyQuotaThisWave && enemies.length === 0);
        const isTimeUp = (waveTimerFrames <= 0);
        if (isQuotaCleared || isTimeUp) {
            gameState = 'BOSS_WARNING';
            warningTimer = 130;
        }
    } else if (gameState === 'BOSS_WARNING') {
        warningTimer--;
        if (warningTimer <= 0) {
            gameState = 'BOSS_FIGHT';
            spawnBoss();
        }
    }

    // Update Proyektil (termasuk homing Arctic Seeker & Shockwave)
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];

        if (p.kind === 'arctic_seeker' && p.target && p.target.hp > 0) {
            const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
            p.vx = Math.cos(angle) * p.speed;
            p.vy = Math.sin(angle) * p.speed;
        } else if (p.kind === 'shockwave_vortex') {
            p.life--;
            p.spinAngle += 0.22;
            p.damageTimer++;

            // Pantul di batas kiri/kanan kanvas
            if (p.x < 30 || p.x > canvas.width - 30) p.vx *= -1;

            // Efek hisapan (Pull) terhadap semua musuh selain boss
            for (const t of getAllActiveTargets()) {
                if (t !== boss) {
                    const dx = p.x - t.x;
                    const dy = p.y - t.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 6 && dist < p.pullRadius) {
                        const pullFactor = (1 - dist / p.pullRadius) * p.pullPower;
                        t.x += (dx / dist) * pullFactor;
                        t.y += (dy / dist) * pullFactor;
                    }
                }
            }

            // Damage berkala setiap 14 frame untuk musuh di dalam pusaran
            if (p.damageTimer % 14 === 0) {
                for (const t of getAllActiveTargets()) {
                    const dist = Math.hypot(t.x - p.x, t.y - p.y);
                    if (dist < p.radius + t.width * 0.35) {
                        applyDamageToTarget(t, Math.round(p.atk * 0.35), '#d8b4fe', false);
                        createExplosion(t.x, t.y, ['#c084fc', '#ffffff'], 3);
                    }
                }
            }

            if (p.life <= 0) {
                createExplosion(p.x, p.y, ['#c084fc', '#e879f9', '#ffffff'], 16);
                projectiles.splice(i, 1);
                continue;
            }
        } else if (p.kind === 'shockwave_fan') {
            p.life--;

            // Cek tabrakan menembus musuh (Piercing Fan Wave)
            for (const t of getAllActiveTargets()) {
                const dist = Math.hypot(t.x - p.x, t.y - p.y);
                const hitRange = (p.arcWidth * 0.55) + (t.width * 0.35);

                if (dist < hitRange && !p.hitTargets.includes(t)) {
                    p.hitTargets.push(t);
                    applyDamageToTarget(t, p.atk, '#c084fc', false);
                    createExplosion(t.x, t.y, ['#c084fc', '#e879f9', '#ffffff'], 6);

                    // Mendorong musuh biasa (selain boss)
                    if (t !== boss) {
                        t.y = Math.max(-20, t.y - p.knockback);
                        t.vy = Math.max(0.4, t.vy * 0.6);
                        spawnFloatingText(t.x, t.y - 18, 'PUSH!', '#d8b4fe', 11);
                    }
                }
            }

            if (p.life <= 0) {
                projectiles.splice(i, 1);
                continue;
            }
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -30 || p.y > canvas.height + 30 || p.x < -30 || p.x > canvas.width + 30) {
            projectiles.splice(i, 1);
        }
    }

    // Update Musuh Biasa
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        updateStatusEffects(e);

        const isTimeStopped = (e.status && e.status.timeStopTimer > 0);
        if (isTimeStopped) {
            // TIME STOP: Musuh berhenti bergerak dan tidak menembak
            if (e.hitFlash > 0) e.hitFlash--;
        } else {
            const speedMult = 1 - (e.status.slowFactor || 0);
            e.y += e.vy * speedMult;
            e.x += e.vx * speedMult;
            if (e.x < 35 || e.x > canvas.width - 35) e.vx *= -1;
            if (e.hitFlash > 0) e.hitFlash--;

            if (e.cfg.canShoot) {
                e.shootTimer -= speedMult;
                if (e.shootTimer <= 0 && e.y > 50 && e.y < canvas.height - 200) {
                    enemyBullets.push({
                        x: e.x, y: e.y + 24, vx: 0,
                        vy: (e.cfg.bulletSpeed + (wave - 1) * 0.2) * speedMult,
                        r: 5, color: '#fb7185'
                    });
                    e.shootTimer = Math.max(55, e.cfg.shootCooldown - wave * 5);
                }
            }
        }

        const hitW = e.width * 0.38;
        const hitH = e.height * 0.38;
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
            // Gelombang kipas & pusaran menembus musuh, tidak hancur saat menabrak
            if (p.kind === 'shockwave_fan' || p.kind === 'shockwave_vortex') continue;

            if (Math.abs(p.x - e.x) < hitW && Math.abs(p.y - e.y) < hitH) {
                projectiles.splice(j, 1);
                handleProjectileImpact(p, e);
                break;
            }
        }

        if (e.hp <= 0) {
            score += e.cfg.score;
            createExplosion(e.x, e.y, e.type === 'heavy' ? ['#e11d48', '#facc15'] : ['#c026d3', '#facc15'], 16);
            spawnFloatingText(e.x, e.y + 10, `+${e.cfg.expReward} EXP`, '#4ade80', 11);

            if (e.type === 'heavy' && Math.random() < GAME_CONFIG.drops.heavyHealChance) {
                drops.push({ x: e.x, y: e.y, vy: 2.1, kind: 'HEAL' });
            }
            enemies.splice(i, 1);
            addExp(e.cfg.expReward);
            continue;
        }

        if (Math.abs(e.x - player.x) < (hitW + 18) && Math.abs(e.y - player.y) < (hitH + 18)) {
            enemies.splice(i, 1);
            damagePlayer();
            continue;
        }

        if (e.y > canvas.height + 50) enemies.splice(i, 1);
    }

    // Update Boss
    if (gameState === 'BOSS_FIGHT' && boss) {
        updateStatusEffects(boss);
        const bCfg = GAME_CONFIG.boss;
        if (boss.introTimer > 0) boss.introTimer--;

        const isBossTimeStopped = (boss.status && boss.status.timeStopTimer > 0);

        if (isBossTimeStopped) {
            // Boss berhenti total selama Time Stop
            if (boss.hitFlash > 0) boss.hitFlash--;
        } else {
            const bSpeedMult = 1 - (boss.status.slowFactor || 0);

            if (boss.y < boss.targetY) {
                boss.y += 1.5;
            } else {
                boss.x += boss.vx * bSpeedMult;
                const margin = boss.width * 0.45;
                if (boss.x < margin || boss.x > canvas.width - margin) boss.vx *= -1;

                boss.attackTimer -= bSpeedMult;
                const isEnraged = boss.hp < boss.maxHp * 0.5;
                if (boss.attackTimer <= 0) {
                    const bSpeed = (bCfg.bulletSpeed + (wave - 1) * bCfg.bulletSpeedIncrement) * bSpeedMult;
                    if (boss.patternIndex % 2 === 0) {
                        const count = isEnraged ? 5 : 3;
                        const spread = 0.24;
                        const startAngle = Math.PI / 2 - ((count - 1) * spread) / 2;
                        for (let k = 0; k < count; k++) {
                            const ang = startAngle + k * spread;
                            enemyBullets.push({
                                x: boss.x, y: boss.y + boss.height * 0.35,
                                vx: Math.cos(ang) * bSpeed, vy: Math.sin(ang) * bSpeed,
                                r: 6, color: '#a855f7'
                            });
                        }
                    } else {
                        [-55, 55].forEach(offsetX => {
                            const bx = boss.x + offsetX;
                            const by = boss.y + 15;
                            const angle = Math.atan2(player.y - by, player.x - bx);
                            enemyBullets.push({
                                x: bx, y: by,
                                vx: Math.cos(angle) * (bSpeed + 0.4), vy: Math.sin(angle) * (bSpeed + 0.4),
                                r: 5.5, color: '#f59e0b'
                            });
                        });
                    }
                    boss.patternIndex++;
                    const cd = isEnraged ? bCfg.enrageCooldown : bCfg.attackCooldown;
                    boss.attackTimer = Math.max(35, cd - (wave - 1) * 4);
                }
            }
        }

        if (boss.hitFlash > 0) boss.hitFlash--;

        const bHitW = boss.width * 0.4;
        const bHitH = boss.height * 0.35;

        // Tabrakan fisik Player menabrak Boss (player terkena hit)
        if (boss && Math.abs(boss.x - player.x) < (bHitW + player.width * 0.35) && Math.abs(boss.y - player.y) < (bHitH + player.height * 0.35)) {
            damagePlayer();
        }

        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
            if (p.kind === 'shockwave_fan' || p.kind === 'shockwave_vortex') continue;

            if (Math.abs(p.x - boss.x) < bHitW && Math.abs(p.y - boss.y) < bHitH) {
                projectiles.splice(j, 1);
                handleProjectileImpact(p, boss);
                break;
            }
        }

        if (boss && boss.hp <= 0) {
            score += bCfg.baseScore * wave;
            screenShake = 22;
            createExplosion(boss.x, boss.y, ['#7e22ce', '#f59e0b', '#38bdf8', '#ffffff'], 55);
            drops.push({ x: boss.x, y: boss.y, vy: 2, kind: 'HEAL' });
            const bossExp = bCfg.expReward;
            boss = null;

            setupWave(wave + 1);
            addExp(bossExp);
        }
    }

    // Update Peluru Musuh
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        if (Math.hypot(b.x - player.x, b.y - player.y) < b.r + 16) {
            enemyBullets.splice(i, 1);
            damagePlayer();
            continue;
        }
        if (b.y > canvas.height + 20 || b.x < -20 || b.x > canvas.width + 20) enemyBullets.splice(i, 1);
    }

    // Update Drops (+HP)
    for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.y += d.vy;
        if (Math.hypot(d.x - player.x, d.y - player.y) < 35) {
            drops.splice(i, 1);
            player.hp = Math.min(GAME_CONFIG.player.maxHp, player.hp + 1);
            createExplosion(d.x, d.y, ['#22c55e', '#ffffff'], 12);
            continue;
        }
        if (d.y > canvas.height + 30) drops.splice(i, 1);
    }

    // Update Partikel & Floating Texts
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 0.8;
        ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

// ==========================================
// 8. RENDER LOOP
// ==========================================
function drawSpriteEntity(entity, img, x, y, w, h, rotateDown = false, fallbackColor = '#38bdf8') {
    ctx.save();
    ctx.translate(x, y);
    if (rotateDown && GAME_CONFIG.autoRotateEnemies) ctx.rotate(Math.PI);

    if (entity && entity.hitFlash > 0) {
        ctx.filter = 'brightness(2.5)';
    } else if (entity && entity.status && entity.status.timeStopTimer > 0) {
        ctx.filter = 'hue-rotate(200deg) saturate(0.4) brightness(1.7)';
    } else if (entity && entity.status && entity.status.freezeTimer > 0) {
        ctx.filter = 'hue-rotate(170deg) saturate(2) brightness(1.2)';
    }

    ctx.imageSmoothingEnabled = false;
    if (img && img.loaded && img.naturalWidth > 0) {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
        ctx.fillStyle = fallbackColor;
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(w / 2, h / 2);
        ctx.lineTo(-w / 2, h / 2);
        ctx.closePath();
        ctx.fill();
    }

    // Visual Lingkaran Waktu jika sedang terkena Time Stop
    if (entity && entity.status && entity.status.timeStopTimer > 0) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(w, h) * 0.58 + Math.sin(frameCount * 0.2) * 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawLightningBolt(x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    const segments = 4;
    for (let s = 1; s < segments; s++) {
        const t = s / segments;
        const jx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 18;
        const jy = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 18;
        ctx.lineTo(jx, jy);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function render() {
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const s of stars) {
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Drops (+HP)
    for (const d of drops) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#060913';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+HP', 0, 1);
        ctx.restore();
    }

    // Proyektil Pemain (Laser, HE, Arctic, Arctic Seeker, Shockwave Fan & Vortex)
    for (const p of projectiles) {
        if (p.kind === 'shockwave_fan') {
            ctx.save();
            ctx.translate(p.x, p.y);
            const angle = Math.atan2(p.vy, p.vx) + Math.PI / 2;
            ctx.rotate(angle);
            ctx.strokeStyle = '#c084fc';
            ctx.shadowColor = '#d8b4fe';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 4;
            ctx.beginPath();
            const rad = p.arcWidth * 0.6;
            ctx.arc(0, 0, rad, -Math.PI * 0.78, -Math.PI * 0.22);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 3, rad * 0.88, -Math.PI * 0.72, -Math.PI * 0.28);
            ctx.stroke();
            ctx.restore();
        } else if (p.kind === 'shockwave_vortex') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.spinAngle);
            ctx.strokeStyle = '#c084fc';
            ctx.shadowColor = '#e879f9';
            ctx.shadowBlur = 12;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 4; a += 0.25) {
                const r = (a / (Math.PI * 4)) * p.radius;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            ctx.fillStyle = '#f5d0fe';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.kind === 'he') {
            ctx.save();
            if (p.isDoom) {
                // Peluru Doom Nova Hellfire membara
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } else if (p.kind === 'arctic' || p.kind === 'arctic_seeker') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            const r = p.kind === 'arctic_seeker' ? 7 : (p.isCryoMachine ? 6.5 : 5);
            ctx.moveTo(0, -r * 1.6);
            ctx.lineTo(r, 0);
            ctx.lineTo(0, r * 1.6);
            ctx.lineTo(-r, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - 2.5, p.y - 10, 5, 20);
        }
    }

    // Efek Visual Petir (Lightning Chain)
    for (const bolt of lightningState.visualBolts) {
        drawLightningBolt(bolt.x1, bolt.y1, bolt.x2, bolt.y2);
    }

    // Musuh Biasa
    for (const e of enemies) {
        const fallback = e.type === 'heavy' ? '#e11d48' : '#c026d3';
        drawSpriteEntity(e, assets[e.type], e.x, e.y, e.width, e.height, true, fallback);

        if (e.hp < e.maxHp) {
            const bw = 36;
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(e.x - bw / 2, e.y - e.height / 2 - 8, bw, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(e.x - bw / 2, e.y - e.height / 2 - 8, bw * Math.max(0, e.hp / e.maxHp), 4);
        }
    }

    // Boss
    if (boss) {
        drawSpriteEntity(boss, assets.boss, boss.x, boss.y, boss.width, boss.height, true, '#7e22ce');

        // Visual Shield Kebal 3 Detik Awal saat animasi masuk
        if (boss.introTimer > 0) {
            ctx.save();
            ctx.translate(boss.x, boss.y);
            const shieldRadius = Math.max(boss.width, boss.height) * 0.52 + Math.sin(frameCount * 0.15) * 4;
            ctx.strokeStyle = '#facc15';
            ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#fde047';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Label Status Kebal
            const secsLeft = (boss.introTimer / 60).toFixed(1);
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.shadowBlur = 8;
            ctx.fillText(`IMMUNE (${secsLeft}s)`, 0, -boss.height * 0.52);
            ctx.restore();
        }
    }

    // Player + Shield Visual
    if (gameState !== 'GAME_OVER') {
        if (player.invulnTimer === 0 || Math.floor(player.invulnTimer / 5) % 2 === 0) {
            ctx.fillStyle = frameCount % 4 < 2 ? '#38bdf8' : '#facc15';
            ctx.beginPath();
            ctx.moveTo(player.x - 7, player.y + 26);
            ctx.lineTo(player.x + 7, player.y + 26);
            ctx.lineTo(player.x, player.y + 38 + Math.random() * 8);
            ctx.fill();

            drawSpriteEntity(null, assets.player, player.x, player.y, player.width, player.height, false, '#1d4ed8');
        }

        // Visual Shield Es dari Arctic Bullet 4B–6B
        if (player.hasShield) {
            ctx.save();
            ctx.strokeStyle = '#67e8f9';
            ctx.fillStyle = 'rgba(103, 232, 249, 0.14)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 38 + Math.sin(frameCount * 0.12) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    // Peluru Musuh
    for (const b of enemyBullets) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Partikel Ledakan
    for (const pt of particles) {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life / 40);
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // Floating Texts
    for (const ft of floatingTexts) {
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
    }

    // Render Virtual Analog Semi-Transparan (Khusus Mobile saat bermain)
    if (isMobileDevice && (gameState === 'WAVE_MINIONS' || gameState === 'BOSS_WARNING' || gameState === 'BOSS_FIGHT')) {
        ctx.save();
        // Jika belum disentuh, tampilkan posisi panduan samar di kanan bawah
        const baseX = joystick.active ? joystick.baseX : canvas.width - 95;
        const baseY = joystick.active ? joystick.baseY : canvas.height - 105;
        const knobX = joystick.active ? joystick.knobX : baseX;
        const knobY = joystick.active ? joystick.knobY : baseY;

        // Lingkaran Luar Analog (Sangat transparan)
        ctx.beginPath();
        ctx.arc(baseX, baseY, joystick.maxRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.stroke();

        // Lingkaran Dalam / Thumb Knob (Agak transparan)
        ctx.beginPath();
        ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
        ctx.fillStyle = joystick.active ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.25)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.stroke();
        ctx.restore();
    }

    // ==========================================
    // HUD ATAS + DAFTAR SENJATA AKTIF + EXP BAR
    // ==========================================
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, canvas.width, 64);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LV.${playerLevel}`, 12, 20);

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`SCR:${score}`, 66, 20);

    // Tampilkan semua senjata aktif & levelnya di baris kedua HUD
    const activeTags = [];
    if (playerSkills.laser) activeTags.push(`LSR:${playerSkills.laser.toUpperCase()}`);
    if (playerSkills.he) activeTags.push(`HE:${playerSkills.he.toUpperCase()}`);
    if (playerSkills.lightning) activeTags.push(`LGT:${playerSkills.lightning.toUpperCase()}`);
    if (playerSkills.arctic) activeTags.push(`ARC:${playerSkills.arctic.toUpperCase()}`);
    if (playerSkills.shockwave) activeTags.push(`SHK:${playerSkills.shockwave.toUpperCase()}`);

    if (playerFusions.cryoMachine) activeTags.push('★CRYO');
    if (playerFusions.timeStop) activeTags.push('★TIME');
    if (playerFusions.doom) activeTags.push('★DOOM');

    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText(activeTags.join(' '), 12, 42);

    // Tengah: Wave & Timer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`WAVE ${wave}`, canvas.width / 2 + 24, 20);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px monospace';
    if (gameState === 'BOSS_FIGHT') {
        ctx.fillStyle = '#f87171';
        ctx.fillText('BOSS FIGHT!', canvas.width / 2 + 24, 42);
    } else {
        const secsLeft = Math.max(0, Math.ceil(waveTimerFrames / 60));
        const quotaLeft = Math.max(0, enemyQuotaThisWave - enemiesSpawnedThisWave + enemies.length);
        ctx.fillText(`${secsLeft}s | MSH:${quotaLeft}`, canvas.width / 2 + 24, 42);
    }

    // Kanan: HP Bar Pemain
    for (let h = 0; h < GAME_CONFIG.player.maxHp; h++) {
        ctx.fillStyle = h < player.hp ? '#22c55e' : '#334155';
        ctx.fillRect(canvas.width - 18 - h * 14, 16, 10, 18);
    }

    // EXP Bar
    const expRatio = Math.min(1, currentExp / expToNextLevel);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 58, canvas.width, 6);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 58, canvas.width * expRatio, 6);

    // Boss Health Bar
    if (gameState === 'BOSS_FIGHT' && boss) {
        const barW = canvas.width - 60;
        const hpRatio = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(30, 74, barW, 12);
        ctx.fillStyle = hpRatio < 0.5 ? '#ef4444' : '#a855f7';
        ctx.fillRect(30, 74, barW * hpRatio, 12);
        ctx.strokeStyle = '#f8fafc';
        ctx.strokeRect(30, 74, barW, 12);
    }

    // Peringatan Boss
    if (gameState === 'BOSS_WARNING' && Math.floor(warningTimer / 12) % 2 === 0) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
        ctx.fillRect(0, canvas.height / 2 - 45, canvas.width, 90);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WARNING!', canvas.width / 2, canvas.height / 2 - 6);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`WAVE ${wave} BOSS APPROACHING`, canvas.width / 2, canvas.height / 2 + 22);
    }

    // Overlay Pilihan Skill Tree
    if (gameState === 'SKILL_SELECT') {
        ctx.fillStyle = 'rgba(6, 9, 19, 0.88)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`LEVEL UP! (LV.${playerLevel})`, canvas.width / 2, 140);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('PILIH UPGRADE SKILL', canvas.width / 2, 168);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText('Klik kartu atau tekan tombol [1] / [2] / [3]', canvas.width / 2, 194);

        skillChoices.forEach((choice, idx) => {
            const cardY = 230 + idx * 125;
            ctx.save();

            if (choice.isFusion) {
                // Highlight Khusus Senjata Fusion (Border neon menyala, background gradasi elegan)
                const pulse = Math.sin(frameCount * 0.15) * 4;
                ctx.fillStyle = '#1e1138';
                ctx.fillRect(38, cardY - 2, canvas.width - 76, 109);

                ctx.strokeStyle = '#f43f5e';
                ctx.shadowColor = '#ec4899';
                ctx.shadowBlur = 14 + pulse;
                ctx.lineWidth = 3.5;
                ctx.strokeRect(38, cardY - 2, canvas.width - 76, 109);

                // Badge Emas Khusus di pojok kanan kartu
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'right';
                ctx.shadowBlur = 6;
                ctx.fillText('★ FUSION LEGENDARY ★', canvas.width - 48, cardY + 18);
            } else {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(40, cardY, canvas.width - 80, 105);
                ctx.strokeStyle = choice.color;
                ctx.lineWidth = choice.isEvo ? 3 : 2;
                ctx.strokeRect(40, cardY, canvas.width - 80, 105);
            }

            ctx.textAlign = 'left';
            ctx.fillStyle = choice.color;
            ctx.font = 'bold 15px monospace';
            ctx.fillText(`[${idx + 1}] ${choice.title}`, 56, cardY + 30);

            if (choice.isFusion) {
                ctx.fillStyle = '#fb7185';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(`★ SYARAT: ${choice.reqText}`, 56, cardY + 49);
            } else if (choice.isEvo) {
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 11px monospace';
                ctx.fillText('★ EVOLUSI CABANG', 56, cardY + 50);
            }

            ctx.fillStyle = '#e2e8f0';
            ctx.font = '11px monospace';
            ctx.fillText(choice.desc, 56, cardY + (choice.isEvo || choice.isFusion ? 72 : 64));
            ctx.restore();
        });
    }

    // Layar Start & Game Over
    if (gameState === 'START' || gameState === 'GAME_OVER') {
        ctx.fillStyle = 'rgba(6, 9, 19, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = gameState === 'START' ? '#38bdf8' : '#ef4444';
        ctx.font = 'bold 34px monospace';
        ctx.fillText(gameState === 'START' ? 'SPACE DEFENDER' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

        if (gameState === 'GAME_OVER') {
            ctx.fillStyle = '#f8fafc';
            ctx.font = '18px monospace';
            ctx.fillText(`SCORE: ${score} | WAVE ${wave} | LV.${playerLevel}`, canvas.width / 2, canvas.height / 2 - 10);
        }

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('KLIK / TEKAN SPASI UNTUK MULAI', canvas.width / 2, canvas.height / 2 + 40);
    }

    ctx.restore();
}

let lastTimestamp = 0;
let frameAccumulator = 0;
const FIXED_TIMESTEP = 1000 / 60; // Kunci kecepatan logika di 60 FPS (16.67 ms per frame)

function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;

    // Batasi maksimal selisih waktu (misal 100ms) agar game tidak loncat saat pindah tab
    const deltaTime = Math.min(100, timestamp - lastTimestamp);
    lastTimestamp = timestamp;
    frameAccumulator += deltaTime;

    try {
        // Jalankan update() tepat 60 kali per detik berapapun Hz layar HP-nya
        while (frameAccumulator >= FIXED_TIMESTEP) {
            update();
            frameAccumulator -= FIXED_TIMESTEP;
        }

        render();
    } catch (err) {
        console.error('Game loop error:', err);
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// ==========================================
// 9. DEVELOPER API (Untuk diakses oleh devtool.js)
// ==========================================
window.GAME_DEV = {
    getPlayer: () => player,
    getSkills: () => playerSkills,
    getFusions: () => playerFusions,
    setWeaponLevel: (wKey, lvl) => {
        playerSkills[wKey] = lvl;
        if (wKey === 'arctic' && (lvl === '4b' || lvl === '5b' || lvl === '6b')) {
            player.hasShield = true;
            weaponTimers.arcticShield = 60 * 60;
        }
        const name = GAME_CONFIG.weapons[wKey]?.name || wKey;
        spawnFloatingText(player.x, player.y - 35, `${name}: ${lvl || 'OFF'}`, '#c084fc', 13);
    },
    setFusion: (fKey, active = true) => {
        playerFusions[fKey] = active;
        const name = GAME_CONFIG.fusions[fKey]?.name || fKey;
        spawnFloatingText(player.x, player.y - 45, `Fusion ${name}: ${active ? 'ON' : 'OFF'}`, active ? '#06b6d4' : '#ef4444', 14);
    },
    setLevel: (lvl) => {
        playerLevel = lvl;
        currentExp = 0;
        expToNextLevel = GAME_CONFIG.leveling.baseExpRequired + (playerLevel - 1) * GAME_CONFIG.leveling.expIncrementPerLvl;
        spawnFloatingText(player.x, player.y - 35, `Level -> ${lvl}`, '#4ade80', 14);
    },
    addExp: (amt) => {
        addExp(amt);
    },
    healFull: () => {
        player.hp = GAME_CONFIG.player.maxHp;
        spawnFloatingText(player.x, player.y - 35, 'FULL HEAL!', '#22c55e', 14);
    },
    toggleGodMode: () => {
        player.godMode = !player.godMode;
        spawnFloatingText(player.x, player.y - 35, `GOD MODE: ${player.godMode ? 'ON' : 'OFF'}`, '#facc15', 14);
        return player.godMode;
    },
    spawnBossNow: () => {
        if (gameState !== 'BOSS_FIGHT') {
            gameState = 'BOSS_FIGHT';
            spawnBoss();
            spawnFloatingText(player.x, player.y - 45, 'BOSS SPAWNED!', '#f87171', 14);
        }
    },
    clearEnemies: () => {
        enemies.length = 0;
        enemyBullets.length = 0;
        spawnFloatingText(player.x, player.y - 35, 'CLEARED!', '#f43f5e', 13);
    },
    triggerSkillCard: () => {
        pendingLevelUps++;
        triggerSkillSelection();
    },
    getState: () => ({
        playerLevel,
        score,
        wave,
        gameState,
        playerSkills,
        playerFusions,
        godMode: !!player.godMode,
        playerHp: player.hp,
        maxHp: GAME_CONFIG.player.maxHp
    })
};