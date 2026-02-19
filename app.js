// ===== Tile Definitions =====

const SUITS = {
  wan: {
    name: '万', label: 'Characters',
    tiles: [
      { id: 'wan1', char: '一', sub: '万', num: 1 },
      { id: 'wan2', char: '二', sub: '万', num: 2 },
      { id: 'wan3', char: '三', sub: '万', num: 3 },
      { id: 'wan4', char: '四', sub: '万', num: 4 },
      { id: 'wan5', char: '五', sub: '万', num: 5 },
      { id: 'wan6', char: '六', sub: '万', num: 6 },
      { id: 'wan7', char: '七', sub: '万', num: 7 },
      { id: 'wan8', char: '八', sub: '万', num: 8 },
      { id: 'wan9', char: '九', sub: '万', num: 9 },
    ]
  },
  tiao: {
    name: '条', label: 'Bamboo',
    tiles: [
      { id: 'tiao1', char: '一', sub: '条', num: 1 },
      { id: 'tiao2', char: '二', sub: '条', num: 2 },
      { id: 'tiao3', char: '三', sub: '条', num: 3 },
      { id: 'tiao4', char: '四', sub: '条', num: 4 },
      { id: 'tiao5', char: '五', sub: '条', num: 5 },
      { id: 'tiao6', char: '六', sub: '条', num: 6 },
      { id: 'tiao7', char: '七', sub: '条', num: 7 },
      { id: 'tiao8', char: '八', sub: '条', num: 8 },
      { id: 'tiao9', char: '九', sub: '条', num: 9 },
    ]
  },
  bing: {
    name: '饼', label: 'Dots',
    tiles: [
      { id: 'bing1', char: '一', sub: '饼', num: 1 },
      { id: 'bing2', char: '二', sub: '饼', num: 2 },
      { id: 'bing3', char: '三', sub: '饼', num: 3 },
      { id: 'bing4', char: '四', sub: '饼', num: 4 },
      { id: 'bing5', char: '五', sub: '饼', num: 5 },
      { id: 'bing6', char: '六', sub: '饼', num: 6 },
      { id: 'bing7', char: '七', sub: '饼', num: 7 },
      { id: 'bing8', char: '八', sub: '饼', num: 8 },
      { id: 'bing9', char: '九', sub: '饼', num: 9 },
    ]
  }
};

const WINDS = [
  { id: 'feng_dong', char: '東', sub: '风', name: '东风' },
  { id: 'feng_nan',  char: '南', sub: '风', name: '南风' },
  { id: 'feng_xi',   char: '西', sub: '风', name: '西风' },
  { id: 'feng_bei',  char: '北', sub: '风', name: '北风' },
];

const DRAGONS = [
  { id: 'jian_zhong', char: '中', sub: '', name: '红中', cssClass: 'jian' },
  { id: 'jian_fa',    char: '發', sub: '', name: '发财', cssClass: 'jian-fa' },
  { id: 'jian_bai',   char: '白', sub: '', name: '白板', cssClass: 'jian-bai' },
];

const COPIES_PER_TILE = 4;
const HAND_SIZE = 14;

// ===== Tile Index Mapping =====
// Indices: wan 0-8, tiao 9-17, bing 18-26, winds 27-30, dragons 31-33

function tileToIndex(tile) {
  if (tile.type === 'suit') {
    const off = { wan: 0, tiao: 9, bing: 18 };
    return off[tile.suit] + tile.num - 1;
  }
  if (tile.type === 'wind') {
    return { feng_dong: 27, feng_nan: 28, feng_xi: 29, feng_bei: 30 }[tile.id];
  }
  if (tile.type === 'dragon') {
    return { jian_zhong: 31, jian_fa: 32, jian_bai: 33 }[tile.id];
  }
}

const NUM_CHARS = ['一','二','三','四','五','六','七','八','九'];

