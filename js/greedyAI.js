// ===== Greedy AI Engine =====
// Implements the greedy algorithm from ai/greedy_algorithm.md
// Three-tier funnel discard + full EV-shootout call evaluator
// Depends on: tiles.js, shanten.js

/* ---------- helpers ---------- */

function buildUnseen(game, playerIdx) {
  const unseen = new Array(34).fill(4);
  const hand = game.players[playerIdx].hand;
  for (const t of hand) {
    if (t.type === 'flower') continue;
    const idx = tileToIndex(t);
    if (idx !== undefined) unseen[idx]--;
  }
  for (let i = 0; i < 4; i++) {
    for (const t of game.players[i].discards) {
      if (t.type === 'flower') continue;
      const idx = tileToIndex(t);
      if (idx !== undefined) unseen[idx]--;
    }
  }
  for (let i = 0; i < 4; i++) {
    for (const m of game.players[i].melds) {
      for (const t of m.tiles) {
        if (t.type === 'flower') continue;
        const idx = tileToIndex(t);
        if (idx !== undefined) unseen[idx]--;
      }
    }
  }
  for (let i = 0; i < 34; i++) {
    if (unseen[i] < 0) unseen[i] = 0;
  }
  return unseen;
}

function handToArr34(hand) {
  const arr = new Array(34).fill(0);
  for (const t of hand) {
    if (t.type === 'flower') continue;
    const idx = tileToIndex(t);
    if (idx !== undefined) arr[idx]++;
  }
  return arr;
}

function calculateShantenWithMelds(handArr, meldsCount) {
  // 直接透传给重构后的底层引擎
  return calculateShanten(handArr, meldsCount || 0);
}

/** First-order ukeire for arr34 (returns {total, tiles:[{idx,count}]}) */
function _calcUkeire(arr, unseen, meldsCount) {
  const sh = calculateShantenWithMelds(arr, meldsCount);
  let total = 0;
  const tiles = [];
  for (let j = 0; j < 34; j++) {
    if (arr[j] >= 4) continue;
    arr[j]++;
    if (calculateShantenWithMelds(arr, meldsCount) < sh) {
      total += unseen[j];
      tiles.push({ idx: j, count: unseen[j] });
    }
    arr[j]--;
  }
  return { total, tiles };
}

/* ---------- 2. get_best_discard  (Three-tier funnel) ---------- */

/**
 * Implements the three-tier funnel from greedy_algorithm.md §3:
 *   Tier 1 – minimise shanten, then maximise ukeire
 *   Tier 2 – maximise 2nd-order expected ukeire (EV)
 *   Tier 3 – safety tie-breaker: smallest unseen[x]
 */
