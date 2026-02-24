// ===== Analysis: Effective Tiles, Paths, Discards, Combos =====
// Depends on: tiles.js, shanten.js

// ===== Effective Tiles =====

// ===== 修复后的有效进张计算 =====

// 必须传入真实手牌数组，用于扣除已拥有的牌
function findEffectiveTiles(handArr, currentShanten) {
  const results = [];
  let totalRealUkeire = 0; // 记录真实的剩余进张总数

  for (let i = 0; i < 34; i++) {
    if (handArr[i] >= 4) continue;
    
    handArr[i]++;
    const sh = calculateShanten(handArr);
    if (sh < currentShanten) {
      // 物理现实约束：最多4张，减去自己手里已经有的
      const remainingCount = 4 - (handArr[i] - 1); 
      
      if (remainingCount > 0) {
        results.push({ index: i, count: remainingCount });
        totalRealUkeire += remainingCount;
      }
    }
    handArr[i]--;
  }
  return { types: results, totalCount: totalRealUkeire };
}


// ===== 修复后的弃牌分析 =====

function analyzeAllDiscards(hand) {
  const results = [];
  const fullHandArr = handToArray(hand); // 完整的手牌数组，用于比对

  for (let i = 0; i < hand.length; i++) {
    // 处理重复牌去重逻辑（保持原有逻辑）
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
    
    // 调用修复后的进张计算器，传入剩余的13张牌
    const { types, totalCount } = findEffectiveTiles(handArr, sh);

    // 严厉建议：废弃 evaluateShape，但在它被移除前，暂且保留接口兼容
    const shape = evaluateShape(handArr); 

    results.push({
      handIndices: [i],
      tile: hand[i],
      shanten: sh,
      effectiveTypes: types.length,
      totalUkeire: totalCount, // 现在这是真实的张数，不再是无脑乘 4
      shapeScore: shape,
    });
  }

  // 排序逻辑：优先向听数小，其次真实进张数多
  results.sort((a, b) => {
    if (a.shanten !== b.shanten) return a.shanten - b.shanten;
    if (a.totalUkeire !== b.totalUkeire) return b.totalUkeire - a.totalUkeire;
    // 当向听数和真实进张数完全一样时，才用这种人类玄学打分来兜底平局
    return b.shapeScore - a.shapeScore; 
  });

  return results;
}

// ===== Win Tiles & Example Paths =====

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

  if (shanten === 0) {
    const winTiles = findWinTiles(handArr);
    return winTiles.length > 0 ? [{ steps: [], winTiles }] : [];
  }

  if (shanten > 3) return [];

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

    handArr[drawIdx]++;

    let foundPath = false;
    for (let d = 0; d < 34 && !foundPath; d++) {
      if (handArr[d] <= 0) continue;
      handArr[d]--;
      if (calculateShanten(handArr) === shanten - 1) {
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

// ===== Shape Evaluation =====

function evaluateShape(handArr) {
  let score = 0;

  for (let suit = 0; suit < 3; suit++) {
    const off = suit * 9;

    for (let i = 0; i < 9; i++) {
      const c = handArr[off + i];
      if (c === 0) continue;

      if (i + 1 < 9 && handArr[off + i] >= 1 && handArr[off + i + 1] >= 1) {
        if (i >= 1 && i + 1 <= 7) {
          score += 4; // 两面
        } else {
          score += 2; // 边张
        }
      }

      if (i + 2 < 9 && handArr[off + i] >= 1 && handArr[off + i + 2] >= 1) {
        score += 3; // 嵌张
      }

      if (c >= 2) score += 2;
      if (c >= 3) score += 6;

      if (i + 2 < 9 && handArr[off+i] >= 1 && handArr[off+i+1] >= 1 && handArr[off+i+2] >= 1) {
        score += 6;
      }

      const hasLeft  = i > 0 && handArr[off + i - 1] >= 1;
      const hasLeft2 = i > 1 && handArr[off + i - 2] >= 1;
      const hasRight = i < 8 && handArr[off + i + 1] >= 1;
      const hasRight2= i < 7 && handArr[off + i + 2] >= 1;
      if (c === 1 && !hasLeft && !hasLeft2 && !hasRight && !hasRight2) {
        score -= 3;
      }
    }
  }

  for (let i = 27; i < 34; i++) {
    if (handArr[i] >= 3) score += 6;
    else if (handArr[i] === 2) score += 2;
    else if (handArr[i] === 1) score -= 2;
  }

  return score;
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
      if (handArr[off + i] >= 3) {
        combos.kezi.push({ suit: suitName, label: `${NUM_CHARS[i]}${suitLabel} ×3`, indices: [off+i] });
      }
      if (handArr[off + i] >= 2) {
        combos.duizi.push({ suit: suitName, label: `${NUM_CHARS[i]}${suitLabel} ×2`, indices: [off+i] });
      }
      if (i + 2 < 9 && handArr[off+i] >= 1 && handArr[off+i+1] >= 1 && handArr[off+i+2] >= 1) {
        combos.shunzi.push({
          suit: suitName,
          label: `${NUM_CHARS[i]}${NUM_CHARS[i+1]}${NUM_CHARS[i+2]}${suitLabel}`,
          indices: [off+i, off+i+1, off+i+2]
        });
      }
      if (i + 1 < 9 && handArr[off+i] >= 1 && handArr[off+i+1] >= 1) {
        const waitType = (i === 0) ? '边张' : (i === 7) ? '边张' : '两面';
        combos.dazi.push({
          suit: suitName,
          label: `${NUM_CHARS[i]}${NUM_CHARS[i+1]}${suitLabel}`,
          wait: waitType,
          indices: [off+i, off+i+1]
        });
      }
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
