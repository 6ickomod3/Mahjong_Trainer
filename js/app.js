// ===== App Controller =====
// Depends on: tiles.js, shanten.js, hand.js, analysis.js, ui.js

// ===== Mode Selection =====

let gameUI = null;

function enterMode(mode) {
  document.getElementById('mode-select').style.display = 'none';
  document.getElementById('btn-back').style.display = '';
  if (mode === 'tenpai') {
    document.getElementById('tenpai-trainer').style.display = '';
  } else if (mode === 'game') {
    const container = document.getElementById('mahjong-game');
    container.style.display = '';
    if (gameUI) gameUI.destroy();
    gameUI = new GameUI(container);
    gameUI.showRuleSelect();
  } else if (mode === 'simulation') {
    const container = document.getElementById('mahjong-game');
    container.style.display = '';
    if (gameUI) gameUI.destroy();
    gameUI = new GameUI(container, {
      simulationMode: true,
      autoRestart: true,
      hintEnabled: false,
      aiLevels: [1, 1, 2, 3], // 2 weak, 1 medium, 1 strong
    });
    gameUI.startSimulation();
  }
}

function showModeSelect() {
  document.getElementById('mode-select').style.display = '';
  document.getElementById('btn-back').style.display = 'none';
  document.getElementById('tenpai-trainer').style.display = 'none';
  const gameContainer = document.getElementById('mahjong-game');
  gameContainer.style.display = 'none';
  if (gameUI) { gameUI.destroy(); gameUI = null; }
}

// ===== State =====

const state = {
  suitCount: 2,
  selectedSuits: ['wan', 'tiao'],
  includeWinds: true,
  includeDragons: true,
  dominantSuit: 'auto',
  minSuitTiles: 0,
  currentHand: null,
  selectedIndex: -1,
  bestDiscards: [],
  hintRevealed: false,
};

// ===== Initialization =====

document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const suitSelectionGroup = document.getElementById('suit-selection');
  const toggleWinds = document.getElementById('toggle-winds');
  const toggleDragons = document.getElementById('toggle-dragons');
  const dominantSuitGroup = document.getElementById('dominant-suit');
  const minSuitRange = document.getElementById('min-suit-range');
  const minSuitValue = document.getElementById('min-suit-value');
  const generateBtn = document.getElementById('generate-btn');
  const hintBanner = document.getElementById('hint-banner');
  const hintBtn = document.getElementById('hint-btn');
  const hintContent = document.getElementById('hint-content');
  const handInfo = document.getElementById('hand-info');
  const infoChips = document.getElementById('info-chips');
  const analysisPanel = document.getElementById('analysis-panel');

  const els = {
    hintBanner, hintBtn, hintContent,
    handInfo, infoChips, analysisPanel,
  };

  // ===== UI Logic =====

  function initButtonGroup(container, onSelect) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-option');
      if (!btn) return;
      container.querySelectorAll('.btn-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn.dataset.value || btn.dataset.suit);
    });
  }

  // Suit picker (free toggle, min 1 required)
  suitSelectionGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.suit-btn');
    if (!btn) return;
    if (btn.classList.contains('active')) {
      const currentlyActive = suitSelectionGroup.querySelectorAll('.suit-btn.active').length;
      if (currentlyActive <= 1) return;
      btn.classList.remove('active');
    } else {
      btn.classList.add('active');
    }
    syncSelectedSuits();
  });

  function syncSelectedSuits() {
    state.selectedSuits = [...suitSelectionGroup.querySelectorAll('.suit-btn.active')]
      .map(b => b.dataset.suit);
    state.suitCount = state.selectedSuits.length;
  }

  function setupToggle(btn, stateKey) {
    btn.addEventListener('click', () => {
      state[stateKey] = !state[stateKey];
      btn.classList.toggle('active', state[stateKey]);
      btn.dataset.enabled = state[stateKey];
    });
  }

  setupToggle(toggleWinds, 'includeWinds');
  setupToggle(toggleDragons, 'includeDragons');

  initButtonGroup(dominantSuitGroup, (val) => { state.dominantSuit = val; });

  minSuitRange.addEventListener('input', () => {
    state.minSuitTiles = parseInt(minSuitRange.value);
    minSuitValue.textContent = state.minSuitTiles;
  });

  // ===== Generate =====

  generateBtn.addEventListener('click', () => {
    const hand = generateHand(state);
    if (!hand) {
      showError('牌池不够！请增加花色或字牌。');
      return;
    }
    renderHand(hand, state, els);
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      generateBtn.click();
    }
  });

  // ===== Hint =====

  hintBtn.addEventListener('click', () => {
    state.hintRevealed = true;
    hintBtn.style.display = 'none';
    hintContent.style.display = '';
    rerenderHand(state);
    renderHintContent(state);
  });

  // Initialize suits
  syncSelectedSuits();
});
