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

// Level masing-masing dari 4 senjata (null jika belum dibuka)
let playerSkills = {
    laser: '1',
    he: null,
    lightning: null,
    arctic: null
};

let weaponTimers = {
    laser: 0,
    he: 0,
    lightning: 0,
    arctic: 0,
    arcticSeeker: 0,
    arcticShield: 0
};

// State khusus Lightning Overload (Cabang A) & visual petir
let lightningState = {
    lockedTarget: null,
    lockFrames: 0,
    visualBolts: [] // Menyimpan garis petir sementara untuk digambar di canvas
};

let skillChoices = [];

const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: GAME_CONFIG.player.width,
    height: GAME_CONFIG.player.height,
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
    }

    if (pendingLevelUps > 0 && gameState !== 'SKILL_SELECT' && gameState !== 'GAME_OVER') {
        triggerSkillSelection();
    }
}

function getAvailableSkillUpgrades() {
    const pool = [];
    const weaponKeys = ['laser', 'he', 'lightning', 'arctic'];

    for (const wKey of weaponKeys) {
        const wCfg = GAME_CONFIG.weapons[wKey];
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

    if (pool.length === 0) {
        pool.push({ weapon: 'heal', nextLvl: null, title: 'Emergency Repair', desc: 'Pulihkan +2 HP Pesawat', color: '#22c55e' });
        pool.push({ weapon: 'bonus', nextLvl: null, title: 'Overcharge Core', desc: '+1000 Bonus Score', color: '#facc15' });
    }

    // Acak urutan dan tampilkan 3 kartu pilihan
    return pool.sort(() => Math.random() - 0.5).slice(0, 3);
}

function triggerSkillSelection() {
    pendingLevelUps--;
    skillChoices = getAvailableSkillUpgrades();
    previousState = gameState;
    gameState = 'SKILL_SELECT';
}

function applySkillChoice(choice) {
    if (choice.weapon === 'heal') {
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
        gameState = previousState;
    }
}

// ==========================================
// 4. KONTROL INPUT
// ==========================================
const keys = {};
let isPointerDown = false;

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

function handleCanvasClick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === 'START' || gameState === 'GAME_OVER') {
        startGame();
        return;
    }

    if (gameState === 'SKILL_SELECT') {
        skillChoices.forEach((choice, idx) => {
            const cardY = 230 + idx * 125;
            if (x >= 40 && x <= canvas.width - 40 && y >= cardY && y <= cardY + 105) {
                applySkillChoice(choice);
            }
        });
        return;
    }

    isPointerDown = true;
    player.x = Math.max(32, Math.min(canvas.width - 32, x));
    player.y = Math.max(68, Math.min(canvas.height - 32, y));
}

