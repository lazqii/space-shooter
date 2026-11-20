// js/state.js - Penyimpanan State Global, Asset & Konstanta Canvas

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
if (GAME_CONFIG.specialBoss) {
    loadSprite('specialBoss', GAME_CONFIG.specialBoss.sprite);
    loadSprite('specialBossTentacle', GAME_CONFIG.specialBoss.tentacleSprite);
}

function loadHallOfFame() {
    try {
        const raw = localStorage.getItem('space_shooter_hof');
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        return [];
    }
}

const GAME_STATE = {
    gameState: 'START', // START, WAVE_MINIONS, BOSS_WARNING, BOSS_FIGHT, SKILL_SELECT, PAUSED, GAME_OVER
    previousState: 'WAVE_MINIONS',
    gameMode: 'ENDLESS', // STAGE, SURVIVAL, ENDLESS
    menuModal: null,     // null, 'MODE_SELECT', 'HALL_OF_FAME', 'ENCYCLOPEDIA'
    encyclopediaTab: 'FUSIONS', // 'FUSIONS' atau 'WEAPONS'

    frameCount: 0,
    score: 0,
    highScore: Number(localStorage.getItem('space_shooter_hi')) || 0,
    hallOfFame: loadHallOfFame(),

    wave: 1,
    waveTimerFrames: GAME_CONFIG.wave.durationSeconds * 60,
    enemiesSpawnedThisWave: 0,
    enemyQuotaThisWave: GAME_CONFIG.wave.baseEnemyQuota,
    spawnIntervalFrames: 150,
    warningTimer: 0,
    screenShake: 0,

    playerLevel: 1,
    currentExp: 0,
    expToNextLevel: GAME_CONFIG.leveling.baseExpRequired,
    pendingLevelUps: 0,
    skillChoices: [],

    enemiesKilled: 0,
    bossesKilled: 0,
    playTimeFrames: 0,
    buildHistory: {},
    shareFeedbackTimer: 0,

    encyclopediaTab: 'WEAPONS',
    encyclopediaSelectedIdx: 0,
    pauseSubScreen: 'MAIN',
    weaponDamageStats: {
        laser: 0,
        he: 0,
        lightning: 0,
        arctic: 0,
        shockwave: 0,
        flamethrower: 0
    },
};

const player = {
    x: 240,
    y: 700,
    width: GAME_CONFIG.player.width,
    height: GAME_CONFIG.player.height,
    speed: GAME_CONFIG.player.speed,
    hp: GAME_CONFIG.player.maxHp,
    hasShield: false,
    invulnTimer: 0,
    godMode: false,
    ultimateActive: false
};

let playerSkills = {
    laser: '1',
    he: null,
    lightning: null,
    arctic: null,
    shockwave: null,
    flamethrower: null
};

let weaponTimers = {
    laser: 0,
    he: 0,
    lightning: 0,
    arctic: 0,
    arcticSeeker: 0,
    arcticShield: 0,
    shockwave: 0,
    flameCooldown: 0,
    flameActive: 0,
    flameTick: 0,
    fusionCryo: 0,
    fusionCryoSub: 0,
    fusionTimeStop: 0,
    fusionTimeStopSub: 0,
    fusionDoom: 0,
    fusionInferno: 0,
    fusionElectroDoom: 0
};

let playerFusions = {
    cryoMachine: false,
    timeStop: false,
    doom: false,
    inferno: false,
    electroDoom: false
};

let lightningState = {
    lockedTarget: null,
    lockFrames: 0,
    lastStackCount: 0,
    currentIntensity: 0,
    visualBolts: []
};

let boss = null;
let projectiles = [];
let enemies = [];
let enemyBullets = [];
let drops = [];
let particles = [];
let floatingTexts = [];
let stars = [];

function initStars() {
    stars = [];
    for (let i = 0; i < 70; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() < 0.6 ? 1.5 : 2.5,
            speed: 0.5 + Math.random() * 2.5,
            alpha: 0.3 + Math.random() * 0.7
        });
    }
}