# 🌌 SupGalaxy v0.5.7-beta
**SupGalaxy** is an open-source, serverless voxel world—**Minecraft-style gameplay fused with satoshi-grade decentralization**. Worlds generate from simple keyword seeds and sync globally through **IPFS + P2FK** on Bitcoin testnet3. No accounts. No servers. No gatekeepers. Just your browser and an infinite procedural cosmos.

Built with ❤️ by **embii4u**, **Grok (xAI)**, **Jules**, **kattacomi**,**ChatGPT** and **github CoPilot**.  
**Demo:** https://supgalaxy.org

> **License: CC0 (Public Domain)**  
> Use, modify, remix, or commercialize freely.

---

## ✨ Core Features

### 🚀 Infinite Procedural Worlds
- Worlds derived from simple keyword seeds (`space`, `FLOWER🌼`, `Love`)  
- Cosmic biomes: Vulcan fields, lunar ranges, massive giants, vast deserts  
- Procedural stars, sun(s) & moon(s) per world  

### 🛠 Craft, Build, Survive
- Mine, place, craft, explore  
- Fight mobs and manage health  
- Toroidal map (wraps seamlessly at edges)  
- Streamlined inventory and crafting system  

### 🌐 Fully Decentralized Persistence
- Chunk deltas stored as JSON on **IPFS**  
- Indexes via **P2FK** (Pay-to-Future-Key) on Bitcoin testnet3  
- Optional world ownership (1-year renewable)  
- Global sync without centralized servers  

### 👥 WebRTC Multiplayer + PvP
- Peer-to-peer multiplayer (TURN recommended)  
- Syncs player position, builds, and combat  
- Drag-and-drop `.json` connection files  
- PvP through left-click with knockback  

### 🪄 The Magician’s Stone
A special block capable of adding **images, video and audio** into the game world.

### 🎙 Proximity Video & Voice
See and hear players based on distance—natural spatial communication.

### 🎵 IPFS Music and Video Streamer
- Discovers audio and video tracks tagged `#game` across the p2fk.io network  
- Loads the 10 latest `.mp3`/`.wav`/ `.mp4`/`.avi` files  
- Includes in-game mini-player controls and saveable playlists  

---

## 🐝 Survival Ecosystem

- **Bees (Day)** — gather pollen and produce honey  
- **Honey** — restores +5 HP  
- **Night Crawlers (Night)** — hunt honey & smash hives  
- **Torches** — repel night creatures with light  

---

# 🎮 How to Play

## Option 1 — **Play Online (Instant)**
👉 **https://supgalaxy.org**  
No install required. Works in Chrome/Firefox. HTTPS recommended.

---

## Option 2 — **Play Locally (ZIP Build)**  
SupGalaxy now ships as a **multi-file project**, easier for developers to modify.

### 📥 Local Setup
1. **Download the ZIP** (from GitHub Releases).  
2. **Unzip** the folder anywhere.  
3. Open the folder and **launch `index.html`** in Chrome or Firefox.  
   - Works offline 

You're in!

---

## 🌍 World & Player Setup
- **World Name**: max 8 chars  
- **Username**: max 20 chars  
- **Seed**: auto-generated as `worldname`  

Spawn, explore, build, fight, survive.

---

## 🕹 Controls

| Action | Keyboard / Mouse | Mobile |
|--------|------------------|--------|
| Move | `WASD` | Arrow buttons |
| Jump | `Space` | `J` |
| Attack / Mine | Left-click | ⚔ |
| Place Block | Right-click | Hold |
| Select Item | Scroll | Hotbar tap |
| Toggle View | `T` | `T` |
| Craft | `R` | — |
| Teleport | `P` | — |
| Save | `X` | — |

**Tips:**  
- 2 sand → 4 glass  
- +10 score per mob defeated  
- Players & mobs spawn in loaded chunks  
- TURN server recommended for multiplayer  

---

# ⚔️ Multiplayer: Drag-and-Drop WebRTC

### Host
1. Start a world.  
2. Receive an **offer** file from a client.  
3. Accept via Pending Connections or drag onto the minimap.  
4. Game creates an **answer** file.  
5. Send the answer back to the client.

### Client
1. Open 🌐 **Online Players** → enter host name → click join
2. Download **offer** file.  
3. Send to host.  
4. Receive **answer**.  
5. Drag it onto your minimap.

Connection established → avatars appear → PvP active.

---

# 🧩 Developer Guide

SupGalaxy is entirely browser-based—no bundlers required for basic usage. For development with linting and formatting, Node.js tooling is available.

## 🏗 Architecture Overview

