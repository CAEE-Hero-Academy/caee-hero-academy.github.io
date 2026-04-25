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
        alex: { name: 'ALEX', title: 'Maestro del Fuego', icon: '🔥', badge: '🧯', unlocked: true, specialty: 'Incendios', color: '#ff4400' },
        sofia: { name: 'SOFÍA', title: 'Poderes Curativos', icon: '🩺', badge: '🩹', unlocked: true, specialty: 'Primeros Auxilios', color: '#00ff88' },
        mateo: { name: 'MATEO', title: 'Guardián de la Tierra', icon: '🌍', badge: '🏠', unlocked: false, specialty: 'Seguridad Sísmica', color: '#44ff44' },
        luna: { name: 'LUNA', title: 'Detective de Riesgos', icon: '🔍', badge: '⚠️', unlocked: false, specialty: 'Detección de Peligros', color: '#ffaa00' },
        kai: { name: 'KAI', title: 'Comandante P.A.S.', icon: '⚡', badge: '🛡️', unlocked: false, specialty: 'Protocolo P.A.S.', color: '#aa44ff' }
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
    worldProgress: { heal: 0, fire: 0, earth: 0, risks: 0, pas: 0 },
    missionsByWorld: {
        heal: ['pas', 'signos', 'matriz'],
        fire: ['extintor', 'clasificacion', 'peligros'],
        earth: ['sismico', 'zonas', 'evacuacion'],
        risks: ['peligros', 'extintor', 'sismico'],
        pas: ['pas', 'evacuacion', 'examen']
    },
    currentMission: null
};

const ranks = [
    { name: 'Cadete', minXP: 0 },
    { name: 'Guardián', minXP: 100 },
    { name: 'Héroe', minXP: 300 },
    { name: 'Leyenda', minXP: 600 },
    { name: 'Máster CAEE', minXP: 1000 }
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
    
    if (document.getElementById('player-rank')) {
        document.getElementById('player-rank').textContent = `Rango: ${gameData.player.rank}`;
    }
    
    const nextRank = ranks.find(r => r.minXP > gameData.player.xp);
    if (nextRank) {
        const currentRankXP = ranks[ranks.findIndex(r => r.name === gameData.player.rank)].minXP;
        const xpInCurrent = gameData.player.xp - currentRankXP;
        const xpNeeded = nextRank.minXP - currentRankXP;
        const percent = (xpInCurrent / xpNeeded) * 100;
        
        if (document.getElementById('xp-fill')) {
            document.getElementById('xp-fill').style.width = `${percent}%`;
            document.getElementById('current-xp').textContent = xpInCurrent;
            document.getElementById('next-xp').textContent = xpNeeded;
        }
    }
}

function addStars(amount) {
    gameData.player.totalStars += amount;
    if (document.getElementById('total-stars')) {
        document.getElementById('total-stars').textContent = gameData.player.totalStars;
    }
    saveGame();
}

function completeMission(earnedStars, earnedXP, rescueAnimation) {
    playSound('victory');
    addStars(earnedStars);
    addXP(earnedXP);
    
    const missionsTotal = gameData.missionsByWorld[gameData.player.currentWorld].length;
    const newProgress = ((gameData.player.currentMissionIndex + 1) / missionsTotal) * 100;
    gameData.worldProgress[gameData.player.currentWorld] = newProgress;
    
    showRescueAnimation(rescueAnimation);
    
    document.getElementById('victory-stars').textContent = earnedStars;
    document.getElementById('victory-xp').textContent = earnedXP;
    document.getElementById('victory-hero-name').textContent = gameData.player.name;
    
    setScreen('victory');
    launchFireworks();
    
    gameData.player.currentMissionIndex++;
    saveGame();
    
    // Desbloquear mundos y héroes
    if (gameData.player.currentWorld === 'heal' && !gameData.unlockedWorlds.includes('fire')) {
        gameData.unlockedWorlds.push('fire');
        showTemporaryMessage('🌟 ¡NUEVO MUNDO: MAESTRO DEL FUEGO DESBLOQUEADO! 🌟');
    }
    if (gameData.player.currentWorld === 'fire' && !gameData.unlockedWorlds.includes('earth')) {
        gameData.unlockedWorlds.push('earth');
        gameData.heroes.mateo.unlocked = true;
        showTemporaryMessage('🌟 ¡HÉROE DESBLOQUEADO: MATEO - GUARDIÁN DE LA TIERRA! 🌟');
        updateHeroSelectUI();
    }
    if (gameData.player.currentWorld === 'earth' && !gameData.unlockedWorlds.includes('risks')) {
        gameData.unlockedWorlds.push('risks');
        gameData.heroes.luna.unlocked = true;
        showTemporaryMessage('🌟 ¡HÉROE DESBLOQUEADO: LUNA - DETECTIVE DE RIESGOS! 🌟');
        updateHeroSelectUI();
    }
    if (gameData.player.currentWorld === 'risks' && !gameData.unlockedWorlds.includes('pas')) {
        gameData.unlockedWorlds.push('pas');
        gameData.heroes.kai.unlocked = true;
        showTemporaryMessage('🌟 ¡HÉROE DESBLOQUEADO: KAI - COMANDANTE P.A.S.! 🌟');
        updateHeroSelectUI();
    }
}

