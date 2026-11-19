// js/menu.js - Sistem Main Menu, Pop-up Mode, Hall of Fame, Encyclopedia & Pause Menu

function saveRunToHallOfFame() {
    if (GAME_STATE.score <= 0) return;

    const buildList = Object.values(GAME_STATE.buildHistory);
    const entry = {
        mode: GAME_STATE.gameMode,
        score: GAME_STATE.score,
        wave: GAME_STATE.wave,
        level: GAME_STATE.playerLevel,
        time: formatPlayTime(GAME_STATE.playTimeFrames),
        build: buildList.slice(-2).join(' + ') || 'Laser Gun Lv.1',
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    };

    GAME_STATE.hallOfFame.push(entry);
    GAME_STATE.hallOfFame.sort((a, b) => b.score - a.score);
    GAME_STATE.hallOfFame = GAME_STATE.hallOfFame.slice(0, 5);

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
        GAME_STATE.gameState = 'PAUSED';
        resetJoystick();
    } else if (GAME_STATE.gameState === 'PAUSED') {
        GAME_STATE.gameState = GAME_STATE.previousState;
    }
}

function returnToMainMenu() {
    GAME_STATE.gameState = 'START';
    GAME_STATE.menuModal = null;
    resetJoystick();
}

// ==========================================
// TATA LETAK TOMBOL MENU & MODAL
// ==========================================
function getMainMenuLayout() {
    const cx = canvas.width / 2;
    const btnW = 280;
    const btnH = 52;
    const btnX = cx - btnW / 2;
    const startY = canvas.height * 0.44;

    return {
        cx,
        startBtn: { x: btnX, y: startY, w: btnW, h: btnH },
        hofBtn: { x: btnX, y: startY + 68, w: btnW, h: btnH },
        bookBtn: { x: btnX, y: startY + 136, w: btnW, h: btnH }
    };
}

function getModeModalLayout() {
    const boxW = canvas.width - 64;
    const boxH = 360;
    const boxX = 32;
    const boxY = (canvas.height - boxH) / 2;
    const btnW = boxW - 44;
    const btnX = boxX + 22;

    return {
        boxX, boxY, boxW, boxH,
        closeBtn: { x: boxX + boxW - 38, y: boxY + 12, w: 26, h: 26 },
        stageBtn: { x: btnX, y: boxY + 75, w: btnW, h: 74 },
        survivalBtn: { x: btnX, y: boxY + 163, w: btnW, h: 74 },
        endlessBtn: { x: btnX, y: boxY + 251, w: btnW, h: 74 }
    };
}

function getModalHeaderLayout() {
    const boxW = canvas.width - 48;
    const boxH = Math.min(560, canvas.height - 110);
    const boxX = 24;
    const boxY = (canvas.height - boxH) / 2;

    return {
        boxX, boxY, boxW, boxH,
        closeBtn: { x: boxX + boxW - 40, y: boxY + 14, w: 28, h: 28 },
        tabFusions: { x: boxX + 16, y: boxY + 54, w: (boxW - 40) / 2, h: 32 },
        tabWeapons: { x: boxX + 24 + (boxW - 40) / 2, y: boxY + 54, w: (boxW - 40) / 2, h: 32 }
    };
}

function getPauseLayout() {
    const boxW = canvas.width - 72;
    const boxH = 350;
    const boxX = 36;
    const boxY = (canvas.height - boxH) / 2;
    const btnW = boxW - 48;
    const btnX = boxX + 24;

    return {
        boxX, boxY, boxW, boxH,
        resumeBtn: { x: btnX, y: boxY + 145, w: btnW, h: 46 },
        restartBtn: { x: btnX, y: boxY + 203, w: btnW, h: 46 },
        menuBtn: { x: btnX, y: boxY + 261, w: btnW, h: 46 }
    };
}

function getHudPauseButtonRect() {
    return { x: canvas.width - 42, y: 36, w: 28, h: 18 };
}

