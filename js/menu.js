// js/menu.js - Sistem Main Menu, Pop-up Mode, Hall of Fame, Encyclopedia & Pause Menu

function saveRunToHallOfFame() {
    if (GAME_STATE.score <= 0) return;

    const currentMode = GAME_STATE.gameMode || 'ENDLESS';
    const buildList = Object.values(GAME_STATE.buildHistory);
    const entry = {
        mode: currentMode,
        score: GAME_STATE.score,
        wave: GAME_STATE.wave,
        level: GAME_STATE.playerLevel,
        time: formatPlayTime(GAME_STATE.playTimeFrames),
        build: buildList.slice(-2).join(' + ') || 'Laser Gun Lv.1',
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    };

    GAME_STATE.hallOfFame.push(entry);

    const modes = ['STAGE', 'SURVIVAL', 'ENDLESS'];
    let trimmed = [];
    modes.forEach(m => {
        const modeEntries = GAME_STATE.hallOfFame
            .filter(r => (r.mode || 'ENDLESS') === m)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
        trimmed = trimmed.concat(modeEntries);
    });
    GAME_STATE.hallOfFame = trimmed;

    try {
        localStorage.setItem('space_shooter_hof', JSON.stringify(GAME_STATE.hallOfFame));
    } catch (_) {
        // Abaikan jika storage penuh
    }
}

function togglePauseGame() {
    const activeStates = ['WAVE_MINIONS', 'BOSS_WARNING', 'BOSS_FIGHT'];
    if (activeStates.includes(GAME_STATE.gameState)) {
        GAME_STATE.previousState = GAME_STATE.gameState;
        GAME_STATE.pauseSubScreen = 'MAIN';
        GAME_STATE.gameState = 'PAUSED';
        resetJoystick();
    } else if (GAME_STATE.gameState === 'PAUSED') {
        GAME_STATE.pauseSubScreen = 'MAIN';
        GAME_STATE.gameState = GAME_STATE.previousState;
    }
}

function returnToMainMenu() {
    GAME_STATE.gameState = 'START';
    GAME_STATE.menuModal = null;
    GAME_STATE.pauseSubScreen = 'MAIN';
    resetJoystick();
}

// ==========================================
// SAFE VIEWPORT & MARGIN RESPONSIF PER LAYAR
// ==========================================
function getSafeViewport() {
    const padX = Math.max(22, Math.round(canvas.width * 0.055));
    const padTop = Math.max(28, Math.round(canvas.height * 0.04));
    const padBottom = Math.max(40, Math.round(canvas.height * 0.055));

    const safeLeft = padX;
    const safeRight = canvas.width - padX;
    const safeW = safeRight - safeLeft;

    const safeTop = padTop;
    const safeBottom = canvas.height - padBottom;
    const safeH = safeBottom - safeTop;

    // Batasi rentang vertikal maksimal agar elemen bawah tidak melorot di layar panjang (20:9)
    const blockH = Math.min(safeH, 640);
    const blockTop = safeTop + Math.floor((safeH - blockH) / 2);
    const blockBottom = blockTop + blockH;

    return {
        padX, padTop, padBottom,
        safeLeft, safeRight, safeW,
        safeTop, safeBottom, safeH,
        blockTop, blockBottom, blockH,
        cx: canvas.width / 2
    };
}

// ==========================================
// HELPER TEKS & PLACEHOLDER IKON SCI-FI
// ==========================================
function drawStyledButton(rect, title, subtitle = '', bg = '#0f172a', border = '#475569', titleColor = '#f8fafc') {
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    ctx.textAlign = 'center';
    ctx.fillStyle = titleColor;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(title, rect.x + rect.w / 2, subtitle ? rect.y + 28 : rect.y + rect.h / 2 + 5);

    if (subtitle) {
        ctx.fillStyle = titleColor === '#64748b' ? '#475569' : '#94a3b8';
        ctx.font = '10.5px monospace';
        ctx.fillText(subtitle, rect.x + rect.w / 2, rect.y + 49);
    }
    ctx.restore();
}

function wrapCanvasText(text, x, y, maxWidth, lineHeight) {
    const paragraphs = String(text).split('\n');
    let curY = y;

    for (let p = 0; p < paragraphs.length; p++) {
        const words = paragraphs[p].split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                ctx.fillText(line.trim(), x, curY);
                line = words[n] + ' ';
                curY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, curY);
        curY += lineHeight;
    }

    return curY;
}

