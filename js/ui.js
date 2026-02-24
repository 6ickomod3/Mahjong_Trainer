// ===== UI Rendering =====
// Depends on: tiles.js, shanten.js, analysis.js

function createTileElement(tile, handIndex, state) {
  const el = document.createElement('div');
  el.className = `tile clickable ${tile.suit}`;
  if (handIndex === state.selectedIndex) el.classList.add('selected');
  if (state.hintRevealed && state.bestDiscards.includes(handIndex)) el.classList.add('best-hint');

  const charEl = document.createElement('div');
  charEl.className = 'tile-char';
  charEl.textContent = tile.char;
  el.appendChild(charEl);

  if (tile.sub) {
    const subEl = document.createElement('div');
    subEl.className = 'tile-sub';
    subEl.textContent = tile.sub;
    el.appendChild(subEl);
  }

  el.addEventListener('click', () => {
    if (state.selectedIndex === handIndex) {
      state.selectedIndex = -1;
    } else {
      state.selectedIndex = handIndex;
    }
    rerenderHand(state);
    updateAnalysis(state);
  });

  return el;
}

function createMiniTile(display, count) {
  const el = document.createElement('div');
  el.className = `tile mini ${display.suit}`;

  const charEl = document.createElement('div');
  charEl.className = 'tile-char';
  charEl.textContent = display.char;
  el.appendChild(charEl);

  if (display.sub) {
    const subEl = document.createElement('div');
    subEl.className = 'tile-sub';
    subEl.textContent = display.sub;
    el.appendChild(subEl);
  }

  if (count !== undefined) {
    const badge = document.createElement('span');
    badge.className = 'tile-badge';
    badge.textContent = `×${count}`;
    el.appendChild(badge);
  }

  return el;
}

function renderHand(hand, state, els) {
  state.currentHand = hand;
  state.selectedIndex = -1;
  state.bestDiscards = [];
  state.hintRevealed = false;
  els.analysisPanel.style.display = 'none';
  els.hintContent.style.display = 'none';

  const { best, all } = findBestDiscards(hand);
  const bestIndices = [];
  for (const b of best) bestIndices.push(...b.handIndices);
  state.bestDiscards = bestIndices;
  state._bestResult = { best, all };

  els.hintBanner.style.display = '';
  els.hintBtn.style.display = '';

  rerenderHand(state);
  renderInfo(hand, state, els);
}

function rerenderHand(state) {
  const handDisplay = document.getElementById('hand-display');
  handDisplay.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'tiles-container';

  let lastSuit = null;
  state.currentHand.forEach((tile, idx) => {
    if (lastSuit !== null && tile.suit !== lastSuit) {
      const gap = document.createElement('div');
      gap.className = 'tile-gap';
      container.appendChild(gap);
    }
    container.appendChild(createTileElement(tile, idx, state));
    lastSuit = tile.suit;
  });

  handDisplay.appendChild(container);
}

