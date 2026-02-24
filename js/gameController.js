// ===== Game Controller =====
// Orchestrates game flow between human and AI players
// Depends on: mahjong.js, tiles.js, shanten.js, greedyAI.js

const AI_DELAY = 600; // ms between AI actions

class GameController {
  constructor(game, onUpdate) {
    this.game = game;
    this.onUpdate = onUpdate;
    this._running = false;
    this._timeoutId = null;
    this.speedMultiplier = 1;
    // AI level per player: 0=Manual, 1=Easy, 2=Medium, 3=Hard
    this.aiLevels = [0, 2, 2, 2];
  }

  setSpeed(mult) {
    const m = parseInt(mult);
    this.speedMultiplier = Number.isFinite(m) && m > 0 ? m : 1;
  }

  destroy() {
    this._running = false;
    if (this._timeoutId) clearTimeout(this._timeoutId);
  }

  // ===== Start Game =====
  start() {
    this.game.deal();
    this._running = true;
    this._notify();

    const humanSeat = this._humanSeat();

    // Dealer already has 14 tiles. If dealer is human, wait for discard.
    // If AI, start AI turn.
    if (humanSeat >= 0 && this.game.currentPlayer === humanSeat) {
      // Check if human can win immediately (天胡)
      if (this.game.canWin(humanSeat)) {
        this._offerActions([
          { type: 'hu', label: '胡 Win', winType: 'zimo' },
          { type: 'pass', label: '过 Pass', _afterPass: () => this._setPhase('waiting_discard') }
        ]);
        return;
      }
      // Check self-gang options
      const gangOpts = this.game.getSelfGangOptions(humanSeat);
      if (gangOpts.length > 0) {
        // Human can gang or just discard normally
        // Don't force action — let them discard
      }
      this._setPhase('waiting_discard');
    } else {
      this._aiTurn();
    }
  }

  _notify() {
    if (this.onUpdate) this.onUpdate(this.game);
  }

  _setPhase(phase) {
    this.game.phase = phase;
    this._notify();
  }

  _delay(fn, ms) {
    const base = ms || AI_DELAY;
    const adj = Math.max(40, Math.floor(base / this.speedMultiplier));
    this._timeoutId = setTimeout(() => {
      if (!this._running) return;
      fn();
    }, adj);
  }

  _humanSeat() {
    return this.game.players.findIndex(p => p.isHuman);
  }

  // ===== Human Actions =====

  humanDiscard(tileIndex) {
    const humanSeat = this._humanSeat();
    if (humanSeat < 0) return;
    if (this.game.phase !== 'waiting_discard' || this.game.currentPlayer !== humanSeat) return;
    const tile = this.game.execDiscard(humanSeat, tileIndex);
    this._notify();
    this._afterDiscard(humanSeat, tile);
  }