function fitCanvasText(text, maxWidth) {
    let str = String(text);
    if (ctx.measureText(str).width <= maxWidth) return str;
    while (str.length > 0 && ctx.measureText(str + '...').width > maxWidth) {
        str = str.slice(0, -1);
    }
    return str + '...';
}

function drawWeaponPlaceholderIcon(key, cx, cy, size, color = '#38bdf8') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    if (key === 'laser') {
        ctx.beginPath();
        ctx.moveTo(-size * 0.25, size * 0.3); ctx.lineTo(-size * 0.1, -size * 0.32);
        ctx.moveTo(0, size * 0.35); ctx.lineTo(0, -size * 0.38);
        ctx.moveTo(size * 0.25, size * 0.3); ctx.lineTo(size * 0.1, -size * 0.32);
        ctx.stroke();
    } else if (key === 'he') {
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.36, 0, Math.PI * 2);
        ctx.stroke();
    } else if (key === 'lightning') {
        ctx.beginPath();
        ctx.moveTo(size * 0.08, -size * 0.38);
        ctx.lineTo(-size * 0.18, 0);
        ctx.lineTo(size * 0.06, 0);
        ctx.lineTo(-size * 0.12, size * 0.38);
        ctx.stroke();
    } else if (key === 'arctic') {
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 3);
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.36);
            ctx.lineTo(0, size * 0.36);
            ctx.stroke();
            ctx.restore();
        }
    } else if (key === 'shockwave') {
        for (let r = 0.16; r <= 0.38; r += 0.11) {
            ctx.beginPath();
            ctx.arc(0, size * 0.1, size * r, Math.PI * 1.15, Math.PI * 1.85);
            ctx.stroke();
        }
    } else if (key === 'flamethrower') {
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.36);
        ctx.quadraticCurveTo(size * 0.32, 0, 0, size * 0.34);
        ctx.quadraticCurveTo(-size * 0.32, 0, 0, -size * 0.36);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.35);
        ctx.lineTo(size * 0.32, size * 0.26);
        ctx.lineTo(-size * 0.32, size * 0.26);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, size * 0.04, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ==========================================
// TATA LETAK RESPONSIF DI DALAM SAFE VIEWPORT
// ==========================================
function getMainMenuLayout() {
    const v = getSafeViewport();
    const btnW = Math.min(280, v.safeW);
    const btnH = 52;
    const btnX = v.cx - btnW / 2;
    const startY = v.blockTop + Math.round(v.blockH * 0.44);

    return {
        v,
        cx: v.cx,
        shipY: v.blockTop + Math.round(v.blockH * 0.16),
        titleY: v.blockTop + Math.round(v.blockH * 0.30),
        subY: v.blockTop + Math.round(v.blockH * 0.36),
        startBtn: { x: btnX, y: startY, w: btnW, h: btnH },
        hofBtn: { x: btnX, y: startY + 66, w: btnW, h: btnH },
        bookBtn: { x: btnX, y: startY + 132, w: btnW, h: btnH }
    };
}

function getModeModalLayout() {
    const v = getSafeViewport();
    const boxW = Math.min(360, v.safeW);
    const boxH = 352;
    const boxX = v.cx - boxW / 2;
    const boxY = v.blockTop + Math.floor((v.blockH - boxH) / 2);
    const btnW = boxW - 40;
    const btnX = boxX + 20;

    return {
        boxX, boxY, boxW, boxH,
        closeBtn: { x: boxX + boxW - 38, y: boxY + 12, w: 26, h: 26 },
        stageBtn: { x: btnX, y: boxY + 72, w: btnW, h: 74 },
        survivalBtn: { x: btnX, y: boxY + 160, w: btnW, h: 74 },
        endlessBtn: { x: btnX, y: boxY + 248, w: btnW, h: 74 }
    };
}

function getFullScreenHofLayout() {
    const v = getSafeViewport();
    const tabGap = 8;
    const tabW = (v.safeW - tabGap * 2) / 3;
    const tabY = v.blockTop + 50;

    return {
        v,
        headerY: v.blockTop + 24,
        closeBtn: { x: v.safeRight - 34, y: v.blockTop + 2, w: 34, h: 34 },
        tabStage: { x: v.safeLeft, y: tabY, w: tabW, h: 36 },
        tabSurvival: { x: v.safeLeft + tabW + tabGap, y: tabY, w: tabW, h: 36 },
        tabEndless: { x: v.safeLeft + (tabW + tabGap) * 2, y: tabY, w: tabW, h: 36 },
        listX: v.safeLeft,
        listY: tabY + 52,
        listW: v.safeW,
        listBottom: v.blockBottom
    };
}

