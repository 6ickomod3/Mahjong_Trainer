// ===== Game UI =====
// Renders the mahjong game table and handles user interactions
// Depends on: mahjong.js, gameController.js, tiles.js

// ===== Create tile element for game =====
function createGameTile(tile, opts = {}) {
  const el = document.createElement('div');
  el.className = 'game-tile';
  if (opts.faceDown) {
    el.classList.add('game-tile-back');
    return el;
  }
  if (opts.small) el.classList.add('game-tile-sm');
  if (opts.highlight) el.classList.add('game-tile-highlight');
  if (opts.clickable) el.classList.add('game-tile-clickable');
  if (opts.drawn) el.classList.add('game-tile-drawn');

  // Determine CSS class
  if (tile.type === 'suit') {
    el.classList.add('game-tile-' + tile.suit);
  } else if (tile.type === 'wind') {
    el.classList.add('game-tile-wind');
  } else if (tile.type === 'dragon') {
    el.classList.add('game-tile-dragon');
    if (tile.id === 'jian_zhong') el.classList.add('game-tile-zhong');
    else if (tile.id === 'jian_fa') el.classList.add('game-tile-fa');
    else if (tile.id === 'jian_bai') el.classList.add('game-tile-bai');
  } else if (tile.type === 'flower') {
    el.classList.add('game-tile-flower');
  }

  const charSpan = document.createElement('span');
  charSpan.className = 'game-tile-char';
  charSpan.textContent = tile.char;
  el.appendChild(charSpan);

  if (tile.sub) {
    const subSpan = document.createElement('span');
    subSpan.className = 'game-tile-sub';
    subSpan.textContent = tile.sub;
    el.appendChild(subSpan);
  }

  return el;
}

// ===== Game UI Renderer =====
class GameUI {
  constructor(container, options = {}) {
    this.container = container;
    this.controller = null;
    this.game = null;
    this.options = options;
    this.simulationMode = !!options.simulationMode;
    this.autoRestart = !!options.autoRestart;
    this.speedMultiplier = options.speedMultiplier || 1;
    this._simRestartTimer = null;
    this.tileSize = 'large'; // 'normal' | 'large' | 'xlarge'
    // Session-level tracking
    this.sessionScores = [0, 0, 0, 0]; // cumulative per player
    this.roundHistory = [];             // [{round, winner, winType, loser, score, scores:[...]}]
    this.roundNumber = 0;
    this.hintEnabled = !!options.hintEnabled;
    // AI level per player: 0=Manual(Human), 1=Easy, 2=Medium, 3=Hard
    this.aiLevels = options.aiLevels ? [...options.aiLevels] : [0, 2, 2, 2];
    this._buildLayout();
  }

