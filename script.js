// ========== SISTEMA DE AUDIO ==========
let audioEnabled = true;
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playSound(type) {
    if (!audioEnabled) return;
    
    try {
        const ctx = initAudio();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        let freq = 440;
        let duration = 0.2;
        let volume = 0.3;
        
        switch(type) {
            case 'click': freq = 880; duration = 0.1; volume = 0.2; break;
            case 'victory': 
                freq = 1046.5; duration = 0.4; volume = 0.4;
                setTimeout(() => {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.frequency.value = 1318.52;
                    gain2.gain.setValueAtTime(0.3, now + 0.2);
                    gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.6);
                    osc2.start();
                    osc2.stop(now + 0.6);
                }, 200);
                break;
            case 'error': freq = 220; duration = 0.3; volume = 0.25; break;
            case 'reward': freq = 1318.52; duration = 0.3; volume = 0.3; break;
        }
        
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);
        osc.start();
        osc.stop(now + duration);
    } catch(e) { console.log('Audio error:', e); }
}

// ========== ESTADO DEL JUEGO ==========
const gameData = {
    currentScreen: 'loading',
    selectedHero: null,
    heroes: {
        ramona: { name: 'RAMONA', title: 'Poderes Curativos', icon: '🩺', badge: '🩹', unlocked: true, specialty: 'Primeros Auxilios', color: '#00ff88' },
        wilmer: { name: 'WILMER', title: 'Maestro del Fuego', icon: '🔥', badge: '🧯', unlocked: true, specialty: 'Incendios', color: '#ff4400' },
        reinaldo: { name: 'REINALDO', title: 'Guardián de la Tierra', icon: '🌍', badge: '🏠', unlocked: true, specialty: 'Seguridad Sísmica', color: '#44ff44' },
        vegita: { name: 'VEGITA', title: 'Comandante P.A.S.', icon: '⚡', badge: '🛡️', unlocked: true, specialty: 'Protocolo P.A.S.', color: '#aa44ff' }
    },
    player: {
        name: '',
        heroIcon: '🧑‍🚀',
        heroBadge: '',
        rank: 'Cadete',
        xp: 0,
        totalStars: 0,
        currentWorld: null,
        currentMissionIndex: 0
    },
    unlockedWorlds: ['heal'],
    worldProgress: { heal: 0, fire: 0, earth: 0, pas: 0 },
    missionsByWorld: {
        heal: ['rcp', 'vendaje', 'quemadura'],
        fire: ['extintor', 'clasificacion', 'peligros'],
        earth: ['sismico', 'zonas', 'evacuacion'],
        pas: ['pas', 'examen']
    },
    currentMission: null
};

const ranks = [
    { name: 'Cadete', minXP: 0 },
    { name: 'Guardián PC', minXP: 100 },
    { name: 'Héroe PC', minXP: 300 },
    { name: 'Comandante', minXP: 600 },
    { name: 'Máster PC', minXP: 1000 }
];

// ========== FUNCIONES DE PROGRESIÓN ==========
function addXP(amount) {
    gameData.player.xp += amount;
    updateRank();
    saveGame();
}

function updateRank() {
    let newRank = ranks[0];
    for (let i = ranks.length - 1; i >= 0; i--) {
        if (gameData.player.xp >= ranks[i].minXP) {
            newRank = ranks[i];
            break;
        }
    }
    gameData.player.rank = newRank.name;
    
    const rankEl = document.getElementById('player-rank');
    if (rankEl) rankEl.textContent = `Rango: ${gameData.player.rank}`;
    
    const nextRank = ranks.find(r => r.minXP > gameData.player.xp);
    if (nextRank) {
        const currentRankXP = ranks[ranks.findIndex(r => r.name === gameData.player.rank)].minXP;
        const xpInCurrent = gameData.player.xp - currentRankXP;
        const xpNeeded = nextRank.minXP - currentRankXP;
        const percent = (xpInCurrent / xpNeeded) * 100;
        
        const fillEl = document.getElementById('xp-fill');
        const currentXpEl = document.getElementById('current-xp');
        const nextXpEl = document.getElementById('next-xp');
        
        if (fillEl) fillEl.style.width = `${percent}%`;
        if (currentXpEl) currentXpEl.textContent = xpInCurrent;
        if (nextXpEl) nextXpEl.textContent = xpNeeded;
    }
}