function indexToDisplay(idx) {
  if (idx < 9)  return { char: NUM_CHARS[idx],   sub: '万', suit: 'wan',  type: 'suit' };
  if (idx < 18) return { char: NUM_CHARS[idx-9], sub: '条', suit: 'tiao', type: 'suit' };
  if (idx < 27) return { char: NUM_CHARS[idx-18],sub: '饼', suit: 'bing', type: 'suit' };
  const honors = [
    { char: '東', sub: '风', suit: 'feng',    type: 'wind' },
    { char: '南', sub: '风', suit: 'feng',    type: 'wind' },
    { char: '西', sub: '风', suit: 'feng',    type: 'wind' },
    { char: '北', sub: '风', suit: 'feng',    type: 'wind' },
    { char: '中', sub: '',   suit: 'jian',    type: 'dragon' },
    { char: '發', sub: '',   suit: 'jian-fa', type: 'dragon' },
    { char: '白', sub: '',   suit: 'jian-bai',type: 'dragon' },
  ];
  return honors[idx - 27];
}

function indexToName(idx) {
  const d = indexToDisplay(idx);
  if (d.type === 'suit') return d.char + d.sub;
  return d.char;
}

function handToArray(hand) {
  const arr = new Array(34).fill(0);
  for (const tile of hand) arr[tileToIndex(tile)]++;
  return arr;
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
  bestDiscards: [],   // indices into currentHand
  hintRevealed: false,
};

// ===== DOM References =====

const suitSelectionGroup = document.getElementById('suit-selection');
const toggleWinds = document.getElementById('toggle-winds');
const toggleDragons = document.getElementById('toggle-dragons');
const dominantSuitGroup = document.getElementById('dominant-suit');
const minSuitRange = document.getElementById('min-suit-range');
const minSuitValue = document.getElementById('min-suit-value');
const generateBtn = document.getElementById('generate-btn');
const handDisplay = document.getElementById('hand-display');
const handInfo = document.getElementById('hand-info');
const infoChips = document.getElementById('info-chips');
const hintBanner = document.getElementById('hint-banner');
const hintBtn = document.getElementById('hint-btn');
const hintContent = document.getElementById('hint-content');
const hintCardsEl = document.getElementById('hint-cards');
const hintExplanationEl = document.getElementById('hint-explanation');
const analysisPanel = document.getElementById('analysis-panel');
const shantenValueEl = document.getElementById('shanten-value');
const shantenDescEl = document.getElementById('shanten-desc');
const pathSection = document.getElementById('path-section');
const pathListEl = document.getElementById('path-list');
const effectiveSummaryEl = document.getElementById('effective-summary');
const effectiveTilesEl = document.getElementById('effective-tiles');
const comboListEl = document.getElementById('combo-list');

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

// ===== Hand Generation =====