// ==========================================
// PENANGANAN KLIK PADA MENU & PAUSE
// ==========================================
function handleMainMenuClick(x, y) {
    if (GAME_STATE.menuModal === 'MODE_SELECT') {
        const m = getModeModalLayout();
        if (isInsideRect(x, y, m.closeBtn)) {
            GAME_STATE.menuModal = null;
        } else if (isInsideRect(x, y, m.stageBtn)) {
            GAME_STATE.gameMode = 'STAGE';
            GAME_STATE.menuModal = null;
            startGame();
        } else if (isInsideRect(x, y, m.survivalBtn)) {
            GAME_STATE.gameMode = 'SURVIVAL';
            GAME_STATE.menuModal = null;
            startGame();
        } else if (isInsideRect(x, y, m.endlessBtn)) {
            GAME_STATE.gameMode = 'ENDLESS';
            GAME_STATE.menuModal = null;
            startGame();
        }
        return true;
    }

    if (GAME_STATE.menuModal === 'HALL_OF_FAME') {
        const h = getModalHeaderLayout();
        if (isInsideRect(x, y, h.closeBtn)) {
            GAME_STATE.menuModal = null;
        }
        return true;
    }

    if (GAME_STATE.menuModal === 'ENCYCLOPEDIA') {
        const e = getModalHeaderLayout();
        if (isInsideRect(x, y, e.closeBtn)) {
            GAME_STATE.menuModal = null;
        } else if (isInsideRect(x, y, e.tabFusions)) {
            GAME_STATE.encyclopediaTab = 'FUSIONS';
        } else if (isInsideRect(x, y, e.tabWeapons)) {
            GAME_STATE.encyclopediaTab = 'WEAPONS';
        }
        return true;
    }

    const menu = getMainMenuLayout();
    if (isInsideRect(x, y, menu.startBtn)) {
        GAME_STATE.menuModal = 'MODE_SELECT';
    } else if (isInsideRect(x, y, menu.hofBtn)) {
        GAME_STATE.menuModal = 'HALL_OF_FAME';
    } else if (isInsideRect(x, y, menu.bookBtn)) {
        GAME_STATE.menuModal = 'ENCYCLOPEDIA';
    }
    return true;
}

function handlePauseMenuClick(x, y) {
    const p = getPauseLayout();
    if (isInsideRect(x, y, p.resumeBtn)) {
        togglePauseGame();
    } else if (isInsideRect(x, y, p.restartBtn)) {
        startGame();
    } else if (isInsideRect(x, y, p.menuBtn)) {
        returnToMainMenu();
    }
    return true;
}

// ==========================================
// RENDER MAIN MENU, MODAL & PAUSE
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
        ctx.fillStyle = '#94a3b8';
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

function renderMainMenuScreen() {
    ctx.fillStyle = 'rgba(6, 9, 19, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const menu = getMainMenuLayout();
    const { cx } = menu;

    // Preview pesawat di tengah atas menu
    drawSpriteEntity(null, assets.player, cx, canvas.height * 0.22, 64, 64, false, '#38bdf8');

    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('SPACE DEFENDER', cx, canvas.height * 0.33);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(`HIGH SCORE: ${GAME_STATE.highScore.toLocaleString('id-ID')}`, cx, canvas.height * 0.37);

    drawStyledButton(menu.startBtn, 'START MISSION', '', '#0369a1', '#38bdf8', '#ffffff');
    drawStyledButton(menu.hofBtn, 'HALL OF FAME', '', '#0f172a', '#64748b', '#facc15');
    drawStyledButton(menu.bookBtn, 'ENCYCLOPEDIA', '', '#0f172a', '#64748b', '#e2e8f0');

    // Render Pop-up Modal jika sedang aktif
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
    ctx.fillText('PILIH MODE MISI', m.boxX + 22, m.boxY + 34);

    drawStyledButton(m.closeBtn, 'X', '', '#1e293b', '#64748b', '#f87171');

    drawStyledButton(
        m.stageBtn,
        'STAGE MODE',
        'Misi bertahap menumpas armada & Boss sektor',
        '#1e293b', '#38bdf8', '#38bdf8'
    );
    drawStyledButton(
        m.survivalBtn,
        'SURVIVAL',
        'Bertahan hidup + Merchant Shop & Artifact',
        '#1e293b', '#4ade80', '#4ade80'
    );
    drawStyledButton(
        m.endlessBtn,
        'ENDLESS',
        'Pertempuran tanpa batas untuk rekor tertinggi',
        '#1e293b', '#facc15', '#facc15'
    );
}

function renderHallOfFameModal() {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const h = getModalHeaderLayout();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(h.boxX, h.boxY, h.boxW, h.boxH);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(h.boxX, h.boxY, h.boxW, h.boxH);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('HALL OF FAME (TOP 5)', h.boxX + 20, h.boxY + 34);

    drawStyledButton(h.closeBtn, 'X', '', '#1e293b', '#64748b', '#f87171');

    const records = GAME_STATE.hallOfFame;
    if (records.length === 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px monospace';
        ctx.fillText('Belum ada rekor tersimpan.', canvas.width / 2, h.boxY + 180);
        ctx.fillText('Selesaikan misi untuk masuk daftar!', canvas.width / 2, h.boxY + 205);
        return;
    }

    let itemY = h.boxY + 72;
    records.forEach((rec, idx) => {
        ctx.fillStyle = idx === 0 ? '#1e293b' : '#0b1120';
        ctx.fillRect(h.boxX + 16, itemY, h.boxW - 32, 76);
        ctx.strokeStyle = idx === 0 ? '#facc15' : '#334155';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(h.boxX + 16, itemY, h.boxW - 32, 76);

        ctx.textAlign = 'left';
        ctx.fillStyle = idx === 0 ? '#facc15' : '#38bdf8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`#${idx + 1} · ${rec.score.toLocaleString('id-ID')} PTS`, h.boxX + 28, itemY + 24);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10.5px monospace';
        ctx.fillText(`[${rec.mode || 'ENDLESS'}] ${rec.date || ''}`, h.boxX + h.boxW - 26, itemY + 24);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        ctx.fillText(`Wave ${rec.wave} · Lv.${rec.level} · Waktu ${rec.time}`, h.boxX + 28, itemY + 44);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(`Build: ${rec.build}`, h.boxX + 28, itemY + 62);

        itemY += 88;
    });
}

