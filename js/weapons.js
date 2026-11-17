// js/weapons.js - Logika 6 Senjata Normal, 5 Fusion, Skill Tree & EXP

function getUsedFusionWeapons() {
    const used = new Set();
    if (!GAME_CONFIG.fusions) return used;
    for (const fKey in playerFusions) {
        if (playerFusions[fKey] && GAME_CONFIG.fusions[fKey]) {
            for (const wKey in GAME_CONFIG.fusions[fKey].req) {
                used.add(wKey);
            }
        }
    }
    return used;
}

function consumeFusionMaterials(fusionKey) {
    const fData = GAME_CONFIG.fusions ? GAME_CONFIG.fusions[fusionKey] : null;
    if (!fData || !fData.req) return;
    for (const wKey in fData.req) {
        playerSkills[wKey] = null;
    }
    if (fusionKey === 'inferno') {
        weaponTimers.flameActive = 0;
        weaponTimers.flameCooldown = 0;
        weaponTimers.flameTick = 0;
    }
}

function getAvailableSkillUpgrades() {
    const pool = [];
    const weaponKeys = ['laser', 'he', 'lightning', 'arctic', 'shockwave', 'flamethrower'];
    const usedFusionWeapons = getUsedFusionWeapons();

    const fusionCards = [];
    if (GAME_CONFIG.fusions && GAME_STATE.playerLevel >= 15) {
        for (const fKey in GAME_CONFIG.fusions) {
            const fData = GAME_CONFIG.fusions[fKey];
            if (!playerFusions[fKey]) {
                let eligible = true;
                for (const rW in fData.req) {
                    if (usedFusionWeapons.has(rW) || playerSkills[rW] !== fData.req[rW]) {
                        eligible = false;
                        break;
                    }
                }
                if (eligible) {
                    fusionCards.push({
                        isFusion: true,
                        fusionKey: fKey,
                        title: `FUSION: ${fData.name}`,
                        desc: fData.desc,
                        reqText: fData.reqText
                    });
                }
            }
        }
    }

    for (const wKey of weaponKeys) {
        if (usedFusionWeapons.has(wKey)) continue;
        const wCfg = GAME_CONFIG.weapons[wKey];
        if (!wCfg) continue;
        const curLvl = playerSkills[wKey];

        if (!curLvl) {
            pool.push({ weapon: wKey, nextLvl: '1', title: `Unlock: ${wCfg.name}`, desc: wCfg.levels['1'].desc });
        } else if (curLvl === '1' || curLvl === '2') {
            const next = String(Number(curLvl) + 1);
            pool.push({ weapon: wKey, nextLvl: next, title: `${wCfg.name} Lv.${next}`, desc: wCfg.levels[next].desc });
        } else if (curLvl === '3') {
            pool.push({ weapon: wKey, nextLvl: '4a', title: wCfg.levels['4a'].name, desc: wCfg.levels['4a'].desc, isEvo: true });
            pool.push({ weapon: wKey, nextLvl: '4b', title: wCfg.levels['4b'].name, desc: wCfg.levels['4b'].desc, isEvo: true });
        } else if (curLvl === '4a' || curLvl === '5a') {
            const next = curLvl === '4a' ? '5a' : '6a';
            pool.push({ weapon: wKey, nextLvl: next, title: wCfg.levels[next].name, desc: wCfg.levels[next].desc });
        } else if (curLvl === '4b' || curLvl === '5b') {
            const next = curLvl === '4b' ? '5b' : '6b';
            pool.push({ weapon: wKey, nextLvl: next, title: wCfg.levels[next].name, desc: wCfg.levels[next].desc });
        }
    }

    const shuffledNormal = pool.sort(() => Math.random() - 0.5);
    const combined = [...fusionCards, ...shuffledNormal];

    if (combined.length === 0) {
        combined.push({ weapon: 'heal', nextLvl: null, title: 'Emergency Repair', desc: 'Pulihkan +2 HP Pesawat' });
        combined.push({ weapon: 'bonus', nextLvl: null, title: 'Overcharge Core', desc: '+1000 Bonus Score' });
    }

    return combined.slice(0, 3);
}