function buildTilePool() {
  const pool = [];
  for (const suitKey of state.selectedSuits) {
    const suit = SUITS[suitKey];
    for (const tile of suit.tiles) {
      for (let i = 0; i < COPIES_PER_TILE; i++) {
        pool.push({ ...tile, suit: suitKey, type: 'suit' });
      }
    }
  }
  if (state.includeWinds) {
    for (const tile of WINDS) {
      for (let i = 0; i < COPIES_PER_TILE; i++) {
        pool.push({ ...tile, suit: 'feng', type: 'wind' });
      }
    }
  }
  if (state.includeDragons) {
    for (const tile of DRAGONS) {
      for (let i = 0; i < COPIES_PER_TILE; i++) {
        pool.push({ ...tile, suit: tile.cssClass, type: 'dragon' });
      }
    }
  }
  return pool;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sortHand(hand) {
  const suitOrder = { wan: 0, tiao: 1, bing: 2, feng: 3, jian: 4, 'jian-fa': 4, 'jian-bai': 4 };
  return hand.sort((a, b) => {
    const sA = suitOrder[a.suit] ?? 5;
    const sB = suitOrder[b.suit] ?? 5;
    if (sA !== sB) return sA - sB;
    return a.id.localeCompare(b.id);
  });
}

function generateHand() {
  const pool = buildTilePool();
  if (pool.length < HAND_SIZE) {
    showError('牌池不够！请增加花色或字牌。');
    return null;
  }
  if (state.minSuitTiles > 0) return generateConstrainedHand(pool);
  shuffle(pool);
  return sortHand(pool.slice(0, HAND_SIZE));
}

function generateConstrainedHand(pool) {
  let domSuit = state.dominantSuit;
  if (domSuit === 'auto') {
    domSuit = state.selectedSuits[Math.floor(Math.random() * state.selectedSuits.length)];
  }
  if (!state.selectedSuits.includes(domSuit)) {
    showError(`主花色 "${SUITS[domSuit].name}" 未被选中！`);
    return null;
  }
  const domPool = pool.filter(t => t.suit === domSuit);
  const restPool = pool.filter(t => t.suit !== domSuit);
  const minFromDom = state.minSuitTiles;
  const remaining = HAND_SIZE - minFromDom;
  if (domPool.length < minFromDom) {
    showError(`${SUITS[domSuit].name}牌不够 ${minFromDom} 张！`);
    return null;
  }
  shuffle(domPool);
  shuffle(restPool);
  if (remaining > 0 && restPool.length < remaining) {
    return sortHand(domPool.slice(0, HAND_SIZE));
  }
  return sortHand([...domPool.slice(0, minFromDom), ...restPool.slice(0, remaining)]);
}

// ===== Shanten Engine =====

// Terminal/honor indices for kokushi
const KOKUSHI_INDICES = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

let _bestScore = 0;

function calculateShanten(handArr) {
  return Math.min(
    shantenRegular(handArr),
    shantenChiitoi(handArr),
    shantenKokushi(handArr)
  );
}

function shantenRegular(arr) {
  let minSh = 8;

  // Without head pair
  _bestScore = 0;
  _scan(arr, 0, 0, 0);
  let s0 = _bestScore;
  minSh = Math.min(minSh, 8 - s0);

  // With head pair
  for (let i = 0; i < 34; i++) {
    if (arr[i] >= 2) {
      arr[i] -= 2;
      _bestScore = 0;
      _scan(arr, 0, 0, 0);
      let s = _bestScore;
      minSh = Math.min(minSh, 8 - s - 1);
      arr[i] += 2;
    }
  }
  return minSh;
}

function _scan(arr, pos, mentsu, partial) {
  // Compute constrained score at this node
  let m = mentsu, p = partial;
  if (m + p > 4) p = 4 - m;
  const score = 2 * m + p;
  if (score > _bestScore) _bestScore = score;

  // Early exit: can't do better than 8 (4 mentsu)
  if (_bestScore >= 8) return;

  // Advance past zeros
  while (pos < 34 && arr[pos] === 0) pos++;
  if (pos >= 34) return;

  const inSuit = pos < 27;
  const posInSuit = pos % 9;

  // --- Mentsu extractions ---

  // Triplet (any tile type)
  if (arr[pos] >= 3) {
    arr[pos] -= 3;
    _scan(arr, pos, mentsu + 1, partial);
    arr[pos] += 3;
  }

  // Sequence (suited tiles only, same suit check via posInSuit)
  if (inSuit && posInSuit <= 6 && arr[pos] >= 1 && arr[pos+1] >= 1 && arr[pos+2] >= 1) {
    arr[pos]--; arr[pos+1]--; arr[pos+2]--;
    _scan(arr, pos, mentsu + 1, partial);
    arr[pos]++; arr[pos+1]++; arr[pos+2]++;
  }

  // --- Taatsu extractions ---

  // Pair (any tile type)
  if (arr[pos] >= 2) {
    arr[pos] -= 2;
    _scan(arr, pos, mentsu, partial + 1);
    arr[pos] += 2;
  }

  // Adjacent pair (suited, same suit)
  if (inSuit && posInSuit <= 7 && arr[pos] >= 1 && arr[pos+1] >= 1) {
    arr[pos]--; arr[pos+1]--;
    _scan(arr, pos, mentsu, partial + 1);
    arr[pos]++; arr[pos+1]++;
  }

  // Kanchan / gap pair (suited, same suit)
  if (inSuit && posInSuit <= 6 && arr[pos] >= 1 && arr[pos+2] >= 1) {
    arr[pos]--; arr[pos+2]--;
    _scan(arr, pos, mentsu, partial + 1);
    arr[pos]++; arr[pos+2]++;
  }

  // Skip this position (abandon remaining tiles here)
  _scan(arr, pos + 1, mentsu, partial);
}

function shantenChiitoi(arr) {
  // Seven pairs: shanten = 6 - pairs
  let pairs = 0;
  for (let i = 0; i < 34; i++) {
    pairs += Math.floor(arr[i] / 2);
  }
  if (pairs > 7) pairs = 7;
  return 6 - pairs;
}

function shantenKokushi(arr) {
  // Thirteen orphans: 13 - unique_terminals - has_pair
  let unique = 0;
  let hasPair = false;
  for (const i of KOKUSHI_INDICES) {
    if (arr[i] >= 1) unique++;
    if (arr[i] >= 2) hasPair = true;
  }
  return 13 - unique - (hasPair ? 1 : 0);
}

// ===== Effective Tiles (有效进张) =====
// Per ukeire.txt: purely mechanical, each type contributes 4 tiles,
// effective if drawing it reduces shanten.

function findEffectiveTiles(handArr, currentShanten) {
  const results = [];
  for (let i = 0; i < 34; i++) {
    if (handArr[i] >= 4) continue; // can't draw a 5th copy
    handArr[i]++;
    const sh = calculateShanten(handArr);
    if (sh < currentShanten) {
      results.push({ index: i });
    }
    handArr[i]--;
  }
  return results;
  // ukeire_types = results.length
  // ukeire_count = results.length * 4
}

// ===== Example Path Finding =====
// Find concrete draw sequences that lead to tenpai, capped for performance

function findWinTiles(handArr) {
  const tiles = [];
  for (let i = 0; i < 34; i++) {
    if (handArr[i] >= 4) continue;
    handArr[i]++;
    if (calculateShanten(handArr) === -1) tiles.push(i);
    handArr[i]--;
  }
  return tiles;
}

function findExamplePaths(handArr, shanten, maxPaths) {
  if (maxPaths === undefined) maxPaths = 3;
  if (shanten <= -1) return [];

  // Tenpai: just find winning tiles
  if (shanten === 0) {
    const winTiles = findWinTiles(handArr);
    return winTiles.length > 0 ? [{ steps: [], winTiles }] : [];
  }

  // Cap at shanten 3 for performance
  if (shanten > 3) return [];

  // Find effective tiles (draws that reduce shanten)
  const effective = [];
  for (let i = 0; i < 34; i++) {
    if (handArr[i] >= 4) continue;
    handArr[i]++;
    if (calculateShanten(handArr) < shanten) effective.push(i);
    handArr[i]--;
  }

  const paths = [];

  for (const drawIdx of effective) {
    if (paths.length >= maxPaths) break;

    // Draw this tile (now 14 tiles, shanten-1)
    handArr[drawIdx]++;

    // Find the best discard to maintain reduced shanten
    let foundPath = false;
    for (let d = 0; d < 34 && !foundPath; d++) {
      if (handArr[d] <= 0) continue;
      handArr[d]--;
      if (calculateShanten(handArr) === shanten - 1) {
        // Recurse to find paths from here
        const subPaths = findExamplePaths(handArr, shanten - 1, 1);
        if (subPaths.length > 0) {
          const sp = subPaths[0];
          paths.push({
            steps: [{ draw: drawIdx, discard: d }, ...sp.steps],
            winTiles: sp.winTiles
          });
          foundPath = true;
        }
      }
      handArr[d]++;
    }

    handArr[drawIdx]--;
  }

  return paths;
}

// ===== Best Discard Analysis =====

// Shape heuristic: used only to break ties when shanten and ukeire are equal.
// Higher score = better hand structure.
function evaluateShape(handArr) {
  let score = 0;

  // --- Suited tiles (sequences, pairs, isolated) ---
  for (let suit = 0; suit < 3; suit++) {
    const off = suit * 9;

    for (let i = 0; i < 9; i++) {
      const c = handArr[off + i];
      if (c === 0) continue;

      // Two-sided sequence shape (e.g. 4-5 waiting on 3 and 6)
      if (i + 1 < 9 && handArr[off + i] >= 1 && handArr[off + i + 1] >= 1) {
        if (i >= 1 && i + 1 <= 7) {
          score += 4; // 两面 (two-sided wait) — best partial
        } else {
          score += 2; // 边张 (edge wait)
        }
      }

      // Kanchan shape (e.g. 3-5 waiting on 4)
      if (i + 2 < 9 && handArr[off + i] >= 1 && handArr[off + i + 2] >= 1) {
        score += 3; // 嵌张 (closed wait) — decent
      }

      // Pair
      if (c >= 2) {
        score += 2;
      }

      // Triplet — already a complete meld
      if (c >= 3) {
        score += 6;
      }

      // Complete sequence
      if (i + 2 < 9 && handArr[off+i] >= 1 && handArr[off+i+1] >= 1 && handArr[off+i+2] >= 1) {
        score += 6;
      }

      // Isolated tile penalty (no neighbor and no pair)
      const hasLeft  = i > 0 && handArr[off + i - 1] >= 1;
      const hasLeft2 = i > 1 && handArr[off + i - 2] >= 1;
      const hasRight = i < 8 && handArr[off + i + 1] >= 1;
      const hasRight2= i < 7 && handArr[off + i + 2] >= 1;
      if (c === 1 && !hasLeft && !hasLeft2 && !hasRight && !hasRight2) {
        score -= 3; // isolated tile
      }
    }
  }

  // --- Honor tiles ---
  for (let i = 27; i < 34; i++) {
    if (handArr[i] >= 3) score += 6;       // triplet
    else if (handArr[i] === 2) score += 2;  // pair
    else if (handArr[i] === 1) score -= 2;  // isolated honor
  }

  return score;
}

function analyzeAllDiscards(hand) {
  const results = [];

  for (let i = 0; i < hand.length; i++) {
    // Skip duplicates (same tile id already analyzed)
    const isDupe = hand.findIndex((t, j) => j < i && t.id === hand[i].id) >= 0;
    if (isDupe) {
      const firstIdx = hand.findIndex(t => t.id === hand[i].id);
      const prev = results.find(r => r.handIndices.includes(firstIdx));
      if (prev) {
        prev.handIndices.push(i);
        continue;
      }
    }

    const remaining = hand.filter((_, j) => j !== i);
    const handArr = handToArray(remaining);
    const sh = calculateShanten(handArr);
    const effective = findEffectiveTiles(handArr, sh);
    const totalUkeire = effective.length * 4;
    const shape = evaluateShape(handArr);

    results.push({
      handIndices: [i],
      tile: hand[i],
      shanten: sh,
      effectiveTypes: effective.length,
      totalUkeire: totalUkeire,
      shapeScore: shape,
    });
  }

  // Priority: 1) minimize shanten  2) maximize total ukeire  3) better shape
  results.sort((a, b) => {
    if (a.shanten !== b.shanten) return a.shanten - b.shanten;
    if (a.totalUkeire !== b.totalUkeire) return b.totalUkeire - a.totalUkeire;
    return b.shapeScore - a.shapeScore;
  });

  return results;
}

function findBestDiscards(hand) {
  const results = analyzeAllDiscards(hand);
  if (results.length === 0) return { best: [], all: results };

  const best = results[0];
  const tied = results.filter(r =>
    r.shanten === best.shanten &&
    r.totalUkeire === best.totalUkeire &&
    r.shapeScore === best.shapeScore
  );

  return { best: tied, all: results };
}

// ===== Combo Detection =====

function findCombos(handArr) {
  const combos = { shunzi: [], kezi: [], dazi: [], duizi: [] };

  for (let suit = 0; suit < 3; suit++) {
    const off = suit * 9;
    const suitName = ['wan', 'tiao', 'bing'][suit];
    const suitLabel = ['万', '条', '饼'][suit];

    for (let i = 0; i < 9; i++) {
      // 刻子 (triplet)
      if (handArr[off + i] >= 3) {
        combos.kezi.push({ suit: suitName, label: `${NUM_CHARS[i]}${suitLabel} ×3`, indices: [off+i] });
      }
      // 对子 (pair)
      if (handArr[off + i] >= 2) {
        combos.duizi.push({ suit: suitName, label: `${NUM_CHARS[i]}${suitLabel} ×2`, indices: [off+i] });
      }
      // 顺子 (sequence of 3)
      if (i + 2 < 9 && handArr[off+i] >= 1 && handArr[off+i+1] >= 1 && handArr[off+i+2] >= 1) {
        combos.shunzi.push({
          suit: suitName,
          label: `${NUM_CHARS[i]}${NUM_CHARS[i+1]}${NUM_CHARS[i+2]}${suitLabel}`,
          indices: [off+i, off+i+1, off+i+2]
        });
      }
      // 搭子 (partial sequence — adjacent)
      if (i + 1 < 9 && handArr[off+i] >= 1 && handArr[off+i+1] >= 1) {
        const waitType = (i === 0) ? '边张' : (i === 7) ? '边张' : '两面';
        combos.dazi.push({
          suit: suitName,
          label: `${NUM_CHARS[i]}${NUM_CHARS[i+1]}${suitLabel}`,
          wait: waitType,
          indices: [off+i, off+i+1]
        });
      }
      // 搭子 (kanchan — gap)
      if (i + 2 < 9 && handArr[off+i] >= 1 && handArr[off+i+2] >= 1) {
        combos.dazi.push({
          suit: suitName,
          label: `${NUM_CHARS[i]}${NUM_CHARS[i+2]}${suitLabel}`,
          wait: '嵌张',
          indices: [off+i, off+i+2]
        });
      }
    }
  }

  // Honor tiles
  for (let i = 27; i < 34; i++) {
    const name = indexToName(i);
    if (handArr[i] >= 3) {
      combos.kezi.push({ suit: 'honor', label: `${name} ×3`, indices: [i] });
    }
    if (handArr[i] >= 2) {
      combos.duizi.push({ suit: 'honor', label: `${name} ×2`, indices: [i] });
    }
  }

  return combos;
}

// ===== Rendering =====

function createTileElement(tile, handIndex) {
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
      state.selectedIndex = -1; // deselect
    } else {
      state.selectedIndex = handIndex; // select new
    }
    rerenderHand();
    updateAnalysis();
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

function renderHand(hand) {
  state.currentHand = hand;
  state.selectedIndex = -1;
  state.bestDiscards = [];
  state.hintRevealed = false;
  analysisPanel.style.display = 'none';
  hintContent.style.display = 'none';

  // Compute best discards
  const { best, all } = findBestDiscards(hand);
  const bestIndices = [];
  for (const b of best) bestIndices.push(...b.handIndices);
  state.bestDiscards = bestIndices;
  state._bestResult = { best, all };

  // Show hint button
  hintBanner.style.display = '';
  hintBtn.style.display = '';

  rerenderHand();
  renderInfo(hand);
}

function rerenderHand() {
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
    container.appendChild(createTileElement(tile, idx));
    lastSuit = tile.suit;
  });

  handDisplay.appendChild(container);
}