function getBestDiscard(game, playerIdx) {
  const player = game.players[playerIdx];
  const hand = player.hand;
  const unseen = buildUnseen(game, playerIdx);
  const meldsCount = player.melds.length;

  /* --- build per-discard stats --- */
  const results = [];
  const seenIdx = new Set();          // dedupe by tile index

  for (let i = 0; i < hand.length; i++) {
    const tile = hand[i];
    if (tile.type === 'flower') continue;
    const tileIdx = tileToIndex(tile);

    // If we already evaluated this tile index, clone the result with this handIndex
    if (seenIdx.has(tileIdx)) {
      const prev = results.find(r => r.tileIdx === tileIdx);
      if (prev) { results.push({ ...prev, handIndex: i, tileId: tile.id }); continue; }
    }
    seenIdx.add(tileIdx);

    const arr = handToArr34(hand);
    arr[tileIdx]--;
    const sh = calculateShantenWithMelds(arr, meldsCount);
    const { total: ukeire, tiles: effectiveTiles } = _calcUkeire(arr, unseen, meldsCount);

    results.push({
      handIndex: i,
      tileId: tile.id,
      tileIdx,
      shanten: sh,
      ukeire,
      effectiveTypes: effectiveTiles.length,
      effectiveTiles,
      ev: 0,          // filled in tier-2 if needed
      unseenX: unseen[tileIdx],
    });
  }

  if (results.length === 0) {
    return { bestIndex: 0, bestTileId: hand[0] ? hand[0].id : null, allResults: [] };
  }

  /* --- Tier 1: keep only min-shanten, then max-ukeire --- */
  const minSh = Math.min(...results.map(r => r.shanten));
  let pool = results.filter(r => r.shanten === minSh);
  const maxUk = Math.max(...pool.map(r => r.ukeire));
  pool = pool.filter(r => r.ukeire === maxUk);

  if (pool.length === 1) {
    // Unique winner — propagate sort and return
    _sortFinal(results);
    return { bestIndex: pool[0].handIndex, bestTileId: pool[0].tileId, allResults: results };
  }

  /* --- Tier 2: 2nd-order expected ukeire EV --- */
  const totalUnseen = unseen.reduce((a, b) => a + b, 0) || 1;
  const tier2Indices = new Set(pool.map(r => r.tileIdx));

  for (const r of results) {
    if (!tier2Indices.has(r.tileIdx)) continue; // only compute for tier-1 ties
    const arr = handToArr34(hand);
    arr[r.tileIdx]--;
    const sh = r.shanten;
    let ev = 0;
    
    for (let y = 0; y < 34; y++) {
      const originalUnseenY = unseen[y];
      // 如果这种牌在场上已经没有了，或者手里已经有4张，直接跳过
      if (arr[y] >= 4 || originalUnseenY <= 0) continue; 
      
      // 【修复 Bug 1】：严格遵循物理现实，摸牌必须从牌山中扣除
      arr[y]++;
      unseen[y]--; 

      const newSh = calculateShantenWithMelds(arr, meldsCount);
      if (newSh < sh) {
        // y 是一张有效进张
        const prob = originalUnseenY / totalUnseen; // 概率使用摸牌前的真实张数
        
        // 【修复 Bug 2】：现在手牌是 14 张，必须寻找一张最优弃牌，以此计算真实的下一步进张数
        let maxUkNew = 0;
        for (let d = 0; d < 34; d++) {
          if (arr[d] <= 0) continue;
          arr[d]--; // 尝试打出 d
          
          // 只有打出 d 后不破坏刚取得的向听数进步，这个路线才成立
          if (calculateShantenWithMelds(arr, meldsCount) === newSh) {
            const { total: ukNew } = _calcUkeire(arr, unseen, meldsCount);
            if (ukNew > maxUkNew) maxUkNew = ukNew;
          }
          arr[d]++; // 恢复打出的牌
        }
        
        ev += prob * maxUkNew;
      }
      
      // 恢复状态，准备模拟下一种摸牌
      unseen[y]++;
      arr[y]--;
    }
    r.ev = ev;
    // also copy ev to any duplicate-tileIdx entries
    for (const dup of results) {
      if (dup !== r && dup.tileIdx === r.tileIdx) dup.ev = ev;
    }
  }

  const maxEv = Math.max(...pool.map(r => r.ev));
  pool = pool.filter(r => r.ev === maxEv);

  if (pool.length === 1) {
    _sortFinal(results);
    return { bestIndex: pool[0].handIndex, bestTileId: pool[0].tileId, allResults: results };
  }

  /* --- Tier 3: safety — pick smallest unseen[x] --- */
  pool.sort((a, b) => a.unseenX - b.unseenX);
  _sortFinal(results);
  return { bestIndex: pool[0].handIndex, bestTileId: pool[0].tileId, allResults: results };
}

/** Sort allResults for display: shanten↑ → ukeire↓ → ev↓ → unseenX↑ */
function _sortFinal(results) {
  results.sort((a, b) => {
    if (a.shanten !== b.shanten) return a.shanten - b.shanten;
    if (a.ukeire !== b.ukeire) return b.ukeire - a.ukeire;
    if (a.ev !== b.ev) return b.ev - a.ev;
    return a.unseenX - b.unseenX;
  });
}

