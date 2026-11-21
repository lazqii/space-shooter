// js/effects.js - Sistem Status (Burn, Freeze, TimeStop, Shatter), Damage & Partikel

function spawnFloatingText(x, y, text, color = '#ffffff', size = 13, gradientBottom = null) {
    floatingTexts.push({
        x: x + (Math.random() - 0.5) * 16,
        y,
        text,
        color,
        gradientBottom,
        size,
        life: 40
    });
}

function createExplosion(x, y, colors, count = 16) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 22 + Math.random() * 18
        });
    }
}

function applyDamageToTarget(target, amount, color = '#ffffff', isCrit = false, weaponKey = null) {
    if (target === boss && boss && boss.introTimer > 0) {
        target.hitFlash = 3;
        spawnFloatingText(target.x, target.y - 20, 'IMMUNE', '#facc15', 13);
        createExplosion(target.x, target.y, ['#facc15', '#ffffff'], 4);
        return;
    }

    target.hp -= amount;
    target.hitFlash = 4;

    if (weaponKey && typeof recordWeaponDamage === 'function') {
        recordWeaponDamage(weaponKey, amount);
    }

    const label = isCrit ? `${Math.round(amount)}!` : `${Math.round(amount)}`;
    spawnFloatingText(target.x, target.y - 15, label, color, isCrit ? 16 : 12);
}

function applyBurnToTarget(target, dmgPerHalfSec, durationSec, sourceWeapon = 'flamethrower') {
    if (target === boss && boss && boss.introTimer > 0) return;
    if (!target.status) updateStatusEffects(target);
    if (dmgPerHalfSec >= (target.status.burnHalfSecDmg || 0)) {
        target.status.burnHalfSecDmg = dmgPerHalfSec;
        target.status.burnSource = sourceWeapon;
    }
    target.status.burnTimer = Math.max(target.status.burnTimer || 0, Math.round(durationSec * 60));
}

function applyFreezeToTarget(target, slowAmount, durationSec, cdSec) {
    if (target === boss && boss && boss.introTimer > 0) return;
    if (!target.status) updateStatusEffects(target);
    if (target.status.freezeCdTimer <= 0) {
        target.status.slowFactor = Math.max(target.status.slowFactor || 0, slowAmount);
        target.status.freezeTimer = Math.round(durationSec * 60);
        target.status.freezeCdTimer = Math.round(cdSec * 60);
        spawnFloatingText(target.x, target.y - 28, 'FREZEE', '#67e8f9', 12);
    }
}

function updateStatusEffects(target) {
    if (!target.status) {
        target.status = {
            burnTimer: 0,
            burnTickTimer: 0,
            burnHalfSecDmg: 0,
            burnSource: 'flamethrower',
            freezeTimer: 0,
            freezeAccumulated: 0,
            freezeCdTimer: 0,
            shatterCdTimer: 0,
            slowFactor: 0,
            timeStopTimer: 0,
            timeStopCdTimer: 0
        };
    }
    const st = target.status;

    if (st.freezeCdTimer > 0) st.freezeCdTimer--;
    if (st.shatterCdTimer > 0) st.shatterCdTimer--;
    if (st.timeStopCdTimer > 0) st.timeStopCdTimer--;
    if (st.timeStopTimer > 0) st.timeStopTimer--;

    if (st.burnTimer > 0) {
        st.burnTimer--;
        st.burnTickTimer++;
        if (st.burnTickTimer >= 30) {
            st.burnTickTimer = 0;
            applyDamageToTarget(target, st.burnHalfSecDmg, '#fb923c', false, st.burnSource || 'flamethrower');
            createExplosion(target.x, target.y, ['#f97316', '#facc15'], 5);
        }
        if (st.burnTimer <= 0) {
            st.burnHalfSecDmg = 0;
        }
    }

    if (st.freezeTimer > 0) {
        st.freezeTimer--;
        st.freezeAccumulated += 1 / 60;

        const heLvl = playerSkills.he;
        if (heLvl === '6b' && st.freezeAccumulated > 4.0 && st.shatterCdTimer <= 0) {
            const trueDmg = GAME_CONFIG.weapons.he.baseAtk * GAME_CONFIG.weapons.he.levels['6b'].shatterTrueDmgPct;
            applyDamageToTarget(target, trueDmg, '#22d3ee', true, 'he');
            spawnFloatingText(target.x, target.y - 34, 'SHATTER!', '#67e8f9', 14);
            createExplosion(target.x, target.y, ['#22d3ee', '#ffffff'], 20);
            st.shatterCdTimer = GAME_CONFIG.weapons.he.levels['6b'].shatterCd * 60;
            st.freezeAccumulated = 0;
        }

        if (st.freezeTimer <= 0) {
            st.slowFactor = 0;
            st.freezeAccumulated = 0;
        }
    }
}