function addStars(amount) {
    gameData.player.totalStars += amount;
    const starsEl = document.getElementById('total-stars');
    if (starsEl) starsEl.textContent = gameData.player.totalStars;
    saveGame();
}

function completeMission(earnedStars, earnedXP, rescueAnimation) {
    playSound('victory');
    addStars(earnedStars);
    addXP(earnedXP);
    launchConfetti();
    
    const missionsTotal = gameData.missionsByWorld[gameData.player.currentWorld].length;
    const newProgress = ((gameData.player.currentMissionIndex + 1) / missionsTotal) * 100;
    gameData.worldProgress[gameData.player.currentWorld] = newProgress;
    
    showRescueAnimation(rescueAnimation);
    
    const starsSpan = document.getElementById('victory-stars');
    const xpSpan = document.getElementById('victory-xp');
    const heroNameSpan = document.getElementById('victory-hero-name');
    
    if (starsSpan) starsSpan.textContent = earnedStars;
    if (xpSpan) xpSpan.textContent = earnedXP;
    if (heroNameSpan) heroNameSpan.textContent = gameData.player.name;
    
    setScreen('victory');
    launchFireworks();
    
    gameData.player.currentMissionIndex++;
    saveGame();
    
    if (gameData.player.currentWorld === 'heal' && !gameData.unlockedWorlds.includes('fire')) {
        gameData.unlockedWorlds.push('fire');
        showTemporaryMessage('🌟 ¡NUEVO MUNDO: PREVENCIÓN DE INCENDIOS DESBLOQUEADO! 🌟');
    }
    if (gameData.player.currentWorld === 'fire' && !gameData.unlockedWorlds.includes('earth')) {
        gameData.unlockedWorlds.push('earth');
        showTemporaryMessage('🌟 ¡NUEVO MUNDO: SEGURIDAD SÍSMICA DESBLOQUEADO! 🌟');
    }
    if (gameData.player.currentWorld === 'earth' && !gameData.unlockedWorlds.includes('pas')) {
        gameData.unlockedWorlds.push('pas');
        showTemporaryMessage('🌟 ¡NUEVO MUNDO: PROTOCOLO P.A.S. DESBLOQUEADO! 🌟');
    }
}

function launchConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.width = Math.random() * 8 + 4 + 'px';
        confetti.style.height = Math.random() * 8 + 4 + 'px';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}

function showRescueAnimation(animationType) {
    const animDiv = document.getElementById('rescue-animation');
    if (!animDiv) return;
    
    const animations = {
        'vendaje': '🩹 ¡Has vendado la herida correctamente! El paciente está a salvo.',
        'rcp': '🫀 ¡RCP aplicada! La persona recupera la conciencia.',
        'quemadura': '💧 ¡Quemadura tratada con agua fría! La piel está a salvo.',
        'extintor': '🧯 ¡Fuego extinguido! Todos están a salvo.',
        'evacuacion': '🚪 ¡Evacuación exitosa! Todos salieron sin peligro.',
        'sismo': '🏠 ¡Protección correcta! Nadie resultó herido.',
        'proteger': '🛡️ ¡Zona protegida! El peligro ha sido controlado.',
        'default': `🦸 ¡${gameData.player.name} ha completado una acción heroica!`
    };
    
    const heroMessage = animations[animationType] || animations.default;
    animDiv.innerHTML = `
        <div style="font-size: 3rem; animation: rescueGlow 1s infinite;">${gameData.player.heroIcon}</div>
        <div style="font-size: 1.2rem; margin-top: 10px;">${heroMessage}</div>
    `;
}

function showTemporaryMessage(msg) {
    const fb = document.getElementById('game-feedback');
    if (fb) {
        fb.innerHTML = `<div style="background: gold; color: black; padding: 15px; border-radius: 30px;">${msg}</div>`;
        setTimeout(() => fb.innerHTML = '', 3000);
    }
}

