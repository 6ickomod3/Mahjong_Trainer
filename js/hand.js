// ===== Hand Generation =====
// Depends on: tiles.js

function buildTilePool(state) {
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

function generateHand(state) {
  const pool = buildTilePool(state);
  if (pool.length < HAND_SIZE) return null;
  if (state.minSuitTiles > 0) return generateConstrainedHand(state, pool);
  shuffle(pool);
  return sortHand(pool.slice(0, HAND_SIZE));
}

function generateConstrainedHand(state, pool) {
  let domSuit = state.dominantSuit;
  if (domSuit === 'auto') {
    domSuit = state.selectedSuits[Math.floor(Math.random() * state.selectedSuits.length)];
  }
  if (!state.selectedSuits.includes(domSuit)) return null;

  const domPool = pool.filter(t => t.suit === domSuit);
  const restPool = pool.filter(t => t.suit !== domSuit);
  const minFromDom = state.minSuitTiles;
  const remaining = HAND_SIZE - minFromDom;

  if (domPool.length < minFromDom) return null;

  shuffle(domPool);
  shuffle(restPool);

  if (remaining > 0 && restPool.length < remaining) {
    return sortHand(domPool.slice(0, HAND_SIZE));
  }
  return sortHand([...domPool.slice(0, minFromDom), ...restPool.slice(0, remaining)]);
}
