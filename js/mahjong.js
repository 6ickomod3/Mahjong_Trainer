// ===== Mahjong Game Engine =====
// Core game logic: wall, dealing, draw/discard, chi/pong/gang, win detection
// Depends on: tiles.js, shanten.js

// ===== Flower Tiles =====
const FLOWERS = [
  { id: 'hua_chun',  char: '春', sub: '花', name: '春', group: 'season', num: 0 },
  { id: 'hua_xia',   char: '夏', sub: '花', name: '夏', group: 'season', num: 1 },
  { id: 'hua_qiu',   char: '秋', sub: '花', name: '秋', group: 'season', num: 2 },
  { id: 'hua_dong2',  char: '冬', sub: '花', name: '冬', group: 'season', num: 3 },
  { id: 'hua_mei',   char: '梅', sub: '花', name: '梅', group: 'plant',  num: 0 },
  { id: 'hua_lan',   char: '兰', sub: '花', name: '兰', group: 'plant',  num: 1 },
  { id: 'hua_zhu',   char: '竹', sub: '花', name: '竹', group: 'plant',  num: 2 },
  { id: 'hua_ju',    char: '菊', sub: '花', name: '菊', group: 'plant',  num: 3 },
];

const SEAT_NAMES = ['东 East', '南 South', '西 West', '北 North'];
const SEAT_WIND_CHARS = ['東', '南', '西', '北'];

// ===== Game Rule Variants =====
const GAME_RULES = {
  shanghai: {
    id: 'shanghai',
    name: '上海敲麻',
    label: 'Shanghai Mahjong',
    hasFlowers: true,
    hasKnock: true,       // 敲 mechanic
    canChi: true,
    canPong: true,
    canGang: true,
    multipleWinners: true, // 一炮多响
  }
};

// ===== MahjongGame Class =====

class MahjongGame {
  constructor(ruleId) {
    this.rules = GAME_RULES[ruleId];
    this.reset();
  }

  reset() {
    // Wall
    this.wall = [];
    this.wallIndex = 0;

    // 4 players: 0=user (东), 1=南, 2=西, 3=北
    this.players = [null, null, null, null];
    for (let i = 0; i < 4; i++) {
      this.players[i] = {
        seat: i,
        name: i === 0 ? '你 (You)' : `AI ${SEAT_WIND_CHARS[i]}`,
        hand: [],       // private tiles (tile objects)
        melds: [],      // exposed melds: { type: 'chi'|'pong'|'gang'|'angang', tiles: [...] }
        flowers: [],    // flower tiles collected
        discards: [],   // tiles discarded
        isHuman: i === 0,
        knocked: false, // 敲 state (Shanghai)
        missedTiles: [], // tiles missed after knock (漏胡)
        score: 0,       // cumulative score
      };
    }

    // Game state
    this.dealer = 0;          // who is dealer
    this.currentPlayer = 0;   // whose turn
    this.phase = 'idle';      // idle | dealing | playing | waiting_discard | waiting_action | ended
    this.turnCount = 0;
    this.lastDiscard = null;  // { tile, playerIdx }
    this.lastDrawn = null;    // tile just drawn by current player
    this.winner = null;       // playerIdx or null
    this.winType = null;      // 'zimo' | 'dianpao'
    this.loser = null;        // who dealt in (dianpao)
    this.log = [];            // game event log

    // Pending actions for human player
    this.pendingActions = [];  // [{ type: 'chi'|'pong'|'gang'|'hu'|'pass', data }]
    this.actionCallback = null;

    // For async game flow
    this._paused = false;
    this._onUpdate = null;   // callback when state changes
  }

  onUpdate(fn) { this._onUpdate = fn; }

  _notify() { if (this._onUpdate) this._onUpdate(this); }

  _log(msg) {
    this.log.push(msg);
    if (this.log.length > 200) this.log.shift();
  }