function showRescueAnimation(animationType) {
    const animDiv = document.getElementById('rescue-animation');
    if (!animDiv) return;
    
    const animations = {
        'vendaje': '🩹 ¡Has vendado la herida correctamente! El paciente está a salvo.',
        'rcp': '🫀 ¡RCP aplicada! La persona recupera la conciencia.',
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
    fb.innerHTML = `<div style="background: ${isError ? 'rgba(255,50,50,0.8)' : 'rgba(0,255,100,0.8)'}; padding: 15px; border-radius: 30px;">
        ${isError ? '❌' : '✅'} ${msg}
    </div>`;
    if (isError) {
        playSound('error');
        document.getElementById('game-area').classList.add('error-shake');
        setTimeout(() => document.getElementById('game-area').classList.remove('error-shake'), 500);
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
    if (screenId === 'hero-select') {
        updateHeroSelectUI();
    }
    if (screenId === 'game') {
        updateGameHeroUI();
    }
}

function updateMainUI() {
    document.getElementById('player-name').textContent = gameData.player.name;
    document.getElementById('player-avatar').textContent = gameData.player.heroIcon;
    updateRank();
    document.getElementById('total-stars').textContent = gameData.player.totalStars;
    
    if (document.getElementById('current-hero-display')) {
        document.getElementById('current-hero-display').innerHTML = `
            🎖️ HÉROE ACTUAL: ${gameData.player.name} 
            <span style="font-size: 1.5rem;">${gameData.player.heroIcon}</span>
            <span style="font-size: 1rem;">${gameData.player.heroBadge}</span>
        `;
    }
    
    const worlds = ['heal', 'fire', 'earth', 'risks', 'pas'];
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
    document.getElementById('game-hero-icon').textContent = gameData.player.heroIcon;
    document.getElementById('game-hero-name').textContent = gameData.player.name;
}

function updateHeroSelectUI() {
    for (const [key, hero] of Object.entries(gameData.heroes)) {
        const card = document.querySelector(`.hero-card[data-hero="${key}"]`);
        if (card) {
            if (hero.unlocked) {
                card.style.opacity = '1';
                const lockDiv = card.querySelector('.hero-lock');
                const selectBtn = card.querySelector('.hero-select-btn');
                if (lockDiv) lockDiv.style.display = 'none';
                if (selectBtn) selectBtn.style.display = 'block';
                
                // Actualizar visual del héroe
                const visualDiv = card.querySelector('.hero-visual');
                if (visualDiv) {
                    visualDiv.style.borderColor = hero.color;
                }
            } else {
                card.style.opacity = '0.7';
                const lockDiv = card.querySelector('.hero-lock');
                const selectBtn = card.querySelector('.hero-select-btn');
                if (lockDiv) lockDiv.style.display = 'block';
                if (selectBtn) selectBtn.style.display = 'none';
            }
        }
    }
}

function selectHero(heroKey) {
    if (!gameData.heroes[heroKey].unlocked) {
        playSound('error');
        showTemporaryMessage(`🔒 ${gameData.heroes[heroKey].name} aún no está disponible. Completa más misiones para desbloquearlo.`);
        return;
    }
    
    gameData.selectedHero = heroKey;
    gameData.player.name = gameData.heroes[heroKey].name;
    gameData.player.heroIcon = gameData.heroes[heroKey].icon;
    gameData.player.heroBadge = gameData.heroes[heroKey].badge;
    playSound('victory');
    showTemporaryMessage(`✨ ¡${gameData.player.name} está listo para salvar vidas! ✨`);
    setScreen('main');
    saveGame();
}

function startMission(missionId) {
    gameData.currentMission = missionId;
    document.getElementById('mission-name').textContent = `Misión: ${missionId.toUpperCase()}`;
    document.getElementById('mission-score').textContent = '0';
    updateGameHeroUI();
    
    if (MiniGames[missionId]) {
        setScreen('game');
        MiniGames[missionId].start();
    } else {
        failMission();
    }
}

function failMission() {
    playSound('error');
    setScreen('gameover');
}

// ========== MINIJUEGOS ==========
const MiniGames = {};

MiniGames.pas = {
    start() {
        const scenarios = [
            { text: 'Ves a una persona inconsciente en medio de la calle con tráfico', correct: 'Proteger', rescue: 'proteger' },
            { text: 'Encuentras un incendio en tu escuela y tus compañeros no lo saben', correct: 'Avisar', rescue: 'evacuacion' },
            { text: 'Tu amigo se cortó profundamente y sangra mucho', correct: 'Socorrer', rescue: 'vendaje' }
        ];
        const s = scenarios[Math.floor(Math.random() * scenarios.length)];
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🛡️ PROTOCOLO P.A.S. 📢🩺</h3>
            <p style="font-size: 1.2rem; text-align: center;">${s.text}</p>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                <button class="option-btn" data-opt="Proteger">🛡️ PROTEGER</button>
                <button class="option-btn" data-opt="Avisar">📢 AVISAR</button>
                <button class="option-btn" data-opt="Socorrer">🩺 SOCORRER</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.opt === s.correct) {
                    completeMission(2, 25, s.rescue);
                } else {
                    showGameFeedback(`Error. El orden es: Proteger → Avisar → Socorrer`, true);
                    setTimeout(() => this.start(), 2000);
                }
            };
        });
    }
};