### High-Level Structure
SupGalaxy follows a modular architecture with clear separation of concerns:

```
SupGalaxy/
├── js/               # JavaScript modules
│   ├── config.js     # Centralized configuration
│   ├── logger.js     # Logging utility
│   ├── api.js        # External API calls (p2fk.io, IPFS)
│   ├── declare.js    # Global declarations and constants
│   ├── main.js       # Main game loop and UI
│   ├── chunk-manager.js    # Chunk loading and ownership
│   ├── world-generation.js # Procedural generation
│   ├── mobs.js       # Entity behavior
│   ├── web-rtc.js    # P2P multiplayer
│   ├── worker.js     # Background polling worker
│   ├── audio-player.js     # Music playback
│   └── video-player.js     # Video playback
├── css/              # Stylesheets
├── lib/              # Third-party libraries (three.js)
├── sounds/           # Audio assets
└── index.html        # Entry point
```

### Core Systems

#### 1. **Rendering Engine** (three.js)
- Scene graph management
- Camera controls (first-person & orbit)
- Dynamic chunk mesh generation
- Procedural skybox (stars, sun, moon, clouds)

#### 2. **World Generation** (Perlin noise-based)
- Infinite procedural terrain from keyword seeds
- Multiple biome types (vulcan, lunar, desert, etc.)
- Toroidal world wrapping at edges
- Chunk-based loading (16×256×16 blocks)

#### 3. **Decentralized Persistence** (IPFS + P2FK)
- Chunk deltas stored as JSON on IPFS
- Ownership anchored on Bitcoin testnet3 via P2FK
- Background worker polls for updates
- 1-year renewable world ownership

#### 4. **Multiplayer** (WebRTC)
- Peer-to-peer connections with TURN fallback
- Position and action synchronization
- Proximity-based voice & video
- Drag-and-drop session file exchange

#### 5. **Gameplay Systems**
- Voxel mining and placement
- Crafting and inventory management
- Mob AI (bees, night crawlers)
- Health and combat mechanics
- The Magician's Stone (embed media)

## 📦 Module Layout

### Configuration (`js/config.js`)
Centralized constants for:
- World generation parameters
- Network endpoints (API_BASE_URL, IPFS_GATEWAY)
- Timing constants (POLL_INTERVAL, ownership periods)
- Feature flags for debugging

### Logger (`js/logger.js`)
Standardized logging with severity levels:
- `logger.debug()` - Development diagnostics
- `logger.info()` - General information
- `logger.warn()` - Warnings
- `logger.error()` - Errors with stack traces

### API Module (`js/api.js`)
Handles all external communication:
- `GetPublicAddressByKeyword()` - Resolve keywords to addresses
- `GetPublicMessagesByAddress()` - Fetch messages from p2fk.io
- `fetchIPFS()` - Retrieve chunk data from IPFS
- Built-in caching and rate limiting

### Chunk Manager (`js/chunk-manager.js`)
Manages world state:
- Chunk loading/unloading based on player position
- Ownership verification and expiry
- Delta synchronization with IPFS
- Mesh generation and optimization

### World Generation (`js/world-generation.js`)
Procedural algorithms:
- Seeded random number generation
- Multi-octave Perlin noise
- Biome selection and blending
- Feature placement (trees, cacti, flowers)

### WebRTC (`js/web-rtc.js`)
Multiplayer networking:
- Peer connection management
- Offer/answer exchange via files
- Position and action broadcasting
- Audio/video stream handling

## 🛠 Development Workflow

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/embiimob/SupGalaxy.git
   cd SupGalaxy
   ```

2. **Install development dependencies** (optional)
   ```bash
   npm install
   ```

3. **Run locally**
   - **Simple:** Open `index.html` in a browser
   - **With server:** `npm start` (runs on http://localhost:8080)

### Code Style and Linting

SupGalaxy uses ESLint with Airbnb base configuration:

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changes
npm run format:check
```

### Making Changes

1. **Edit source files** in the `js/` directory
2. **Test changes** by refreshing the browser (no build step)
3. **Lint and format** before committing
4. **Test multiplayer** if WebRTC code is affected

### Key Development Principles

- **Minimal dependencies**: Keep the codebase lean
- **Browser compatibility**: Support Chrome and Firefox
- **No build step**: Direct JavaScript execution
- **Modular design**: Clear separation between systems
- **Functional integrity**: Never break crypto, IPFS, or core mechanics

## 🧪 Testing & Linting

### Manual Testing Checklist

