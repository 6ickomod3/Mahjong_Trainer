# 🀄 麻将训练器 — Mahjong Trainer

A browser-based mahjong training tool for improving hand reading, tile efficiency, and decision-making skills. Play against AI opponents or watch AI simulations — all powered by a pure math-based greedy engine.

## Features

### 🎯 听牌训练 (Tenpai Trainer)
- **Random hand generation** with configurable suits, winds, and dragons
- **Dominant suit constraints** — practice chinitsu/honitsu-style hands
- **Shanten calculation** — regular, seven pairs (chiitoi), and thirteen orphans (kokushi)
- **Effective tile analysis (有效进张)** — see which draws improve your hand
- **Best discard hints** — ranked by shanten, ukeire count, and 2nd-order EV
- **Example paths** — concrete draw/discard sequences to reach tenpai
- **Combo detection** — sequences, triplets, partials, and pairs

### 🀄 普通麻将 (Normal Mahjong)
- **Shanghai mahjong rules** — 4-player game with flowers, winds, and dragons
- **3 AI difficulty levels** — Easy (random), Medium (basic heuristics), Hard (full greedy engine)
- **Pong / Chi / Gang recommendations** — greedy EV-based call advice with a toggleable 💡 Hint button
- **Tenpai display** — see your winning tiles and remaining counts when in tenpai
- **Full game flow** — draw, discard, meld, win (自摸 / 点炮)

### 🤖 AI Simulation
- **Spectator mode** — watch 4 AI players play full games automatically
- **Configurable AI levels** — set each seat's difficulty (Easy / Medium / Hard)
- **Speed controls** — 1×, 2×, 4× playback speed
- **Auto-restart** — games restart automatically after each round

### 📊 Session Scoreboard
- **Aggregated scores** — cumulative totals displayed at the top
- **Per-round history** — each round shows score deltas (not cumulative)
- **点炮 details** — round log shows who dealt into whom (e.g., "AI 南 点炮 → AI 東 8花")

### 🧠 Greedy AI Engine
- **Three-tier discard funnel** — min shanten → max ukeire → max 2nd-order expected ukeire → safety tie-breaker
- **Full EV shootout for calls** — pong/chi decisions evaluated by simulating the post-call state and running the full discard engine, compared against pass EV
- **Meld-aware shanten** — correctly adjusts shanten for open hands
- **No hardcoded heuristics** — all decisions are pure mathematical expectation

## Getting Started

This is a static web app — no build step required.

```bash
# Serve locally
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

## Project Structure

```
├── index.html              # Main HTML
├── css/
│   ├── base.css            # Reset, body, header
│   ├── components.css      # Buttons, toggles, sliders, chips
│   ├── tiles.css           # Tile visual styling
│   ├── modes.css           # Mode selection screen
│   ├── trainer.css         # Trainer controls, analysis, hints
│   └── game.css            # Game table, actions, speed controls
├── js/
│   ├── tiles.js            # Tile definitions, constants, index mapping
│   ├── shanten.js          # Shanten calculation engine
│   ├── hand.js             # Hand generation, shuffling, sorting
│   ├── analysis.js         # Discard analysis, combos, effective tiles, paths
│   ├── mahjong.js          # Core mahjong game logic (Shanghai rules)
│   ├── gameController.js   # Game flow orchestration (human + AI)
│   ├── game-ui.js          # Game table rendering, simulation UI
│   ├── greedyAI.js         # Greedy AI engine (3-tier funnel + EV shootout)
│   ├── ui.js               # Tenpai trainer DOM rendering
│   └── app.js              # Mode selection, state, event binding
├── ai/
│   ├── greedy_algorithm.md # Algorithm specification (Chinese)
│   └── ai_levels.md        # AI difficulty level definitions
├── rules/
│   └── shanghai_mahjong.md # Shanghai mahjong rule reference
└── ukeire.txt              # Reference notes on ukeire calculation
```

## Controls

### Tenpai Trainer
- **Space** — generate a new random hand
- **Click a tile** — select it to see discard analysis
- **Hint button** — reveal the best discard(s) with a ranking table

### Normal Mahjong
- **Click a tile** — discard it from your hand
- **Action buttons** — pong, chi, gang, hu, or pass
- **💡 Hint** — toggle AI recommendations on/off

### AI Simulation
- **Speed buttons** — switch between 1×, 2×, 4× speed
- **AI Level selectors** — change each seat's difficulty mid-game