function showGameFeedback(msg, isError = false) {
    const fb = document.getElementById('game-feedback');
    if (!fb) return;
    
    fb.innerHTML = `<div style="background: ${isError ? 'rgba(255,50,50,0.8)' : 'rgba(0,255,100,0.8)'}; padding: 15px; border-radius: 30px;">
        ${isError ? '❌' : '✅'} ${msg}
    </div>`;
    if (isError) {
        playSound('error');
        const gameArea = document.getElementById('game-area');
        if (gameArea) {
            gameArea.classList.add('error-shake');
            setTimeout(() => gameArea.classList.remove('error-shake'), 500);
        }
    } else {
        playSound('click');
    }
    setTimeout(() => fb.innerHTML = '', 2000);
}

// ========== NAVEGACIÓN ==========
function setScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(`${screenId}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        gameData.currentScreen = screenId;
    }
    
    if (screenId === 'main') {
        updateMainUI();
    }
    if (screenId === 'game') {
        updateGameHeroUI();
    }
}

function updateMainUI() {
    const nameEl = document.getElementById('player-name');
    const avatarEl = document.getElementById('player-avatar');
    const starsEl = document.getElementById('total-stars');
    const heroDisplayEl = document.getElementById('current-hero-display');
    
    if (nameEl) nameEl.textContent = gameData.player.name;
    if (avatarEl) avatarEl.textContent = gameData.player.heroIcon;
    if (starsEl) starsEl.textContent = gameData.player.totalStars;
    updateRank();
    
    if (heroDisplayEl) {
        heroDisplayEl.innerHTML = `
            🎖️ HÉROE ACTUAL: ${gameData.player.name} 
            <span style="font-size: 1.5rem;">${gameData.player.heroIcon}</span>
            <span style="font-size: 1rem;">${gameData.player.heroBadge}</span>
        `;
    }
    
    const worlds = ['heal', 'fire', 'earth', 'pas'];
    worlds.forEach(world => {
        const lock = document.getElementById(`lock-${world}`);
        const progressFill = document.querySelector(`.world-card[data-world="${world}"] .world-progress-fill`);
        if (lock) {
            if (gameData.unlockedWorlds.includes(world)) {
                lock.style.display = 'none';
            } else {
                lock.style.display = 'flex';
                lock.innerHTML = '🔒';
            }
        }
        if (progressFill) {
            progressFill.style.width = `${gameData.worldProgress[world] || 0}%`;
        }
    });
}

function updateGameHeroUI() {
    const iconEl = document.getElementById('game-hero-icon');
    const nameEl = document.getElementById('game-hero-name');
    
    if (iconEl) iconEl.textContent = gameData.player.heroIcon;
    if (nameEl) nameEl.textContent = gameData.player.name;
}

function selectHero(heroKey) {
    const hero = gameData.heroes[heroKey];
    if (!hero || !hero.unlocked) {
        playSound('error');
        showTemporaryMessage(`🔒 ${hero?.name || 'Héroe'} no disponible.`);
        return;
    }
    
    gameData.selectedHero = heroKey;
    gameData.player.name = hero.name;
    gameData.player.heroIcon = hero.icon;
    gameData.player.heroBadge = hero.badge;
    
    playSound('victory');
    showTemporaryMessage(`✨ ¡${gameData.player.name} está listo para salvar vidas! ✨`);
    setScreen('main');
    saveGame();
}

function startMission(missionId) {
    gameData.currentMission = missionId;
    const missionEl = document.getElementById('mission-name');
    if (missionEl) missionEl.textContent = `Misión: ${getMissionName(missionId)}`;
    
    updateGameHeroUI();
    
    if (MiniGames[missionId]) {
        setScreen('game');
        MiniGames[missionId].start();
    } else {
        failMission();
    }
}

function getMissionName(missionId) {
    const names = {
        'rcp': 'RCP - Reanimación Cardiopulmonar',
        'vendaje': 'Vendaje de Heridas',
        'quemadura': 'Tratamiento de Quemaduras',
        'extintor': 'Uso del Extintor',
        'clasificacion': 'Clasificación de Fuegos',
        'peligros': 'Detección de Peligros',
        'sismico': 'Defensa Sísmica',
        'zonas': 'Zonas Seguras',
        'evacuacion': 'Evacuación de Emergencia',
        'pas': 'Protocolo P.A.S.',
        'examen': 'Examen Final'
    };
    return names[missionId] || missionId.toUpperCase();
}

function failMission() {
    playSound('error');
    setScreen('gameover');
}

// ========== MINIJUEGOS ==========
const MiniGames = {};

MiniGames.rcp = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🫀 REANIMACIÓN CARDIOPULMONAR (RCP)</h3>
            <p style="font-size: 1.1rem;">Encuentras a una persona inconsciente que no respira. ¿Qué haces?</p>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center; margin-top: 20px;">
                <button class="option-btn" data-correct="true">Llamar al 911 y comenzar RCP (30 compresiones, 2 ventilaciones)</button>
                <button class="option-btn" data-correct="false">Darle agua y esperar que despierte</button>
                <button class="option-btn" data-correct="false">Moverlo y sentarlo rápidamente</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(3, 30, 'rcp');
                } else {
                    showGameFeedback('¡Incorrecto! Lo correcto es llamar a emergencias y comenzar RCP inmediatamente', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.vendaje = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🩹 VENDAJE DE HERIDAS</h3>
            <p style="font-size: 1.1rem;">Un compañero se cortó el brazo y sangra moderadamente. ¿Cuál es el primer paso?</p>
            <div style="display: flex; gap: 15px; flex-direction: column; align-items: center; margin-top: 20px;">
                <button class="option-btn" data-correct="true">Limpiar la herida con agua y aplicar presión con una gasa</button>
                <button class="option-btn" data-correct="false">Aplicar alcohol directamente sobre la herida</button>
                <button class="option-btn" data-correct="false">Vendar sin limpiar para no perder tiempo</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(3, 25, 'vendaje');
                } else {
                    showGameFeedback('¡Incorrecto! Primero lava suavemente con agua, luego aplica presión con una gasa estéril', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.quemadura = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">💧 TRATAMIENTO DE QUEMADURAS</h3>
            <p style="font-size: 1.1rem;">Tu amigo se quema la mano con agua caliente. ¿Qué haces primero?</p>
            <div style="display: flex; gap: 15px; flex-direction: column; align-items: center; margin-top: 20px;">
                <button class="option-btn" data-correct="true">Enfriar la quemadura con agua fría durante 15 minutos</button>
                <button class="option-btn" data-correct="false">Aplicar hielo directamente sobre la piel</button>
                <button class="option-btn" data-correct="false">Poner crema o ungüento inmediatamente</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(3, 25, 'quemadura');
                } else {
                    showGameFeedback('¡Incorrecto! Lo correcto es enfriar con agua fría (no hielo) durante 15 minutos', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.extintor = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🧯 USO DEL EXTINTOR</h3>
            <div style="background: rgba(255,50,0,0.3); padding: 20px; border-radius: 30px; text-align: left; margin-bottom: 20px;">
                <div>✅ PASO 1: Tirar del pasador de seguridad</div>
                <div>✅ PASO 2: Apuntar a la BASE del fuego</div>
                <div>✅ PASO 3: Presionar la palanca</div>
                <div>✅ PASO 4: Barrer lateralmente</div>
            </div>
            <p>¿Hacia dónde debes apuntar el extintor?</p>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                <button class="option-btn" data-correct="true">A la base del fuego</button>
                <button class="option-btn" data-correct="false">A las llamas altas</button>
                <button class="option-btn" data-correct="false">Al techo</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(3, 35, 'extintor');
                } else {
                    showGameFeedback('¡Incorrecto! Siempre apunta a la BASE del fuego', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.clasificacion = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🔥 CLASIFICACIÓN DE FUEGOS</h3>
            <p>¿Qué tipo de extintor usarías para un incendio ELÉCTRICO?</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                <button class="option-btn" data-correct="true">Clase C (extintor de CO2 o Polvo ABC)</button>
                <button class="option-btn" data-correct="false">Clase A (agua)</button>
                <button class="option-btn" data-correct="false">Clase B (líquidos inflamables)</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(2, 20, 'extintor');
                } else {
                    showGameFeedback('¡Incorrecto! Para fuegos eléctricos se usa extintor de CO2 o Polvo ABC (Clase C)', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.peligros = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🔍 DETECTOR DE PELIGROS</h3>
            <p>Identifica el peligro más GRAVE:</p>
            <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
                <button class="option-btn" data-correct="true">🔌 Enchufe múltiple sobrecargado y cables pelados</button>
                <button class="option-btn" data-correct="false">📚 Libros desordenados en el escritorio</button>
                <button class="option-btn" data-correct="false">🪑 Una silla fuera de su lugar</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(2, 20, 'default');
                } else {
                    showGameFeedback('¡Peligro no detectado! La sobrecarga eléctrica es un riesgo grave de incendio', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.sismico = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🌍 ¡SISMO! DEFENSA SÍSMICA</h3>
            <p style="font-size: 1.3rem; animation: shake 0.5s infinite;">🏢⚠️ ¡TIEMBLA FUERTE! ⚠️🏢</p>
            <p>¿Cuál es la acción correcta durante un sismo?</p>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                <button class="option-btn" data-correct="true">Agáchate, cúbrete y sujétate bajo una mesa resistente</button>
                <button class="option-btn" data-correct="false">Corre hacia la salida inmediatamente</button>
                <button class="option-btn" data-correct="false">Párate junto a una ventana</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(3, 30, 'sismo');
                } else {
                    showGameFeedback('¡Error! Nunca corras durante el sismo. Agáchate, cúbrete y sujétate', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.zonas = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🏠 ZONAS SEGURAS DURANTE UN SISMO</h3>
            <p>Si estás en tu casa, ¿DÓNDE es más seguro protegerse?</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                <button class="option-btn" data-correct="true">Bajo una mesa resistente o junto a un pilar</button>
                <button class="option-btn" data-correct="false">Junto a una ventana grande</button>
                <button class="option-btn" data-correct="false">Dentro del ascensor</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(2, 20, 'sismo');
                } else {
                    showGameFeedback('Zona insegura. Busca una mesa resistente o un pilar estructural', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.evacuacion = {
    start() {
        let playerPos = { x: 0, y: 0 };
        const exitPos = { x: 4, y: 4 };
        const walls = [[1,1], [1,2], [2,1], [3,3]];
        
        const renderMaze = () => {
            const container = document.getElementById('game-area');
            if (!container) return;
            
            let html = '<h3 style="color: cyan;">🚪 EVACUACIÓN SEGURA - LABERINTO</h3>';
            html += '<p>Lleva a tu héroe (🔴) hasta la salida (🟢)</p>';
            html += '<div class="maze-container">';
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    let cellClass = 'maze-cell';
                    if (walls.some(w => w[0] === row && w[1] === col)) cellClass += ' wall';
                    if (playerPos.x === row && playerPos.y === col) cellClass += ' player';
                    if (exitPos.x === row && exitPos.y === col) cellClass += ' exit';
                    html += `<div class="${cellClass}"></div>`;
                }
            }
            html += '</div>';
            html += '<div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; justify-content: center;">';
            html += '<button id="move-up" class="option-btn">⬆️ Arriba</button>';
            html += '<button id="move-down" class="option-btn">⬇️ Abajo</button>';
            html += '<button id="move-left" class="option-btn">⬅️ Izquierda</button>';
            html += '<button id="move-right" class="option-btn">➡️ Derecha</button>';
            html += '</div>';
            container.innerHTML = html;
            
            document.getElementById('move-up').onclick = () => movePlayer(-1, 0);
            document.getElementById('move-down').onclick = () => movePlayer(1, 0);
            document.getElementById('move-left').onclick = () => movePlayer(0, -1);
            document.getElementById('move-right').onclick = () => movePlayer(0, 1);
        };
        
        const movePlayer = (dx, dy) => {
            const newX = playerPos.x + dx;
            const newY = playerPos.y + dy;
            
            if (newX >= 0 && newX < 5 && newY >= 0 && newY < 5) {
                if (!walls.some(w => w[0] === newX && w[1] === newY)) {
                    playerPos = { x: newX, y: newY };
                    playSound('click');
                    renderMaze();
                    
                    if (playerPos.x === exitPos.x && playerPos.y === exitPos.y) {
                        completeMission(3, 30, 'evacuacion');
                    }
                } else {
                    showGameFeedback('Hay una pared, no puedes pasar', true);
                }
            }
        };
        
        renderMaze();
    }
};

MiniGames.pas = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🛡️ PROTOCOLO P.A.S.</h3>
            <p>¿Cuál es el orden CORRECTO del protocolo PAS ante una emergencia?</p>
            <div style="display: flex; gap: 15px; flex-direction: column; align-items: center; margin-top: 20px;">
                <button class="option-btn" data-correct="true">PROTEGER → AVISAR → SOCORRER</button>
                <button class="option-btn" data-correct="false">SOCORRER → AVISAR → PROTEGER</button>
                <button class="option-btn" data-correct="false">AVISAR → SOCORRER → PROTEGER</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.correct === 'true') {
                    completeMission(3, 25, 'proteger');
                } else {
                    showGameFeedback('Error. El orden correcto es: PROTEGER → AVISAR → SOCORRER', true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.examen = {
    start() {
        const questions = [
            { q: '¿Cuál es el primer paso del protocolo PAS?', correct: 'Proteger', options: ['Proteger', 'Avisar', 'Socorrer'] },
            { q: '¿Qué número de emergencias debemos llamar en Venezuela?', correct: '911', options: ['911', '112', '171'] },
            { q: '¿Qué haces durante un sismo?', correct: 'Agacharse, cubrirse, sujetarse', options: ['Agacharse, cubrirse, sujetarse', 'Correr hacia la salida', 'Pararse junto a la ventana'] },
            { q: '¿Qué tipo de extintor usas para un incendio eléctrico?', correct: 'Clase C (CO2 o Polvo ABC)', options: ['Clase A (agua)', 'Clase B (líquidos)', 'Clase C (CO2 o Polvo ABC)'] },
            { q: '¿Cuánto tiempo debes enfriar una quemadura con agua?', correct: '15 minutos', options: ['5 minutos', '15 minutos', '30 minutos'] }
        ];
        let currentQ = 0;
        let score = 0;
        
        const showQuestion = () => {
            if (currentQ >= questions.length) {
                const earnedStars = score === questions.length ? 5 : Math.floor(score * 1.5);
                completeMission(earnedStars, 50 + (score * 10), 'default');
                return;
            }
            
            const q = questions[currentQ];
            const container = document.getElementById('game-area');
            container.innerHTML = `
                <h3 style="color: cyan;">📝 EXAMEN FINAL - PROTECCIÓN CIVIL VENEZUELA</h3>
                <p>Pregunta ${currentQ + 1}/${questions.length}</p>
                <p style="background: rgba(0,0,0,0.6); padding: 20px; border-radius: 20px; margin: 20px 0;">${q.q}</p>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                    ${q.options.map(opt => `<button class="option-btn" data-ans="${opt}">${opt}</button>`).join('')}
                </div>
            `;
            
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.onclick = () => {
                    if (btn.dataset.ans === q.correct) {
                        showGameFeedback('✅ ¡Correcto!');
                        score++;
                    } else {
                        showGameFeedback(`❌ Incorrecto. Respuesta correcta: ${q.correct}`, true);
                    }
                    currentQ++;
                    setTimeout(showQuestion, 2000);
                };
            });
        };
        
        showQuestion();
    }
};

// ========== EFECTOS ==========
function launchFireworks() {
    const container = document.getElementById('fireworks');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = Math.random() * 100 + '%';
        firework.style.top = Math.random() * 100 + '%';
        firework.style.setProperty('--x', (Math.random() - 0.5) * 200 + 'px');
        firework.style.setProperty('--y', (Math.random() - 0.5) * 200 + 'px');
        container.appendChild(firework);
        setTimeout(() => firework.remove(), 2000);
    }
}

function initParticles() {
    const particleField = document.getElementById('particle-field');
    if (!particleField) return;
    
    for (let i = 0; i < 100; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '3px';
        particle.style.height = '3px';
        particle.style.background = `rgba(0, 51, 160, ${Math.random() * 0.5})`;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.borderRadius = '50%';
        particleField.appendChild(particle);
    }
}

// ========== GUARDADO LOCAL ==========
function saveGame() {
    const saveData = {
        player: gameData.player,
        unlockedWorlds: gameData.unlockedWorlds,
        worldProgress: gameData.worldProgress,
        selectedHero: gameData.selectedHero
    };
    localStorage.setItem('pc_venezuela_save', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('pc_venezuela_save');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gameData.player = data.player;
            gameData.unlockedWorlds = data.unlockedWorlds;
            gameData.worldProgress = data.worldProgress;
            gameData.selectedHero = data.selectedHero;
        } catch(e) { console.log('Error loading save'); }
    }
}

// ========== EVENT LISTENERS ==========
document.getElementById('start-game-btn')?.addEventListener('click', () => {
    playSound('click');
    setScreen('hero-select');
});

document.getElementById('back-to-start-from-hero')?.addEventListener('click', () => {
    playSound('click');
    setScreen('start');
});

document.getElementById('continue-to-worlds')?.addEventListener('click', () => {
    playSound('click');
    setScreen('main');
});

document.getElementById('exit-game')?.addEventListener('click', () => {
    playSound('click');
    setScreen('main');
});

document.getElementById('retry-mission')?.addEventListener('click', () => {
    playSound('click');
    if (gameData.currentMission) {
        startMission(gameData.currentMission);
    }
});

document.getElementById('exit-after-fail')?.addEventListener('click', () => {
    playSound('click');
    setScreen('main');
});

document.getElementById('audio-toggle-main')?.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    const btn = document.getElementById('audio-toggle-main');
    if (btn) btn.textContent = audioEnabled ? '🔊' : '🔇';
    playSound('click');
});

document.querySelectorAll('.hero-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const heroKey = btn.dataset.hero;
        selectHero(heroKey);
    });
});

document.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
        const heroKey = card.dataset.hero;
        if (gameData.heroes[heroKey]?.unlocked) {
            selectHero(heroKey);
        }
    });
});

document.querySelectorAll('.world-card').forEach(card => {
    card.addEventListener('click', () => {
        const world = card.dataset.world;
        
        if (!gameData.selectedHero) {
            showTemporaryMessage('⚠️ Primero debes seleccionar un héroe');
            setScreen('hero-select');
            return;
        }
        
        if (gameData.unlockedWorlds.includes(world)) {
            playSound('click');
            gameData.player.currentWorld = world;
            gameData.player.currentMissionIndex = 0;
            const firstMission = gameData.missionsByWorld[world][0];
            startMission(firstMission);
        } else {
            playSound('error');
            showGameFeedback('🔒 Mundo bloqueado. Completa los mundos anteriores primero', true);
        }
    });
});

// ========== INICIALIZACIÓN ==========
window.addEventListener('load', () => {
    loadGame();
    initParticles();
    updateRank();
    
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        setScreen('start');
        
        if (!localStorage.getItem('tutorial_shown')) {
            setTimeout(() => {
                const tutorial = document.getElementById('tutorial-overlay');
                if (tutorial) tutorial.style.display = 'flex';
            }, 500);
            localStorage.setItem('tutorial_shown', 'true');
        }
    }, 2000);
});

document.getElementById('next-tutorial')?.addEventListener('click', () => {
    const tutorial = document.getElementById('tutorial-overlay');
    if (tutorial) tutorial.style.display = 'none';
});

document.body.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}, { once: true });

console.log('🎮 PC Venezuela - Juego de Gestión de Riesgo listo! 🇻🇪');
