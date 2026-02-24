# 🀄 麻将训练器 — Mahjong Trainer

A browser-based mahjong training tool for improving hand reading and tile efficiency skills.

## Features

### 🎯 听牌训练 (Tenpai Trainer)
- **Random hand generation** with configurable suits, winds, and dragons
- **Dominant suit constraints** — practice chinitsu/honitsu-style hands
- **Shanten calculation** — regular, seven pairs (chiitoi), and thirteen orphans (kokushi)
- **Effective tile analysis (有效进张)** — see which draws improve your hand
- **Best discard hints** — ranked by shanten, ukeire count, and hand shape
- **Example paths** — concrete draw/discard sequences to reach tenpai
- **Combo detection** — sequences, triplets, partials, and pairs

### 🀄 普通麻将 (Normal Mahjong)
- Coming soon

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
│   └── trainer.css         # Trainer controls, analysis, hints
├── js/
│   ├── tiles.js            # Tile definitions, constants, index mapping
│   ├── shanten.js          # Shanten calculation engine
│   ├── hand.js             # Hand generation, shuffling, sorting
│   ├── analysis.js         # Discard analysis, combos, effective tiles, paths
│   ├── ui.js               # DOM rendering
│   └── app.js              # Mode selection, state, event binding
└── ukeire.txt              # Reference notes on ukeire calculation
```

## Controls

- **Space** — generate a new random hand
- **Click a tile** — select it to see discard analysis
- **Hint button** — reveal the best discard(s) with a ranking table