/* ---------- 3. Pure-array best discard (for call evaluator) ---------- */

/**
 * Like getBestDiscard but operates on raw arr34 + unseen.
 * Returns { shanten, ukeire, ev, discardIdx }.
 */
function _bestDiscardArr(arr, unseen, meldsCount) {
  const candidates = [];
  for (let d = 0; d < 34; d++) {
    if (arr[d] <= 0) continue;
    arr[d]--;
    const sh = calculateShantenWithMelds(arr, meldsCount);
    const { total: uk } = _calcUkeire(arr, unseen, meldsCount);
    candidates.push({ discardIdx: d, shanten: sh, ukeire: uk, ev: 0, unseenX: unseen[d] });
    arr[d]++;
  }
  if (candidates.length === 0) return { shanten: 99, ukeire: 0, ev: 0, discardIdx: -1 };

  // Tier 1
  const minSh = Math.min(...candidates.map(c => c.shanten));
  let pool = candidates.filter(c => c.shanten === minSh);
  const maxUk = Math.max(...pool.map(c => c.ukeire));
  pool = pool.filter(c => c.ukeire === maxUk);

  if (pool.length === 1) {
    return pool[0];
  }

// Tier 2
  const totalUnseen = unseen.reduce((a, b) => a + b, 0) || 1;
  for (const c of pool) {
    arr[c.discardIdx]--;
    const sh = c.shanten;
    let ev = 0;
    
    for (let y = 0; y < 34; y++) {
      const originalUnseenY = unseen[y];
      if (arr[y] >= 4 || originalUnseenY <= 0) continue;
      
      // 【Bug 1 修复】
      arr[y]++;
      unseen[y]--; 

      const newSh = calculateShantenWithMelds(arr, meldsCount);
      if (newSh < sh) {
        const prob = originalUnseenY / totalUnseen;
        
        // 【Bug 2 修复】
        let maxUkNew = 0;
        for (let d = 0; d < 34; d++) {
          if (arr[d] <= 0) continue;
          arr[d]--;
          if (calculateShantenWithMelds(arr, meldsCount) === newSh) {
            const { total: ukNew } = _calcUkeire(arr, unseen, meldsCount);
            if (ukNew > maxUkNew) maxUkNew = ukNew;
          }
          arr[d]++;
        }
        ev += prob * maxUkNew;
      }
      
      unseen[y]++;
      arr[y]--;
    }
    c.ev = ev;
    arr[c.discardIdx]++;
  }

  const maxEv = Math.max(...pool.map(c => c.ev));
  pool = pool.filter(c => c.ev === maxEv);

  if (pool.length === 1) return pool[0];

  // Tier 3
  pool.sort((a, b) => a.unseenX - b.unseenX);
  return pool[0];
}

/* ---------- 4. evaluate_call  (Full EV Shootout) ---------- */

/**
 * Implements §5 of greedy_algorithm.md:
 *   For each valid call, simulate the state, run best-discard EV engine,
 *   compare against pass.
 *
 * Returns the same shape as before for UI compatibility:
 *   { shouldCall, shBefore, bestShAfter, currentBestUkeire, bestUkeireAfter,
 *     deltaShanten, deltaUkeire, evPass, evCall }
 */