- [ ] World spawns correctly from seed
- [ ] Blocks can be mined and placed
- [ ] Inventory and crafting work
- [ ] Mobs spawn and behave correctly
- [ ] Health and damage systems function
- [ ] Chunks load/unload properly
- [ ] IPFS chunk loading works
- [ ] WebRTC connections establish
- [ ] Position sync works in multiplayer
- [ ] Audio/video proximity features work

### Linting

Run ESLint to catch common issues:
```bash
npm run lint
```

Common issues caught:
- Use of `var` instead of `const`/`let`
- Unused variables
- Missing semicolons
- Inconsistent formatting
- Console.log statements (warnings)

### Browser Console

Check for errors:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Use logger history: `logger.getHistory()`

## 🔧 Extending SupGalaxy

### Add a Block
```js
BLOCKS[id] = {
  name: "StarBlock",
  color: "#hex",
  transparent: true
};
```

### Add a Recipe
```js
RECIPES.push({
  id: "star",
  out: { id: 120, count: 1 },
  requires: { 4: 2 }
});
```

### Add a Biome
```js
BIOMES.push({
  key: "nebula",
  palette: [16, 4],
  heightScale: 2.0,
  roughness: 0.7,
  featureDensity: 0.01
});
```

### Multiplayer Hooks
- Position sync via `user_update`  
- Avatar rendering through `userPositions`  
- TURN server strongly recommended  

---

# 🌐 Local Decentralized Setup (Advanced)

Run your own **Sup!?** + **p2fk.io** stack for full independence.

### Requirements
- Windows  
- ~260 GB free (Bitcoin testnet3)  
- .NET 8.0+  
- Fast SSD  

### 1. Install & Sync Sup!?
- Extract `Supv0.7.6-beta` to `C:\SUP`  
- Launch `SUP.exe`  
- Enable **testnet**  
- Sync (1–2 days)  

### 2. Run Local p2fk.io API

Edit `Wrapper.cs`:

```csharp
public string TestCLIPath = @"C:\SUP\SUP.exe";
public string TestVersionByte = @"111";
public string TestRPCURL = @"http://127.0.0.1:18332";
public string TestRPCUser = "good-user";
public string TestRPCPassword = "better-password";
```

Start API → http://localhost:5000

### 3. Point SupGalaxy to Your API
Search/replace `https://p2fk.io` with your local endpoint.

### 4. Etch Saves
Export JSON from the game → publish using Sup!? → peers sync automatically.

---

# 🆚 SupGalaxy vs. Traditional Voxel Games

| Feature | SupGalaxy | Traditional |
|--------|-----------|-------------|
| Worlds | Infinite | Finite / server-bound |
| Persistence | On-chain (IPFS + BTC) | Central servers |
| Multiplayer | WebRTC P2P | Hosted servers |
| Ownership | Player-controlled | Company-owned |
| Licensing | **CC0** | Proprietary |

---

# 📝 Migration Notes (v0.5.7-beta)

## What's New in v0.5.7-beta

### Code Quality Improvements
- ✅ Converted all `var` declarations to `const`/`let` for modern JavaScript
- ✅ Added centralized configuration module (`js/config.js`)
- ✅ Implemented standardized logging utility (`js/logger.js`)
- ✅ Improved error handling and async patterns in API module
- ✅ Added JSDoc annotations for better code documentation

### Development Tools
- ✅ Added `package.json` with npm scripts for linting and formatting
- ✅ Configured ESLint with Airbnb base style guide
- ✅ Added Prettier for consistent code formatting
- ✅ Added EditorConfig for cross-editor consistency

### Documentation
- ✅ Expanded README with Architecture Overview
- ✅ Added Module Layout section explaining each file
- ✅ Included Development Workflow guide
- ✅ Added Testing & Linting best practices

## Breaking Changes
None. All changes are backward compatible. The game functionality remains identical.

## For Developers

If you're working with a local copy:

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Optional - Install dev dependencies:**
   ```bash
   npm install
   ```

3. **Run linting (optional):**
   ```bash
   npm run lint
   ```

## Code Structure Changes
- Constants now reference `CONFIG` module instead of being redeclared
- API calls use centralized rate limiting helper
- Logger replaces some console.log calls (more to come)

## Future Plans
- Consider directory reorganization (/src, /assets, /styles)
- Add more comprehensive JSDoc coverage
- Implement retry strategies for network calls
- Add optional performance benchmarking

---

# 🤝 Join the Cosmos
- **Play**: https://supgalaxy.org  
- **Contribute**: Pull requests welcome  
- **Community**: Join **#HugPuddle** on Sup!?  
- **Contact**: @embii4u on Sup!?  

**SupGalaxy: A gift to the world. Build freely. Explore infinitely.** ✨
