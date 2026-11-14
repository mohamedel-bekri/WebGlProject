// Connect the game to the simple HTML menu and status display.
export function createHUD() {
  const startScreen = document.querySelector('#start-screen');
  const pauseScreen = document.querySelector('#pause-screen');
  const hud = document.querySelector('#hud');
  const ammoText = document.querySelector('#ammo');
  const startButton = document.querySelector('#start-button');
  const resumeButton = document.querySelector('#resume-button');
  const restartButton = document.querySelector('#restart-button');

  return {
    bind(buttonActions) {
      startButton.addEventListener('click', buttonActions.start);
      resumeButton.addEventListener('click', buttonActions.resume);
      restartButton.addEventListener('click', buttonActions.restart);
    },
    showMenu() {
      startScreen.classList.remove('hidden');
      pauseScreen.classList.add('hidden');
      hud.classList.add('hidden');
    },
    showGame() {
      startScreen.classList.add('hidden');
      pauseScreen.classList.add('hidden');
      hud.classList.remove('hidden');
    },
    showPause() {
      startScreen.classList.add('hidden');
      pauseScreen.classList.remove('hidden');
      hud.classList.add('hidden');
    },
    setAmmo(amount) {
      ammoText.textContent = `Ammo: ${amount} / 30`;
    },
  };
}