function evaluateCallDetailed(game, playerIdx, offeredTile, callType, chiOption) {
  const player = game.players[playerIdx];
  const hand = player.hand;
  const unseen = buildUnseen(game, playerIdx);
  const meldsBefore = player.melds.length;
  const meldsAfter = meldsBefore + 1;

  // --- Pass baseline ---
  const arrPass = handToArr34(hand);
  const shBefore = calculateShantenWithMelds(arrPass, meldsBefore);
  const passResult = _bestDiscardArr(arrPass.slice(), unseen, meldsBefore);
  // For pass, "best discard" isn't really applicable (hand is 13 tiles, waiting for draw),
  // so we just measure current ukeire as the baseline.
  let currentBestUkeire = 0;
  for (let j = 0; j < 34; j++) {
    if (arrPass[j] >= 4) continue;
    arrPass[j]++;
    if (calculateShantenWithMelds(arrPass, meldsBefore) < shBefore) currentBestUkeire += unseen[j];
    arrPass[j]--;
  }
  // EV for pass: compute 2nd-order expected ukeire of current hand (no discard needed)
  const totalUnseen = unseen.reduce((a, b) => a + b, 0) || 1;
  let evPass = 0;
  for (let y = 0; y < 34; y++) {
    const originalUnseenY = unseen[y];
    if (arrPass[y] >= 4 || originalUnseenY <= 0) continue;
    
    // 【Bug 1 修复】
    arrPass[y]++;
    unseen[y]--; 

    const newSh = calculateShantenWithMelds(arrPass, meldsBefore);
    if (newSh < shBefore) {
      const prob = originalUnseenY / totalUnseen;
      
      // 【Bug 2 修复】
      let maxUkNew = 0;
      for (let d = 0; d < 34; d++) {
        if (arrPass[d] <= 0) continue;
        arrPass[d]--;
        if (calculateShantenWithMelds(arrPass, meldsBefore) === newSh) {
           const { total: ukNew } = _calcUkeire(arrPass, unseen, meldsBefore);
           if (ukNew > maxUkNew) maxUkNew = ukNew;
        }
        arrPass[d]++;
      }
      evPass += prob * maxUkNew;
    }
    
    unseen[y]++;
    arrPass[y]--;
  }

  // --- Simulate call state ---
  const arrAfter = handToArr34(hand);
  const offeredIdx = tileToIndex(offeredTile);

  if (callType === 'pong') {
    arrAfter[offeredIdx] -= 2;   // remove 2 from hand (the 3rd comes from offered tile)
  } else if (callType === 'chi' && chiOption) {
    const suitOff = { wan: 0, tiao: 9, bing: 18 }[chiOption.suit];
    for (const n of chiOption.nums) {
      const idx = suitOff + n - 1;
      if (idx !== offeredIdx) {
        arrAfter[idx]--;
      }
    }
  } else {
    return {
      shouldCall: false,
      shBefore,
      bestShAfter: 99,
      currentBestUkeire,
      bestUkeireAfter: 0,
      deltaShanten: 0,
      deltaUkeire: 0,
      evPass,
      evCall: 0,
    };
  }
  // arrAfter now holds the 14-tile hand after call (need to discard 1)

  // Run best-discard EV engine on the called state
  const callResult = _bestDiscardArr(arrAfter.slice(), unseen, meldsAfter);
  const bestShAfter = callResult.shanten;
  const bestUkeireAfter = callResult.ukeire;
  const evCall = callResult.ev;

  const deltaShanten = shBefore - bestShAfter;
  const deltaUkeire = bestUkeireAfter - currentBestUkeire;

  // §5.3 Decision: shanten priority, then EV
  let shouldCall = false;
  if (bestShAfter < shBefore) {
    // Call reduces shanten — always call
    shouldCall = true;
  } else if (bestShAfter > shBefore) {
    // Call worsens shanten — never call
    shouldCall = false;
  } else {
    // Same shanten — compare EV
    shouldCall = evCall > evPass;
  }

  return {
    shouldCall,
    shBefore,
    bestShAfter,
    currentBestUkeire,
    bestUkeireAfter,
    deltaShanten,
    deltaUkeire,
    evPass,
    evCall,
  };
}

function evaluateCall(game, playerIdx, offeredTile, callType, chiOption) {
  return evaluateCallDetailed(game, playerIdx, offeredTile, callType, chiOption).shouldCall;
}

function getHumanRecommendation(game) {
  const player = game.players[0];
  if (player.hand.length < 2) return null;
  const result = getBestDiscard(game, 0);
  return result.bestTileId || null;
}
