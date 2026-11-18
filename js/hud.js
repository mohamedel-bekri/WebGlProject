// Connect the game to the simple HTML menu and status display.
export function createHUD() {
  const startScreen = document.querySelector('#start-screen');
  const pauseScreen = document.querySelector('#pause-screen');
  const hud = document.querySelector('#hud');
  const ammoText = document.querySelector('#ammo');
  const startButton = document.querySelector('#start-button');
  const resumeButton = document.querySelector('#resume-button');
  const restartButton = document.querySelector('#restart-button');
  const settingsScreen = document.querySelector('#settings-screen');
  const settingsButton = document.querySelector('#settings-button');
  const settingsBackButton = document.querySelector('#settings-back-button');
  const qualityButtons = document.querySelectorAll('[data-quality]');

  settingsButton.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    settingsScreen.classList.remove('hidden');
  });

  settingsBackButton.addEventListener('click', () => {
    settingsScreen.classList.add('hidden');
    pauseScreen.classList.remove('hidden');
  });

  // --- Panneau supérieur : Vague, Ennemis restants et Score ---
  const topStatsBar = document.createElement('div');
  Object.assign(topStatsBar.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(20, 24, 22, 0.78)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '8px 20px',
    borderRadius: '4px',
    color: '#e8ece9',
    fontFamily: 'sans-serif',
    fontSize: '15px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    pointerEvents: 'none',
    display: 'flex',
    gap: '18px',
  });

  const waveSpan = document.createElement('span');
  waveSpan.textContent = 'Vague : 1';
  waveSpan.style.color = '#60a5fa';

  const remainingSpan = document.createElement('span');
  remainingSpan.textContent = 'Ennemis : 4';

  const scoreSpan = document.createElement('span');
  scoreSpan.textContent = 'Score : 0';
  scoreSpan.style.color = '#fbbf24';

  topStatsBar.append(waveSpan, remainingSpan, scoreSpan);
  hud.appendChild(topStatsBar);

  // --- Bannière d'annonce de nouvelle vague ---
  const waveBanner = document.createElement('div');
  Object.assign(waveBanner.style, {
    position: 'fixed',
    top: '22%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#f8fafc',
    fontFamily: 'sans-serif',
    fontSize: '32px',
    fontWeight: 'bold',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.85)',
    letterSpacing: '2px',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
    zIndex: '6',
  });
  document.body.appendChild(waveBanner);
  let bannerTimeout = null;

  // --- Barre de vie (bas gauche) ---
  const healthContainer = document.createElement('div');
  Object.assign(healthContainer.style, {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    width: '220px',
    background: 'rgba(20, 24, 22, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '8px 12px',
    borderRadius: '4px',
    color: '#e8ece9',
    fontFamily: 'sans-serif',
    fontSize: '14px',
    pointerEvents: 'none',
  });

  const healthLabel = document.createElement('div');
  healthLabel.textContent = 'PV : 100 / 100';
  healthLabel.style.marginBottom = '5px';
  healthLabel.style.fontWeight = 'bold';

  const healthBarBg = document.createElement('div');
  Object.assign(healthBarBg.style, {
    width: '100%',
    height: '10px',
    background: '#2c302e',
    borderRadius: '2px',
    overflow: 'hidden',
  });

  const healthBarFill = document.createElement('div');
  Object.assign(healthBarFill.style, {
    width: '100%',
    height: '100%',
    background: '#4caf50',
    transition: 'width 0.15s ease, background-color 0.2s ease',
  });

  healthBarBg.appendChild(healthBarFill);
  healthContainer.appendChild(healthLabel);
  healthContainer.appendChild(healthBarBg);
  hud.appendChild(healthContainer);

  // --- Flash rouge à l'impact ---
  const damageFlash = document.createElement('div');
  Object.assign(damageFlash.style, {
    position: 'fixed',
    inset: '0',
    background: 'radial-gradient(circle, transparent 45%, rgba(220, 38, 38, 0.55) 100%)',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'opacity 0.25s ease-out',
    zIndex: '5',
  });
  document.body.appendChild(damageFlash);
  let flashTimeout = null;

  // --- Écran Game Over ---
  const gameOverScreen = document.createElement('div');
  Object.assign(gameOverScreen.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(15, 18, 16, 0.88)',
    display: 'none',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f2f4f3',
    fontFamily: 'sans-serif',
    zIndex: '20',
  });

  gameOverScreen.innerHTML = `
    <h1 style="font-size: 48px; margin: 0 0 10px; color: #ef4444; letter-spacing: 2px;">VOUS ÊTES MORT</h1>
    <p id="gameover-summary" style="font-size: 20px; margin: 0 0 24px; color: #fbbf24; font-weight: bold;">Vague atteinte : 1 — Score final : 0</p>
    <button id="gameover-restart-btn" style="padding: 12px 28px; font-size: 16px; font-weight: bold; cursor: pointer; background: #4caf50; color: white; border: none; border-radius: 4px;">
      Rejouer
    </button>
  `;
  document.body.appendChild(gameOverScreen);
  const gameOverRestartBtn = gameOverScreen.querySelector('#gameover-restart-btn');
  const gameOverSummary = gameOverScreen.querySelector('#gameover-summary');

  return {
    bind(buttonActions) {
      startButton.addEventListener('click', buttonActions.start);
      resumeButton.addEventListener('click', buttonActions.resume);
      restartButton.addEventListener('click', buttonActions.restart);
      gameOverRestartBtn.addEventListener('click', buttonActions.restart);
    },
    showMenu() {
      settingsScreen.classList.add('hidden');
      startScreen.classList.remove('hidden');
      pauseScreen.classList.add('hidden');
      hud.classList.add('hidden');
      gameOverScreen.style.display = 'none';
    },
    showGame() {
      settingsScreen.classList.add('hidden');
      startScreen.classList.add('hidden');
      pauseScreen.classList.add('hidden');
      hud.classList.remove('hidden');
      gameOverScreen.style.display = 'none';
    },
    showPause() {
      settingsScreen.classList.add('hidden');
      startScreen.classList.add('hidden');
      pauseScreen.classList.remove('hidden');
      hud.classList.add('hidden');
      gameOverScreen.style.display = 'none';
    },
    showGameOver(wave = 1, score = 0) {
      settingsScreen.classList.add('hidden');
      startScreen.classList.add('hidden');
      pauseScreen.classList.add('hidden');
      hud.classList.add('hidden');
      gameOverSummary.textContent = `Vague atteinte : ${wave} — Score final : ${score}`;
      gameOverScreen.style.display = 'flex';
    },
    setAmmo(amount) {
      ammoText.textContent = `Ammo: ${amount} / 30`;
    },
    setHealth(current, max = 100) {
      const clamped = Math.max(0, Math.round(current));
      const pct = (clamped / max) * 100;
      healthLabel.textContent = `PV : ${clamped} / ${max}`;
      healthBarFill.style.width = `${pct}%`;

      if (pct > 50) healthBarFill.style.background = '#4caf50';
      else if (pct > 25) healthBarFill.style.background = '#f59e0b';
      else healthBarFill.style.background = '#ef4444';
    },
    setWaveStats(wave, remaining, score) {
      waveSpan.textContent = `Vague : ${wave}`;
      remainingSpan.textContent = `Ennemis : ${remaining}`;
      scoreSpan.textContent = `Score : ${score}`;
    },
    announceWave(waveNumber) {
      waveBanner.textContent = `VAGUE ${waveNumber}`;
      waveBanner.style.opacity = '1';
      clearTimeout(bannerTimeout);
      bannerTimeout = setTimeout(() => {
        waveBanner.style.opacity = '0';
      }, 1800);
    },
    triggerDamageFlash() {
      damageFlash.style.opacity = '1';
      clearTimeout(flashTimeout);
      flashTimeout = setTimeout(() => {
        damageFlash.style.opacity = '0';
      }, 150);
    },
    onQualityChange(callback) {
      qualityButtons.forEach((button) => {
        button.addEventListener('click', () => callback(button.dataset.quality));
      });
    },
    setQualityActive(level) {
      qualityButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.quality === level);
      });
    },
  };
}