function renderEncyclopediaModal() {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const e = getModalHeaderLayout();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(e.boxX, e.boxY, e.boxW, e.boxH);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.boxX, e.boxY, e.boxW, e.boxH);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 17px monospace';
    ctx.fillText('ARMORY ENCYCLOPEDIA', e.boxX + 20, e.boxY + 34);

    drawStyledButton(e.closeBtn, 'X', '', '#1e293b', '#64748b', '#f87171');

    // Tab Switcher
    const isFusionTab = GAME_STATE.encyclopediaTab === 'FUSIONS';
    drawStyledButton(
        e.tabFusions, 'FUSION RECIPES', '',
        isFusionTab ? '#1e293b' : '#0b1120',
        isFusionTab ? '#38bdf8' : '#334155',
        isFusionTab ? '#38bdf8' : '#94a3b8'
    );
    drawStyledButton(
        e.tabWeapons, 'ARSENAL (6)', '',
        !isFusionTab ? '#1e293b' : '#0b1120',
        !isFusionTab ? '#38bdf8' : '#334155',
        !isFusionTab ? '#38bdf8' : '#94a3b8'
    );

    let curY = e.boxY + 104;
    const contentX = e.boxX + 18;
    const maxW = e.boxW - 36;

    if (isFusionTab) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10.5px monospace';
        ctx.fillText('Syarat: Kedua LV. Senjata MAX. | Fusion 1 LV.10 | Fusion 2 LV.20', contentX, curY);
        curY += 18;

        for (const fKey in GAME_CONFIG.fusions) {
            const f = GAME_CONFIG.fusions[fKey];
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(contentX, curY, maxW, 74);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(contentX, curY, maxW, 74);

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12.5px monospace';
            ctx.fillText(f.name, contentX + 10, curY + 18);

            ctx.fillStyle = '#38bdf8';
            ctx.font = '10px monospace';
            ctx.fillText(`Rumus: ${f.reqText}`, contentX + 10, curY + 34);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '10px monospace';
            wrapCanvasText(f.desc, contentX + 10, curY + 50, maxW - 20, 13);

            curY += 82;
        }
    } else {
        const weaponKeys = ['laser', 'he', 'lightning', 'arctic', 'shockwave', 'flamethrower'];
        for (const wKey of weaponKeys) {
            const w = GAME_CONFIG.weapons[wKey];
            if (!w) continue;

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(contentX, curY, maxW, 66);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.strokeRect(contentX, curY, maxW, 66);

            ctx.textAlign = 'left';
            ctx.fillStyle = w.color || '#f8fafc';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(w.name, contentX + 10, curY + 17);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '9.5px monospace';
            ctx.fillText(w.levels['1'].desc, contentX + 10, curY + 32);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '10px monospace';
            ctx.fillText(`• 6A: ${w.levels['6a'].name}  |  6B: ${w.levels['6b'].name}`, contentX + 10, curY + 51);

            curY += 73;
        }
    }
}

function renderPauseOverlay() {
    ctx.fillStyle = 'rgba(6, 9, 19, 0.88)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const p = getPauseLayout();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(p.boxX, p.boxY, p.boxW, p.boxH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.boxX, p.boxY, p.boxW, p.boxH);

    const cx = canvas.width / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('GAME PAUSED', cx, p.boxY + 42);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '11.5px monospace';
    ctx.fillText(`MODE: ${GAME_STATE.gameMode} · WAVE ${GAME_STATE.wave} · LV.${GAME_STATE.playerLevel}`, cx, p.boxY + 66);

    // Ringkasan Build saat ini
    const buildItems = Object.values(GAME_STATE.buildHistory);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10.5px monospace';
    const buildPreview = buildItems.slice(0, 3).join(' | ') || 'Laser Gun Lv.1';
    ctx.fillText(buildPreview, cx, p.boxY + 95);
    if (buildItems.length > 3) {
        ctx.fillText(buildItems.slice(3, 6).join(' | '), cx, p.boxY + 113);
    }

    drawStyledButton(p.resumeBtn, 'RESUME', '', '#15803d', '#4ade80', '#ffffff');
    drawStyledButton(p.restartBtn, 'RESTART', '', '#1e293b', '#64748b', '#facc15');
    drawStyledButton(p.menuBtn, 'MAIN MENU', '', '#1e293b', '#64748b', '#f87171');
}