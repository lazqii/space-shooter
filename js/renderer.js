// js/renderer.js - Semua Fungsi Gambar Canvas, Efek Visual, HUD, Main Menu & Pause

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

    if (entity && entity.status && entity.status.timeStopTimer > 0) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(w, h) * 0.58 + Math.sin(GAME_STATE.frameCount * 0.2) * 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawLightningBolt(x1, y1, x2, y2, intensity = 0) {
    ctx.save();
    const boost = Math.min(5, intensity);
    const isInferno = playerFusions.inferno;

    ctx.strokeStyle = isInferno ? (boost > 0 ? '#ffffff' : '#fde047') : '#fde047';
    ctx.shadowColor = isInferno ? '#f97316' : '#eab308';
    ctx.shadowBlur = isInferno ? (14 + boost * 5) : 10;
    ctx.lineWidth = isInferno ? (3.2 + boost * 1.1) : 2.5;

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

    if (isInferno) {
        ctx.strokeStyle = boost > 0 ? 'rgba(251, 146, 60, 0.75)' : 'rgba(249, 115, 22, 0.45)';
        ctx.lineWidth = 6 + boost * 1.8;
        ctx.stroke();
    }

    ctx.restore();
}

function drawFlameThrowerCone() {
    if (playerFusions.inferno || !playerSkills.flamethrower || weaponTimers.flameActive <= 0) return;

    const ftCfg = GAME_CONFIG.weapons.flamethrower;
    if (!ftCfg) return;
    const curLvl = playerSkills.flamethrower;
    const ftLvl = ftCfg.levels[curLvl];
    if (!ftLvl) return;

    const isWildfire = ['4b', '5b', '6b'].includes(curLvl);
    const coneRange = ftCfg.baseRange * (ftLvl.rangeMult || 1.0);
    const halfSpread = ftCfg.baseSpread * (ftLvl.spreadMult || 1.0);
    const startX = player.x;
    const startY = player.y - 26;
    const t = GAME_STATE.frameCount;
    const pixelGrid = 4; // Ukuran grid piksel agar tampil tajam bergaya retro

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Pijar dasar (Ambient Glow)
    const baseGrad = ctx.createRadialGradient(startX, startY, 6, startX, startY - coneRange * 0.45, coneRange);
    if (isWildfire) {
        baseGrad.addColorStop(0, 'rgba(224, 242, 254, 0.36)');
        baseGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.18)');
        baseGrad.addColorStop(1, 'rgba(29, 78, 216, 0)');
    } else {
        baseGrad.addColorStop(0, 'rgba(254, 240, 138, 0.30)');
        baseGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.14)');
        baseGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    }

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.arc(startX, startY, coneRange, -Math.PI / 2 - halfSpread, -Math.PI / 2 + halfSpread);
    ctx.closePath();
    ctx.fill();

    // 2. Lidah api bergelombang (3 lapisan dinamis)
    const layers = isWildfire ? [
        { color: 'rgba(37, 99, 235, 0.40)', scale: 1.0, amp: 0.08, speed: 0.45 },
        { color: 'rgba(56, 189, 248, 0.55)', scale: 0.84, amp: 0.06, speed: 0.55 },
        { color: 'rgba(224, 242, 254, 0.72)', scale: 0.56, amp: 0.04, speed: 0.65 }
    ] : [
        { color: 'rgba(239, 68, 68, 0.38)', scale: 1.0, amp: 0.16, speed: 0.35 },
        { color: 'rgba(249, 115, 22, 0.50)', scale: 0.82, amp: 0.12, speed: 0.45 },
        { color: 'rgba(254, 240, 138, 0.60)', scale: 0.52, amp: 0.08, speed: 0.55 }
    ];

    layers.forEach((layer, idx) => {
        const maxDist = coneRange * layer.scale;
        const steps = 8;
        const leftPts = [];
        const rightPts = [];

        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            const dist = ratio * maxDist;
            const wave = Math.sin(t * layer.speed - ratio * 5 + idx * 1.7) * (layer.amp * ratio);
            const curHalfSpread = halfSpread * (0.22 + ratio * 0.85);

            const angleL = -Math.PI / 2 - curHalfSpread + wave;
            const angleR = -Math.PI / 2 + curHalfSpread + wave;

            leftPts.push({
                x: Math.round((startX + Math.cos(angleL) * dist) / pixelGrid) * pixelGrid,
                y: Math.round((startY + Math.sin(angleL) * dist) / pixelGrid) * pixelGrid
            });
            rightPts.push({
                x: Math.round((startX + Math.cos(angleR) * dist) / pixelGrid) * pixelGrid,
                y: Math.round((startY + Math.sin(angleR) * dist) / pixelGrid) * pixelGrid
            });
        }

        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        for (const pt of leftPts) ctx.lineTo(pt.x, pt.y);
        for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i].x, rightPts[i].y);
        ctx.closePath();
        ctx.fill();
    });

    // 3. Partikel kotak piksel (Ember & Plasma Blocks) yang melesat keluar
    const particleCount = Math.max(24, Math.round(coneRange / 6));
    const flowSpeed = isWildfire ? 0.08 : 0.055;

    for (let i = 0; i < particleCount; i++) {
        const rawProgress = t * flowSpeed + i * (1 / particleCount);
        const progress = rawProgress % 1;
        const cycle = Math.floor(rawProgress);
        const dist = progress * coneRange;

        const seed = Math.sin(i * 12.9898 + cycle * 78.233);
        const wobble = Math.sin(t * 0.25 + i) * (isWildfire ? 0.04 : 0.08) * progress;
        const angle = -Math.PI / 2 + (seed * halfSpread * 0.94) + wobble;

        // Snap posisi ke grid piksel 4px
        const px = Math.round((startX + Math.cos(angle) * dist) / pixelGrid) * pixelGrid;
        const py = Math.round((startY + Math.sin(angle) * dist) / pixelGrid) * pixelGrid;

        // Ukuran kotak kelipatan pixelGrid (16px -> 12px -> 8px -> 4px)
        const rawSize = (1 - Math.abs(progress - 0.3)) * (12 + halfSpread * 12);
        const blockSize = Math.max(pixelGrid, Math.round(rawSize / pixelGrid) * pixelGrid);
        const alpha = (1 - progress) * 0.92;

        if (isWildfire) {
            if (progress < 0.28) {
                ctx.fillStyle = `rgba(240, 249, 255, ${alpha})`; // Inti putih plasma
            } else if (progress < 0.68) {
                ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;  // Biru elektrik
            } else {
                ctx.fillStyle = `rgba(37, 99, 235, ${alpha * 0.85})`; // Biru pekat
            }
        } else {
            if (progress < 0.28) {
                ctx.fillStyle = `rgba(254, 249, 195, ${alpha})`; // Inti kuning-putih
            } else if (progress < 0.68) {
                ctx.fillStyle = `rgba(249, 115, 22, ${alpha})`;  // Oranye api
            } else {
                ctx.fillStyle = `rgba(220, 38, 38, ${alpha * 0.85})`; // Bara merah
            }
        }

        ctx.fillRect(px - blockSize / 2, py - blockSize / 2, blockSize, blockSize);
    }

    ctx.restore();
}