function updateAnalysis() {
  if (state.selectedIndex < 0 || !state.currentHand) {
    analysisPanel.style.display = 'none';
    return;
  }

  // Build 13-tile hand (excluding selected tile)
  const remaining = state.currentHand.filter((_, i) => i !== state.selectedIndex);
  const handArr = handToArray(remaining);

  // Shanten
  const sh = calculateShanten(handArr);
  shantenValueEl.textContent = sh;
  if (sh === 0) {
    shantenDescEl.textContent = '听牌！(Tenpai)';
    shantenValueEl.classList.add('tenpai');
  } else if (sh === -1) {
    shantenValueEl.textContent = '和';
    shantenDescEl.textContent = '已和牌！(Complete)';
    shantenValueEl.classList.add('tenpai');
  } else {
    shantenDescEl.textContent = `还需 ${sh} 步听牌`;
    shantenValueEl.classList.remove('tenpai');
  }

  // Example paths
  renderPaths(handArr, sh);

  // Effective tiles
  const effective = findEffectiveTiles(handArr, sh);
  effectiveTilesEl.innerHTML = '';
  const totalCount = effective.length * 4;
  for (const et of effective) {
    const display = indexToDisplay(et.index);
    effectiveTilesEl.appendChild(createMiniTile(display));
  }
  effectiveSummaryEl.textContent = `(${effective.length}种${totalCount}张)`;

  if (effective.length === 0) {
    effectiveTilesEl.innerHTML = '<span class="no-effective">无（已是最优或已和牌）</span>';
  }

  // Combos
  const combos = findCombos(handArr);
  comboListEl.innerHTML = '';

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
    comboListEl.appendChild(group);
  }

  analysisPanel.style.display = '';
}