  humanAction(action) {
    const humanSeat = this._humanSeat();
    if (humanSeat < 0) return;
    // Clear action buttons immediately to prevent double-clicks
    this.game.pendingActions = [];
    this._pendingAfterPass = null;

    if (action.type === 'hu') {
      if (action.winType === 'zimo') {
        this.game.execWin(humanSeat, 'zimo', null);
      } else {
        // Remove claimed tile from discarder's discard pile
        this._claimLastDiscard();
        // Add tile to hand for display
        this.game.players[humanSeat].hand.push(action.tile);
        this.game._sortHand(humanSeat);
        this.game.execWin(humanSeat, 'dianpao', action.discardedBy);
      }
      this._notify();
      return;
    }
    if (action.type === 'pong') {
      this._claimLastDiscard();
      this.game.execPong(humanSeat, action.tile);
      this.game.currentPlayer = humanSeat;
      this._notify();
      this._setPhase('waiting_discard');
      return;
    }
    if (action.type === 'chi') {
      this._claimLastDiscard();
      this.game.execChi(humanSeat, action.chiOption, action.tile);
      this.game.currentPlayer = humanSeat;
      this._notify();
      this._setPhase('waiting_discard');
      return;
    }
    if (action.type === 'gang') {
      this._claimLastDiscard();
      this.game.execGang(humanSeat, action.tile);
      this.game.currentPlayer = humanSeat;
      this._notify();
      // After gang draw, check win
      if (this.game.canWin(humanSeat)) {
        this._offerActions([
          { type: 'hu', label: '胡 Win', winType: 'zimo' },
          { type: 'pass', label: '过 Pass', _afterPass: () => this._setPhase('waiting_discard') }
        ]);
        return;
      }
      this._setPhase('waiting_discard');
      return;
    }
    if (action.type === 'angang') {
      this.game.execAnGang(humanSeat, action.tileId);
      this.game.currentPlayer = humanSeat;
      this._notify();
      if (this.game.canWin(humanSeat)) {
        this._offerActions([
          { type: 'hu', label: '胡 Win', winType: 'zimo' },
          { type: 'pass', label: '过 Pass', _afterPass: () => this._setPhase('waiting_discard') }
        ]);
        return;
      }
      this._setPhase('waiting_discard');
      return;
    }
    if (action.type === 'jiagang') {
      this.game.execJiaGang(humanSeat, action.tileId, action.meld);
      this.game.currentPlayer = humanSeat;
      this._notify();
      if (this.game.canWin(humanSeat)) {
        this._offerActions([
          { type: 'hu', label: '胡 Win', winType: 'zimo' },
          { type: 'pass', label: '过 Pass', _afterPass: () => this._setPhase('waiting_discard') }
        ]);
        return;
      }
      this._setPhase('waiting_discard');
      return;
    }
    if (action.type === 'pass') {
      // Continue to next step — _pendingAfterPass already cleared above,
      // but the action had a pending callback saved before clearing
      if (action._afterPass) {
        action._afterPass();
      }
      return;
    }
  }

  // Remove the last discarded tile from the discarder's discard pile (it was claimed)
  _claimLastDiscard() {
    if (this.game.lastDiscard) {
      const discards = this.game.players[this.game.lastDiscard.playerIdx].discards;
      const tile = this.game.lastDiscard.tile;
      const idx = discards.lastIndexOf(tile);
      if (idx >= 0) discards.splice(idx, 1);
    }
  }

  _offerActions(actions) {
    this.game.pendingActions = actions;
    this._setPhase('waiting_action');
  }

