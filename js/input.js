// js/input.js - Kontrol Keyboard, Touch & Virtual Analog Joystick

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


function formatPlayTime(frames) {
    const totalSec = Math.floor(frames / 60);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getGameOverLayout() {
    const cx = canvas.width / 2;
    const cardW = canvas.width - 56;
    const cardX = 28;
    const cardY = 85;
    const cardH = Math.min(475, canvas.height - 225);
    const btnY = cardY + cardH + 18;
    const btnGap = 12;
    const btnW = (cardW - btnGap) / 2;

    return {
        cx, cardX, cardY, cardW, cardH,
        shareBtn: { x: cardX, y: btnY, w: btnW, h: 48 },
        retryBtn: { x: cardX + btnW + btnGap, y: btnY, w: btnW, h: 48 }
    };
}

async function shareGameResult() {
    const timeStr = formatPlayTime(GAME_STATE.playTimeFrames);
    const buildList = Object.values(GAME_STATE.buildHistory);
    const buildSummary = buildList.length > 0 ? buildList.join(', ') : 'Laser Gun Lv.1';
    const gameUrl = 'https://spaceshooter.lazqii.my.id';

    const shareText =
        `🚀 SPACE DEFENDER - MISSION REPORT\n` +
        `🏆 Skor: ${GAME_STATE.score.toLocaleString('id-ID')} (Wave ${GAME_STATE.wave} | Lv.${GAME_STATE.playerLevel})\n` +
        `👾 Musuh: ${GAME_STATE.enemiesKilled} | 👹 Boss: ${GAME_STATE.bossesKilled}\n` +
        `⏱️ Bertahan: ${timeStr}\n` +
        `⚡ Build: ${buildSummary}\n\n` +
        `Berani pecahin rekor skorku? Mainkan langsung di:\n${gameUrl}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Space Defender - Rekor Skor!',
                text: shareText
            });
            GAME_STATE.shareFeedbackTimer = 150;
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    // Fallback untuk browser desktop: salin otomatis ke clipboard
    try {
        await navigator.clipboard.writeText(shareText);
        GAME_STATE.shareFeedbackTimer = 180;
    } catch (_) {
        const tempInput = document.createElement('textarea');
        tempInput.value = shareText;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        GAME_STATE.shareFeedbackTimer = 180;
    }
}

function isInsideRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function handleMenuAction(x, y) {
    if (GAME_STATE.gameState === 'START') {
        startGame();
        return true;
    }
    if (GAME_STATE.gameState === 'GAME_OVER') {
        const layout = getGameOverLayout();
        if (isInsideRect(x, y, layout.shareBtn)) {
            shareGameResult();
            return true;
        }
        if (isInsideRect(x, y, layout.retryBtn)) {
            startGame();
            return true;
        }
        return true;
    }
    if (GAME_STATE.gameState === 'SKILL_SELECT') {
        for (let idx = 0; idx < GAME_STATE.skillChoices.length; idx++) {
            const cardY = 230 + idx * 125;
            if (x >= 40 && x <= canvas.width - 40 && y >= cardY && y <= cardY + 105) {
                applySkillChoice(GAME_STATE.skillChoices[idx]);
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

function applyPlayerMovement() {
    const spd = player.speed;
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= spd;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += spd;
    if (keys['ArrowUp'] || keys['KeyW']) player.y -= spd;
    if (keys['ArrowDown'] || keys['KeyS']) player.y += spd;

    if (joystick.active) {
        player.x += joystick.dx * spd;
        player.y += joystick.dy * spd;
    }

    player.x = Math.max(32, Math.min(canvas.width - 32, player.x));
    player.y = Math.max(68, Math.min(canvas.height - 32, player.y));
}

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if ((e.code === 'Space' || e.code === 'Enter') && (GAME_STATE.gameState === 'START' || GAME_STATE.gameState === 'GAME_OVER')) {
        startGame();
    }
    if (GAME_STATE.gameState === 'SKILL_SELECT') {
        if (e.code === 'Digit1' && GAME_STATE.skillChoices[0]) applySkillChoice(GAME_STATE.skillChoices[0]);
        if (e.code === 'Digit2' && GAME_STATE.skillChoices[1]) applySkillChoice(GAME_STATE.skillChoices[1]);
        if (e.code === 'Digit3' && GAME_STATE.skillChoices[2]) applySkillChoice(GAME_STATE.skillChoices[2]);
    }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

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