function addExp(amount) {
    GAME_STATE.currentExp += amount;
    while (GAME_STATE.currentExp >= GAME_STATE.expToNextLevel) {
        GAME_STATE.currentExp -= GAME_STATE.expToNextLevel;
        GAME_STATE.playerLevel++;
        GAME_STATE.expToNextLevel = GAME_CONFIG.leveling.baseExpRequired + (GAME_STATE.playerLevel - 1) * GAME_CONFIG.leveling.expIncrementPerLvl;
        GAME_STATE.pendingLevelUps++;
        player.invulnTimer = 60;
    }

    if (GAME_STATE.pendingLevelUps > 0 && GAME_STATE.gameState !== 'SKILL_SELECT' && GAME_STATE.gameState !== 'GAME_OVER') {
        triggerSkillSelection();
    }
}

function triggerSkillSelection() {
    GAME_STATE.pendingLevelUps--;
    GAME_STATE.skillChoices = getAvailableSkillUpgrades();
    GAME_STATE.previousState = GAME_STATE.gameState;
    GAME_STATE.gameState = 'SKILL_SELECT';
}

function applySkillChoice(choice) {
    if (choice.isFusion) {
        playerFusions[choice.fusionKey] = true;
        consumeFusionMaterials(choice.fusionKey);
        const cleanTitle = choice.title.replace('FUSION: ', '');
        spawnFloatingText(player.x, player.y - 45, `FUSION: ${cleanTitle}!`, '#f8fafc', 16);
        createExplosion(player.x, player.y, ['#e2e8f0', '#ffffff', '#94a3b8'], 32);
        GAME_STATE.screenShake = 14;
    } else if (choice.weapon === 'heal') {
        player.hp = Math.min(GAME_CONFIG.player.maxHp, player.hp + 2);
    } else if (choice.weapon === 'bonus') {
        GAME_STATE.score += 1000;
    } else {
        playerSkills[choice.weapon] = choice.nextLvl;
        if (choice.weapon === 'arctic' && choice.nextLvl === '4b') {
            player.hasShield = true;
            weaponTimers.arcticShield = Math.round(GAME_CONFIG.weapons.arctic.levels['4b'].shieldIntervalSec * 60);
        }
        if (choice.weapon === 'flamethrower' && choice.nextLvl === '1') {
            weaponTimers.flameCooldown = 0;
            weaponTimers.flameActive = 0;
        }
    }

    if (GAME_STATE.pendingLevelUps > 0) {
        triggerSkillSelection();
    } else {
        player.invulnTimer = Math.max(player.invulnTimer, 60);
        GAME_STATE.gameState = GAME_STATE.previousState;
    }
}