function updateAnalysis(state) {
  const els = {
    analysisPanel: document.getElementById('analysis-panel'),
    shantenValueEl: document.getElementById('shanten-value'),
    shantenDescEl: document.getElementById('shanten-desc'),
    pathSection: document.getElementById('path-section'),
    pathListEl: document.getElementById('path-list'),
    effectiveSummaryEl: document.getElementById('effective-summary'),
    effectiveTilesEl: document.getElementById('effective-tiles'),
    comboListEl: document.getElementById('combo-list'),
  };

  if (state.selectedIndex < 0 || !state.currentHand) {
    els.analysisPanel.style.display = 'none';
    return;
  }

  const remaining = state.currentHand.filter((_, i) => i !== state.selectedIndex);
  const handArr = handToArray(remaining);

  // Shanten
  const sh = calculateShanten(handArr);
  els.shantenValueEl.textContent = sh;
  if (sh === 0) {
    els.shantenDescEl.textContent = '听牌！(Tenpai)';
    els.shantenValueEl.classList.add('tenpai');
  } else if (sh === -1) {
    els.shantenValueEl.textContent = '和';
    els.shantenDescEl.textContent = '已和牌！(Complete)';
    els.shantenValueEl.classList.add('tenpai');
  } else {
    els.shantenDescEl.textContent = `还需 ${sh} 步听牌`;
    els.shantenValueEl.classList.remove('tenpai');
  }

  // Paths
  renderPaths(handArr, sh, els);

  // Effective tiles
  const effective = findEffectiveTiles(handArr, sh);
  els.effectiveTilesEl.innerHTML = '';
  const totalCount = effective.length * 4;
  for (const et of effective) {
    const display = indexToDisplay(et.index);
    els.effectiveTilesEl.appendChild(createMiniTile(display));
  }
  els.effectiveSummaryEl.textContent = `(${effective.length}种${totalCount}张)`;

  if (effective.length === 0) {
    els.effectiveTilesEl.innerHTML = '<span class="no-effective">无（已是最优或已和牌）</span>';
  }

  // Combos
  const combos = findCombos(handArr);
  els.comboListEl.innerHTML = '';

  const sections = [
    { key: 'shunzi', title: '顺子 (Sequences)', icon: '🔗' },
    { key: 'kezi',   title: '刻子 (Triplets)',  icon: '🔺' },
    { key: 'dazi',   title: '搭子 (Partials)',   icon: '🔸' },
    { key: 'duizi',  title: '对子 (Pairs)',      icon: '🔹' },
  ];

  for (const sec of sections) {
    const items = combos[sec.key];
    if (items.length === 0) continue;

    const group = document.createElement('div');
    group.className = 'combo-group';

    const header = document.createElement('div');
    header.className = 'combo-group-header';
    header.textContent = `${sec.icon} ${sec.title}`;
    group.appendChild(header);

    const chips = document.createElement('div');
    chips.className = 'combo-chips';

    for (const item of items) {
      const chip = document.createElement('span');
      chip.className = `combo-chip combo-${sec.key}`;
      let text = item.label;
      if (item.wait) text += ` (${item.wait})`;
      chip.textContent = text;
      chips.appendChild(chip);
    }

    group.appendChild(chips);
    els.comboListEl.appendChild(group);
  }

  els.analysisPanel.style.display = '';
}

function renderInfo(hand, state, els) {
  els.handInfo.style.display = '';
  els.infoChips.innerHTML = '';

  const suitsUsed = new Set();
  const suitCounts = {};
  let windCount = 0, dragonCount = 0;

  for (const tile of hand) {
    if (tile.type === 'suit') {
      suitsUsed.add(tile.suit);
      suitCounts[tile.suit] = (suitCounts[tile.suit] || 0) + 1;
    }
    if (tile.type === 'wind') windCount++;
    if (tile.type === 'dragon') dragonCount++;
  }

  const suitNames = [...suitsUsed].map(s => SUITS[s].name).join('');
  addChip(`花色: ${suitNames} (${suitsUsed.size}种)`, els.infoChips);
  addChip(`总数: ${hand.length}张`, els.infoChips);
  for (const [s, count] of Object.entries(suitCounts)) {
    addChip(`${SUITS[s].name}: ${count}张`, els.infoChips);
  }
  if (windCount > 0) addChip(`风牌: ${windCount}张`, els.infoChips);
  if (dragonCount > 0) addChip(`箭牌: ${dragonCount}张`, els.infoChips);
}

function addChip(text, container) {
  const chip = document.createElement('span');
  chip.className = 'info-chip';
  chip.textContent = text;
  container.appendChild(chip);
}

function showError(msg) {
  const handDisplay = document.getElementById('hand-display');
  const handInfo = document.getElementById('hand-info');
  const analysisPanel = document.getElementById('analysis-panel');
  handDisplay.innerHTML = `<div class="hand-placeholder"><p style="color:#e74c3c">${msg}</p></div>`;
  handInfo.style.display = 'none';
  analysisPanel.style.display = 'none';
}