function renderHUDAndOverlays() {
    // 1. Jika sedang di layar START, langsung tampilkan Main Menu (tanpa HUD pertempuran)
    if (GAME_STATE.gameState === 'START') {
        if (typeof renderMainMenuScreen === 'function') {
            renderMainMenuScreen();
        }
        return;
    }

    // 2. HUD Atas saat permainan berlangsung
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, canvas.width, 64);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LV.${GAME_STATE.playerLevel}`, 12, 20);

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`SCR:${GAME_STATE.score}`, 66, 20);

    const activeTags = [];
    if (playerSkills.laser) activeTags.push(`LSR:${playerSkills.laser.toUpperCase()}`);
    if (playerSkills.he) activeTags.push(`HE:${playerSkills.he.toUpperCase()}`);
    if (playerSkills.lightning) activeTags.push(`LGT:${playerSkills.lightning.toUpperCase()}`);
    if (playerSkills.arctic) activeTags.push(`ARC:${playerSkills.arctic.toUpperCase()}`);
    if (playerSkills.shockwave) activeTags.push(`SHK:${playerSkills.shockwave.toUpperCase()}`);
    if (playerSkills.flamethrower) activeTags.push(`FLM:${playerSkills.flamethrower.toUpperCase()}`);

    if (playerFusions.cryoMachine) activeTags.push('[CRYO]');
    if (playerFusions.timeStop) activeTags.push('[TIME]');
    if (playerFusions.doom) activeTags.push('[DOOM]');
    if (playerFusions.inferno) activeTags.push('[INFERNO]');
    if (playerFusions.electroDoom) activeTags.push('[E-DOOM]');

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9.5px monospace';
    ctx.fillText(activeTags.join(' '), 12, 42);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`WAVE ${GAME_STATE.wave}`, canvas.width / 2 + 24, 20);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px monospace';
    if (GAME_STATE.gameState === 'BOSS_FIGHT') {
        ctx.fillStyle = '#f87171';
        ctx.fillText('BOSS FIGHT!', canvas.width / 2 + 24, 42);
    } else {
        const secsLeft = Math.max(0, Math.ceil(GAME_STATE.waveTimerFrames / 60));
        const quotaLeft = Math.max(0, GAME_STATE.enemyQuotaThisWave - GAME_STATE.enemiesSpawnedThisWave + enemies.length);
        ctx.fillText(`${secsLeft}s | MSH:${quotaLeft}`, canvas.width / 2 + 24, 42);
    }

    // Bar HP Player
    for (let h = 0; h < GAME_CONFIG.player.maxHp; h++) {
        ctx.fillStyle = h < player.hp ? '#22c55e' : '#334155';
        ctx.fillRect(canvas.width - 18 - h * 14, 12, 10, 16);
    }

    // Tombol Pause [||] di pojok kanan atas HUD
    if (typeof getHudPauseButtonRect === 'function') {
        const pauseRect = getHudPauseButtonRect();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(pauseRect.x, pauseRect.y, pauseRect.w, pauseRect.h);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.strokeRect(pauseRect.x, pauseRect.y, pauseRect.w, pauseRect.h);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('||', pauseRect.x + pauseRect.w / 2, pauseRect.y + 13);
    }

    // Bar EXP
    const expRatio = Math.min(1, GAME_STATE.currentExp / GAME_STATE.expToNextLevel);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 58, canvas.width, 6);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(0, 58, canvas.width * expRatio, 6);

    // HP Bar Boss
    if (GAME_STATE.gameState === 'BOSS_FIGHT' && boss) {
        const barW = canvas.width - 60;
        const hpRatio = Math.max(0, boss.hp / boss.maxHp);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(30, 74, barW, 12);
        ctx.fillStyle = hpRatio < 0.5 ? '#ef4444' : '#a855f7';
        ctx.fillRect(30, 74, barW * hpRatio, 12);
        ctx.strokeStyle = '#f8fafc';
        ctx.strokeRect(30, 74, barW, 12);
    }

    // Warning Boss
    if (GAME_STATE.gameState === 'BOSS_WARNING' && Math.floor(GAME_STATE.warningTimer / 12) % 2 === 0) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.25)';
        ctx.fillRect(0, canvas.height / 2 - 45, canvas.width, 90);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WARNING!', canvas.width / 2, canvas.height / 2 - 6);
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`WAVE ${GAME_STATE.wave} BOSS APPROACHING`, canvas.width / 2, canvas.height / 2 + 22);
    }

    // 3. Overlay Pilihan Upgrade / Skill Tree
    if (GAME_STATE.gameState === 'SKILL_SELECT') {
        ctx.fillStyle = 'rgba(6, 9, 19, 0.90)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`LEVEL UP · LV.${GAME_STATE.playerLevel}`, canvas.width / 2, 140);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 21px monospace';
        ctx.fillText('PILIH UPGRADE', canvas.width / 2, 168);

        ctx.fillStyle = '#64748b';
        ctx.font = '11.5px monospace';
        ctx.fillText('Pilih kartu atau tekan tombol [1] / [2] / [3]', canvas.width / 2, 194);

        GAME_STATE.skillChoices.forEach((choice, idx) => {
            const cardY = 230 + idx * 125;
            ctx.save();
            ctx.fillStyle = choice.isFusion ? '#1e293b' : '#0f172a';
            ctx.fillRect(40, cardY, canvas.width - 80, 105);

            ctx.strokeStyle = choice.isFusion ? '#cbd5e1' : (choice.isEvo ? '#94a3b8' : '#475569');
            ctx.lineWidth = choice.isFusion ? 2.5 : 1.5;
            ctx.strokeRect(40, cardY, canvas.width - 80, 105);

            if (choice.isFusion) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = 'bold 9.5px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('FUSION', canvas.width - 52, cardY + 20);
            }

            ctx.textAlign = 'left';
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 14.5px monospace';
            ctx.fillText(`[${idx + 1}] ${choice.title}`, 56, cardY + 30);

            if (choice.isFusion) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10.5px monospace';
                ctx.fillText(`Syarat: ${choice.reqText}`, 56, cardY + 50);
            } else if (choice.isEvo) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10.5px monospace';
                ctx.fillText('Evolusi Cabang', 56, cardY + 50);
            }

            ctx.fillStyle = '#cbd5e1';
            ctx.font = '11px monospace';
            const descStartY = (choice.isEvo || choice.isFusion) ? cardY + 70 : cardY + 56;
            wrapCanvasText(choice.desc, 56, descStartY, canvas.width - 112, 15);
            ctx.restore();
        });
    }

    // 4. Overlay Pause Menu
    if (GAME_STATE.gameState === 'PAUSED') {
        if (typeof renderPauseOverlay === 'function') {
            renderPauseOverlay();
        }
    }

    // 5. Overlay Mission Report (Game Over)
    if (GAME_STATE.gameState === 'GAME_OVER') {
        const layout = getGameOverLayout();
        const { cx, cardX, cardY, cardW, cardH, shareBtn, retryBtn } = layout;

        ctx.fillStyle = 'rgba(6, 9, 19, 0.92)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(cardX, cardY, cardW, cardH);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 26px monospace';
        ctx.fillText('MISSION FAILED', cx, cardY + 38);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.fillText(`MODE: ${GAME_STATE.gameMode} · RINGKASAN PERTEMPURAN`, cx, cardY + 58);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`SCORE: ${GAME_STATE.score.toLocaleString('id-ID')}`, cx, cardY + 92);

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`BEST SCORE: ${GAME_STATE.highScore.toLocaleString('id-ID')}`, cx, cardY + 112);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cardX + 18, cardY + 126);
        ctx.lineTo(cardX + cardW - 18, cardY + 126);
        ctx.stroke();

        const col1X = cardX + 22;
        const col2X = cx + 10;
        let statY = cardY + 150;
        const rowGap = 24;

        ctx.textAlign = 'left';
        ctx.font = '12px monospace';

        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Wave Dicapai', col1X, statY);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`: Wave ${GAME_STATE.wave}`, col1X + 95, statY);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Level Akhir', col2X, statY);
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`: Lv.${GAME_STATE.playerLevel}`, col2X + 88, statY);

        statY += rowGap;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Waktu Main', col1X, statY);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`: ${formatPlayTime(GAME_STATE.playTimeFrames)}`, col1X + 95, statY);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Boss Kalah', col2X, statY);
        ctx.fillStyle = '#c084fc';
        ctx.fillText(`: ${GAME_STATE.bossesKilled}`, col2X + 88, statY);

        statY += rowGap;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Musuh Kalah', col1X, statY);
        ctx.fillStyle = '#fb7185';
        ctx.fillText(`: ${GAME_STATE.enemiesKilled}`, col1X + 95, statY);

        statY += 18;
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(cardX + 18, statY);
        ctx.lineTo(cardX + cardW - 18, statY);
        ctx.stroke();

        statY += 22;
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('POWER-UP & BUILD DIAMBIL:', col1X, statY);

        const buildItems = Object.values(GAME_STATE.buildHistory);
        if (buildItems.length === 0) buildItems.push('Laser Gun Lv.1');

        statY += 22;
        ctx.font = '11.5px monospace';
        buildItems.forEach((item, index) => {
            if (statY + index * 20 < cardY + cardH - 12) {
                const isFusionItem = item.includes('(FUSION)');
                ctx.fillStyle = isFusionItem ? '#38bdf8' : '#cbd5e1';
                ctx.fillText(`• ${item}`, col1X + 4, statY + index * 20);
            }
        });

        // Tombol Bagikan Skor
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(shareBtn.x, shareBtn.y, shareBtn.w, shareBtn.h);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(shareBtn.x, shareBtn.y, shareBtn.w, shareBtn.h);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BAGIKAN SKOR', shareBtn.x + shareBtn.w / 2, shareBtn.y + 29);

        // Tombol Main Lagi
        ctx.fillStyle = '#15803d';
        ctx.fillRect(retryBtn.x, retryBtn.y, retryBtn.w, retryBtn.h);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(retryBtn.x, retryBtn.y, retryBtn.w, retryBtn.h);

        ctx.fillStyle = '#ffffff';
        ctx.fillText('MAIN LAGI', retryBtn.x + retryBtn.w / 2, retryBtn.y + 29);

        if (GAME_STATE.shareFeedbackTimer > 0) {
            ctx.fillStyle = '#4ade80';
            ctx.font = 'bold 11.5px monospace';
            ctx.fillText('✓ Teks skor & link disalin! Siap ditempel ke sosmed.', cx, shareBtn.y + shareBtn.h + 24);
        }
    }
}

function render() {
    ctx.save();
    if (GAME_STATE.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * GAME_STATE.screenShake, (Math.random() - 0.5) * GAME_STATE.screenShake);
    }

    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const s of stars) {
        ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Jika masih di Main Menu, cukup gambar bintang latar + layar Main Menu
    if (GAME_STATE.gameState === 'START') {
        renderHUDAndOverlays();
        ctx.restore();
        return;
    }

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

    drawFlameThrowerCone();

    for (const p of projectiles) {
        if (p.kind === 'shockwave_fan') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
            ctx.strokeStyle = '#c084fc';
            ctx.shadowColor = '#d8b4fe';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 4;
            const rad = p.arcWidth * 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, rad, -Math.PI * 0.78, -Math.PI * 0.22);
            ctx.stroke();
            ctx.restore();
        } else if (p.kind === 'shockwave_vortex') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.spinAngle);
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 4; a += 0.25) {
                const r = (a / (Math.PI * 4)) * p.radius;
                const px = Math.cos(a) * r, py = Math.sin(a) * r;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();
        } else if (p.kind === 'he') {
            ctx.save();
            ctx.fillStyle = p.isDoom ? '#ef4444' : p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.isDoom ? 9 : 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.isDoom ? 4.5 : 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.kind === 'arctic' || p.kind === 'arctic_seeker') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = p.color;
            const r = p.kind === 'arctic_seeker' ? 7 : (p.isCryoMachine ? 6.5 : 5);
            ctx.beginPath();
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

    for (const bolt of lightningState.visualBolts) {
        drawLightningBolt(bolt.x1, bolt.y1, bolt.x2, bolt.y2, bolt.intensity || 0);
    }

    for (const e of enemies) {
        drawSpriteEntity(e, assets[e.type], e.x, e.y, e.width, e.height, true, e.type === 'heavy' ? '#e11d48' : '#c026d3');
        if (e.hp < e.maxHp) {
            const bw = 36;
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(e.x - bw / 2, e.y - e.height / 2 - 8, bw, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(e.x - bw / 2, e.y - e.height / 2 - 8, bw * Math.max(0, e.hp / e.maxHp), 4);
        }
    }

    if (boss) {
        const bossSprite = (boss.isSpecial ? assets.specialBoss : assets.boss) || assets.player;
        const hasTentacleImg = assets.specialBossTentacle && assets.specialBossTentacle.loaded;

        // ============================================================
        // 1. LAYER BELAKANG: Tentakel #1 (Mencuat dari balik bahu bos ke luar layar)
        // ============================================================
        if (boss.isSpecial && boss.tentacleAttack && boss.tentacleAttack.phase === 'STRIKE') {
            const isLeft = boss.tentacleAttack.side === 'left';
            const progress = 1 - (boss.tentacleAttack.timer / (boss.tentacleAttack.maxTimer || 42));
            const backCurve = Math.sin(Math.min(1, progress * 1.25) * Math.PI);

            if (backCurve > 0.02) {
                const originX = boss.x + (isLeft ? -boss.width * 0.25 : boss.width * 0.25);
                const originY = boss.y - boss.height * 0.12;

                ctx.save();
                ctx.translate(originX, originY);
                if (isLeft) ctx.scale(-1, 1);

                ctx.rotate(-0.15 + backCurve * 0.5);
                const w1 = 135 * (0.7 + backCurve * 0.5);
                const h1 = 175 * (0.7 + backCurve * 0.6);

                if (hasTentacleImg) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(assets.specialBossTentacle, -w1 * 0.35, -h1 * 0.85, w1, h1);
                } else {
                    ctx.fillStyle = '#110e2e';
                    ctx.fillRect(-14, -h1 * 0.8, 28, h1 * 0.8);
                }
                ctx.restore();
            }
        }

        // ============================================================
        // 2. LAYER TENGAH: Badan Utama Bos
        // ============================================================
        drawSpriteEntity(boss, bossSprite, boss.x, boss.y, boss.width, boss.height, !boss.isSpecial, '#7e22ce');

        // ============================================================
        // 3. LAYER DEPAN: Garis Peringatan, Kilatan Mata & Tentakel #2 (Dari Tepi Layar)
        // ============================================================
        if (boss.isSpecial) {
            // Garis & zona peringatan merah sebelum tentakel menyabet dari tepi layar
            if (boss.tentacleAttack && boss.tentacleAttack.phase === 'WARN') {
                const tx = boss.tentacleAttack.x;
                const ty = boss.tentacleAttack.y;
                const edgeX = boss.tentacleAttack.side === 'left' ? 0 : canvas.width;

                ctx.save();
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)';
                ctx.setLineDash([8, 6]);
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(edgeX, ty - 25);
                ctx.lineTo(tx, ty);
                ctx.stroke();

                // Lingkaran target bahaya di posisi pemain
                ctx.fillStyle = 'rgba(244, 63, 94, 0.18)';
                ctx.beginPath();
                ctx.arc(tx, ty, 38, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // Tentakel #2: Muncul dari tepi layar samping (pangkal tersembunyi di luar canvas) menyabet ke target!
            if (boss.tentacleAttack && boss.tentacleAttack.phase === 'STRIKE') {
                const progress = 1 - (boss.tentacleAttack.timer / (boss.tentacleAttack.maxTimer || 42));
                const strikePhase = Math.max(0, (progress - 0.10) / 0.90);
                const thrustCurve = Math.sin(strikePhase * Math.PI);

                if (thrustCurve > 0.02) {
                    const isLeft = boss.tentacleAttack.side === 'left';
                    const edgeX = isLeft ? -10 : canvas.width + 10;
                    const anchorY = boss.tentacleAttack.y - 40;

                    // Hitung sudut murni dari titik keluar di tepi layar menuju pusat lingkaran target
                    const dx = boss.tentacleAttack.x - edgeX;
                    const dy = boss.tentacleAttack.y - anchorY;
                    const distToTarget = Math.hypot(dx, dy);
                    const angleToTarget = Math.atan2(dy, dx);

                    ctx.save();
                    ctx.translate(edgeX, anchorY);

                    // Putar sumbu -Y (atas gambar) agar mengarah lurus ke lingkaran target
                    // Dikurangi 0.45 rad karena ujung gambar tentakel aslinya melengkung ke kanan atas
                    ctx.rotate(angleToTarget + Math.PI / 2 - (isLeft ? 0.45 : -0.45));
                    if (!isLeft) ctx.scale(-1, 1);

                    // Tambahkan efek ayunan cambukan saat menyabet
                    const whipSwing = (1 - thrustCurve) * -0.25;
                    ctx.rotate(whipSwing);

                    const drawW = 140;
                    // Perpanjang 1.45x dari jarak target supaya ujung runcingnya benar-benar melewati titik target
                    const drawH = Math.max(60, (distToTarget * 1.45 + 60) * thrustCurve);

                    if (hasTentacleImg) {
                        ctx.imageSmoothingEnabled = false;
                        // Pivot tepat di pangkal bawah tengah gambar (-drawW * 0.5, -drawH)
                        ctx.drawImage(assets.specialBossTentacle, -drawW * 0.5, -drawH, drawW, drawH);
                    } else {
                        ctx.fillStyle = '#110e2e';
                        ctx.strokeStyle = '#be123c';
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(-22, 0);
                        ctx.lineTo(0, -drawH);
                        ctx.lineTo(22, 0);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // Kilatan energi di mata sebelum menembakkan laser
            if (boss.eyeCharge) {
                const ex = boss.x + boss.eyeCharge.ox;
                const ey = boss.y + boss.eyeCharge.oy;
                ctx.save();
                ctx.fillStyle = boss.eyeCharge.isCenter ? 'rgba(250, 204, 21, 0.85)' : 'rgba(254, 240, 138, 0.8)';
                ctx.shadowColor = '#facc15';
                ctx.shadowBlur = 16;
                ctx.beginPath();
                ctx.arc(ex, ey, boss.eyeCharge.isCenter ? 18 : 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // 4. Tameng Kebal Intro
        if (boss.introTimer > 0) {
            ctx.save();
            ctx.translate(boss.x, boss.y);
            const shieldRadius = Math.max(boss.width, boss.height) * 0.52 + Math.sin(GAME_STATE.frameCount * 0.15) * 4;
            ctx.strokeStyle = '#facc15';
            ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`IMMUNE (${(boss.introTimer / 60).toFixed(1)}s)`, 0, -boss.height * 0.52);
            ctx.restore();
        }
    }

    if (GAME_STATE.gameState !== 'GAME_OVER') {
        if (player.invulnTimer === 0 || Math.floor(player.invulnTimer / 5) % 2 === 0) {
            ctx.fillStyle = GAME_STATE.frameCount % 4 < 2 ? '#38bdf8' : '#facc15';
            ctx.beginPath();
            ctx.moveTo(player.x - 7, player.y + 26);
            ctx.lineTo(player.x + 7, player.y + 26);
            ctx.lineTo(player.x, player.y + 38 + Math.random() * 8);
            ctx.fill();

            drawSpriteEntity(null, assets.player, player.x, player.y, player.width, player.height, false, '#1d4ed8');
        }

        if (player.hasShield) {
            ctx.save();
            ctx.strokeStyle = '#67e8f9';
            ctx.fillStyle = 'rgba(103, 232, 249, 0.14)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 38 + Math.sin(GAME_STATE.frameCount * 0.12) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    for (const b of enemyBullets) {
        if (b.isBossLaser) {
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);

            const grad = ctx.createLinearGradient(0, -24, 0, 24);
            grad.addColorStop(0, 'rgba(250, 204, 21, 0)');
            grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.85)');
            grad.addColorStop(1, 'rgba(254, 240, 138, 1)');

            ctx.fillStyle = grad;
            ctx.fillRect(-4.5, -24, 9, 48);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, 22);
            ctx.lineTo(2.2, -16);
            ctx.lineTo(-2.2, -16);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        } else {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (const pt of particles) {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life / 40);
        ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    for (const ft of floatingTexts) {
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
    }

    if (isMobileDevice && (GAME_STATE.gameState === 'WAVE_MINIONS' || GAME_STATE.gameState === 'BOSS_WARNING' || GAME_STATE.gameState === 'BOSS_FIGHT')) {
        ctx.save();
        const baseX = joystick.active ? joystick.baseX : canvas.width - 95;
        const baseY = joystick.active ? joystick.baseY : canvas.height - 105;
        const knobX = joystick.active ? joystick.knobX : baseX;
        const knobY = joystick.active ? joystick.knobY : baseY;

        ctx.beginPath();
        ctx.arc(baseX, baseY, joystick.maxRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
        ctx.fillStyle = joystick.active ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.25)';
        ctx.fill();
        ctx.restore();
    }

    renderHUDAndOverlays();
    ctx.restore();
}