function getFullScreenEncyclopediaLayout() {
    const v = getSafeViewport();
    const tabGap = 8;
    const tabW = (v.safeW - tabGap * 2) / 3;
    const tabY = v.blockTop + 50;
    const gridStartY = tabY + 52;
    const cols = 3;
    const gap = 10;
    const cardW = (v.safeW - gap * 2) / 3;
    const cardH = 104;
    const detailY = gridStartY + cardH * 2 + gap + 16;

    return {
        v,
        headerY: v.blockTop + 24,
        closeBtn: { x: v.safeRight - 34, y: v.blockTop + 2, w: 34, h: 34 },
        tabWeapons: { x: v.safeLeft, y: tabY, w: tabW, h: 36 },
        tabFusions: { x: v.safeLeft + tabW + tabGap, y: tabY, w: tabW, h: 36 },
        tabArtifacts: { x: v.safeLeft + (tabW + tabGap) * 2, y: tabY, w: tabW, h: 36 },
        gridStartX: v.safeLeft,
        gridStartY,
        cols,
        gap,
        cardW,
        cardH,
        detailBox: {
            x: v.safeLeft,
            y: detailY,
            w: v.safeW,
            h: Math.max(165, v.blockBottom - detailY)
        }
    };
}

function getFullScreenPauseLayout() {
    const v = getSafeViewport();
    const btnSize = 54;
    const gap = 20;
    const totalRowW = btnSize * 4 + gap * 3;
    const startX = v.cx - totalRowW / 2;
    const bottomRowY = v.blockBottom - btnSize;
    const resumeW = Math.min(240, v.safeW);

    return {
        v,
        cx: v.cx,
        titleY: v.blockTop + 28,
        chartBtn: { x: v.safeRight - 38, y: v.blockTop + 2, w: 38, h: 38 },
        subCloseBtn: { x: v.safeRight - 36, y: v.blockTop + 2, w: 36, h: 36 },
        resumeBtn: { x: v.cx - resumeW / 2, y: bottomRowY - 68, w: resumeW, h: 48 },
        ownedWeaponsBtn: { x: startX, y: bottomRowY, w: btnSize, h: btnSize },
        artifactsBtn: { x: startX + (btnSize + gap), y: bottomRowY, w: btnSize, h: btnSize },
        restartBtn: { x: startX + (btnSize + gap) * 2, y: bottomRowY, w: btnSize, h: btnSize },
        quitBtn: { x: startX + (btnSize + gap) * 3, y: bottomRowY, w: btnSize, h: btnSize }
    };
}

function getHudPauseButtonRect() {
    return { x: canvas.width - 42, y: 36, w: 28, h: 18 };
}

// ==========================================
// HANDLER KLIK MENU & PAUSE
// ==========================================
function handleMainMenuClick(x, y) {
    if (GAME_STATE.menuModal === 'MODE_SELECT') {
        const m = getModeModalLayout();
        if (isInsideRect(x, y, m.closeBtn)) {
            GAME_STATE.menuModal = null;
        } else if (isInsideRect(x, y, m.stageBtn) || isInsideRect(x, y, m.survivalBtn)) {
            spawnFloatingText(x, y - 10, 'MODE MASIH TERKUNCI!', '#94a3b8', 12);
        } else if (isInsideRect(x, y, m.endlessBtn)) {
            GAME_STATE.gameMode = 'ENDLESS';
            GAME_STATE.menuModal = null;
            startGame();
        }
        return true;
    }

    if (GAME_STATE.menuModal === 'HALL_OF_FAME') {
        const h = getFullScreenHofLayout();
        if (isInsideRect(x, y, h.closeBtn)) {
            GAME_STATE.menuModal = null;
        } else if (isInsideRect(x, y, h.tabStage)) {
            GAME_STATE.hofTab = 'STAGE';
        } else if (isInsideRect(x, y, h.tabSurvival)) {
            GAME_STATE.hofTab = 'SURVIVAL';
        } else if (isInsideRect(x, y, h.tabEndless)) {
            GAME_STATE.hofTab = 'ENDLESS';
        }
        return true;
    }

    if (GAME_STATE.menuModal === 'ENCYCLOPEDIA') {
        const e = getFullScreenEncyclopediaLayout();
        if (isInsideRect(x, y, e.closeBtn)) {
            GAME_STATE.menuModal = null;
        } else if (isInsideRect(x, y, e.tabWeapons)) {
            GAME_STATE.encyclopediaTab = 'WEAPONS';
            GAME_STATE.encyclopediaSelectedIdx = 0;
        } else if (isInsideRect(x, y, e.tabFusions)) {
            GAME_STATE.encyclopediaTab = 'FUSIONS';
            GAME_STATE.encyclopediaSelectedIdx = 0;
        } else if (isInsideRect(x, y, e.tabArtifacts)) {
            GAME_STATE.encyclopediaTab = 'ARTIFACTS';
            GAME_STATE.encyclopediaSelectedIdx = 0;
        } else if (GAME_STATE.encyclopediaTab !== 'ARTIFACTS') {
            const count = GAME_STATE.encyclopediaTab === 'WEAPONS' ? 6 : Object.keys(GAME_CONFIG.fusions).length;
            for (let i = 0; i < count; i++) {
                const col = i % e.cols;
                const row = Math.floor(i / e.cols);
                const rect = {
                    x: e.gridStartX + col * (e.cardW + e.gap),
                    y: e.gridStartY + row * (e.cardH + e.gap),
                    w: e.cardW,
                    h: e.cardH
                };
                if (isInsideRect(x, y, rect)) {
                    GAME_STATE.encyclopediaSelectedIdx = i;
                    break;
                }
            }
        }
        return true;
    }

    const menu = getMainMenuLayout();
    if (isInsideRect(x, y, menu.startBtn)) {
        GAME_STATE.menuModal = 'MODE_SELECT';
    } else if (isInsideRect(x, y, menu.hofBtn)) {
        GAME_STATE.hofTab = 'ENDLESS';
        GAME_STATE.menuModal = 'HALL_OF_FAME';
    } else if (isInsideRect(x, y, menu.bookBtn)) {
        GAME_STATE.encyclopediaTab = 'WEAPONS';
        GAME_STATE.encyclopediaSelectedIdx = 0;
        GAME_STATE.menuModal = 'ENCYCLOPEDIA';
    }
    return true;
}

