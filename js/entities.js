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

function spawnBoss() {
    const bCfg = GAME_CONFIG.boss;
    const totalHp = bCfg.baseHp + (GAME_STATE.wave - 1) * bCfg.hpIncrementPerWave;
    const sizeBonus = Math.min(bCfg.maxSizeBonus, (GAME_STATE.wave - 1) * bCfg.sizeIncrementPerWave);

    boss = {
        x: canvas.width / 2,
        y: -130,
        targetY: 155,
        width: bCfg.baseWidth + sizeBonus,
        height: bCfg.baseHeight + sizeBonus,
        vx: bCfg.baseSpeedX + (GAME_STATE.wave - 1) * bCfg.speedIncrementPerWave,
        hp: totalHp,
        maxHp: totalHp,
        attackTimer: 180,
        patternIndex: 0,
        hitFlash: 0,
        status: null,
        introTimer: 180
    };
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
        const bCfg = GAME_CONFIG.boss;
        if (boss.introTimer > 0) boss.introTimer--;

        if (boss.status && boss.status.timeStopTimer > 0) {
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
                    const bSpeed = (bCfg.bulletSpeed + (GAME_STATE.wave - 1) * bCfg.bulletSpeedIncrement) * bSpeedMult;
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
                            const bx = boss.x + offsetX, by = boss.y + 15;
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
                    boss.attackTimer = Math.max(35, cd - (GAME_STATE.wave - 1) * 4);
                }
            }
        }

        if (boss.hitFlash > 0) boss.hitFlash--;
        const bHitW = boss.width * 0.4, bHitH = boss.height * 0.35;

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
            GAME_STATE.score += bCfg.baseScore * GAME_STATE.wave;
            GAME_STATE.screenShake = 22;
            createExplosion(boss.x, boss.y, ['#7e22ce', '#f59e0b', '#38bdf8', '#ffffff'], 55);
            drops.push({ x: boss.x, y: boss.y, vy: 2, kind: 'HEAL' });
            const bossExp = bCfg.expReward;
            boss = null;
            setupWave(GAME_STATE.wave + 1);
            addExp(bossExp);
        }
    }
}