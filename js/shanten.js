// ===== Shanten Engine =====
// Depends on: tiles.js (for constants)

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
  let m = mentsu, p = partial;
  if (m + p > 4) p = 4 - m;
  const score = 2 * m + p;
  if (score > _bestScore) _bestScore = score;

  if (_bestScore >= 8) return;

  while (pos < 34 && arr[pos] === 0) pos++;
  if (pos >= 34) return;

  const inSuit = pos < 27;
  const posInSuit = pos % 9;

  // Triplet (any tile type)
  if (arr[pos] >= 3) {
    arr[pos] -= 3;
    _scan(arr, pos, mentsu + 1, partial);
    arr[pos] += 3;
  }

  // Sequence (suited tiles only)
  if (inSuit && posInSuit <= 6 && arr[pos] >= 1 && arr[pos+1] >= 1 && arr[pos+2] >= 1) {
    arr[pos]--; arr[pos+1]--; arr[pos+2]--;
    _scan(arr, pos, mentsu + 1, partial);
    arr[pos]++; arr[pos+1]++; arr[pos+2]++;
  }

  // Pair (any tile type)
  if (arr[pos] >= 2) {
    arr[pos] -= 2;
    _scan(arr, pos, mentsu, partial + 1);
    arr[pos] += 2;
  }

  // Adjacent pair (suited)
  if (inSuit && posInSuit <= 7 && arr[pos] >= 1 && arr[pos+1] >= 1) {
    arr[pos]--; arr[pos+1]--;
    _scan(arr, pos, mentsu, partial + 1);
    arr[pos]++; arr[pos+1]++;
  }

  // Kanchan / gap pair (suited)
  if (inSuit && posInSuit <= 6 && arr[pos] >= 1 && arr[pos+2] >= 1) {
    arr[pos]--; arr[pos+2]--;
    _scan(arr, pos, mentsu, partial + 1);
    arr[pos]++; arr[pos+2]++;
  }

  // Skip this position
  _scan(arr, pos + 1, mentsu, partial);
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