function handlePauseMenuClick(x, y) {
    const p = getFullScreenPauseLayout();

    if ((GAME_STATE.pauseSubScreen || 'MAIN') !== 'MAIN') {
        if (isInsideRect(x, y, p.subCloseBtn)) {
            GAME_STATE.pauseSubScreen = 'MAIN';
        }
        return true;
    }

    if (isInsideRect(x, y, p.chartBtn)) {
        GAME_STATE.pauseSubScreen = 'DAMAGE';
    } else if (isInsideRect(x, y, p.resumeBtn)) {
        togglePauseGame();
    } else if (isInsideRect(x, y, p.ownedWeaponsBtn)) {
        GAME_STATE.pauseSubScreen = 'OWNED_WEAPONS';
    } else if (isInsideRect(x, y, p.artifactsBtn)) {
        GAME_STATE.pauseSubScreen = 'ARTIFACTS';
    } else if (isInsideRect(x, y, p.restartBtn)) {
        GAME_STATE.pauseSubScreen = 'MAIN';
        startGame();
    } else if (isInsideRect(x, y, p.quitBtn)) {
        returnToMainMenu();
    }
    return true;
}

// ==========================================
// RENDER MAIN MENU & MODE SELECT
// ==========================================
function renderMainMenuScreen() {
    ctx.fillStyle = 'rgba(6, 9, 19, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const menu = getMainMenuLayout();
    const { cx } = menu;

    drawSpriteEntity(null, assets.player, cx, menu.shipY, 64, 64, false, '#38bdf8');

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 32px monospace';
    ctx.fillText('SPACE DEFENDER', cx, menu.titleY);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(`HIGH SCORE: ${GAME_STATE.highScore.toLocaleString('id-ID')}`, cx, menu.subY);

    drawStyledButton(menu.startBtn, 'START MISSION', '', '#0369a1', '#38bdf8', '#ffffff');
    drawStyledButton(menu.hofBtn, 'HALL OF FAME', '', '#0f172a', '#64748b', '#facc15');
    drawStyledButton(menu.bookBtn, 'ENCYCLOPEDIA', '', '#0f172a', '#64748b', '#e2e8f0');

    if (GAME_STATE.menuModal === 'MODE_SELECT') {
        renderModeSelectModal();
    } else if (GAME_STATE.menuModal === 'HALL_OF_FAME') {
        renderHallOfFameModal();
    } else if (GAME_STATE.menuModal === 'ENCYCLOPEDIA') {
        renderEncyclopediaModal();
    }
}