// ==========================================
// LOGIKA LIGHTNING OVERLOAD + INFERNO + ELECTRO DOOM
// ==========================================
function executeLightningOverload(lvlData, wCfg, options = {}) {
    if (!lvlData || !wCfg) return;

    const primary = findNearestTarget(player.x, player.y, [], wCfg.maxRange || 380);
    if (!primary) {
        lightningState.lockedTarget = null;
        lightningState.lockFrames = 0;
        lightningState.lastStackCount = 0;
        lightningState.currentIntensity = 0;
        return;
    }

    const baseCd = wCfg.baseCooldown || 12;
    let finalAtk = lvlData.atk || 5;
    let currentStacks = 0;

    // 1. Pasif Peningkatan DMG Lightning Shock (tetap aktif pada Lightning 6A, Inferno, & Electro Doom)
    if (lvlData.rampIntervalSec) {
        if (lightningState.lockedTarget === primary) {
            lightningState.lockFrames += baseCd;
            currentStacks = Math.floor(lightningState.lockFrames / (lvlData.rampIntervalSec * 60));

            const lockSeconds = Math.max(1, lightningState.lockFrames / 60);
            const maxTotalBonus = (lvlData.maxBonusPerSec || 10) * lockSeconds;
            const bonusDmg = Math.min(maxTotalBonus, currentStacks * (lvlData.rampBonus || 2));
            finalAtk += bonusDmg;

            if (currentStacks > lightningState.lastStackCount) {
                lightningState.lastStackCount = currentStacks;

                if (options.isElectroDoom && GAME_CONFIG.weapons.he) {
                    const heCfg = GAME_CONFIG.weapons.he;
                    const heLvl = heCfg.levels['6a'];
                    triggerHeExplosion({
                        x: primary.x,
                        y: primary.y,
                        atk: heCfg.baseAtk,
                        radius: heCfg.explosionRadius * 1.15,
                        lvlData: heLvl,
                        forceCrit: true,
                        isElectroDoom: true
                    }, primary);
                    spawnFloatingText(primary.x, primary.y - 36, 'ELECTRO DOOM!', '#fde047', 14);
                }
            }
        } else {
            lightningState.lockedTarget = primary;
            lightningState.lockFrames = 0;
            lightningState.lastStackCount = 0;
            currentStacks = 0;
        }
    }

    lightningState.currentIntensity = currentStacks;

    // 2. Pasif Burn Inferno (selalu aktif bersamaan dengan peningkatan DMG petir)
    if (options.isInferno) {
        if (!primary.status) updateStatusEffects(primary);
        const ftCfg = GAME_CONFIG.weapons.flamethrower;
        const ftLvl = ftCfg && ftCfg.levels ? ftCfg.levels['6b'] : null;

        const baseBurn = ftLvl ? ftLvl.burnDmg : 4;
        const burnDur = ftLvl ? ftLvl.burnDurationSec : 2.5;
        const lockSec = Math.max(1, lightningState.lockFrames / 60);

        const maxBurnBonus = 5 * lockSec; // Maks +10/dtk (+5 per 0.5 detik)
        const infernoBurnBonus = Math.min(maxBurnBonus, currentStacks * 3);

        applyBurnToTarget(primary, baseBurn + infernoBurnBonus, burnDur);

        const flameColors = currentStacks > 0
            ? ['#ffffff', '#fef08a', '#f97316']
            : ['#f97316', '#facc15'];
        createExplosion(primary.x, primary.y, flameColors, 4 + Math.min(8, currentStacks * 2));
    }

    applyDamageToTarget(primary, finalAtk, options.isInferno ? '#fb923c' : '#fde047', false);
    createExplosion(primary.x, primary.y, ['#eab308', '#fef08a'], 4);
    lightningState.visualBolts.push({
        x1: player.x, y1: player.y - 24,
        x2: primary.x, y2: primary.y,
        life: 6,
        intensity: options.isInferno ? currentStacks : 0
    });

    if (lvlData.chains > 0) {
        const hitTargets = [primary];
        let lastNode = primary;
        for (let c = 0; c < lvlData.chains; c++) {
            const nextNode = findNearestTarget(lastNode.x, lastNode.y, hitTargets, wCfg.chainRadius || 155);
            if (!nextNode) break;
            hitTargets.push(nextNode);
            applyDamageToTarget(nextNode, finalAtk, '#facc15', false);
            createExplosion(nextNode.x, nextNode.y, ['#eab308', '#ffffff'], 3);
            lightningState.visualBolts.push({
                x1: lastNode.x, y1: lastNode.y,
                x2: nextNode.x, y2: nextNode.y,
                life: 6,
                intensity: 0
            });
            lastNode = nextNode;
        }
    }
}

