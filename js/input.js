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

function handleMenuAction(x, y) {
    if (GAME_STATE.gameState === 'START' || GAME_STATE.gameState === 'GAME_OVER') {
        startGame();
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