MiniGames.signos = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🫀 DETECTA SIGNOS VITALES</h3>
            <p>Selecciona los 3 signos vitales básicos:</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                <button class="option-btn" data-val="respiracion">Respiración</button>
                <button class="option-btn" data-val="pulso">Pulso</button>
                <button class="option-btn" data-val="conciencia">Conciencia</button>
                <button class="option-btn" data-val="presion">Presión Arterial</button>
            </div>
            <div id="selected-signos" style="display: flex; gap: 10px; margin-top: 20px; justify-content: center;"></div>
        `;
        
        let selected = [];
        const selectedDiv = document.getElementById('selected-signos');
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                const val = btn.dataset.val;
                if (!selected.includes(val) && val !== 'presion' && selected.length < 3) {
                    selected.push(val);
                    selectedDiv.innerHTML += `<span style="background: cyan; padding: 5px 10px; border-radius: 20px;">${btn.textContent}</span>`;
                    playSound('click');
                }
                if (selected.length === 3) {
                    if (selected.includes('respiracion') && selected.includes('pulso') && selected.includes('conciencia')) {
                        completeMission(2, 20, 'rcp');
                    } else {
                        showGameFeedback('¡Incorrecto! Los signos vitales son: Respiración, Pulso y Conciencia', true);
                        setTimeout(() => this.start(), 2000);
                    }
                }
            };
        });
    }
};

MiniGames.matriz = {
    start() {
        const questions = [
            { text: 'Quemadura leve por agua caliente', correct: 'Agua fría 15 minutos', rescue: 'vendaje' },
            { text: 'Persona inconsciente que respira', correct: 'Posición lateral de seguridad', rescue: 'rcp' },
            { text: 'Sangrado nasal abundante', correct: 'Inclinar cabeza adelante', rescue: 'vendaje' }
        ];
        const q = questions[Math.floor(Math.random() * questions.length)];
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">⚡ MATRIZ DE ACCIÓN RÁPIDA</h3>
            <p style="font-size: 1.2rem;">${q.text}</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                <button class="option-btn" data-act="Agua fría 15 minutos">Agua fría 15 min</button>
                <button class="option-btn" data-act="Posición lateral de seguridad">Posición lateral</button>
                <button class="option-btn" data-act="Inclinar cabeza adelante">Inclinar cabeza adelante</button>
                <button class="option-btn" data-act="Aplicar hielo directo">Aplicar hielo directo</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.act === q.correct) {
                    completeMission(2, 20, q.rescue);
                } else {
                    showGameFeedback(`Incorrecto. La acción correcta es: ${q.correct}`, true);
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
            <h3 style="color: cyan;">🧯 SIMULADOR DE EXTINTOR</h3>
            <div style="background: rgba(255,50,0,0.3); padding: 20px; border-radius: 30px; text-align: left;">
                <div>✅ 1. Tirar del pasador de seguridad</div>
                <div>✅ 2. Apuntar a la base del fuego</div>
                <div>✅ 3. Presionar la palanca</div>
                <div>✅ 4. Barrer lateralmente</div>
            </div>
            <button id="extinguish-action" class="option-btn" style="background: #ff4400; font-size: 1.3rem;">🔥 APAGAR FUEGO 🔥</button>
        `;
        
        document.getElementById('extinguish-action').onclick = () => {
            completeMission(3, 35, 'extintor');
        };
    }
};