function executeFlameThrower(ftLvl, ftCfg) {
    if (!ftLvl || !ftCfg) return;

    if (weaponTimers.flameActive > 0) {
        weaponTimers.flameActive--;
        weaponTimers.flameTick++;

        const coneRange = (ftCfg.baseRange || 165) * (ftLvl.rangeMult || 1.0);
        const halfSpread = ftCfg.baseSpread || 0.42;

        if (weaponTimers.flameTick % 15 === 0) {
            for (const t of getAllActiveTargets()) {
                const dx = t.x - player.x;
                const dy = t.y - (player.y - 28);
                const dist = Math.hypot(dx, dy);

                if (dy < 10 && dist <= coneRange + t.width * 0.35) {
                    const angleFromUp = Math.abs(Math.atan2(dx, -dy));
                    if (angleFromUp <= halfSpread) {
                        applyDamageToTarget(t, ftLvl.atk, '#fb923c', false);
                        applyBurnToTarget(t, ftLvl.burnDmg, ftLvl.burnDurationSec);
                    }
                }
            }
        }

        if (weaponTimers.flameActive <= 0) {
            weaponTimers.flameCooldown = Math.round((ftLvl.cooldownSec || 2.0) * 60);
        }
    } else {
        if (weaponTimers.flameCooldown > 0) {
            weaponTimers.flameCooldown--;
        } else {
            weaponTimers.flameActive = Math.round((ftLvl.durationSec || 2.0) * 60);
            weaponTimers.flameTick = 0;
        }
    }
}

