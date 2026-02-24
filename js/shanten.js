// ===== Shanten Engine =====
// Depends on: tiles.js (for constants)

// Terminal/honor indices for kokushi
const KOKUSHI_INDICES = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

let _bestScore = 0;

// ===== 核心引擎修复 =====
// 直接在底层接入副露数，切断一切幻觉和溢出

function calculateShanten(handArr, meldsCount = 0) {
  let baseShanten;
  // 修复 Bug 1：一旦有副露，立刻物理阻断七对子和国士无双的计算
  if (meldsCount > 0) {
    baseShanten = shantenRegular(handArr, meldsCount);
  } else {
    baseShanten = Math.min(
      shantenRegular(handArr, 0),
      shantenChiitoi(handArr),
      shantenKokushi(handArr)
    );
  }
  
  // 直接在底层完成副露折算，保证数据一致性
  const adjusted = baseShanten - 2 * meldsCount;
  return adjusted < -1 ? -1 : adjusted;
}

function shantenRegular(arr, meldsCount = 0) {
  let minSh = 8;
  // 修复 Bug 2：严格限制剩余空间的拓扑容量
  const maxComp = 4 - meldsCount;

  // 不作将牌的情况
  _bestScore = 0;
  _scan(arr, 0, 0, 0, maxComp);
  let s0 = _bestScore;
  minSh = Math.min(minSh, 8 - s0);

  // 尝试把每一对当成将牌
  for (let i = 0; i < 34; i++) {
    if (arr[i] >= 2) {
      arr[i] -= 2;
      _bestScore = 0;
      _scan(arr, 0, 0, 0, maxComp);
      let s = _bestScore;
      minSh = Math.min(minSh, 8 - s - 1);
      arr[i] += 2;
    }
  }
  return minSh;
}

// 增加 maxComp 参数进行物理法则约束
function _scan(arr, pos, mentsu, partial, maxComp) {
  let m = mentsu, p = partial;
  // 约束：面子+搭子的总数绝对不能超过当前手牌的物理容纳极限
  if (m + p > maxComp) p = maxComp - m;
  
  const score = 2 * m + p;
  if (score > _bestScore) _bestScore = score;

  if (_bestScore >= maxComp * 2) return; // 剪枝优化：如果已经达到当前状态满分，直接返回

  while (pos < 34 && arr[pos] === 0) pos++;
  if (pos >= 34) return;

  const inSuit = pos < 27;
  const posInSuit = pos % 9;

  // Triplet
  if (arr[pos] >= 3) {
    arr[pos] -= 3;
    _scan(arr, pos, mentsu + 1, partial, maxComp);
    arr[pos] += 3;
  }

  // Sequence
  if (inSuit && posInSuit <= 6 && arr[pos] >= 1 && arr[pos+1] >= 1 && arr[pos+2] >= 1) {
    arr[pos]--; arr[pos+1]--; arr[pos+2]--;
    _scan(arr, pos, mentsu + 1, partial, maxComp);
    arr[pos]++; arr[pos+1]++; arr[pos+2]++;
  }

  // Pair (视为搭子)
  if (arr[pos] >= 2) {
    arr[pos] -= 2;
    _scan(arr, pos, mentsu, partial + 1, maxComp);
    arr[pos] += 2;
  }

  // Adjacent
  if (inSuit && posInSuit <= 7 && arr[pos] >= 1 && arr[pos+1] >= 1) {
    arr[pos]--; arr[pos+1]--;
    _scan(arr, pos, mentsu, partial + 1, maxComp);
    arr[pos]++; arr[pos+1]++;
  }

  // Kanchan
  if (inSuit && posInSuit <= 6 && arr[pos] >= 1 && arr[pos+2] >= 1) {
    arr[pos]--; arr[pos+2]--;
    _scan(arr, pos, mentsu, partial + 1, maxComp);
    arr[pos]++; arr[pos+2]++;
  }

  // Skip
  _scan(arr, pos + 1, mentsu, partial, maxComp);
}

function shantenChiitoi(arr) {
  let pairs = 0;
  for (let i = 0; i < 34; i++) {
    pairs += Math.floor(arr[i] / 2);
  }
  if (pairs > 7) pairs = 7;
  return 6 - pairs;
}

function shantenKokushi(arr) {
  let unique = 0;
  let hasPair = false;
  for (const i of KOKUSHI_INDICES) {
    if (arr[i] >= 1) unique++;
    if (arr[i] >= 2) hasPair = true;
  }
  return 13 - unique - (hasPair ? 1 : 0);
}