MiniGames.clasificacion = {
    start() {
        const container = document.getElementById('game-area');
        container.innerHTML = `
            <h3 style="color: cyan;">🔥 CLASIFICACIÓN DE FUEGOS</h3>
            <p>Fuego de aceite de cocina → ¿Clase?</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="option-btn" data-class="A">Clase A (Sólidos)</button>
                <button class="option-btn" data-class="B">Clase B (Líquidos)</button>
                <button class="option-btn" data-class="C">Clase C (Gases)</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.class === 'B') {
                    completeMission(2, 20, 'extintor');
                } else {
                    showGameFeedback('¡Incorrecto! Aceite de cocina es Clase B (líquidos inflamables)', true);
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
            <p>¿Cuál es un peligro de incendio?</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="option-btn" data-danger="enchufe">Enchufe sobrecargado</button>
                <button class="option-btn" data-danger="manta">Manta en el suelo</button>
                <button class="option-btn" data-danger="juguete">Juguete en la mesa</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.danger === 'enchufe') {
                    completeMission(2, 20, 'default');
                } else {
                    showGameFeedback('¡Peligro no detectado! La sobrecarga eléctrica es un riesgo grave', true);
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
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <button class="option-btn" data-act="agachate">Agáchate</button>
                <button class="option-btn" data-act="corre">Corre afuera</button>
                <button class="option-btn" data-act="sujetate">Cúbrete y Sujétate</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.act === 'agachate' || btn.dataset.act === 'sujetate') {
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
            <h3 style="color: cyan;">🏠 ZONAS SEGURAS</h3>
            <p>¿Dónde debes protegerte durante un sismo?</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="option-btn" data-zone="ventana">Junto a ventana</button>
                <button class="option-btn" data-zone="pilar">Bajo mesa o pilar</button>
                <button class="option-btn" data-zone="ascensor">Dentro del ascensor</button>
            </div>
        `;
        
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = () => {
                if (btn.dataset.zone === 'pilar') {
                    completeMission(2, 20, 'sismo');
                } else {
                    showGameFeedback('Zona insegura. Busca una mesa resistente o pilar estructural', true);
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
        
        function renderMaze() {
            const container = document.getElementById('game-area');
            let html = '<h3 style="color: cyan;">🚪 EVACUACIÓN SEGURA - LABERINTO</h3>';
            html += '<p>Lleva al héroe a la salida (🟢)</p>';
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
        }
        
        function movePlayer(dx, dy) {
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
        }
        
        renderMaze();
    }
};

MiniGames.examen = {
    start() {
        const questions = [
            { q: '¿Cuál es el primer paso del protocolo PAS?', a: 'proteger', valid: ['proteger', 'protege'] },
            { q: '¿Qué número de emergencias debemos llamar?', a: '112', valid: ['112', '911'] },
            { q: '¿Qué haces durante un sismo?', a: 'agacharse cubrirse', valid: ['agacharse', 'cubrirse', 'sujetarse'] }
        ];
        let currentQ = 0;
        let score = 0;
        
        function showQuestion() {
            if (currentQ >= questions.length) {
                const earnedStars = score === questions.length ? 5 : Math.floor(score * 1.5);
                completeMission(earnedStars, 50 + (score * 10), 'default');
                return;
            }
            
            const q = questions[currentQ];
            const container = document.getElementById('game-area');
            container.innerHTML = `
                <h3 style="color: cyan;">📝 EXAMEN FINAL - AGENTE CAEE</h3>
                <p>Pregunta ${currentQ + 1}/${questions.length}</p>
                <p style="background: rgba(0,0,0,0.6); padding: 20px; border-radius: 20px;">${q.q}</p>
                <input type="text" id="exam-answer" placeholder="Escribe tu respuesta..." style="padding: 12px; width: 80%; max-width: 300px; border-radius: 30px; background: rgba(0,0,0,0.7); color: white; border: 2px solid cyan;">
                <button id="submit-exam" class="option-btn">Responder</button>
            `;
            
            document.getElementById('submit-exam').onclick = () => {
                const answer = document.getElementById('exam-answer').value.toLowerCase().trim();
                const isValid = q.valid.some(v => answer.includes(v));
                
                if (isValid) {
                    showGameFeedback('✅ ¡Correcto!');
                    score++;
                } else {
                    showGameFeedback(`❌ Incorrecto. Respuesta: ${q.a}`, true);
                }
                currentQ++;
                setTimeout(showQuestion, 2000);
            };
        }
        
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
        firework.style.animationDelay = Math.random() * 2 + 's';
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
        particle.style.width = '2px';
        particle.style.height = '2px';
        particle.style.background = `rgba(0, 243, 255, ${Math.random() * 0.5})`;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `float ${Math.random() * 10 + 5}s linear infinite`;
        particleField.appendChild(particle);
    }
}

// ========== GUARDADO LOCAL ==========
function saveGame() {
    const saveData = {
        player: gameData.player,
        unlockedWorlds: gameData.unlockedWorlds,
        worldProgress: gameData.worldProgress,
        selectedHero: gameData.selectedHero,
        heroes: gameData.heroes
    };
    localStorage.setItem('caee_hero_save', JSON.stringify(saveData));
}

function loadGame() {
    const saved = localStorage.getItem('caee_hero_save');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gameData.player = data.player;
            gameData.unlockedWorlds = data.unlockedWorlds;
            gameData.worldProgress = data.worldProgress;
            gameData.selectedHero = data.selectedHero;
            if (data.heroes) gameData.heroes = data.heroes;
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
    document.getElementById('audio-toggle-main').textContent = audioEnabled ? '🔊' : '🔇';
    playSound('click');
});

// Botones de selección de héroe
document.querySelectorAll('.hero-select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const heroKey = btn.dataset.hero;
        selectHero(heroKey);
    });
});