canvas.addEventListener('mousedown', (e) => handleCanvasClick(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => {
    if (isPointerDown && gameState !== 'START' && gameState !== 'GAME_OVER' && gameState !== 'SKILL_SELECT') {
        const rect = canvas.getBoundingClientRect();
        player.x = Math.max(32, Math.min(canvas.width - 32, (e.clientX - rect.left) * (canvas.width / rect.width)));
        player.y = Math.max(68, Math.min(canvas.height - 32, (e.clientY - rect.top) * (canvas.height / rect.height)));
    }
});
window.addEventListener('mouseup', () => { isPointerDown = false; });

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleCanvasClick(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isPointerDown && gameState !== 'SKILL_SELECT') {
        const rect = canvas.getBoundingClientRect();
        player.x = Math.max(32, Math.min(canvas.width - 32, (e.touches[0].clientX - rect.left) * (canvas.width / rect.width)));
        player.y = Math.max(68, Math.min(canvas.height - 32, (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)));
    }
}, { passive: false });
canvas.addEventListener('touchend', () => { isPointerDown = false; });

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

    playerSkills = { laser: '1', he: null, lightning: null, arctic: null };
    weaponTimers = { laser: 0, he: 0, lightning: 0, arctic: 0, arcticSeeker: 0, arcticShield: 0 };
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
    // 1. LASER GUN
    if (playerSkills.laser && weaponTimers.laser <= 0) {
        const wCfg = GAME_CONFIG.weapons.laser;
        const lvlData = wCfg.levels[playerSkills.laser];
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
            color: wCfg.color
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

    // 4. ARCTIC BULLET (Peluru Es Utama + Cabang A Homing Seeker + Cabang B Shield)
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

        // Cabang A: Homing Ice Shard setiap 2 detik
        if (lvlData.seekerIntervalSec && weaponTimers.arcticSeeker <= 0) {
            const target = findNearestTarget(player.x, player.y);
            if (target) {
                const angle = Math.atan2(target.y - (player.y - 24), target.x - player.x);
                const speed = 9.5;
                projectiles.push({
                    kind: 'arctic_seeker',
                    target,
                    speed,
                    x: player.x,
                    y: player.y - 24,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    atk: lvlData.atk * lvlData.seekerDmgMult,
                    slow: lvlData.slow,
                    duration: wCfg.freezeDuration,
                    cd: wCfg.freezeCd,
                    color: '#22d3ee'
                });
                weaponTimers.arcticSeeker = Math.round(lvlData.seekerIntervalSec * 60);
            }
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
    target.hp -= amount;
    target.hitFlash = 4;
    const label = isCrit ? `${Math.round(amount)}!` : `${Math.round(amount)}`;
    spawnFloatingText(target.x, target.y - 15, label, color, isCrit ? 16 : 12);
}

function applyFreezeToTarget(target, slowAmount, durationSec, cdSec) {
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
            slowFactor: 0
        };
    }
    const st = target.status;

    if (st.freezeCdTimer > 0) st.freezeCdTimer--;
    if (st.shatterCdTimer > 0) st.shatterCdTimer--;

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
    createExplosion(proj.x, proj.y, ['#f97316', '#facc15', '#ef4444'], 22);
    screenShake = Math.max(screenShake, 5);

    for (const target of getAllActiveTargets()) {
        const dist = Math.hypot(target.x - proj.x, target.y - proj.y);
        const hitRange = proj.radius + (target.width * 0.35);

        if (target === directTarget || dist <= hitRange) {
            const isCrit = Math.random() < lvl.critRate;
            const finalDmg = isCrit ? proj.atk * lvl.critDmg : proj.atk;
            applyDamageToTarget(target, finalDmg, isCrit ? '#facc15' : '#fdba74', isCrit);

            if (!target.status) updateStatusEffects(target);

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
        attackTimer: 60,
        patternIndex: 0,
        hitFlash: 0,
        status: null
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
    if (player.invulnTimer > 0) return;

    // Cek Shield dari Arctic Bullet Cabang B terlebih dahulu
    if (player.hasShield) {
        player.hasShield = false;
        player.invulnTimer = 45;
        screenShake = 6;
        spawnFloatingText(player.x, player.y - 30, 'BLOCKED!', '#67e8f9', 14);
        createExplosion(player.x, player.y, ['#67e8f9', '#ffffff'], 22);
        return;
    }

    player.hp--;
    player.invulnTimer = GAME_CONFIG.player.invulnDuration;
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

    const pSpeed = GAME_CONFIG.player.speed;
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= pSpeed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += pSpeed;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= pSpeed;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += pSpeed;

    player.x = Math.max(32, Math.min(canvas.width - 32, player.x));
    player.y = Math.max(68, Math.min(canvas.height - 32, player.y));

    if (player.invulnTimer > 0) player.invulnTimer--;
    if (weaponTimers.laser > 0) weaponTimers.laser--;
    if (weaponTimers.he > 0) weaponTimers.he--;
    if (weaponTimers.lightning > 0) weaponTimers.lightning--;
    if (weaponTimers.arctic > 0) weaponTimers.arctic--;
    if (weaponTimers.arcticSeeker > 0) weaponTimers.arcticSeeker--;
    if (weaponTimers.arcticShield > 0) weaponTimers.arcticShield--;

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

    // Update Proyektil (termasuk homing untuk Arctic Seeker)
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (p.kind === 'arctic_seeker' && p.target && p.target.hp > 0) {
            const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
            p.vx = Math.cos(angle) * p.speed;
            p.vy = Math.sin(angle) * p.speed;
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

        const hitW = e.width * 0.38;
        const hitH = e.height * 0.38;
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
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

        if (boss.hitFlash > 0) boss.hitFlash--;

        const bHitW = boss.width * 0.4;
        const bHitH = boss.height * 0.35;
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
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

    // Proyektil Pemain (Laser, HE, Arctic, Arctic Seeker)
    for (const p of projectiles) {
        if (p.kind === 'he') {
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.kind === 'arctic' || p.kind === 'arctic_seeker') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            const r = p.kind === 'arctic_seeker' ? 7 : 5;
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
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(40, cardY, canvas.width - 80, 105);
            ctx.strokeStyle = choice.color;
            ctx.lineWidth = choice.isEvo ? 3 : 2;
            ctx.strokeRect(40, cardY, canvas.width - 80, 105);

            ctx.textAlign = 'left';
            ctx.fillStyle = choice.color;
            ctx.font = 'bold 15px monospace';
            ctx.fillText(`[${idx + 1}] ${choice.title}`, 56, cardY + 32);

            if (choice.isEvo) {
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 11px monospace';
                ctx.fillText('★ EVOLUSI CABANG', 56, cardY + 52);
            }

            ctx.fillStyle = '#e2e8f0';
            ctx.font = '11px monospace';
            ctx.fillText(choice.desc, 56, cardY + (choice.isEvo ? 76 : 64));
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

    // Jalankan update() tepat 60 kali per detik berapapun Hz layar HP-nya
    while (frameAccumulator >= FIXED_TIMESTEP) {
        update();
        frameAccumulator -= FIXED_TIMESTEP;
    }

    render();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);