function fireActiveWeapons() {
    // 1. LASER GUN
    if (playerSkills.laser && weaponTimers.laser <= 0) {
        const wCfg = GAME_CONFIG.weapons.laser;
        const lvlData = wCfg.levels[playerSkills.laser];
        for (let i = 0; i < lvlData.branches; i++) {
            let vx = 0, vy = -lvlData.speed;
            if (lvlData.branches > 1 && lvlData.spread > 0) {
                const angle = -Math.PI / 2 + (i - (lvlData.branches - 1) / 2) * (lvlData.spread / (lvlData.branches - 1) * 2);
                vx = Math.cos(angle) * lvlData.speed;
                vy = Math.sin(angle) * lvlData.speed;
            }
            projectiles.push({ kind: 'laser', x: player.x, y: player.y - 28, vx, vy, atk: wCfg.baseAtk, color: wCfg.color });
        }
        weaponTimers.laser = Math.max(1, Math.round(wCfg.baseCooldown / lvlData.shotsPerSec));
    }

    // 2. HE CANNON
    if (playerSkills.he && weaponTimers.he <= 0) {
        const wCfg = GAME_CONFIG.weapons.he;
        const lvlData = wCfg.levels[playerSkills.he];
        projectiles.push({
            kind: 'he', x: player.x, y: player.y - 30, vx: 0, vy: -8.5,
            atk: wCfg.baseAtk, radius: wCfg.explosionRadius, lvlData, color: wCfg.color
        });
        weaponTimers.he = wCfg.baseCooldown;
    }

    // 3. LIGHTNING CHAIN
    if (playerSkills.lightning && weaponTimers.lightning <= 0) {
        const wCfg = GAME_CONFIG.weapons.lightning;
        const lvlData = wCfg.levels[playerSkills.lightning];
        executeLightningOverload(lvlData, wCfg, { isInferno: false, isElectroDoom: false });
        weaponTimers.lightning = wCfg.baseCooldown;
    }

    // 4. ARCTIC BULLET
    if (playerSkills.arctic) {
        const wCfg = GAME_CONFIG.weapons.arctic;
        const lvlData = wCfg.levels[playerSkills.arctic];

        if (weaponTimers.arctic <= 0) {
            projectiles.push({
                kind: 'arctic', x: player.x, y: player.y - 28, vx: 0, vy: -10,
                atk: lvlData.atk, slow: lvlData.slow, duration: wCfg.freezeDuration, cd: wCfg.freezeCd, color: wCfg.color
            });
            weaponTimers.arctic = wCfg.baseCooldown;
        }

        if (lvlData.seekerIntervalSec && weaponTimers.arcticSeeker <= 0) {
            const target = findNearestTarget(player.x, player.y);
            if (target) {
                const angle = Math.atan2(target.y - (player.y - 24), target.x - player.x);
                const speed = 9.5;
                projectiles.push({
                    kind: 'arctic_seeker', target, speed, x: player.x, y: player.y - 24,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    atk: lvlData.atk * lvlData.seekerDmgMult, slow: lvlData.slow,
                    duration: wCfg.freezeDuration, cd: wCfg.freezeCd, color: '#22d3ee'
                });
            }
            weaponTimers.arcticSeeker = Math.round(lvlData.seekerIntervalSec * 60);
        }

        if (lvlData.shieldIntervalSec && weaponTimers.arcticShield <= 0) {
            player.hasShield = true;
            weaponTimers.arcticShield = Math.round(lvlData.shieldIntervalSec * 60);
            spawnFloatingText(player.x, player.y - 38, 'SHIELD READY', '#67e8f9', 12);
            createExplosion(player.x, player.y, ['#67e8f9', '#ffffff'], 14);
        }
    }

    // 5. SHOCK WAVE
    if (playerSkills.shockwave && weaponTimers.shockwave <= 0) {
        const swCfg = GAME_CONFIG.weapons.shockwave;
        const swLvl = swCfg.levels[playerSkills.shockwave];

        if (swLvl.isVortex) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.72;
            const speed = 4.2;
            projectiles.push({
                kind: 'shockwave_vortex', x: player.x, y: player.y - 24,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                atk: swLvl.atk, vortexSize: swLvl.vortexSize || 1.0, radius: 40 * (swLvl.vortexSize || 1.0),
                pullRadius: swLvl.pullRadius || 135, pullPower: swLvl.pullPower || 3.8,
                life: 140, damageTimer: 0, spinAngle: 0, color: swCfg.color
            });
            createExplosion(player.x, player.y - 20, ['#c084fc', '#d8b4fe'], 6);
        } else {
            const waveCount = swLvl.waves || 1;
            const spreadAngles = waveCount === 1 ? [0] : (waveCount === 2 ? [-0.15, 0.15] : [-0.25, 0, 0.25]);
            for (let w = 0; w < waveCount; w++) {
                const angle = -Math.PI / 2 + spreadAngles[w];
                const speed = 8.5;
                projectiles.push({
                    kind: 'shockwave_fan', x: player.x, y: player.y - 22,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    atk: swLvl.atk, sizeMult: swLvl.sizeMult || 1.0, knockback: swLvl.knockback || 22,
                    arcWidth: 74 * (swLvl.sizeMult || 1.0), hitTargets: [], life: 65, color: swCfg.color
                });
            }
            createExplosion(player.x, player.y - 20, ['#c084fc', '#e879f9', '#ffffff'], 8);
        }
        weaponTimers.shockwave = swCfg.baseCooldown;
    }

    // 6. FLAME THROWER
    if (playerSkills.flamethrower && !playerFusions.inferno && GAME_CONFIG.weapons.flamethrower) {
        const ftCfg = GAME_CONFIG.weapons.flamethrower;
        executeFlameThrower(ftCfg.levels[playerSkills.flamethrower], ftCfg);
    }

    // FUSION 1: CRYO MACHINE
    if (playerFusions.cryoMachine) {
        const laserCfg = GAME_CONFIG.weapons.laser, laserLvl = laserCfg.levels['6b'];
        const arcCfg = GAME_CONFIG.weapons.arctic, arcLvl = arcCfg.levels['6a'];

        if (weaponTimers.fusionMain <= 0) {
            projectiles.push({
                kind: 'arctic', isCryoMachine: true, x: player.x, y: player.y - 28, vx: 0, vy: -laserLvl.speed,
                atk: laserCfg.baseAtk + arcLvl.atk * 0.5, slow: arcLvl.slow,
                duration: arcCfg.freezeDuration, cd: arcCfg.freezeCd, color: '#38bdf8'
            });
            weaponTimers.fusionMain = Math.max(1, Math.round(laserCfg.baseCooldown / laserLvl.shotsPerSec));
        }
        if (weaponTimers.fusionSub <= 0) {
            const allTargets = getAllActiveTargets().sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
            for (let k = 0; k < 2; k++) {
                const target = allTargets[k] || allTargets[0];
                if (target) {
                    const finalAngle = Math.atan2(target.y - (player.y - 24), target.x - player.x) + (k === 0 ? -0.22 : 0.22);
                    const speed = 9.5;
                    projectiles.push({
                        kind: 'arctic_seeker', target, speed, x: player.x + (k === 0 ? -10 : 10), y: player.y - 24,
                        vx: Math.cos(finalAngle) * speed, vy: Math.sin(finalAngle) * speed,
                        atk: arcLvl.atk * arcLvl.seekerDmgMult, slow: arcLvl.slow,
                        duration: arcCfg.freezeDuration, cd: arcCfg.freezeCd, color: '#38bdf8'
                    });
                }
            }
            weaponTimers.fusionSub = Math.round(arcLvl.seekerIntervalSec * 60);
        }
    }

    // FUSION 2: TIME STOP
    if (playerFusions.timeStop) {
        const heCfg = GAME_CONFIG.weapons.he, heLvl = heCfg.levels['6b'];
        const arcCfg = GAME_CONFIG.weapons.arctic, arcLvl = arcCfg.levels['6a'];

        if (weaponTimers.fusionMain <= 0) {
            projectiles.push({
                kind: 'he', isTimeStopShot: true, x: player.x, y: player.y - 30, vx: 0, vy: -8.8,
                atk: heCfg.baseAtk + 10, radius: heCfg.explosionRadius, lvlData: heLvl, color: '#60a5fa'
            });
            weaponTimers.fusionMain = heCfg.baseCooldown;
        }
        if (weaponTimers.fusionSub <= 0) {
            const target = findNearestTarget(player.x, player.y);
            if (target) {
                const angle = Math.atan2(target.y - (player.y - 24), target.x - player.x);
                const speed = 9.5;
                projectiles.push({
                    kind: 'arctic_seeker', target, speed, x: player.x, y: player.y - 24,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    atk: arcLvl.atk * arcLvl.seekerDmgMult, slow: arcLvl.slow,
                    duration: arcCfg.freezeDuration, cd: arcCfg.freezeCd, color: '#60a5fa'
                });
            }
            weaponTimers.fusionSub = Math.round(arcLvl.seekerIntervalSec * 60);
        }
    }

    // FUSION 3: DOOM
    if (playerFusions.doom && weaponTimers.fusionMain <= 0) {
        const laserCfg = GAME_CONFIG.weapons.laser, laserLvl = laserCfg.levels['6a'];
        const heCfg = GAME_CONFIG.weapons.he, heLvl = heCfg.levels['6a'];
        const branches = 5, spread = 0.36, speed = 9.2;
        for (let i = 0; i < branches; i++) {
            const angle = -Math.PI / 2 + (i - (branches - 1) / 2) * (spread / (branches - 1) * 2);
            projectiles.push({
                kind: 'he', isDoom: true, x: player.x, y: player.y - 28,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                atk: heCfg.baseAtk * 1.15, radius: heCfg.explosionRadius * 1.1, lvlData: heLvl, color: '#ef4444'
            });
        }
        weaponTimers.fusionMain = Math.max(1, Math.round(laserCfg.baseCooldown / laserLvl.shotsPerSec));
    }

    // FUSION 4: INFERNO (Lightning Overload 6A + Pasif Burn permanen tanpa semburan api)
    if (playerFusions.inferno && weaponTimers.fusionMain <= 0) {
        const lgtCfg = GAME_CONFIG.weapons.lightning;
        executeLightningOverload(lgtCfg.levels['6a'], lgtCfg, { isInferno: true, isElectroDoom: false });
        weaponTimers.fusionMain = lgtCfg.baseCooldown || 12;
    }

    // FUSION 5: ELECTRO DOOM
    if (playerFusions.electroDoom && weaponTimers.fusionMain <= 0) {
        const lgtCfg = GAME_CONFIG.weapons.lightning;
        executeLightningOverload(lgtCfg.levels['6a'], lgtCfg, { isInferno: false, isElectroDoom: true });
        weaponTimers.fusionMain = lgtCfg.baseCooldown || 12;
    }
}