  // ===== After Discard: Check Other Players =====
  _afterDiscard(discardPlayerIdx, tile) {
    if (!this._running) return;
    const humanSeat = this._humanSeat();

    // Check all other players for win, pong, gang
    // Priority: hu > pong/gang > chi

    const humanActions = [];
    let aiWinner = -1;

    // Check win for all players
    for (let i = 1; i <= 3; i++) {
      const p = (discardPlayerIdx + i) % 4;
      if (p === discardPlayerIdx) continue;

      if (this.game.canWinWith(p, tile)) {
        if (p === humanSeat) {
          // Human can win
          humanActions.push({
            type: 'hu', label: '胡 Win', tile, winType: 'dianpao', discardedBy: discardPlayerIdx
          });
        } else {
          // AI always wins
          aiWinner = p;
          break;
        }
      }
    }

    if (aiWinner >= 0) {
      this._delay(() => {
        // Remove claimed tile from discarder's discard pile
        const discards = this.game.players[discardPlayerIdx].discards;
        const dIdx = discards.lastIndexOf(tile);
        if (dIdx >= 0) discards.splice(dIdx, 1);
        this.game.players[aiWinner].hand.push(tile);
        this.game._sortHand(aiWinner);
        this.game.execWin(aiWinner, 'dianpao', discardPlayerIdx);
        this._notify();
      });
      return;
    }

    // Check pong/gang for all (except discarder)
    for (let i = 1; i <= 3; i++) {
      const p = (discardPlayerIdx + i) % 4;
      if (p === discardPlayerIdx) continue;

      if (p === humanSeat) {
        // Human options
        if (this.game.canGang(humanSeat, tile)) {
          humanActions.push({ type: 'gang', label: '杠 Gang', tile });
        }
        if (this.game.canPong(humanSeat, tile)) {
          const pongEval = evaluateCallDetailed(this.game, humanSeat, tile, 'pong', null);
          humanActions.push({
            type: 'pong',
            label: '碰 Pong',
            tile,
            recommended: false,
            advice: pongEval.shouldCall
              ? `建议碰：向听 ${pongEval.shBefore}→${pongEval.bestShAfter}`
              : `不建议碰：向听 ${pongEval.shBefore}→${pongEval.bestShAfter}`,
            eval: pongEval,
          });
        }
      } else {
        // AI pong decision based on level
        const level = this.aiLevels[p] || 2;
        if (this.game.canPong(p, tile)) {
          let doPong = false;
          if (level === 1) {
            // Easy: never calls
            doPong = false;
          } else if (level === 2) {
            // Medium: call if shanten improves, 50% probability
            if (this._callReducesShanten(p, tile, 'pong', null) && Math.random() < 0.5) {
              doPong = true;
            }
          } else if (level === 3) {
            // Hard: always call if beneficial
            doPong = evaluateCall(this.game, p, tile, 'pong', null);
          }
          if (doPong) {
            this._delay(() => {
              const discards = this.game.players[discardPlayerIdx].discards;
              const dIdx = discards.lastIndexOf(tile);
              if (dIdx >= 0) discards.splice(dIdx, 1);
              this.game.execPong(p, tile);
              this.game.currentPlayer = p;
              this._notify();
              this._aiDiscard(p);
            });
            return;
          }
        }
      }
    }

    // Check chi for next player only
    const nextP = this.game.nextPlayer(discardPlayerIdx);
    if (nextP === humanSeat) {
      const chiOpts = this.game.getChiOptions(humanSeat, tile);
      const chiCandidates = [];
      for (const opt of chiOpts) {
        const nums = opt.nums.map(n => {
          const d = indexToDisplay(n - 1 + { wan: 0, tiao: 9, bing: 18 }[opt.suit]);
          return d.char;
        }).join('');
        const chiEval = evaluateCallDetailed(this.game, humanSeat, tile, 'chi', opt);
        chiCandidates.push({
          type: 'chi',
          label: `吃 ${nums}${SUITS[opt.suit].name}`,
          tile,
          chiOption: opt,
          eval: chiEval,
          recommended: false,
          preferred: false,
        });
      }

      if (chiCandidates.length > 0) {
        chiCandidates.sort((a, b) => {
          if ((a.eval.shouldCall ? 1 : 0) !== (b.eval.shouldCall ? 1 : 0)) {
            return (b.eval.shouldCall ? 1 : 0) - (a.eval.shouldCall ? 1 : 0);
          }
          if (a.eval.bestShAfter !== b.eval.bestShAfter) {
            return a.eval.bestShAfter - b.eval.bestShAfter;
          }
          return b.eval.bestUkeireAfter - a.eval.bestUkeireAfter;
        });

        const preferred = chiCandidates[0];
        preferred.preferred = true;
        preferred.recommended = false;

        for (const item of chiCandidates) {
          item.advice = item.eval.shouldCall
            ? `建议吃：向听 ${item.eval.shBefore}→${item.eval.bestShAfter}`
            : `不建议吃：向听 ${item.eval.shBefore}→${item.eval.bestShAfter}`;
          if (item.preferred) {
            item.advice += '（首选）';
          }
          humanActions.push(item);
        }
      }
    } else {
      // AI chi decision based on level
      const chiLevel = this.aiLevels[nextP] || 2;
      if (chiLevel >= 2) {
        const chiOpts = this.game.getChiOptions(nextP, tile);
        for (const opt of chiOpts) {
          let doChi = false;
          if (chiLevel === 2) {
            // Medium: chi if shanten improves, 50% probability
            if (this._callReducesShanten(nextP, tile, 'chi', opt) && Math.random() < 0.5) {
              doChi = true;
            }
          } else if (chiLevel === 3) {
            // Hard: always chi if beneficial
            doChi = evaluateCall(this.game, nextP, tile, 'chi', opt);
          }
          if (doChi) {
            this._delay(() => {
              const discards = this.game.players[discardPlayerIdx].discards;
              const dIdx = discards.lastIndexOf(tile);
              if (dIdx >= 0) discards.splice(dIdx, 1);
              this.game.execChi(nextP, opt, tile);
              this.game.currentPlayer = nextP;
              this._notify();
              this._aiDiscard(nextP);
            });
            return;
          }
        }
      }
      // Easy: never calls (chiLevel === 1 skips entirely)
    }

    if (humanActions.length > 0) {
      // Choose a single recommended action for clarity
      for (const action of humanActions) {
        action.recommended = false;
      }

      const callCandidates = humanActions.filter(a =>
        (a.type === 'pong' || a.type === 'chi') && a.eval
      );

      callCandidates.sort((a, b) => {
        if ((a.eval.shouldCall ? 1 : 0) !== (b.eval.shouldCall ? 1 : 0)) {
          return (b.eval.shouldCall ? 1 : 0) - (a.eval.shouldCall ? 1 : 0);
        }
        if (a.eval.bestShAfter !== b.eval.bestShAfter) {
          return a.eval.bestShAfter - b.eval.bestShAfter;
        }
        if (a.eval.bestUkeireAfter !== b.eval.bestUkeireAfter) {
          return b.eval.bestUkeireAfter - a.eval.bestUkeireAfter;
        }
        return (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0);
      });

      let recommendedAction = null;
      if (callCandidates.length > 0 && callCandidates[0].eval.shouldCall) {
        recommendedAction = callCandidates[0];
        recommendedAction.recommended = true;
      }

      const afterPass = () => {
        this._advanceToNextTurn(discardPlayerIdx);
      };
      humanActions.push({
        type: 'pass',
        label: '过 Pass',
        _afterPass: afterPass,
        recommended: !recommendedAction,
        advice: recommendedAction ? '' : '建议过：当前吃/碰收益不足',
      });
      this._offerActions(humanActions);
      return;
    }

    // No actions — advance to next player's turn
    this._advanceToNextTurn(discardPlayerIdx);
  }