  // ===== Build Wall =====
  buildWall() {
    this.wall = [];
    // Suited tiles: 4 copies each
    for (const suitKey of ['wan', 'tiao', 'bing']) {
      const suit = SUITS[suitKey];
      for (const tileDef of suit.tiles) {
        for (let c = 0; c < 4; c++) {
          this.wall.push({ ...tileDef, suit: suitKey, type: 'suit' });
        }
      }
    }
    // Winds
    for (const w of WINDS) {
      for (let c = 0; c < 4; c++) {
        this.wall.push({ ...w, suit: 'feng', type: 'wind' });
      }
    }
    // Dragons
    for (const d of DRAGONS) {
      for (let c = 0; c < 4; c++) {
        this.wall.push({ ...d, suit: d.cssClass, type: 'dragon' });
      }
    }
    // Flowers (1 copy each)
    if (this.rules.hasFlowers) {
      for (const f of FLOWERS) {
        this.wall.push({ ...f, suit: 'hua', type: 'flower' });
      }
    }

    // Shuffle
    for (let i = this.wall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wall[i], this.wall[j]] = [this.wall[j], this.wall[i]];
    }
    this.wallIndex = 0;
  }

  wallRemaining() { return this.wall.length - this.wallIndex; }

  drawFromWall() {
    if (this.wallIndex >= this.wall.length) return null;
    return this.wall[this.wallIndex++];
  }

  // ===== Deal =====
  deal() {
    this.buildWall();
    this.phase = 'dealing';

    // Deal 13 tiles each, dealer gets 14
    for (let round = 0; round < 3; round++) {
      for (let p = 0; p < 4; p++) {
        for (let t = 0; t < 4; t++) {
          this._dealTile(p);
        }
      }
    }
    for (let p = 0; p < 4; p++) {
      this._dealTile(p);
    }
    // Dealer gets extra tile
    this._dealTile(this.dealer);

    // Sort hands
    for (let p = 0; p < 4; p++) {
      this._sortHand(p);
    }

    this.currentPlayer = this.dealer;
    this.phase = 'playing';
    this.turnCount = 0;
    this._log(`游戏开始，庄家: ${this.players[this.dealer].name}`);
  }

  _dealTile(playerIdx) {
    const tile = this.drawFromWall();
    if (!tile) return;
    if (tile.type === 'flower') {
      this.players[playerIdx].flowers.push(tile);
      // Draw replacement
      this._dealTile(playerIdx);
      return;
    }
    this.players[playerIdx].hand.push(tile);
  }

  _sortHand(playerIdx) {
    const suitOrder = { wan: 0, tiao: 1, bing: 2, feng: 3, jian: 4, 'jian-fa': 4, 'jian-bai': 4 };
    this.players[playerIdx].hand.sort((a, b) => {
      const sA = suitOrder[a.suit] ?? 5;
      const sB = suitOrder[b.suit] ?? 5;
      if (sA !== sB) return sA - sB;
      return a.id.localeCompare(b.id);
    });
  }

  // ===== Tile matching =====
  _tilesMatch(a, b) { return a.id === b.id; }

  _handArr(playerIdx) {
    return handToArray(this.players[playerIdx].hand);
  }

  // ===== Win Check =====
  canWin(playerIdx) {
    const player = this.players[playerIdx];
    const arr = this._handArr(playerIdx);
    const numMelds = player.melds.length;
    if (numMelds === 0) {
      return calculateShanten(arr) === -1;
    }
    return this._isCompleteHand(arr, 4 - numMelds);
  }

  // Check if adding a tile would complete a win
  canWinWith(playerIdx, tile) {
    const player = this.players[playerIdx];
    const arr = handToArray(player.hand);
    const idx = tileToIndex(tile);
    arr[idx]++;
    const numMelds = player.melds.length;
    if (numMelds === 0) {
      return calculateShanten(arr) === -1;
    }
    return this._isCompleteHand(arr, 4 - numMelds);
  }

  // Check if arr can form exactly `groupsNeeded` groups + 1 pair
  _isCompleteHand(arr, groupsNeeded) {
    // Try each tile as the pair
    for (let i = 0; i < 34; i++) {
      if (arr[i] >= 2) {
        arr[i] -= 2;
        if (this._tryGroups(arr, groupsNeeded, 0)) {
          arr[i] += 2;
          return true;
        }
        arr[i] += 2;
      }
    }
    return false;
  }

  _tryGroups(arr, needed, pos) {
    if (needed === 0) {
      for (let i = 0; i < 34; i++) if (arr[i] > 0) return false;
      return true;
    }
    while (pos < 34 && arr[pos] === 0) pos++;
    if (pos >= 34) return false;

    // Triplet
    if (arr[pos] >= 3) {
      arr[pos] -= 3;
      if (this._tryGroups(arr, needed - 1, pos)) { arr[pos] += 3; return true; }
      arr[pos] += 3;
    }

    // Sequence (suited tiles only, pos within suit boundary)
    if (pos < 27 && pos % 9 <= 6 && arr[pos + 1] >= 1 && arr[pos + 2] >= 1) {
      arr[pos]--; arr[pos + 1]--; arr[pos + 2]--;
      if (this._tryGroups(arr, needed - 1, pos)) { arr[pos]++; arr[pos + 1]++; arr[pos + 2]++; return true; }
      arr[pos]++; arr[pos + 1]++; arr[pos + 2]++;
    }

    return false;
  }

  // ===== Chi (吃) Check =====
  // Only the next player can chi. tile is the discarded tile.
  getChiOptions(playerIdx, tile) {
    if (!this.rules.canChi) return [];
    if (tile.type !== 'suit') return [];
    const num = tile.num;
    const suit = tile.suit;
    const hand = this.players[playerIdx].hand;
    const options = [];

    // Check three possible sequences containing this tile
    // [num-2, num-1, num], [num-1, num, num+1], [num, num+1, num+2]
    const combos = [
      [num - 2, num - 1], // tile completes the right
      [num - 1, num + 1], // tile in the middle
      [num + 1, num + 2], // tile completes the left
    ];

    for (const [a, b] of combos) {
      if (a < 1 || b < 1 || a > 9 || b > 9) continue;
      const hasA = hand.some(t => t.type === 'suit' && t.suit === suit && t.num === a);
      const hasB = hand.some(t => t.type === 'suit' && t.suit === suit && t.num === b);
      if (hasA && hasB) {
        const nums = [a, b, num].sort((x, y) => x - y);
        // Avoid duplicate combos
        const key = `${suit}${nums.join('')}`;
        if (!options.some(o => o.key === key)) {
          options.push({ key, suit, nums, tileNeeded: num });
        }
      }
    }
    return options;
  }

  // ===== Pong (碰) Check =====
  canPong(playerIdx, tile) {
    if (!this.rules.canPong) return false;
    const count = this.players[playerIdx].hand.filter(t => this._tilesMatch(t, tile)).length;
    return count >= 2;
  }

  // ===== Gang (杠) Check =====
  canGang(playerIdx, tile) {
    if (!this.rules.canGang) return false;
    const count = this.players[playerIdx].hand.filter(t => this._tilesMatch(t, tile)).length;
    return count >= 3;
  }

  // Check for concealed gang (暗杠) or add-gang (加杠) on own turn
  getSelfGangOptions(playerIdx) {
    const player = this.players[playerIdx];
    const options = [];
    // Concealed gang: 4 of a kind in hand
    const counts = {};
    for (const t of player.hand) {
      counts[t.id] = (counts[t.id] || 0) + 1;
    }
    for (const [id, count] of Object.entries(counts)) {
      if (count >= 4) {
        options.push({ type: 'angang', tileId: id, tile: player.hand.find(t => t.id === id) });
      }
    }
    // Add-gang: have a tile matching an existing pong meld
    for (const meld of player.melds) {
      if (meld.type === 'pong') {
        const matchTile = player.hand.find(t => this._tilesMatch(t, meld.tiles[0]));
        if (matchTile) {
          options.push({ type: 'jiagang', tileId: matchTile.id, tile: matchTile, meld });
        }
      }
    }
    return options;
  }

  // ===== Execute Actions =====

  execDraw(playerIdx) {
    const tile = this.drawFromWall();
    if (!tile) return null;

    if (tile.type === 'flower') {
      this.players[playerIdx].flowers.push(tile);
      this._log(`${this.players[playerIdx].name} 摸到花牌 ${tile.char}`);
      this._notify();
      // Draw replacement
      return this.execDraw(playerIdx);
    }

    this.players[playerIdx].hand.push(tile);
    this.lastDrawn = tile;
    this._log(`${this.players[playerIdx].name} 摸牌`);
    return tile;
  }

  execDiscard(playerIdx, tileIndex) {
    const player = this.players[playerIdx];
    const tile = player.hand.splice(tileIndex, 1)[0];
    player.discards.push(tile);
    this.lastDiscard = { tile, playerIdx };
    this.lastDrawn = null;
    this._sortHand(playerIdx);
    this._log(`${player.name} 打出 ${this._tileName(tile)}`);
    return tile;
  }

  execChi(playerIdx, chiOption, discardedTile) {
    const player = this.players[playerIdx];
    const meldTiles = [];

    // Remove tiles from hand
    for (const num of chiOption.nums) {
      if (num === chiOption.tileNeeded) {
        meldTiles.push(discardedTile);
        continue;
      }
      const idx = player.hand.findIndex(t =>
        t.type === 'suit' && t.suit === chiOption.suit && t.num === num
      );
      if (idx >= 0) {
        meldTiles.push(player.hand.splice(idx, 1)[0]);
      }
    }

    // Sort meld tiles by number
    meldTiles.sort((a, b) => a.num - b.num);
    player.melds.push({ type: 'chi', tiles: meldTiles });
    this._sortHand(playerIdx);
    this._log(`${player.name} 吃 ${this._tileName(discardedTile)}`);
  }

  execPong(playerIdx, tile) {
    const player = this.players[playerIdx];
    const meldTiles = [tile];
    let removed = 0;
    for (let i = player.hand.length - 1; i >= 0 && removed < 2; i--) {
      if (this._tilesMatch(player.hand[i], tile)) {
        meldTiles.push(player.hand.splice(i, 1)[0]);
        removed++;
      }
    }
    player.melds.push({ type: 'pong', tiles: meldTiles });
    this._sortHand(playerIdx);
    this._log(`${player.name} 碰 ${this._tileName(tile)}`);
  }

  execGang(playerIdx, tile) {
    const player = this.players[playerIdx];
    const meldTiles = [tile];
    let removed = 0;
    for (let i = player.hand.length - 1; i >= 0 && removed < 3; i--) {
      if (this._tilesMatch(player.hand[i], tile)) {
        meldTiles.push(player.hand.splice(i, 1)[0]);
        removed++;
      }
    }
    player.melds.push({ type: 'gang', tiles: meldTiles });
    this._sortHand(playerIdx);
    this._log(`${player.name} 杠 ${this._tileName(tile)}`);
    // Draw replacement
    return this.execDraw(playerIdx);
  }

  execAnGang(playerIdx, tileId) {
    const player = this.players[playerIdx];
    const meldTiles = [];
    for (let i = player.hand.length - 1; i >= 0; i--) {
      if (player.hand[i].id === tileId) {
        meldTiles.push(player.hand.splice(i, 1)[0]);
      }
    }
    player.melds.push({ type: 'angang', tiles: meldTiles });
    this._sortHand(playerIdx);
    this._log(`${player.name} 暗杠 ${this._tileName(meldTiles[0])}`);
    return this.execDraw(playerIdx);
  }

  execJiaGang(playerIdx, tileId, meld) {
    const player = this.players[playerIdx];
    const idx = player.hand.findIndex(t => t.id === tileId);
    if (idx >= 0) {
      const tile = player.hand.splice(idx, 1)[0];
      meld.tiles.push(tile);
      meld.type = 'gang'; // upgrade pong to gang
      this._sortHand(playerIdx);
      this._log(`${player.name} 加杠 ${this._tileName(tile)}`);
      return this.execDraw(playerIdx);
    }
    return null;
  }

  execWin(playerIdx, winType, loserIdx) {
    this.winner = playerIdx;
    this.winType = winType;
    this.loser = loserIdx;
    this.phase = 'ended';
    const player = this.players[playerIdx];

    // Calculate score
    const score = this._calculateScore(playerIdx, winType, loserIdx);
    this.winScore = score;

    if (winType === 'zimo') {
      this._log(`🎉 ${player.name} 自摸胡牌！`);
    } else {
      this._log(`🎉 ${player.name} 胡牌！${this.players[loserIdx].name} 点炮`);
    }

    // Log score breakdown
    this._log(`--- 计分 Scoring ---`);
    this._log(`花牌: ${score.flowerCount}花`);
    if (score.meldFlowers > 0) this._log(`刃子/杠: ${score.meldFlowers}花`);
    this._log(`基础花: ${score.baseFlowers}花`);
    for (const fan of score.fan) {
      this._log(`番种: ${fan.name} (${fan.value})`);
    }
    this._log(`总花: ${score.totalFlowers} | 番数: ${score.fanMultiplier}x`);
    this._log(`得分: ${score.finalPoints}花`);

    if (winType === 'zimo') {
      this._log(`自摸: 三家各付 ${score.finalPoints}花`);
      // Each other player pays
      for (let i = 0; i < 4; i++) {
        if (i === playerIdx) {
          this.players[i].score = (this.players[i].score || 0) + score.finalPoints * 3;
        } else {
          this.players[i].score = (this.players[i].score || 0) - score.finalPoints;
        }
      }
    } else {
      this._log(`点炮: ${this.players[loserIdx].name} 付 ${score.finalPoints}花`);
      this.players[playerIdx].score = (this.players[playerIdx].score || 0) + score.finalPoints;
      this.players[loserIdx].score = (this.players[loserIdx].score || 0) - score.finalPoints;
    }

    this._log(`--- 当前分数 ---`);
    for (let i = 0; i < 4; i++) {
      this._log(`${this.players[i].name}: ${this.players[i].score || 0}花`);
    }
  }

  // ===== Scoring =====
  _calculateScore(playerIdx, winType, loserIdx) {
    const player = this.players[playerIdx];
    const hand = player.hand;
    const melds = player.melds;
    const arr = handToArray(hand);

    // --- Flower tiles ---
    const flowerCount = player.flowers.length;

    // --- Meld-based flowers ---
    let meldFlowers = 0;
    for (const meld of melds) {
      const t = meld.tiles[0];
      const isWind = t.type === 'wind';
      const isDragon = t.type === 'dragon';
      const isSuit = t.type === 'suit';

      if (meld.type === 'pong') {
        if (isWind) meldFlowers += 1;
        else if (isDragon) meldFlowers += 2;
      } else if (meld.type === 'gang') {
        // Exposed gang (ming gang)
        if (isWind) meldFlowers += 2;
        else if (isDragon) meldFlowers += 3;
        else if (isSuit) meldFlowers += 1;
      } else if (meld.type === 'angang') {
        if (isWind) meldFlowers += 3;
        else if (isDragon) meldFlowers += 4;
        else if (isSuit) meldFlowers += 2;
      }
    }

    // Also check triplets in hand (concealed pong/triplets not declared as melds)
    for (let i = 0; i < 34; i++) {
      if (arr[i] >= 3) {
        const isWind = i >= 27 && i <= 30;
        const isDragon = i >= 31 && i <= 33;
        if (isWind) meldFlowers += 1;
        else if (isDragon) meldFlowers += 2;
      }
    }

    const baseFlowers = flowerCount + meldFlowers;

    // --- Fan detection ---
    const fan = [];
    const allTiles = [...hand]; // tiles in hand
    for (const m of melds) allTiles.push(...m.tiles);

    // Check suits present
    const suitsPresent = new Set();
    let hasHonors = false;
    for (const t of allTiles) {
      if (t.type === 'suit') suitsPresent.add(t.suit);
      else if (t.type === 'wind' || t.type === 'dragon') hasHonors = true;
    }

    // Men qing (no chi/pong/exposed gang)
    const hasExposedMeld = melds.some(m => m.type === 'chi' || m.type === 'pong' || m.type === 'gang');
    if (!hasExposedMeld) {
      fan.push({ name: '门清 Concealed', value: 1 });
    }

    // All pong (peng peng hu) — all groups are triplets/quads, no sequences
    const hasChi = melds.some(m => m.type === 'chi');
    let handHasSequence = false;
    if (!hasChi) {
      // Check if remaining hand tiles form only triplets + pair
      const testArr = arr.slice();
      handHasSequence = !this._isAllTripletsAndPair(testArr, 4 - melds.length);
    }
    const isPengPengHu = !hasChi && !handHasSequence;
    if (isPengPengHu) {
      fan.push({ name: '碰碰胡 All Pong', value: 1 });
    }

    // Hun yi se (mixed flush) — one suit + honors only
    if (suitsPresent.size === 1 && hasHonors) {
      fan.push({ name: '混一色 Mixed Flush', value: 1 });
    }

    // Qing yi se (full flush) — one suit, no honors
    if (suitsPresent.size === 1 && !hasHonors) {
      fan.push({ name: '清一色 Full Flush', value: 10 }); // worth 1 lezi = 10 hua
    }

    // Hun peng (mixed flush + all pong)
    if (suitsPresent.size === 1 && hasHonors && isPengPengHu) {
      fan.push({ name: '混碰 Mixed Pong Flush', value: 10 });
    }

    // Qing peng (full flush + all pong)
    if (suitsPresent.size === 1 && !hasHonors && isPengPengHu) {
      fan.push({ name: '清碰 Pure Pong Flush', value: 20 });
    }

    // Feng yi se (all winds)
    const allWinds = allTiles.every(t => t.type === 'wind');
    if (allWinds) {
      fan.push({ name: '风一色 All Winds', value: 20 });
    }

    // Da diao che (single wait — only 1 tile in hand, rest are melds)
    if (hand.length === 2 && melds.length === 4) {
      // hand.length is 2 after win tile added (pair)
      fan.push({ name: '大吊车 Single Wait', value: 10 });
    }

    // Fan multiplier
    let fanMultiplier = 1;
    let bonusFlowers = 0;
    for (const f of fan) {
      if (f.value >= 10) {
        // Lezi-class — use as bonus flowers (lezi = 10 hua)
        bonusFlowers += f.value;
      } else {
        fanMultiplier *= Math.pow(2, f.value);
      }
    }

    const totalFlowers = Math.max(baseFlowers, 1); // at least 1
    let finalPoints = totalFlowers * fanMultiplier + bonusFlowers;

    return {
      flowerCount,
      meldFlowers,
      baseFlowers,
      fan,
      fanMultiplier,
      totalFlowers,
      bonusFlowers,
      finalPoints,
    };
  }

  _isAllTripletsAndPair(arr, groupsNeeded) {
    // Check if arr forms groupsNeeded triplets + 1 pair (no sequences)
    for (let i = 0; i < 34; i++) {
      if (arr[i] >= 2) {
        arr[i] -= 2;
        if (this._tryTriplets(arr, groupsNeeded, 0)) {
          arr[i] += 2;
          return true;
        }
        arr[i] += 2;
      }
    }
    return false;
  }

  _tryTriplets(arr, needed, pos) {
    if (needed === 0) {
      for (let i = 0; i < 34; i++) if (arr[i] > 0) return false;
      return true;
    }
    while (pos < 34 && arr[pos] === 0) pos++;
    if (pos >= 34) return false;
    if (arr[pos] >= 3) {
      arr[pos] -= 3;
      const result = this._tryTriplets(arr, needed - 1, pos);
      arr[pos] += 3;
      return result;
    }
    return false;
  }

  _tileName(tile) {
    if (tile.type === 'suit') return tile.char + tile.sub;
    if (tile.type === 'flower') return tile.char;
    return tile.char;
  }

  nextPlayer(current) {
    return (current + 1) % 4;
  }
}