function renderModeSelectModal() {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const m = getModeModalLayout();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(m.boxX, m.boxY, m.boxW, m.boxH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(m.boxX, m.boxY, m.boxW, m.boxH);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('PILIH MODE MISI', m.boxX + 20, m.boxY + 34);

    drawStyledButton(m.closeBtn, 'X', '', '#1e293b', '#64748b', '#f87171');

    drawStyledButton(
        m.stageBtn,
        'STAGE MODE [LOCKED]',
        'Segera hadir · Misi bertahap menumpas armada',
        '#0b1120', '#334155', '#64748b'
    );
    drawStyledButton(
        m.survivalBtn,
        'SURVIVAL [LOCKED]',
        'Segera hadir · Merchant Shop & Artifact',
        '#0b1120', '#334155', '#64748b'
    );
    drawStyledButton(
        m.endlessBtn,
        'ENDLESS',
        'Pertempuran tanpa batas untuk rekor tertinggi',
        '#1e293b', '#38bdf8', '#38bdf8'
    );
}

// ==========================================
// RENDER FULL-SCREEN HALL OF FAME (3 TAB MODE)
// ==========================================
function renderHallOfFameModal() {
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const h = getFullScreenHofLayout();
    const { v } = h;
    const activeTab = GAME_STATE.hofTab || 'ENDLESS';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('HALL OF FAME', v.safeLeft, h.headerY);
    drawStyledButton(h.closeBtn, 'X', '', '#0f172a', '#475569', '#f87171');

    const tabs = [
        { rect: h.tabStage, label: 'STAGE', active: activeTab === 'STAGE' },
        { rect: h.tabSurvival, label: 'SURVIVAL', active: activeTab === 'SURVIVAL' },
        { rect: h.tabEndless, label: 'ENDLESS', active: activeTab === 'ENDLESS' }
    ];
    tabs.forEach(t => {
        drawStyledButton(
            t.rect, t.label, '',
            t.active ? '#0c2340' : '#0f172a',
            t.active ? '#38bdf8' : '#334155',
            t.active ? '#38bdf8' : '#64748b'
        );
    });

    const records = GAME_STATE.hallOfFame
        .filter(rec => (rec.mode || 'ENDLESS') === activeTab)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    if (records.length === 0) {
        const emptyY = h.listY + Math.floor((h.listBottom - h.listY) * 0.42);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`[ BELUM ADA REKOR MODE ${activeTab} ]`, v.cx, emptyY);

        ctx.font = '11px monospace';
        const subMsg = activeTab === 'ENDLESS'
            ? 'Selesaikan misi untuk masuk daftar peringkat Top 5!'
            : 'Mode ini masih terkunci atau belum memiliki catatan misi.';
        ctx.fillText(subMsg, v.cx, emptyY + 24);
        return;
    }

    const availH = h.listBottom - h.listY;
    const gap = 10;
    const cardH = Math.min(92, Math.floor((availH - gap * 4) / 5));
    const rankColors = ['#facc15', '#e2e8f0', '#fb923c', '#38bdf8', '#38bdf8'];
    let itemY = h.listY;

    records.forEach((rec, idx) => {
        const accent = rankColors[idx] || '#38bdf8';

        ctx.fillStyle = idx === 0 ? '#0f172a' : '#0b1120';
        ctx.fillRect(h.listX, itemY, h.listW, cardH);
        ctx.strokeStyle = idx === 0 ? '#facc15' : '#1e293b';
        ctx.lineWidth = idx === 0 ? 1.8 : 1.2;
        ctx.strokeRect(h.listX, itemY, h.listW, cardH);

        ctx.textAlign = 'left';
        ctx.fillStyle = accent;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`#${idx + 1} · ${rec.score.toLocaleString('id-ID')} PTS`, h.listX + 14, itemY + 24);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#64748b';
        ctx.font = '10.5px monospace';
        ctx.fillText(rec.date || '', h.listX + h.listW - 14, itemY + 24);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText(`Wave ${rec.wave} · Lv.${rec.level} · Waktu ${rec.time}`, h.listX + 14, itemY + 46);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(fitCanvasText(`Build: ${rec.build}`, h.listW - 28), h.listX + 14, itemY + 66);

        itemY += cardH + gap;
    });
}