  _advanceToNextTurn(fromPlayer) {
    if (!this._running) return;
    const humanSeat = this._humanSeat();
    const next = this.game.nextPlayer(fromPlayer);
    this.game.currentPlayer = next;
    this.game.pendingActions = [];

    if (this.game.wallRemaining() <= 0) {
      // Draw game (流局)
      this.game.phase = 'ended';
      this.game.winner = null;
      this.game._log('流局！(Draw - no tiles left)');
      this._notify();
      return;
    }

    if (next === humanSeat && humanSeat >= 0) {
      // Human turn: draw and wait for discard
      this._delay(() => {
        const drawn = this.game.execDraw(humanSeat);
        if (!drawn) {
          this.game.phase = 'ended';
          this.game._log('流局！');
          this._notify();
          return;
        }
        this._notify();

        // Check self win (自摸)
        if (this.game.canWin(humanSeat)) {
          const afterPass = () => {
            this._setPhase('waiting_discard');
          };
          this._offerActions([
            { type: 'hu', label: '胡 Win (自摸)', winType: 'zimo' },
            { type: 'pass', label: '过 Pass', _afterPass: afterPass }
          ]);
          return;
        }

        // Check self gang options
        const gangOpts = this.game.getSelfGangOptions(humanSeat);
        if (gangOpts.length > 0) {
          const actions = [];
          for (const opt of gangOpts) {
            if (opt.type === 'angang') {
              actions.push({ type: 'angang', label: `暗杠 ${this.game._tileName(opt.tile)}`, tileId: opt.tileId });
            } else {
              actions.push({ type: 'jiagang', label: `加杠 ${this.game._tileName(opt.tile)}`, tileId: opt.tileId, meld: opt.meld });
            }
          }
          actions.push({ type: 'pass', label: '过 Pass', _afterPass: () => {
            this._setPhase('waiting_discard');
          }});
          this._offerActions(actions);
          return;
        }

        this._setPhase('waiting_discard');
      });
    } else {
      // AI turn
      this._delay(() => this._aiTurn());
    }
  }

  // ===== AI Turn =====
  _aiTurn() {
    if (!this._running) return;
    const p = this.game.currentPlayer;
    const player = this.game.players[p];

    // If this is the dealer's first turn (already has 14 tiles), skip draw
    const needsDraw = !(this.game.turnCount === 0 && p === this.game.dealer);

    if (needsDraw) {
      const drawn = this.game.execDraw(p);
      if (!drawn) {
        this.game.phase = 'ended';
        this.game._log('流局！');
        this._notify();
        return;
      }
    }

    this.game.turnCount++;
    this._notify();

    // Check win (自摸)
    if (this.game.canWin(p)) {
      this._delay(() => {
        this.game.execWin(p, 'zimo', null);
        this._notify();
      });
      return;
    }

    // Check self gang (AI does concealed gang if possible, based on level)
    const aiLevel = this.aiLevels[p] || 2;
    const gangOpts = this.game.getSelfGangOptions(p);
    if (gangOpts.length > 0 && aiLevel >= 2) {
      const opt = gangOpts[0];
      this._delay(() => {
        if (opt.type === 'angang') {
          this.game.execAnGang(p, opt.tileId);
        } else {
          this.game.execJiaGang(p, opt.tileId, opt.meld);
        }
        this._notify();
        // After gang draw, check win
        if (this.game.canWin(p)) {
          this._delay(() => {
            this.game.execWin(p, 'zimo', null);
            this._notify();
          });
          return;
        }
        // Need to discard
        this._aiDiscard(p);
      });
      return;
    }

    // Random discard
    this._delay(() => this._aiDiscard(p));
  }

