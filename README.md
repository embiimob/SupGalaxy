# 🌌 SupGalaxy v0.5.16-beta
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
A special block capable of adding **images, video, audio and animated 3d models** into the game world.

### 🪧 The Calligraphy Stone
A special block capable of adding **colored or transparent signs with clickable web links** into the game world.

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

SupGalaxy is entirely browser-based—no bundlers, node modules, or build steps.

### Core Architecture
- **three.js** rendering  
- Infinite procedural chunks (16×64×16)  
- Background worker polling P2FK  
- WebRTC peer-to-peer networking  
- Simple JS modules

### Extend SupGalaxy

#### Add a Block
```js
BLOCKS[id] = {
  name: "StarBlock",
  color: "#hex",
  transparent: true
};
```

#### Add a Recipe
```js
RECIPES.push({
  id: "star",
  out: { id: 120, count: 1 },
  requires: { 4: 2 }
});
```

#### Add a Biome
```js
BIOMES.push({
  key: "nebula",
  palette: [16, 4],
  heightScale: 2.0,
  roughness: 0.7,
  featureDensity: 0.01
});
```

#### Multiplayer Hooks
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

# 🤝 Join the Cosmos
- **Play**: https://supgalaxy.org  
- **Contribute**: Pull requests welcome  
- **Community**: Join **#HugPuddle** on Sup!?  
- **Contact**: @embii4u on Sup!?  

**SupGalaxy: A gift to the world. Build freely. Explore infinitely.** ✨