// ==========================================
// RENDER FULL-SCREEN ENCYCLOPEDIA
// ==========================================
function renderEncyclopediaModal() {
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const e = getFullScreenEncyclopediaLayout();
    const { v } = e;
    const tab = GAME_STATE.encyclopediaTab || 'WEAPONS';
    const selectedIdx = GAME_STATE.encyclopediaSelectedIdx || 0;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('ARMORY DATABASE', v.safeLeft, e.headerY);
    drawStyledButton(e.closeBtn, 'X', '', '#0f172a', '#475569', '#f87171');

    const tabs = [
        { rect: e.tabWeapons, label: 'SENJATA', active: tab === 'WEAPONS' },
        { rect: e.tabFusions, label: 'FUSION', active: tab === 'FUSIONS' },
        { rect: e.tabArtifacts, label: 'ARTEFAK', active: tab === 'ARTIFACTS' }
    ];
    tabs.forEach(t => {
        drawStyledButton(
            t.rect, t.label, '',
            t.active ? '#0c2340' : '#0f172a',
            t.active ? '#38bdf8' : '#334155',
            t.active ? '#38bdf8' : '#64748b'
        );
    });

    if (tab === 'ARTIFACTS') {
        const emptyY = e.gridStartY + Math.floor((v.blockBottom - e.gridStartY) * 0.42);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('[ DATABASE ARTEFAK KOSONG ]', v.cx, emptyY);
        ctx.font = '11px monospace';
        ctx.fillText('Modul artefak akan tersedia pada pembaruan berikutnya.', v.cx, emptyY + 24);
        return;
    }

    const items = tab === 'WEAPONS'
        ? ['laser', 'he', 'lightning', 'arctic', 'shockwave', 'flamethrower'].map(k => ({ key: k, data: GAME_CONFIG.weapons[k] }))
        : Object.entries(GAME_CONFIG.fusions).map(([k, v]) => ({ key: k, data: v }));

    items.forEach((item, idx) => {
        if (!item.data) return;
        const col = idx % e.cols;
        const row = Math.floor(idx / e.cols);
        const cardX = e.gridStartX + col * (e.cardW + e.gap);
        const cardY = e.gridStartY + row * (e.cardH + e.gap);
        const isSelected = selectedIdx === idx;
        const accentColor = item.data.color || '#38bdf8';

        ctx.fillStyle = isSelected ? '#0f172a' : '#0b1120';
        ctx.fillRect(cardX, cardY, e.cardW, e.cardH);
        ctx.strokeStyle = isSelected ? accentColor : '#1e293b';
        ctx.lineWidth = isSelected ? 2.2 : 1.2;
        ctx.strokeRect(cardX, cardY, e.cardW, e.cardH);

        drawWeaponPlaceholderIcon(item.key, cardX + e.cardW / 2, cardY + 36, 40, accentColor);

        ctx.textAlign = 'center';
        ctx.fillStyle = isSelected ? '#f8fafc' : '#94a3b8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(fitCanvasText(item.data.name, e.cardW - 10), cardX + e.cardW / 2, cardY + 73);

        const dots = tab === 'WEAPONS' ? 6 : 1;
        const dotGap = 8;
        const startDotX = cardX + e.cardW / 2 - ((dots - 1) * dotGap) / 2;
        for (let d = 0; d < dots; d++) {
            ctx.fillStyle = isSelected ? '#4ade80' : '#334155';
            ctx.beginPath();
            ctx.arc(startDotX + d * dotGap, cardY + 90, 2.3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    const selected = items[selectedIdx] || items[0];
    if (selected && selected.data) {
        const d = e.detailBox;
        const accent = selected.data.color || '#38bdf8';

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(d.x, d.y, d.w, d.h);

        ctx.textAlign = 'left';
        ctx.fillStyle = accent;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(selected.data.name.toUpperCase(), d.x + 14, d.y + 24);

        if (tab === 'WEAPONS') {
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '10.5px monospace';
            const nextY = wrapCanvasText(selected.data.levels['1'].desc, d.x + 14, d.y + 44, d.w - 28, 14);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 10.5px monospace';
            ctx.fillText(fitCanvasText(`EVOLUSI 6A · ${selected.data.levels['6a'].name}`, d.w - 28), d.x + 14, nextY + 10);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9.5px monospace';
            ctx.fillText(fitCanvasText(selected.data.levels['6a'].desc, d.w - 28), d.x + 14, nextY + 24);

            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 10.5px monospace';
            ctx.fillText(fitCanvasText(`EVOLUSI 6B · ${selected.data.levels['6b'].name}`, d.w - 28), d.x + 14, nextY + 44);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9.5px monospace';
            ctx.fillText(fitCanvasText(selected.data.levels['6b'].desc, d.w - 28), d.x + 14, nextY + 58);
        } else {
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 10.5px monospace';
            ctx.fillText(fitCanvasText(`SYARAT: ${selected.data.reqText}`, d.w - 28), d.x + 14, d.y + 46);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px monospace';
            wrapCanvasText(selected.data.desc, d.x + 14, d.y + 68, d.w - 28, 16);
        }
    }
}

// ==========================================
// RENDER FULL-SCREEN TACTICAL PAUSE & SUB-HALAMAN
// ==========================================
function renderPauseOverlay() {
    ctx.fillStyle = 'rgba(6, 9, 19, 0.96)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const p = getFullScreenPauseLayout();
    const { v } = p;
    const sub = GAME_STATE.pauseSubScreen || 'MAIN';

    if (sub === 'DAMAGE') {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 19px monospace';
        ctx.fillText('COMBAT DAMAGE REPORT', p.cx, p.titleY);

        drawStyledButton(p.subCloseBtn, 'X', '', '#0f172a', '#475569', '#f87171');

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11.5px monospace';
        ctx.fillText(`MODE: ${GAME_STATE.gameMode}  ·  WAVE ${GAME_STATE.wave}`, p.cx, p.titleY + 28);

        const stats = GAME_STATE.weaponDamageStats || {};
        const weaponKeys = ['laser', 'he', 'lightning', 'arctic', 'shockwave', 'flamethrower'];
        const activeList = weaponKeys
            .filter(k => playerSkills[k] || (stats[k] && stats[k] > 0))
            .map(k => ({
                key: k,
                name: GAME_CONFIG.weapons[k].name,
                color: GAME_CONFIG.weapons[k].color || '#38bdf8',
                dmg: stats[k] || 0
            }));

        const maxDmg = Math.max(1, ...activeList.map(a => a.dmg));
        const totalDmg = activeList.reduce((acc, cur) => acc + cur.dmg, 0);

        let rowY = p.titleY + 72;
        const iconCenterX = v.safeLeft + 18;
        const barStartX = v.safeLeft + 46;
        const barMaxW = v.safeRight - barStartX;

        activeList.forEach(item => {
            drawWeaponPlaceholderIcon(item.key, iconCenterX, rowY + 16, 32, item.color);

            ctx.textAlign = 'left';
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(item.name, barStartX, rowY + 12);

            ctx.textAlign = 'right';
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 12px monospace';
            const pct = totalDmg > 0 ? Math.round((item.dmg / totalDmg) * 100) : 0;
            ctx.fillText(`${item.dmg.toLocaleString('id-ID')} (${pct}%)`, v.safeRight, rowY + 12);

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(barStartX, rowY + 20, barMaxW, 8);
            ctx.fillStyle = item.color;
            ctx.fillRect(barStartX, rowY + 20, Math.max(4, (item.dmg / maxDmg) * barMaxW), 8);

            rowY += 56;
        });

        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '11px monospace';
        ctx.fillText(`TOTAL DAMAGE DIBERIKAN: ${totalDmg.toLocaleString('id-ID')}`, p.cx, v.blockBottom - 8);
        return;
    }

    if (sub === 'OWNED_WEAPONS') {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('ARSENAL AKTIF', p.cx, p.titleY);

        drawStyledButton(p.subCloseBtn, 'X', '', '#0f172a', '#475569', '#f87171');

        const cols = 3;
        const gap = 12;
        const cardW = (v.safeW - gap * 2) / 3;
        const cardH = 115;

        const owned = [];
        for (const [k, lvl] of Object.entries(playerSkills)) {
            if (lvl && GAME_CONFIG.weapons[k]) {
                owned.push({ key: k, name: GAME_CONFIG.weapons[k].name, lvl: lvl.toUpperCase(), color: GAME_CONFIG.weapons[k].color });
            }
        }
        for (const [fKey, isActive] of Object.entries(playerFusions)) {
            if (isActive && GAME_CONFIG.fusions[fKey]) {
                owned.push({ key: fKey, name: GAME_CONFIG.fusions[fKey].name, lvl: 'FUSION', color: '#facc15' });
            }
        }

        owned.forEach((item, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const cx = v.safeLeft + col * (cardW + gap);
            const cy = p.titleY + 48 + row * (cardH + gap);

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(cx, cy, cardW, cardH);
            ctx.strokeStyle = item.color || '#38bdf8';
            ctx.lineWidth = 1.6;
            ctx.strokeRect(cx, cy, cardW, cardH);

            drawWeaponPlaceholderIcon(item.key, cx + cardW / 2, cy + 40, 42, item.color || '#38bdf8');

            ctx.textAlign = 'center';
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(fitCanvasText(item.name, cardW - 10), cx + cardW / 2, cy + 80);

            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(item.lvl === 'FUSION' ? '[FUSION]' : `LV.${item.lvl}`, cx + cardW / 2, cy + 98);
        });
        return;
    }

    if (sub === 'ARTIFACTS') {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('ARTEFAK TERPASANG', p.cx, p.titleY);

        drawStyledButton(p.subCloseBtn, 'X', '', '#0f172a', '#475569', '#f87171');

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('[ BELUM ADA ARTEFAK YANG DIMILIKI ]', p.cx, v.blockTop + Math.floor(v.blockH * 0.45));
        return;
    }

    // Tombol Chart di pojok kanan atas safe area
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(p.chartBtn.x, p.chartBtn.y, p.chartBtn.w, p.chartBtn.h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.chartBtn.x, p.chartBtn.y, p.chartBtn.w, p.chartBtn.h);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(p.chartBtn.x + 9, p.chartBtn.y + 20, 4, 10);
    ctx.fillRect(p.chartBtn.x + 17, p.chartBtn.y + 11, 4, 19);
    ctx.fillRect(p.chartBtn.x + 25, p.chartBtn.y + 15, 4, 15);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('SYSTEM PAUSED', p.cx, p.titleY);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 12.5px monospace';
    ctx.fillText(`Current Level : ${GAME_STATE.playerLevel}`, p.cx, p.titleY + 38);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Time Survived : ${formatPlayTime(GAME_STATE.playTimeFrames)}`, p.cx, p.titleY + 60);

    ctx.fillStyle = '#fb7185';
    ctx.fillText(`Enemies Killed : ${GAME_STATE.enemiesKilled}  (Wave ${GAME_STATE.wave})`, p.cx, p.titleY + 82);

    const leftStats = [
        { label: 'Hull HP', val: `${player.hp} / ${GAME_CONFIG.player.maxHp}`, color: '#4ade80' },
        { label: 'Energy Shield', val: player.hasShield ? 'ACTIVE' : 'OFFLINE', color: '#38bdf8' },
        { label: 'Flight Speed', val: `${player.speed}`, color: '#e2e8f0' },
        { label: 'Score', val: `${GAME_STATE.score.toLocaleString('id-ID')}`, color: '#facc15' }
    ];

    const activeWeaponCount = Object.values(playerSkills).filter(Boolean).length;
    const activeFusionCount = Object.values(playerFusions).filter(Boolean).length;
    const heLvl = playerSkills.he ? GAME_CONFIG.weapons.he.levels[playerSkills.he] : null;

    const rightStats = [
        { label: 'Active Weapons', val: `${activeWeaponCount} / 6`, color: '#38bdf8' },
        { label: 'Active Fusions', val: `${activeFusionCount}`, color: '#c084fc' },
        { label: 'HE Crit Rate', val: heLvl ? `${Math.round(heLvl.critRate * 100)}%` : '0%', color: '#fb923c' },
        { label: 'Bosses Slain', val: `${GAME_STATE.bossesKilled}`, color: '#f43f5e' }
    ];

    let statY = p.titleY + 134;
    const col1L = v.safeLeft, col1R = p.cx - 12;
    const col2L = p.cx + 12, col2R = v.safeRight;

    for (let i = 0; i < leftStats.length; i++) {
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(leftStats[i].label, col1L, statY);
        ctx.textAlign = 'right';
        ctx.fillStyle = leftStats[i].color;
        ctx.fillText(leftStats[i].val, col1R, statY);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(rightStats[i].label, col2L, statY);
        ctx.textAlign = 'right';
        ctx.fillStyle = rightStats[i].color;
        ctx.fillText(rightStats[i].val, col2R, statY);

        statY += 32;
    }

    drawStyledButton(p.resumeBtn, 'RESUME GAME', '', '#0c2340', '#38bdf8', '#ffffff');

    const bottomButtons = [
        { rect: p.ownedWeaponsBtn, label: 'WPN', border: '#38bdf8', color: '#38bdf8' },
        { rect: p.artifactsBtn, label: 'ART', border: '#64748b', color: '#94a3b8' },
        { rect: p.restartBtn, label: 'RST', border: '#facc15', color: '#facc15' },
        { rect: p.quitBtn, label: 'EXIT', border: '#ef4444', color: '#f87171' }
    ];

    bottomButtons.forEach(btn => {
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(btn.rect.x + btn.rect.w / 2, btn.rect.y + btn.rect.h / 2, btn.rect.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = btn.border;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = btn.color;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, btn.rect.x + btn.rect.w / 2, btn.rect.y + btn.rect.h / 2);
        ctx.restore();
    });
}