// Click en toda la tarjeta del héroe
document.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
        const heroKey = card.dataset.hero;
        if (gameData.heroes[heroKey]?.unlocked) {
            selectHero(heroKey);
        } else {
            playSound('error');
            showTemporaryMessage(`🔒 ${gameData.heroes[heroKey]?.name || 'Héroe'} bloqueado. Completa misiones para desbloquear.`);
        }
    });
});

// Selección de mundos
document.querySelectorAll('.world-card[data-world]').forEach(card => {
    card.addEventListener('click', () => {
        if (!gameData.selectedHero) {
            showTemporaryMessage('⚠️ Primero debes seleccionar un héroe en la pantalla anterior');
            setScreen('hero-select');
            return;
        }
        
        const world = card.dataset.world;
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
        document.getElementById('loading-screen').style.display = 'none';
        setScreen('start');
        
        if (!localStorage.getItem('tutorial_shown')) {
            setTimeout(() => {
                document.getElementById('tutorial-overlay').style.display = 'flex';
            }, 500);
            localStorage.setItem('tutorial_shown', 'true');
        }
    }, 2000);
});

document.getElementById('next-tutorial')?.addEventListener('click', () => {
    document.getElementById('tutorial-overlay').style.display = 'none';
});

document.body.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}, { once: true });

console.log('🎮 CAEE Hero Academy - ¡Juego listo! El pequeño héroe que salva vidas');   