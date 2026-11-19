// js/entities.js - Manajemen Wave, Spawn Musuh/Boss & Deteksi Tabrakan

function setupWave(waveNum) {
    GAME_STATE.wave = waveNum;
    GAME_STATE.waveTimerFrames = GAME_CONFIG.wave.durationSeconds * 60;
    GAME_STATE.enemiesSpawnedThisWave = 0;
    GAME_STATE.enemyQuotaThisWave = GAME_CONFIG.wave.baseEnemyQuota + (waveNum - 1) * GAME_CONFIG.wave.quotaIncrement;

    const activeSpawnFrames = Math.max(600, (GAME_CONFIG.wave.durationSeconds - 8) * 60);
    GAME_STATE.spawnIntervalFrames = Math.max(22, Math.floor(activeSpawnFrames / GAME_STATE.enemyQuotaThisWave));
    GAME_STATE.gameState = 'WAVE_MINIONS';
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

function spawnEnemy() {
    if (GAME_STATE.enemiesSpawnedThisWave >= GAME_STATE.enemyQuotaThisWave) return;

    GAME_STATE.enemiesSpawnedThisWave++;
    const heavyChance = Math.min(0.65, 0.25 + GAME_STATE.wave * 0.08);
    const typeKey = Math.random() < heavyChance ? 'heavy' : 'scout';
    const cfg = GAME_CONFIG.enemies[typeKey];
    const maxHp = cfg.baseHp + (GAME_STATE.wave - 1) * cfg.hpIncrementPerWave;

    enemies.push({
        type: typeKey,
        cfg,
        x: 45 + Math.random() * (canvas.width - 90),
        y: -50,
        width: cfg.width,
        height: cfg.height,
        vy: cfg.baseSpeedY + (GAME_STATE.wave - 1) * cfg.speedIncrement,
        vx: cfg.speedX ? (Math.random() < 0.5 ? -cfg.speedX : cfg.speedX) : 0,
        hp: maxHp,
        maxHp,
        shootTimer: 60 + Math.floor(Math.random() * 60),
        hitFlash: 0,
        status: null
    });
}

function spawnSpecificEnemy(type, spawnX, spawnY) {
    const cfg = GAME_CONFIG.enemies[type];
    if (!cfg) return;
    const maxHp = cfg.baseHp + (GAME_STATE.wave - 1) * cfg.hpIncrementPerWave;

    enemies.push({
        type,
        cfg,
        x: spawnX,
        y: spawnY,
        width: cfg.width,
        height: cfg.height,
        vy: cfg.baseSpeedY + (GAME_STATE.wave - 1) * cfg.speedIncrement,
        vx: cfg.speedX ? (Math.random() < 0.5 ? -cfg.speedX : cfg.speedX) : 0,
        hp: maxHp,
        maxHp,
        shootTimer: 60 + Math.floor(Math.random() * 60),
        hitFlash: 0,
        status: null
    });
}

function spawnBoss() {
    const cfg = GAME_CONFIG.boss;
    const spCfg = GAME_CONFIG.specialBoss;
    const waveScale = Math.max(0, GAME_STATE.wave - 1);

    // Cek apakah wave kelipatan 10 (100%) atau kena peluang 10%
    const isSpecial = spCfg && (
        (GAME_STATE.wave % spCfg.guaranteedEveryWave === 0) ||
        (Math.random() < spCfg.spawnChance)
    );

    const baseBossHp = cfg.baseHp + waveScale * cfg.hpIncrementPerWave;
    const baseBossExp = cfg.expReward + waveScale * 25;
    const baseBossScore = cfg.baseScore + waveScale * 500;

    if (isSpecial) {
        boss = {
            isSpecial: true,
            name: spCfg.name,
            x: canvas.width / 2,
            y: -140,
            targetY: 175,
            width: spCfg.width,
            height: spCfg.height,
            hp: Math.round(baseBossHp * spCfg.hpMultiplier),
            maxHp: Math.round(baseBossHp * spCfg.hpMultiplier),
            expReward: Math.round(baseBossExp * spCfg.expMultiplier),
            scoreReward: Math.round(baseBossScore * spCfg.scoreMultiplier),
            introTimer: 110,
            hitFlash: 0,
            status: null,

            // Timer 4 pola serangan khusus
            mouthTimer: 70,
            eyeTimer: 90,
            eyeCharge: null,
            tentacleTimer: 130,
            tentacleAttack: null,
            spawnHeavyTimer: 200
        };
    } else {
        const sizeBonus = Math.min(cfg.maxSizeBonus, waveScale * cfg.sizeIncrementPerWave);
        boss = {
            isSpecial: false,
            x: canvas.width / 2,
            y: -90,
            targetY: 135,
            width: cfg.baseWidth + sizeBonus,
            height: cfg.baseHeight + sizeBonus,
            hp: baseBossHp,
            maxHp: baseBossHp,
            expReward: baseBossExp,
            scoreReward: baseBossScore,
            speedX: cfg.baseSpeedX + waveScale * cfg.speedIncrementPerWave,
            dirX: Math.random() < 0.5 ? -1 : 1,
            attackTimer: cfg.attackCooldown,
            introTimer: 90,
            hitFlash: 0,
            status: null
        };
    }
}

function damagePlayer() {
    if (player.godMode || player.invulnTimer > 0) return;

    if (player.hasShield) {
        player.hasShield = false;
        player.invulnTimer = 60;
        GAME_STATE.screenShake = 6;
        spawnFloatingText(player.x, player.y - 30, 'BLOCKED!', '#67e8f9', 14);
        createExplosion(player.x, player.y, ['#67e8f9', '#ffffff'], 22);
        return;
    }

    player.hp--;
    player.invulnTimer = 60;
    GAME_STATE.screenShake = 12;
    createExplosion(player.x, player.y, ['#38bdf8', '#facc15', '#ffffff'], 20);
    if (player.hp <= 0) {
        GAME_STATE.gameState = 'GAME_OVER';
        if (GAME_STATE.score > GAME_STATE.highScore) {
            GAME_STATE.highScore = GAME_STATE.score;
            localStorage.setItem('space_shooter_hi', GAME_STATE.highScore);
        }
        saveRunToHallOfFame();
    }
}

function triggerHeExplosion(proj, directTarget) {
    const lvl = proj.lvlData;
    const isTimeStop = playerFusions.timeStop || proj.isTimeStopShot;
    const blastRadius = isTimeStop ? proj.radius * 1.55 : proj.radius;

    if (proj.isElectroDoom) {
        createExplosion(proj.x, proj.y, ['#fde047', '#f97316', '#ffffff'], 26);
        GAME_STATE.screenShake = Math.max(GAME_STATE.screenShake, 6);
    } else if (proj.isDoom) {
        createExplosion(proj.x, proj.y, ['#ef4444', '#f97316', '#facc15', '#ffffff'], 28);
        GAME_STATE.screenShake = Math.max(GAME_STATE.screenShake, 7);
    } else if (isTimeStop) {
        createExplosion(proj.x, proj.y, ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff'], 30);
        GAME_STATE.screenShake = Math.max(GAME_STATE.screenShake, 7);
    } else {
        createExplosion(proj.x, proj.y, ['#f97316', '#facc15', '#ef4444'], 22);
        GAME_STATE.screenShake = Math.max(GAME_STATE.screenShake, 5);
    }

    for (const target of getAllActiveTargets()) {
        const dist = Math.hypot(target.x - proj.x, target.y - proj.y);
        const hitRange = blastRadius + (target.width * 0.35);

        if (target === directTarget || dist <= hitRange) {
            const isCrit = proj.forceCrit ? true : (Math.random() < lvl.critRate);
            const finalDmg = isCrit ? proj.atk * lvl.critDmg : proj.atk;
            applyDamageToTarget(target, finalDmg, isCrit ? '#facc15' : '#fdba74', isCrit);

            if (!target.status) updateStatusEffects(target);

            if (isTimeStop && target.status.timeStopCdTimer <= 0) {
                const isBoss = (target === boss);
                const durationSec = isBoss ? 1.5 : 3.0;
                target.status.timeStopTimer = Math.round(durationSec * 60);
                target.status.timeStopCdTimer = Math.round(4.0 * 60);
                spawnFloatingText(target.x, target.y - 32, isBoss ? 'TIME STOP (1.5s)!' : 'TIME STOP (3s)!', '#60a5fa', 14);
            }

            if (lvl.burnPct) {
                applyBurnToTarget(target, (proj.atk * lvl.burnPct) * 0.5, lvl.burnDuration);
            }
            if (lvl.freezeSlow) {
                applyFreezeToTarget(target, lvl.freezeSlow, lvl.freezeDuration, lvl.freezeCd);
            }
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

function updateProjectiles() {
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
            if (p.x < 30 || p.x > canvas.width - 30) p.vx *= -1;

            for (const t of getAllActiveTargets()) {
                if (t !== boss) {
                    const dx = p.x - t.x, dy = p.y - t.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist > 6 && dist < p.pullRadius) {
                        const pullFactor = (1 - dist / p.pullRadius) * p.pullPower;
                        t.x += (dx / dist) * pullFactor;
                        t.y += (dy / dist) * pullFactor;
                    }
                }
            }

            if (p.damageTimer % 14 === 0) {
                for (const t of getAllActiveTargets()) {
                    if (Math.hypot(t.x - p.x, t.y - p.y) < p.radius + t.width * 0.35) {
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
            for (const t of getAllActiveTargets()) {
                const dist = Math.hypot(t.x - p.x, t.y - p.y);
                const hitRange = (p.arcWidth * 0.55) + (t.width * 0.35);
                if (dist < hitRange && !p.hitTargets.includes(t)) {
                    p.hitTargets.push(t);
                    applyDamageToTarget(t, p.atk, '#c084fc', false);
                    createExplosion(t.x, t.y, ['#c084fc', '#e879f9', '#ffffff'], 6);
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
}

function updateEnemiesAndBoss() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        updateStatusEffects(e);

        if (e.status && e.status.timeStopTimer > 0) {
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
                        vy: (e.cfg.bulletSpeed + (GAME_STATE.wave - 1) * 0.2) * speedMult,
                        r: 5, color: '#fb7185'
                    });
                    e.shootTimer = Math.max(55, e.cfg.shootCooldown - GAME_STATE.wave * 5);
                }
            }
        }

        const hitW = e.width * 0.38, hitH = e.height * 0.38;
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const p = projectiles[j];
            if (p.kind === 'shockwave_fan' || p.kind === 'shockwave_vortex') continue;
            if (Math.abs(p.x - e.x) < hitW && Math.abs(p.y - e.y) < hitH) {
                projectiles.splice(j, 1);
                handleProjectileImpact(p, e);
                break;
            }
        }

        if (e.hp <= 0) {
            GAME_STATE.score += e.cfg.score;
            GAME_STATE.enemiesKilled++;
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

    if (GAME_STATE.gameState === 'BOSS_FIGHT' && boss) {
        updateStatusEffects(boss);
        if (boss.hitFlash > 0) boss.hitFlash--;

        // Fase masuk arena (turun sampai targetY)
        if (boss.y < boss.targetY) {
            boss.y += 1.6;
        }
        if (boss.introTimer > 0) {
            boss.introTimer--;
            return;
        }

        const st = boss.status || {};
        const timeMult = st.timeStopTimer > 0 ? 0.5 : (st.freezeTimer > 0 ? 0.75 : 1.0);

        if (boss.isSpecial) {
            // ==========================================
            // AI SPECIAL BOSS (DIAM DI TEMPAT + 4 SKILL)
            // ==========================================
            const spCfg = GAME_CONFIG.specialBoss;
            const halfW = boss.width / 2;
            const halfH = boss.height / 2;

            // 1. SERANGAN TENTAKEL (Animasi Sprite Memanjang & Menukik)
            if (boss.tentacleAttack) {
                boss.tentacleAttack.timer -= timeMult;
                if (boss.tentacleAttack.phase === 'WARN' && boss.tentacleAttack.timer <= 0) {
                    boss.tentacleAttack.phase = 'STRIKE';
                    boss.tentacleAttack.maxTimer = 42; // 0.7 detik total animasi
                    boss.tentacleAttack.timer = 42;
                    GAME_STATE.screenShake = 9;
                } else if (boss.tentacleAttack.phase === 'STRIKE') {
                    const progress = 1 - (boss.tentacleAttack.timer / boss.tentacleAttack.maxTimer);
                    // Tentakel ujung aktif menyabet area target di tengah/bawah layar (progress 35% - 80%)
                    if (progress >= 0.35 && progress <= 0.80) {
                        const hitRadiusX = 52;
                        const hitRadiusY = 38;
                        if (
                            Math.abs(player.x - boss.tentacleAttack.x) < hitRadiusX &&
                            Math.abs(player.y - boss.tentacleAttack.y) < hitRadiusY
                        ) {
                            damagePlayer();
                        }
                    }
                    if (boss.tentacleAttack.timer <= 0) {
                        boss.tentacleAttack = null;
                    }
                }
            } else {
                boss.tentacleTimer -= timeMult;
                if (boss.tentacleTimer <= 0) {
                    const targetX = Math.min(canvas.width - 55, Math.max(55, player.x));
                    const targetY = Math.min(canvas.height - 70, Math.max(boss.y + halfH + 80, player.y));
                    boss.tentacleAttack = {
                        x: targetX,
                        y: targetY,
                        side: targetX < canvas.width / 2 ? 'left' : 'right',
                        phase: 'WARN',
                        timer: 48
                    };
                    boss.tentacleTimer = spCfg.tentacleSlamCd;
                }
            }

            // 2. TEMBAKAN DARI BANYAK MULUT (Koordinat presisi di 3 mulut utama)
            boss.mouthTimer -= timeMult;
            if (boss.mouthTimer <= 0) {
                const mouthOffsets = [
                    { ox: -halfW * 0.46, oy: -halfH * 0.36 }, // Mulut lidah kiri atas
                    { ox: 0, oy: halfH * 0.22 },  // Mulut bergigi tengah
                    { ox: halfW * 0.22, oy: -halfH * 0.16 }  // Mulut lidah samping kanan
                ];
                mouthOffsets.forEach((m, idx) => {
                    const mx = boss.x + m.ox;
                    const my = boss.y + m.oy;
                    const baseAngle = Math.atan2(player.y - my, player.x - mx);
                    const spread = idx === 1 ? [-0.22, 0, 0.22] : [-0.1, 0.1];
                    spread.forEach(ang => {
                        const spd = 4.2 + GAME_STATE.wave * 0.08;
                        enemyBullets.push({
                            x: mx, y: my,
                            vx: Math.cos(baseAngle + ang) * spd,
                            vy: Math.sin(baseAngle + ang) * spd,
                            r: 6,
                            color: '#f43f5e'
                        });
                    });
                });
                boss.mouthTimer = spCfg.mouthBarrageCd;
            }

            // 3. LASER MATA ACAK & MATA TENGAH (Koordinat presisi di tengah bola mata kuning)
            if (boss.eyeCharge) {
                boss.eyeCharge.timer -= timeMult;
                if (boss.eyeCharge.timer <= 0) {
                    const ex = boss.x + boss.eyeCharge.ox;
                    const ey = boss.y + boss.eyeCharge.oy;
                    const laserSpd = 9.0;

                    if (boss.eyeCharge.isCenter) {
                        const angles = [-0.40, -0.20, 0, 0.20, 0.40];
                        angles.forEach(a => {
                            const finalAng = Math.PI / 2 + a;
                            enemyBullets.push({
                                isBossLaser: true,
                                x: ex, y: ey,
                                vx: Math.cos(finalAng) * laserSpd,
                                vy: Math.sin(finalAng) * laserSpd,
                                r: 5,
                                color: '#facc15'
                            });
                        });
                    } else {
                        const aimAng = Math.atan2(player.y - ey, player.x - ex);
                        enemyBullets.push({
                            isBossLaser: true,
                            x: ex, y: ey,
                            vx: Math.cos(aimAng) * (laserSpd + 1.2),
                            vy: Math.sin(aimAng) * (laserSpd + 1.2),
                            r: 5,
                            color: '#fde047'
                        });
                    }
                    boss.eyeCharge = null;
                }
            } else {
                boss.eyeTimer -= timeMult;
                if (boss.eyeTimer <= 0) {
                    const eyes = [
                        { ox: 0, oy: -halfH * 0.12, isCenter: true },  // Mata besar tengah
                        { ox: -halfW * 0.68, oy: -halfH * 0.02, isCenter: false }, // Mata besar kiri
                        { ox: -halfW * 0.38, oy: halfH * 0.08, isCenter: false }, // Mata kecil tengah-kiri
                        { ox: -halfW * 0.19, oy: -halfH * 0.34, isCenter: false }, // Mata atas tengah
                        { ox: halfW * 0.64, oy: -halfH * 0.30, isCenter: false }  // Mata besar kanan
                    ];
                    const chosen = eyes[Math.floor(Math.random() * eyes.length)];
                    boss.eyeCharge = { ...chosen, timer: 28 };
                    boss.eyeTimer = spCfg.eyeLaserCd;
                }
            }

            // 4. MEMUNCULKAN HEAVY ENEMY DARI MULUT BUNDAR KIRI BAWAH & KANAN BAWAH
            boss.spawnHeavyTimer -= timeMult;
            if (boss.spawnHeavyTimer <= 0) {
                const activeHeavies = enemies.filter(e => e.type === 'heavy').length;
                if (activeHeavies < spCfg.maxActiveHeavies) {
                    const spawnPoints = [
                        { x: boss.x - halfW * 0.44, y: boss.y + halfH * 0.36 }, // Mulut merah kiri bawah
                        { x: boss.x + halfW * 0.64, y: boss.y + halfH * 0.28 }  // Mulut merah kanan bawah
                    ];
                    spawnPoints.forEach(sp => {
                        spawnSpecificEnemy('heavy', sp.x, sp.y);
                        createExplosion(sp.x, sp.y, ['#f43f5e', '#fb7185'], 10);
                    });
                }
                boss.spawnHeavyTimer = spCfg.spawnHeavyCd;
            }
        } else {
            // ==========================================
            // AI BOSS BIASA (GERAK KIRI-KANAN + TEMBAK)
            // ==========================================
            const bCfg = GAME_CONFIG.boss;
            const waveScale = Math.max(0, GAME_STATE.wave - 1);
            boss.x += boss.speedX * boss.dirX * timeMult;
            const margin = boss.width * 0.45;
            if (boss.x <= margin) { boss.x = margin; boss.dirX = 1; }
            if (boss.x >= canvas.width - margin) { boss.x = canvas.width - margin; boss.dirX = -1; }

            boss.attackTimer -= timeMult;
            if (boss.attackTimer <= 0) {
                const isEnraged = boss.hp < boss.maxHp * 0.5;
                const spd = bCfg.bulletSpeed + waveScale * bCfg.bulletSpeedIncrement;
                const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
                const spread = isEnraged ? [-0.32, -0.16, 0, 0.16, 0.32] : [-0.2, 0, 0.2];
                spread.forEach(a => {
                    enemyBullets.push({
                        x: boss.x, y: boss.y + boss.height * 0.3,
                        vx: Math.cos(baseAngle + a) * spd,
                        vy: Math.sin(baseAngle + a) * spd,
                        r: 6,
                        color: '#a855f7'
                    });
                });
                boss.attackTimer = isEnraged ? bCfg.enrageCooldown : bCfg.attackCooldown;
            }
        }

        // ==========================================
        // TABRAKAN PELURU & KEMATIAN (BERLAKU UNTUK SEMUA BOSS)
        // ==========================================
        const bHitW = boss.width * 0.42;
        const bHitH = boss.height * 0.36;

        if (Math.abs(boss.x - player.x) < (bHitW + player.width * 0.35) && Math.abs(boss.y - player.y) < (bHitH + player.height * 0.35)) {
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
            const wasSpecial = boss.isSpecial;
            GAME_STATE.score += boss.scoreReward || (GAME_CONFIG.boss.baseScore * GAME_STATE.wave);
            GAME_STATE.bossesKilled++;
            GAME_STATE.screenShake = wasSpecial ? 30 : 22;
            createExplosion(boss.x, boss.y, ['#7e22ce', '#f59e0b', '#38bdf8', '#ffffff'], wasSpecial ? 80 : 55);
            drops.push({ x: boss.x, y: boss.y, vy: 2, kind: 'HEAL' });
            const bossExp = boss.expReward || GAME_CONFIG.boss.expReward;
            boss = null;
            setupWave(GAME_STATE.wave + 1);
            addExp(bossExp);
        }
    }

}