  _buildLayout() {
    this.container.innerHTML = '';

    // Rule selection sub-screen
    this.ruleScreen = document.createElement('div');
    this.ruleScreen.className = 'game-rule-select';
    this.ruleScreen.innerHTML = `
      <h2 class="game-rule-title">选择规则 <span class="game-rule-sub">Choose Rules</span></h2>
      <div class="game-rule-cards" id="game-rule-cards"></div>
    `;
    this.container.appendChild(this.ruleScreen);

    // Game table
    this.tableWrap = document.createElement('div');
    this.tableWrap.className = 'game-table-wrap';
    this.tableWrap.style.display = 'none';
    this.tableWrap.innerHTML = `
      <div class="game-toolbar">
        <label class="game-size-label">牌大小 Tile Size:</label>
        <div class="game-size-btns" id="game-size-btns">
          <button class="game-size-btn" data-size="normal">小 S</button>
          <button class="game-size-btn active" data-size="large">中 M</button>
          <button class="game-size-btn" data-size="xlarge">大 L</button>
        </div>
        <div class="game-speed-btns" id="game-speed-btns">
          <button class="game-speed-btn" data-speed="1">1x</button>
          <button class="game-speed-btn" data-speed="2">2x</button>
          <button class="game-speed-btn" data-speed="4">4x</button>
        </div>
        <button class="game-hint-toggle" id="game-hint-toggle">💡 Hint: OFF</button>
      </div>
      <div class="game-table">
        <!-- Top player (seat 2, West) -->
        <div class="game-seat game-seat-top">
          <div class="game-seat-header">
            <span class="game-seat-name" id="gs-name-2"></span>
            <select class="ai-level-select" id="gs-ailevel-2">
              <option value="1">Easy</option>
              <option value="2" selected>Medium</option>
              <option value="3">Hard</option>
            </select>
            <span class="game-seat-flowers" id="gs-flowers-2"></span>
          </div>
          <div class="game-seat-melds" id="gs-melds-2"></div>
          <div class="game-seat-hand" id="gs-hand-2"></div>
        </div>
        <!-- Left player (seat 3, North) -->
        <div class="game-seat game-seat-left">
          <div class="game-seat-header">
            <span class="game-seat-name" id="gs-name-3"></span>
            <select class="ai-level-select" id="gs-ailevel-3">
              <option value="1">Easy</option>
              <option value="2" selected>Medium</option>
              <option value="3">Hard</option>
            </select>
            <span class="game-seat-flowers" id="gs-flowers-3"></span>
          </div>
          <div class="game-seat-melds" id="gs-melds-3"></div>
          <div class="game-seat-hand" id="gs-hand-3"></div>
        </div>
        <!-- Right player (seat 1, South) -->
        <div class="game-seat game-seat-right">
          <div class="game-seat-header">
            <span class="game-seat-name" id="gs-name-1"></span>
            <select class="ai-level-select" id="gs-ailevel-1">
              <option value="1">Easy</option>
              <option value="2" selected>Medium</option>
              <option value="3">Hard</option>
            </select>
            <span class="game-seat-flowers" id="gs-flowers-1"></span>
          </div>
          <div class="game-seat-melds" id="gs-melds-1"></div>
          <div class="game-seat-hand" id="gs-hand-1"></div>
        </div>
        <!-- Center info + discard area -->
        <div class="game-center">
          <div class="game-center-info">
            <div class="game-wall-count" id="game-wall-count">余牌: --</div>
            <div class="game-turn-indicator" id="game-turn-indicator"></div>
            <div class="game-ting-info" id="game-ting-info" style="display:none;"></div>
          </div>
          <div class="game-discard-area">
            <div class="game-discard-river" id="gs-discards-2"></div>
            <div class="game-discard-middle-row">
              <div class="game-discard-river game-discard-left" id="gs-discards-3"></div>
              <div class="game-discard-river game-discard-right" id="gs-discards-1"></div>
            </div>
            <div class="game-discard-river" id="gs-discards-0"></div>
          </div>
        </div>
        <!-- Bottom player (seat 0, human) -->
        <div class="game-seat game-seat-bottom">
          <div class="game-seat-header">
            <span class="game-seat-name" id="gs-name-0"></span>
            <select class="ai-level-select" id="gs-ailevel-0">
              <option value="1">Easy</option>
              <option value="2" selected>Medium</option>
              <option value="3">Hard</option>
            </select>
            <span class="game-seat-flowers" id="gs-flowers-0"></span>
          </div>
          <div class="game-seat-melds" id="gs-melds-0"></div>
          <div class="game-seat-hand" id="gs-hand-0"></div>
        </div>
      </div>
      <!-- Action panel -->
      <div class="game-action-panel" id="game-action-panel" style="display:none;"></div>
      <!-- Game result overlay -->
      <div class="game-result-overlay" id="game-result-overlay" style="display:none;">
        <div class="game-result-card">
          <div class="game-result-title" id="game-result-title"></div>
          <div class="game-result-detail" id="game-result-detail"></div>
          <div class="game-result-hand" id="game-result-hand"></div>
          <button class="btn-generate game-btn-restart" id="game-btn-restart">
            🔄 再来一局 <span class="btn-sub">Play Again</span>
          </button>
          <button class="btn-hint game-btn-back" id="game-btn-back-result">
            ← 返回选择 <span class="btn-sub">Back to Menu</span>
          </button>
        </div>
      </div>
      <!-- Game log -->
      <div class="game-log-panel">
        <details>
          <summary>📋 游戏日志 Log</summary>
          <div class="game-log" id="game-log"></div>
        </details>
      </div>
      <!-- Session Scoreboard -->
      <div class="game-scoreboard" id="game-scoreboard">
        <div class="game-scoreboard-header">
          <span class="game-scoreboard-title">🏆 战绩 Session Scores</span>
          <span class="game-scoreboard-round" id="game-round-label">第 0 局</span>
        </div>
        <div class="game-scoreboard-totals" id="game-scoreboard-totals"></div>
        <div class="game-scoreboard-history" id="game-scoreboard-history"></div>
      </div>
    `;
    this.container.appendChild(this.tableWrap);

    this._cacheEls();
  }

