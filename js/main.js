// js/main.js - Game Loop Utama & Inisialisasi

function resizeCanvasToAspect() {
    const wrapper = document.getElementById('game-wrapper');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();

    if (rect.width > 10 && rect.height > 10) {
        const aspect = rect.height / rect.width;
        canvas.width = 480;
        canvas.height = Math.max(640, Math.min(1000, Math.round(480 * aspect)));
    } else {
        canvas.width = 480;
        canvas.height = 800;
    }

    player.x = Math.min(Math.max(32, player.x), canvas.width - 32);
    player.y = Math.min(player.y, canvas.height - 40);
}

window.addEventListener('resize', resizeCanvasToAspect);
window.addEventListener('load', () => {
    resizeCanvasToAspect();
    initStars();
});

function startGame() {
    GAME_STATE.score = 0;
    GAME_STATE.playerLevel = 1;
    GAME_STATE.currentExp = 0;
    GAME_STATE.expToNextLevel = GAME_CONFIG.leveling.baseExpRequired;
    GAME_STATE.pendingLevelUps = 0;
    GAME_STATE.enemiesKilled = 0;
    GAME_STATE.bossesKilled = 0;
    GAME_STATE.playTimeFrames = 0;
    GAME_STATE.buildHistory = { laser: `${GAME_CONFIG.weapons.laser.name} Lv.1` };
    GAME_STATE.shareFeedbackTimer = 0;

    playerSkills = { laser: '1', he: null, lightning: null, arctic: null, shockwave: null, flamethrower: null };
    weaponTimers = {
        laser: 0, he: 0, lightning: 0, arctic: 0, arcticSeeker: 0,
        arcticShield: 0, shockwave: 0, flameCooldown: 0, flameActive: 0,
        flameTick: 0, fusionMain: 0, fusionSub: 0
    };
    playerFusions = { cryoMachine: false, timeStop: false, doom: false, inferno: false, electroDoom: false };
    lightningState = { lockedTarget: null, lockFrames: 0, lastStackCount: 0, currentIntensity: 0, visualBolts: [] };

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

function update() {
    GAME_STATE.frameCount++;
    if (GAME_STATE.screenShake > 0) GAME_STATE.screenShake--;

    for (const s of stars) {
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
    }

    for (let i = lightningState.visualBolts.length - 1; i >= 0; i--) {
        lightningState.visualBolts[i].life--;
        if (lightningState.visualBolts[i].life <= 0) lightningState.visualBolts.splice(i, 1);
    }

    if (GAME_STATE.shareFeedbackTimer > 0) GAME_STATE.shareFeedbackTimer--;

    if (
        GAME_STATE.gameState === 'START' ||
        GAME_STATE.gameState === 'GAME_OVER' ||
        GAME_STATE.gameState === 'SKILL_SELECT' ||
        GAME_STATE.gameState === 'PAUSED'
    ) return;

    GAME_STATE.playTimeFrames++;

    applyPlayerMovement();

    if (player.invulnTimer > 0) player.invulnTimer--;
    if (weaponTimers.laser > 0) weaponTimers.laser--;
    if (weaponTimers.he > 0) weaponTimers.he--;
    if (weaponTimers.lightning > 0) weaponTimers.lightning--;
    if (weaponTimers.arctic > 0) weaponTimers.arctic--;
    if (weaponTimers.arcticSeeker > 0) weaponTimers.arcticSeeker--;
    if (weaponTimers.arcticShield > 0) weaponTimers.arcticShield--;
    if (weaponTimers.shockwave > 0) weaponTimers.shockwave--;
    if (weaponTimers.fusionMain > 0) weaponTimers.fusionMain--;
    if (weaponTimers.fusionSub > 0) weaponTimers.fusionSub--;

    fireActiveWeapons();

    if (GAME_STATE.gameState === 'WAVE_MINIONS') {
        GAME_STATE.waveTimerFrames--;
        if (
            GAME_STATE.enemiesSpawnedThisWave < GAME_STATE.enemyQuotaThisWave &&
            GAME_STATE.frameCount % GAME_STATE.spawnIntervalFrames === 0 &&
            enemies.length < GAME_CONFIG.wave.maxEnemiesOnScreen
        ) {
            spawnEnemy();
        }

        const isQuotaCleared = (GAME_STATE.enemiesSpawnedThisWave >= GAME_STATE.enemyQuotaThisWave && enemies.length === 0);
        if (isQuotaCleared || GAME_STATE.waveTimerFrames <= 0) {
            GAME_STATE.gameState = 'BOSS_WARNING';
            GAME_STATE.warningTimer = 130;
        }
    } else if (GAME_STATE.gameState === 'BOSS_WARNING') {
        GAME_STATE.warningTimer--;
        if (GAME_STATE.warningTimer <= 0) {
            GAME_STATE.gameState = 'BOSS_FIGHT';
            spawnBoss();
        }
    }

    updateProjectiles();
    updateEnemiesAndBoss();

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

let lastTimestamp = 0;
let frameAccumulator = 0;
const FIXED_TIMESTEP = 1000 / 60;

function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = Math.min(100, timestamp - lastTimestamp);
    lastTimestamp = timestamp;
    frameAccumulator += deltaTime;

    try {
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