function renderInfo(hand) {
  handInfo.style.display = '';
  infoChips.innerHTML = '';

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
  addChip(`花色: ${suitNames} (${suitsUsed.size}种)`);
  addChip(`总数: ${hand.length}张`);
  for (const [s, count] of Object.entries(suitCounts)) {
    addChip(`${SUITS[s].name}: ${count}张`);
  }
  if (windCount > 0) addChip(`风牌: ${windCount}张`);
  if (dragonCount > 0) addChip(`箭牌: ${dragonCount}张`);
}

function addChip(text) {
  const chip = document.createElement('span');
  chip.className = 'info-chip';
  chip.textContent = text;
  infoChips.appendChild(chip);
}

function showError(msg) {
  handDisplay.innerHTML = `<div class="hand-placeholder"><p style="color:#e74c3c">${msg}</p></div>`;
  handInfo.style.display = 'none';
  analysisPanel.style.display = 'none';
}

function renderPaths(handArr, shanten) {
  if (shanten < 0) {
    pathSection.style.display = 'none';
    return;
  }

  // Clone because findExamplePaths mutates temporarily
  const arrCopy = [...handArr];
  const paths = findExamplePaths(arrCopy, shanten, 3);

  if (paths.length === 0 && shanten > 0) {
    pathSection.style.display = 'none';
    return;
  }

  pathSection.style.display = '';
  pathListEl.innerHTML = '';

  if (shanten === 0) {
    // Tenpai: just show winning tiles
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

      pathListEl.appendChild(pathEl);
    }
    return;
  }

  // Shanten >= 1: show example draw/discard paths
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

      // Draw
      const drawGroup = document.createElement('span');
      drawGroup.className = 'path-action';
      const drawLabel = document.createElement('span');
      drawLabel.className = 'path-label path-draw';
      drawLabel.textContent = '摸';
      drawGroup.appendChild(drawLabel);
      drawGroup.appendChild(createMiniTile(indexToDisplay(step.draw)));
      stepsEl.appendChild(drawGroup);

      // Arrow
      const arrow1 = document.createElement('span');
      arrow1.className = 'path-arrow';
      arrow1.textContent = '→';
      stepsEl.appendChild(arrow1);

      // Discard
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

    // Final: show tenpai waiting tiles
    const arrow3 = document.createElement('span');
    arrow3.className = 'path-arrow';
    arrow3.textContent = '→ 听';
    stepsEl.appendChild(arrow3);

    for (const wi of path.winTiles) {
      stepsEl.appendChild(createMiniTile(indexToDisplay(wi)));
    }

    pathEl.appendChild(stepsEl);
    pathListEl.appendChild(pathEl);
  });
}