function renderPaths(handArr, shanten, els) {
  if (shanten < 0) {
    els.pathSection.style.display = 'none';
    return;
  }

  const arrCopy = [...handArr];
  const paths = findExamplePaths(arrCopy, shanten, 3);

  if (paths.length === 0 && shanten > 0) {
    els.pathSection.style.display = 'none';
    return;
  }

  els.pathSection.style.display = '';
  els.pathListEl.innerHTML = '';

  if (shanten === 0) {
    const winTiles = findWinTiles([...handArr]);
    if (winTiles.length > 0) {
      const pathEl = document.createElement('div');
      pathEl.className = 'path-item';

      const label = document.createElement('span');
      label.className = 'path-label path-win';
      label.textContent = '和牌:';
      pathEl.appendChild(label);

      for (const wi of winTiles) {
        pathEl.appendChild(createMiniTile(indexToDisplay(wi)));
      }

      els.pathListEl.appendChild(pathEl);
    }
    return;
  }

  paths.forEach((path, idx) => {
    const pathEl = document.createElement('div');
    pathEl.className = 'path-item';

    const header = document.createElement('div');
    header.className = 'path-header';
    header.textContent = `路径 ${idx + 1}`;
    pathEl.appendChild(header);

    const stepsEl = document.createElement('div');
    stepsEl.className = 'path-steps';

    for (let s = 0; s < path.steps.length; s++) {
      const step = path.steps[s];

      const drawGroup = document.createElement('span');
      drawGroup.className = 'path-action';
      const drawLabel = document.createElement('span');
      drawLabel.className = 'path-label path-draw';
      drawLabel.textContent = '摸';
      drawGroup.appendChild(drawLabel);
      drawGroup.appendChild(createMiniTile(indexToDisplay(step.draw)));
      stepsEl.appendChild(drawGroup);

      const arrow1 = document.createElement('span');
      arrow1.className = 'path-arrow';
      arrow1.textContent = '→';
      stepsEl.appendChild(arrow1);

      const discardGroup = document.createElement('span');
      discardGroup.className = 'path-action';
      const discardLabel = document.createElement('span');
      discardLabel.className = 'path-label path-discard';
      discardLabel.textContent = '打';
      discardGroup.appendChild(discardLabel);
      discardGroup.appendChild(createMiniTile(indexToDisplay(step.discard)));
      stepsEl.appendChild(discardGroup);

      if (s < path.steps.length - 1) {
        const arrow2 = document.createElement('span');
        arrow2.className = 'path-arrow';
        arrow2.textContent = '→';
        stepsEl.appendChild(arrow2);
      }
    }

    const arrow3 = document.createElement('span');
    arrow3.className = 'path-arrow';
    arrow3.textContent = '→ 听';
    stepsEl.appendChild(arrow3);

    for (const wi of path.winTiles) {
      stepsEl.appendChild(createMiniTile(indexToDisplay(wi)));
    }

    pathEl.appendChild(stepsEl);
    els.pathListEl.appendChild(pathEl);
  });
}

function renderHintContent(state) {
  const hintCardsEl = document.getElementById('hint-cards');
  const hintExplanationEl = document.getElementById('hint-explanation');

  const { best, all } = state._bestResult || { best: [], all: [] };
  hintCardsEl.innerHTML = '';
  hintExplanationEl.innerHTML = '';

  if (best.length === 0) return;

  const top = best[0];

  for (const b of best) {
    const tile = b.tile;
    const miniEl = createMiniTile({
      char: tile.char,
      sub: tile.sub || '',
      suit: tile.suit,
      type: tile.type
    });
    miniEl.classList.add('hint-tile');
    hintCardsEl.appendChild(miniEl);
  }

  const lines = [];

  if (top.shanten === 0) {
    lines.push(`✅ 打出后即可 <strong>听牌</strong>！`);
  } else {
    lines.push(`向听数: <strong>${top.shanten}</strong>`);
  }
  lines.push(`有效进张: <strong>${top.effectiveTypes}种 ${top.totalUkeire}张</strong>`);

  if (all.length > 1) {
    const worst = all[all.length - 1];
    if (worst.shanten > top.shanten) {
      lines.push(`<span class="hint-compare">↔ 最差打牌向听数为 ${worst.shanten}，相差 ${worst.shanten - top.shanten} 步</span>`);
    } else if (worst.totalUkeire < top.totalUkeire) {
      lines.push(`<span class="hint-compare">↔ 最差打牌仅 ${worst.effectiveTypes}种${worst.totalUkeire}张进张</span>`);
    }
  }

  lines.push('<div class="hint-ranking">');
  lines.push('<table class="ranking-table"><thead><tr><th>排名</th><th>打牌</th><th>向听</th><th>进张总数</th><th>进张种类</th><th>牌形</th></tr></thead><tbody>');
  const shown = all.slice(0, Math.min(all.length, 6));
  let rank = 1;
  for (const r of shown) {
    const isBest = r.shanten === top.shanten && r.totalUkeire === top.totalUkeire && r.shapeScore === top.shapeScore;
    const cls = isBest ? ' class="rank-best"' : '';
    const tileName = indexToName(tileToIndex(r.tile));
    lines.push(`<tr${cls}><td>${rank}</td><td>${tileName}</td><td>${r.shanten}</td><td>${r.totalUkeire}张</td><td>${r.effectiveTypes}种</td><td>${r.shapeScore}</td></tr>`);
    rank++;
  }
  lines.push('</tbody></table></div>');

  hintExplanationEl.innerHTML = lines.join('');
}