  _cacheEls() {
    this.els = {};
    for (let i = 0; i < 4; i++) {
      this.els['name' + i] = document.getElementById('gs-name-' + i);
      this.els['flowers' + i] = document.getElementById('gs-flowers-' + i);
      this.els['melds' + i] = document.getElementById('gs-melds-' + i);
      this.els['hand' + i] = document.getElementById('gs-hand-' + i);
      this.els['discards' + i] = document.getElementById('gs-discards-' + i);
    }
    this.els.wallCount = document.getElementById('game-wall-count');
    this.els.turnIndicator = document.getElementById('game-turn-indicator');
    this.els.tingInfo = document.getElementById('game-ting-info');
    this.els.actionPanel = document.getElementById('game-action-panel');
    this.els.resultOverlay = document.getElementById('game-result-overlay');
    this.els.resultTitle = document.getElementById('game-result-title');
    this.els.resultDetail = document.getElementById('game-result-detail');
    this.els.resultHand = document.getElementById('game-result-hand');
    this.els.log = document.getElementById('game-log');
    this.els.ruleCards = document.getElementById('game-rule-cards');
    this.els.scoreboard = document.getElementById('game-scoreboard');
    this.els.scoreboardTotals = document.getElementById('game-scoreboard-totals');
    this.els.scoreboardHistory = document.getElementById('game-scoreboard-history');
    this.els.roundLabel = document.getElementById('game-round-label');
    this.els.hintToggle = document.getElementById('game-hint-toggle');
    this.els.speedBtns = document.getElementById('game-speed-btns');

    // Button bindings
    document.getElementById('game-btn-restart').addEventListener('click', () => this.startGame());
    document.getElementById('game-btn-back-result').addEventListener('click', () => this.showRuleSelect());
    this.els.hintToggle.addEventListener('click', () => {
      this.hintEnabled = !this.hintEnabled;
      this._updateHintButton();
      if (this.game) this.render(this.game);
    });
    this._updateHintButton();

    // AI level dropdowns
    for (let i = 0; i <= 3; i++) {
      const sel = document.getElementById('gs-ailevel-' + i);
      if (sel) {
        sel.value = this.aiLevels[i];
        const idx = i;
        sel.addEventListener('change', () => {
          this.aiLevels[idx] = parseInt(sel.value);
          if (this.controller) {
            this.controller.aiLevels[idx] = this.aiLevels[idx];
          }
        });
        if (this.simulationMode) {
          sel.disabled = false;
        } else if (i === 0) {
          sel.disabled = true;
          sel.style.display = 'none';
        }
      }
    }

    if (this.simulationMode) {
      const hintBtn = this.els.hintToggle;
      if (hintBtn) hintBtn.style.display = 'none';
      if (this.els.speedBtns) this.els.speedBtns.style.display = '';
    } else {
      if (this.els.speedBtns) this.els.speedBtns.style.display = 'none';
    }

    if (this.els.speedBtns) {
      this._updateSpeedButtons();
      this.els.speedBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.game-speed-btn');
        if (!btn) return;
        this.speedMultiplier = parseInt(btn.dataset.speed);
        this._updateSpeedButtons();
        if (this.controller && this.controller.setSpeed) {
          this.controller.setSpeed(this.speedMultiplier);
        }
      });
    }

    // Tile size toggle
    const sizeBtns = document.getElementById('game-size-btns');
    sizeBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('.game-size-btn');
      if (!btn) return;
      sizeBtns.querySelectorAll('.game-size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.tileSize = btn.dataset.size;
      this.tableWrap.classList.remove('game-size-normal', 'game-size-large', 'game-size-xlarge');
      this.tableWrap.classList.add('game-size-' + this.tileSize);
      if (this.game) this.render(this.game);
    });
  }

  _updateHintButton() {
    if (!this.els || !this.els.hintToggle) return;
    this.els.hintToggle.textContent = this.hintEnabled ? '💡 Hint: ON' : '💡 Hint: OFF';
    this.els.hintToggle.classList.toggle('active', this.hintEnabled);
  }

  _updateSpeedButtons() {
    if (!this.els || !this.els.speedBtns) return;
    this.els.speedBtns.querySelectorAll('.game-speed-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.speed) === this.speedMultiplier);
    });
  }

  // ===== Rule Selection =====
  showRuleSelect() {
    if (this.controller) this.controller.destroy();
    if (this._simRestartTimer) {
      clearTimeout(this._simRestartTimer);
      this._simRestartTimer = null;
    }
    this.ruleScreen.style.display = '';
    this.tableWrap.style.display = 'none';
    // Reset session when going back to rule select
    this.sessionScores = [0, 0, 0, 0];
    this.roundHistory = [];
    this.roundNumber = 0;
    this._renderRuleCards();
  }

  _renderRuleCards() {
    const container = this.els.ruleCards;
    container.innerHTML = '';
    for (const [id, rule] of Object.entries(GAME_RULES)) {
      const card = document.createElement('button');
      card.className = 'mode-card';
      card.innerHTML = `
        <span class="mode-icon">🀄</span>
        <span class="mode-name">${rule.name}</span>
        <span class="mode-desc">${rule.label}</span>
        <span class="mode-badge mode-badge-ready">开始 Start</span>
      `;
      card.addEventListener('click', () => {
        this.selectedRule = id;
        this.startGame();
      });
      container.appendChild(card);
    }
  }

  // ===== Start Game =====
  startGame() {
    if (this._simRestartTimer) {
      clearTimeout(this._simRestartTimer);
      this._simRestartTimer = null;
    }
    this.ruleScreen.style.display = 'none';
    this.tableWrap.style.display = '';
    this.tableWrap.classList.add('game-size-' + this.tileSize);
    this.els.resultOverlay.style.display = 'none';
    this.roundNumber++;

    this.game = new MahjongGame(this.selectedRule || 'shanghai');
    if (this.simulationMode) {
      for (let i = 0; i < 4; i++) {
        this.game.players[i].isHuman = false;
        this.game.players[i].name = `AI ${SEAT_WIND_CHARS[i]}`;
      }
    }
    // Carry session scores into the new game
    for (let i = 0; i < 4; i++) {
      this.game.players[i].score = this.sessionScores[i];
    }
    this.controller = new GameController(this.game, (g) => this.render(g));
    // Sync AI levels to controller
    this.controller.aiLevels = [...this.aiLevels];
    if (this.controller.setSpeed) this.controller.setSpeed(this.speedMultiplier);
    this._renderScoreboard();
    this.controller.start();
  }

  startSimulation() {
    this.selectedRule = 'shanghai';
    this.startGame();
  }

  // ===== Count visible tiles of a given id =====
  _countVisible(tileId) {
    if (!this.game) return 0;
    let count = 0;
    for (let i = 0; i < 4; i++) {
      const p = this.game.players[i];
      // Discards (all visible)
      for (const t of p.discards) if (t.id === tileId) count++;
      // Melds (visible to all)
      for (const m of p.melds) {
        for (const t of m.tiles) if (t.id === tileId) count++;
      }
    }
    // Human hand tiles
    for (const t of this.game.players[0].hand) if (t.id === tileId) count++;
    return count;
  }

  _addTooltip(el, tile) {
    if (!tile || tile.type === 'flower') return;
    const visible = this._countVisible(tile.id);
    const remaining = 4 - visible;
    const name = this.game._tileName(tile);
    el.title = `${name} — 剩余 ${remaining} 张 (${remaining} left)`;
    // Badge
    const badge = document.createElement('span');
    badge.className = 'game-tile-remaining';
    badge.textContent = remaining;
    if (remaining === 0) badge.classList.add('game-tile-remaining-zero');
    el.appendChild(badge);
    el.classList.add('game-tile-has-tooltip');
  }

  _tileFromIndex(idx) {
    if (idx >= 0 && idx <= 8) {
      return { id: `wan${idx + 1}`, char: NUM_CHARS[idx], sub: '万', num: idx + 1, suit: 'wan', type: 'suit' };
    }
    if (idx >= 9 && idx <= 17) {
      const n = idx - 9;
      return { id: `tiao${n + 1}`, char: NUM_CHARS[n], sub: '条', num: n + 1, suit: 'tiao', type: 'suit' };
    }
    if (idx >= 18 && idx <= 26) {
      const n = idx - 18;
      return { id: `bing${n + 1}`, char: NUM_CHARS[n], sub: '饼', num: n + 1, suit: 'bing', type: 'suit' };
    }
    if (idx === 27) return { id: 'feng_dong', char: '東', sub: '', name: '东风', suit: 'feng', type: 'wind' };
    if (idx === 28) return { id: 'feng_nan', char: '南', sub: '', name: '南风', suit: 'feng', type: 'wind' };
    if (idx === 29) return { id: 'feng_xi', char: '西', sub: '', name: '西风', suit: 'feng', type: 'wind' };
    if (idx === 30) return { id: 'feng_bei', char: '北', sub: '', name: '北风', suit: 'feng', type: 'wind' };
    if (idx === 31) return { id: 'jian_zhong', char: '中', sub: '', name: '红中', suit: 'jian', type: 'dragon' };
    if (idx === 32) return { id: 'jian_fa', char: '發', sub: '', name: '发财', suit: 'jian', type: 'dragon' };
    if (idx === 33) return { id: 'jian_bai', char: '白', sub: '', name: '白板', suit: 'jian', type: 'dragon' };
    return null;
  }

  _renderTingInfo() {
    const el = this.els.tingInfo;
    if (!el || !this.game) return;

    const handArr = handToArray(this.game.players[0].hand);
    const sh = calculateShanten(handArr);

    if (sh !== 0) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }

    const winTiles = [];
    for (let i = 0; i < 34; i++) {
      if (handArr[i] >= 4) continue;
      const t = this._tileFromIndex(i);
      if (!t) continue;
      if (this.game.canWinWith(0, t)) {
        const visible = this._countVisible(t.id);
        const remaining = Math.max(0, 4 - visible);
        const d = indexToDisplay(i);
        winTiles.push({ idx: i, char: d.char, sub: d.sub || '', remaining });
      }
    }

    if (winTiles.length === 0) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }

    winTiles.sort((a, b) => b.remaining - a.remaining || a.idx - b.idx);
    const total = winTiles.reduce((sum, w) => sum + w.remaining, 0);

    let html = `<div class="game-ting-title">🎯 听牌中 Ting · 可胡 ${winTiles.length} 种 / ${total} 枚</div>`;
    html += '<div class="game-ting-list">';
    for (const w of winTiles) {
      html += `<span class="game-ting-item">${w.char}${w.sub}<b>${w.remaining}</b></span>`;
    }
    html += '</div>';
    el.innerHTML = html;
    el.style.display = '';
  }

  /**
   * Add a rich analysis tooltip to a hand tile during discard phase.
   * Shows: shanten, effective tiles (types + total count), ranking, and the tiles themselves.
   */
  _addDiscardTooltip(el, tile, analysis, rank, bestShanten) {
    if (!tile || tile.type === 'flower') return;
    const visible = this._countVisible(tile.id);
    const remaining = 4 - visible;

    // Remove native title (we use custom popup)
    el.removeAttribute('title');

    // Remaining badge (keep it)
    const badge = document.createElement('span');
    badge.className = 'game-tile-remaining';
    badge.textContent = remaining;
    if (remaining === 0) badge.classList.add('game-tile-remaining-zero');
    el.appendChild(badge);
    el.classList.add('game-tile-has-tooltip');

    // Rich tooltip popup
    const popup = document.createElement('div');
    popup.className = 'game-tile-popup';

    const name = this.game._tileName(tile);
    let html = `<div class="gtp-header">${name}</div>`;

    if (analysis) {
      // Shanten
      const shLabel = analysis.shanten === 0 ? '听牌 Tenpai!'
        : analysis.shanten === -1 ? '和了 Win!'
        : `${analysis.shanten} 向听`;
      const shClass = analysis.shanten <= 0 ? 'gtp-good' : analysis.shanten > bestShanten ? 'gtp-bad' : '';
      html += `<div class="gtp-row ${shClass}"><span class="gtp-label">向听</span><span class="gtp-val">${shLabel}</span></div>`;

      // Effective tiles count
      html += `<div class="gtp-row"><span class="gtp-label">进张</span><span class="gtp-val">${analysis.effectiveTypes}种 ${analysis.ukeire}枚</span></div>`;

      // Rank
      const rankClass = rank === 1 ? 'gtp-good' : '';
      html += `<div class="gtp-row ${rankClass}"><span class="gtp-label">排名</span><span class="gtp-val">#${rank}${rank === 1 ? ' ★' : ''}</span></div>`;

      // List effective tiles (compact)
      if (analysis.effectiveTiles && analysis.effectiveTiles.length > 0) {
        const tileStrs = analysis.effectiveTiles.map(et => {
          const d = indexToDisplay(et.idx);
          return `${d.char}${d.sub || ''}×${et.count}`;
        });
        // Show up to 10 tiles, then '...'
        const display = tileStrs.length > 10
          ? tileStrs.slice(0, 10).join(' ') + ' ...'
          : tileStrs.join(' ');
        html += `<div class="gtp-tiles">${display}</div>`;
      }
    } else {
      html += `<div class="gtp-row"><span class="gtp-label">剩余</span><span class="gtp-val">${remaining}张</span></div>`;
    }

    popup.innerHTML = html;
    el.appendChild(popup);
  }

  // ===== Render Game State =====
  render(game) {
    this.game = game;

    // Wall count
    this.els.wallCount.textContent = `余牌: ${game.wallRemaining()}`;

    // Turn indicator
    const cp = game.players[game.currentPlayer];
    this.els.turnIndicator.textContent = game.phase === 'ended' ? '游戏结束' : `${cp.name} 的回合`;
    const youSeat = this.game.players.findIndex(p => p.isHuman);
    this.els.turnIndicator.className = 'game-turn-indicator' + (game.currentPlayer === youSeat ? ' game-turn-you' : '');
    this._renderTingInfo();

    // Each player
    for (let i = 0; i < 4; i++) {
      this._renderPlayer(i);
    }

    // Actions
    this._renderActions();

    // Log
    this._renderLog();

    // Result
    if (game.phase === 'ended') {
      this._showResult();
      if (this.simulationMode && this.autoRestart) {
        this._simRestartTimer = setTimeout(() => {
          this.startGame();
        }, Math.max(200, 1200 / this.speedMultiplier));
      }
    }
  }

  _renderPlayer(idx) {
    const p = this.game.players[idx];
    const isActive = this.game.currentPlayer === idx;

    // Name + score
    const scoreStr = p.score !== 0 ? ` (${p.score > 0 ? '+' : ''}${p.score})` : '';
    const nameEl = this.els['name' + idx];
    nameEl.textContent = `${SEAT_WIND_CHARS[idx]} ${p.name}${scoreStr}`;
    nameEl.className = 'game-seat-name' + (isActive ? ' game-seat-active' : '');

    // Flowers
    const flEl = this.els['flowers' + idx];
    flEl.innerHTML = '';
    if (p.flowers.length > 0) {
      const span = document.createElement('span');
      span.className = 'game-flower-count';
      span.textContent = '🌸×' + p.flowers.length;
      span.title = p.flowers.map(f => f.char).join(' ');
      flEl.appendChild(span);
    }

    // Melds
    const meldsEl = this.els['melds' + idx];
    meldsEl.innerHTML = '';
    for (const meld of p.melds) {
      const meldDiv = document.createElement('div');
      meldDiv.className = 'game-meld game-meld-' + meld.type;
      for (const tile of meld.tiles) {
        const tileEl = createGameTile(tile, {
          small: true,
          faceDown: meld.type === 'angang' && idx !== 0
        });
        if (!(meld.type === 'angang' && idx !== 0)) {
          this._addTooltip(tileEl, tile);
        }
        meldDiv.appendChild(tileEl);
      }
      meldsEl.appendChild(meldDiv);
    }

    // Hand
    const handEl = this.els['hand' + idx];
    handEl.innerHTML = '';
    if (idx === 0) {
      // Human hand — visible, clickable for discard
      const isDiscardPhase = this.game.phase === 'waiting_discard' && this.game.currentPlayer === 0;
      // Get AI analysis for highlighting + tooltips
      let aiResult = null;
      let analysisMap = null; // tileId -> analysis object
      let rankMap = null;     // tileId -> rank number
      let bestShanten = 99;
      if (isDiscardPhase && this.hintEnabled) {
        aiResult = getBestDiscard(this.game, 0);
        analysisMap = {};
        rankMap = {};
        let currentRank = 0;
        let prevKey = null;
        for (let ri = 0; ri < aiResult.allResults.length; ri++) {
          const r = aiResult.allResults[ri];
          const key = `${r.shanten}_${r.ukeire}_${r.shape}`;
          if (key !== prevKey) { currentRank = ri + 1; prevKey = key; }
          if (!analysisMap[r.tileId]) {
            analysisMap[r.tileId] = r;
            rankMap[r.tileId] = currentRank;
          }
        }
        bestShanten = aiResult.allResults.length > 0 ? aiResult.allResults[0].shanten : 99;
      }
      const recommendedId = aiResult ? aiResult.bestTileId : null;
      let recommendedMarked = false;
      for (let ti = 0; ti < p.hand.length; ti++) {
        const tile = p.hand[ti];
        const isDrawn = (ti === p.hand.length - 1 && this.game.lastDrawn &&
          tile.id === this.game.lastDrawn.id);
        const tileEl = createGameTile(tile, {
          clickable: isDiscardPhase,
          drawn: isDrawn
        });
        // Highlight recommended discard (mark first matching tile)
        if (isDiscardPhase && this.hintEnabled && recommendedId && tile.id === recommendedId && !recommendedMarked) {
          tileEl.classList.add('game-tile-recommended');
          recommendedMarked = true;
        }
        if (isDiscardPhase && this.hintEnabled && analysisMap && analysisMap[tile.id]) {
          this._addDiscardTooltip(tileEl, tile, analysisMap[tile.id], rankMap[tile.id], bestShanten);
        } else {
          this._addTooltip(tileEl, tile);
        }
        if (isDiscardPhase) {
          const tidx = ti;
          tileEl.addEventListener('click', () => {
            this.controller.humanDiscard(tidx);
          });
        }
        handEl.appendChild(tileEl);
      }
    } else {
      // AI hand — face down
      for (let ti = 0; ti < p.hand.length; ti++) {
        const tileEl = createGameTile(null, { faceDown: true, small: true });
        handEl.appendChild(tileEl);
      }
    }

    // Discards
    const discEl = this.els['discards' + idx];
    discEl.innerHTML = '';
    for (const tile of p.discards) {
      const isLast = (this.game.lastDiscard &&
        tile === p.discards[p.discards.length - 1] &&
        this.game.lastDiscard.playerIdx === idx);
      const tileEl = createGameTile(tile, { small: !isLast, highlight: isLast });
      this._addTooltip(tileEl, tile);
      discEl.appendChild(tileEl);
    }
  }

  _renderActions() {
    const panel = this.els.actionPanel;
    if (!this.game.pendingActions || this.game.pendingActions.length === 0) {
      panel.style.display = 'none';
      panel.innerHTML = '';
      return;
    }

    panel.style.display = '';
    panel.innerHTML = '';

    for (const action of this.game.pendingActions) {
      const btn = document.createElement('button');
      btn.className = 'game-action-btn';
      if (action.type === 'hu') btn.classList.add('game-action-hu');
      if (action.type === 'pass') btn.classList.add('game-action-pass');
      if (action.type === 'pong') btn.classList.add('game-action-pong');
      if (action.type === 'gang' || action.type === 'angang' || action.type === 'jiagang') btn.classList.add('game-action-gang');
      if (action.type === 'chi') btn.classList.add('game-action-chi');
      if (this.hintEnabled && action.recommended) btn.classList.add('game-action-recommended');
      if (this.hintEnabled && action.preferred) btn.classList.add('game-action-preferred');

      let label = action.label;
      if (this.hintEnabled && action.recommended) label += ' ★建议';
      else if (this.hintEnabled && action.type === 'chi' && action.preferred) label += '（首选吃）';
      btn.textContent = label;

      if (this.hintEnabled && action.advice) {
        btn.title = action.advice;
      }
      btn.addEventListener('click', () => {
        this.controller.humanAction(action);
      });
      panel.appendChild(btn);
    }
  }

  _renderLog() {
    const logEl = this.els.log;
    logEl.innerHTML = '';
    const entries = this.game.log.slice(-30);
    for (const msg of entries) {
      const div = document.createElement('div');
      div.className = 'game-log-entry';
      div.textContent = msg;
      logEl.appendChild(div);
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  _showResult() {
    const overlay = this.els.resultOverlay;
    overlay.style.display = '';

    // Record session history
    this._recordRound();

    if (this.game.winner !== null) {
      const winner = this.game.players[this.game.winner];
      this.els.resultTitle.textContent = this.game.winner === 0
        ? '🎉 你赢了！ You Win!'
        : `${winner.name} 胡牌！`;
      this.els.resultDetail.textContent = this.game.winType === 'zimo'
        ? '自摸 (Self-drawn win)'
        : `点炮 by ${this.game.players[this.game.loser].name}`;

      // Show winner's hand
      const handDiv = this.els.resultHand;
      handDiv.innerHTML = '<div class="game-result-label">胡牌手牌:</div>';
      const tilesRow = document.createElement('div');
      tilesRow.className = 'game-result-tiles';
      for (const tile of winner.hand) {
        tilesRow.appendChild(createGameTile(tile, { small: true }));
      }
      // Show melds
      for (const meld of winner.melds) {
        const gap = document.createElement('span');
        gap.className = 'game-result-meld-gap';
        tilesRow.appendChild(gap);
        for (const tile of meld.tiles) {
          tilesRow.appendChild(createGameTile(tile, { small: true }));
        }
      }
      handDiv.appendChild(tilesRow);

      // Flowers
      if (winner.flowers.length > 0) {
        const flDiv = document.createElement('div');
        flDiv.className = 'game-result-flowers';
        flDiv.textContent = '花牌: ' + winner.flowers.map(f => f.char).join(' ') + ` (${winner.flowers.length}花)`;
        handDiv.appendChild(flDiv);
      }

      // Scoring breakdown
      if (this.game.winScore) {
        const sc = this.game.winScore;
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'game-result-score';
        let html = '<div class="game-result-score-title">📊 计分 Scoring</div>';
        html += '<table class="game-score-table">';
        html += `<tr><td>花牌 Flowers</td><td>${sc.flowerCount}花</td></tr>`;
        if (sc.meldFlowers > 0) html += `<tr><td>刃子/杠 Melds</td><td>${sc.meldFlowers}花</td></tr>`;
        html += `<tr><td>基础花 Base</td><td>${sc.baseFlowers}花</td></tr>`;
        for (const f of sc.fan) {
          html += `<tr><td>番 ${f.name}</td><td>${f.value >= 10 ? f.value + '花' : f.value + '番'}</td></tr>`;
        }
        html += `<tr class="game-score-total"><td>得分 Points</td><td>${sc.finalPoints}花</td></tr>`;
        html += '</table>';

        if (this.game.winType === 'zimo') {
          html += `<div class="game-score-payment">自摸: 三家各付 ${sc.finalPoints}花</div>`;
        } else {
          html += `<div class="game-score-payment">点炮: ${this.game.players[this.game.loser].name} 付 ${sc.finalPoints}花</div>`;
        }

        // Current standings
        html += '<div class="game-score-standings">';
        for (let i = 0; i < 4; i++) {
          const p = this.game.players[i];
          const s = p.score || 0;
          html += `<span class="game-score-player ${s > 0 ? 'positive' : s < 0 ? 'negative' : ''}">${SEAT_WIND_CHARS[i]} ${s > 0 ? '+' : ''}${s}</span>`;
        }
        html += '</div>';

        scoreDiv.innerHTML = html;
        handDiv.appendChild(scoreDiv);
      }
    } else {
      this.els.resultTitle.textContent = '流局 Draw Game';
      this.els.resultDetail.textContent = '牌墙已空 No tiles remaining';
      this.els.resultHand.innerHTML = '';
    }
  }

  // ===== Session Tracking =====
  _recordRound() {
    // Compute per-round deltas before updating session totals
    const prevScores = [...this.sessionScores];
    for (let i = 0; i < 4; i++) {
      this.sessionScores[i] = this.game.players[i].score;
    }
    const roundDeltas = this.sessionScores.map((s, i) => s - prevScores[i]);

    const entry = { round: this.roundNumber };
    if (this.game.winner !== null) {
      const w = this.game.players[this.game.winner];
      entry.winner = this.game.winner;
      entry.winnerName = w.name;
      entry.winType = this.game.winType;
      entry.points = this.game.winScore ? this.game.winScore.finalPoints : 0;
      if (this.game.loser !== null && this.game.loser !== undefined) {
        entry.loser = this.game.loser;
        entry.loserName = this.game.players[this.game.loser].name;
      }
    } else {
      entry.draw = true;
    }
    entry.scores = [...this.sessionScores];     // cumulative
    entry.deltas = roundDeltas;                 // per-round
    this.roundHistory.push(entry);
    this._renderScoreboard();
  }

  _renderScoreboard() {
    // Round label
    this.els.roundLabel.textContent = `第 ${this.roundNumber} 局`;

    // Totals
    const totals = this.els.scoreboardTotals;
    totals.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const s = this.sessionScores[i];
      const div = document.createElement('div');
      div.className = 'game-sb-player' + (s > 0 ? ' positive' : s < 0 ? ' negative' : '');
      div.innerHTML = `<span class="game-sb-seat">${SEAT_WIND_CHARS[i]}</span>`
        + `<span class="game-sb-name">${SEAT_NAMES[i]}</span>`
        + `<span class="game-sb-score">${s > 0 ? '+' : ''}${s}</span>`;
      totals.appendChild(div);
    }

    // History
    const hist = this.els.scoreboardHistory;
    hist.innerHTML = '';
    if (this.roundHistory.length === 0) return;
    const table = document.createElement('table');
    table.className = 'game-sb-table';
    let headerHtml = '<thead><tr><th>#</th>';
    for (let i = 0; i < 4; i++) headerHtml += `<th>${SEAT_WIND_CHARS[i]}</th>`;
    headerHtml += '<th>结果</th></tr></thead>';
    table.innerHTML = headerHtml;
    const tbody = document.createElement('tbody');
    for (const r of this.roundHistory) {
      const tr = document.createElement('tr');
      // Use per-round deltas instead of cumulative scores
      const deltas = r.deltas || [0, 0, 0, 0];
      let cells = `<td>${r.round}</td>`;
      for (let i = 0; i < 4; i++) {
        const d = deltas[i];
        cells += `<td class="${d > 0 ? 'positive' : d < 0 ? 'negative' : ''}">${d > 0 ? '+' : ''}${d}</td>`;
      }
      if (r.draw) {
        cells += '<td>流局 Draw</td>';
      } else if (r.winType === 'zimo') {
        cells += `<td>${r.winnerName} 自摸 ${r.points}花</td>`;
      } else {
        // 点炮: show who dealt into who
        cells += `<td>${r.loserName || '?'} 点炮 → ${r.winnerName} ${r.points}花</td>`;
      }
      tr.innerHTML = cells;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    hist.appendChild(table);
  }

  destroy() {
    if (this.controller) this.controller.destroy();
    if (this._simRestartTimer) {
      clearTimeout(this._simRestartTimer);
      this._simRestartTimer = null;
    }
    this.container.innerHTML = '';
  }
}