// ===== Event Binding =====

generateBtn.addEventListener('click', () => {
  const hand = generateHand();
  if (hand) renderHand(hand);
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    generateBtn.click();
  }
});

// Initialize
syncSelectedSuits();

hintBtn.addEventListener('click', () => {
  state.hintRevealed = true;
  hintBtn.style.display = 'none';
  hintContent.style.display = '';
  rerenderHand();
  renderHintContent();
});

function renderHintContent() {
  const { best, all } = state._bestResult || { best: [], all: [] };
  hintCardsEl.innerHTML = '';
  hintExplanationEl.innerHTML = '';

  if (best.length === 0) return;

  const top = best[0];

  // Show best tile(s)
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

  // Build explanation
  const lines = [];

  if (top.shanten === 0) {
    lines.push(`✅ 打出后即可 <strong>听牌</strong>！`);
  } else {
    lines.push(`向听数: <strong>${top.shanten}</strong>`);
  }
  lines.push(`有效进张: <strong>${top.effectiveTypes}种 ${top.totalUkeire}张</strong>`);

  // Compare with worst
  if (all.length > 1) {
    const worst = all[all.length - 1];
    if (worst.shanten > top.shanten) {
      lines.push(`<span class="hint-compare">↔ 最差打牌向听数为 ${worst.shanten}，相差 ${worst.shanten - top.shanten} 步</span>`);
    } else if (worst.totalUkeire < top.totalUkeire) {
      lines.push(`<span class="hint-compare">↔ 最差打牌仅 ${worst.effectiveTypes}种${worst.totalUkeire}张进张</span>`);
    }
  }

  // Show ranking table for top discards
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