  _aiDiscard(p) {
    if (!this._running) return;
    // Route by AI level
    const level = this.aiLevels ? this.aiLevels[p] : 2;
    let idx = 0;
    if (level === 1) {
      // Easy: minimize shanten, random among best
      const hand = this.game.players[p].hand;
      let bestSh = 99;
      let candidates = [];
      for (let i = 0; i < hand.length; i++) {
        const tile = hand[i];
        if (tile.type === 'flower') continue;
        const arr = handToArr34(hand);
        const tileIdx = tileToIndex(tile);
        arr[tileIdx]--;
        const sh = calculateShanten(arr);
        if (sh < bestSh) { bestSh = sh; candidates = [i]; }
        else if (sh === bestSh) { candidates.push(i); }
      }
      idx = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (level === 2) {
      // Medium: maximize ukeire among min shanten, fake unseen
      const hand = this.game.players[p].hand;
      let bestSh = 99, bestU = -1;
      let candidates = [];
      for (let i = 0; i < hand.length; i++) {
        const tile = hand[i];
        if (tile.type === 'flower') continue;
        const arr = handToArr34(hand);
        const tileIdx = tileToIndex(tile);
        arr[tileIdx]--;
        const sh = calculateShanten(arr);
        let ukeire = 0;
        for (let j = 0; j < 34; j++) {
          if (arr[j] >= 4) continue;
          arr[j]++;
          if (calculateShanten(arr) < sh) ukeire += 4;
          arr[j]--;
        }
        if (sh < bestSh || (sh === bestSh && ukeire > bestU)) {
          bestSh = sh; bestU = ukeire; candidates = [i];
        } else if (sh === bestSh && ukeire === bestU) {
          candidates.push(i);
        }
      }
      idx = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (level === 3) {
      // Hard: use getBestDiscard (real unseen, full logic)
      const result = getBestDiscard(this.game, p);
      idx = result.bestIndex;
    } else {
      // Fallback: random
      const hand = this.game.players[p].hand;
      idx = Math.floor(Math.random() * hand.length);
    }
    const tile = this.game.execDiscard(p, idx);
    this._notify();
    this._afterDiscard(p, tile);
  }

  /**
   * Quick check: does calling (pong/chi) reduce shanten?
   * Used by Medium AI for simple call decisions.
   */
  _callReducesShanten(playerIdx, offeredTile, callType, chiOption) {
    const hand = this.game.players[playerIdx].hand;
    const arrBefore = handToArr34(hand);
    const shBefore = calculateShanten(arrBefore);

    const arrAfter = handToArr34(hand);
    const offeredIdx = tileToIndex(offeredTile);

    if (callType === 'pong') {
      arrAfter[offeredIdx] -= 2;
    } else if (callType === 'chi' && chiOption) {
      const suitOff = { wan: 0, tiao: 9, bing: 18 }[chiOption.suit];
      for (const n of chiOption.nums) {
        const idx = suitOff + n - 1;
        if (idx !== offeredIdx) {
          arrAfter[idx]--;
        }
      }
    } else {
      return false;
    }

    // Find best shanten after discarding one tile from remaining hand
    let bestShAfter = 99;
    for (let d = 0; d < 34; d++) {
      if (arrAfter[d] <= 0) continue;
      arrAfter[d]--;
      const sh = calculateShanten(arrAfter);
      if (sh < bestShAfter) bestShAfter = sh;
      arrAfter[d]++;
    }

    return bestShAfter < shBefore;
  }
}
