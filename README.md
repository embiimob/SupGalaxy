# 🌌 SupGalaxy v1.2.0
**SupGalaxy** is an open-source, serverless voxel world—**Minecraft-style gameplay fused with satoshi-grade decentralization**. Worlds generate from simple keyword seeds and sync globally through **IPFS + P2FK** on Bitcoin testnet3. No accounts. No servers. No gatekeepers. Just your browser and an infinite procedural cosmos.

Built with ❤️ by **embii4u**, **kattacomi**, **Grok (xAI)**, **Jules**, **ChatGPT** and **github CoPilot**.

> **License: CC0 (Public Domain)**  
> Use, modify, remix, or commercialize freely.  
> **Demo: https://supgalaxy.org**

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
- Save and reload game session via file  

### 👥 WebRTC Multiplayer + PvP
- Peer-to-peer multiplayer (TURN recommended)  
- Syncs player position, builds, and combat  
- Drag-and-drop `.json` connection files  
- PvP through left-click with knockback  

### 🪄 The Magician’s Stone
A special block capable of adding **images, video, audio and animated 3d models** into the game world.

### 🪧 The Calligraphy Stone
A special block capable of adding **colored or transparent signs with clickable web links** into the game world.

### 🧍 Custom Avatars
After login, press `V` (or the **Avatar** HUD button) to wear a custom model: paste an **objkt.com token URL** (the model is read from the token's artifact URI), `IPFS:CID`, `ipfs://` or `https://` link to a **Mixamo-rigged `.glb`/`.gltf`** or a **MagicaVoxel `.vox`**. The dialog previews the model walking on a turntable (optional wireframe look). Models are scaled to the 2-block player height. Rigged GLB/GLTF avatars use standard skeletal walking, sprinting, jumping and attack motions, starting from a neutral standing pose. After 10 seconds without moving, jumping or attacking, an embedded animation plays once as a long idle (preferring an idle-named clip, otherwise the first clip), then returns to standing. Gameplay actions immediately interrupt it; models without a skeleton use whole-model motion instead. IPFS/objkt avatars are shown to every multiplayer peer (https models stay local for privacy) and avatars are saved in session files (`profile.avatar`).

### 🎙 Proximity Video & Voice
See and hear players based on distance—natural spatial communication.

### 💬 Global Player Chat
Real-time text chat with all connected players via WebRTC. Press `/` to open chat, send messages instantly, and view chat history.

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
- **Red Laser Gun** — deals 5 damage per shot (no ammo needed)
- **Green Laser Gun** — deals 10 damage per shot, fires two blasts at once (consumes Emerald)
- **Blue Laser Gun** — deals 15 damage per shot, fires three blasts at once (consumes Blue Calcite, drops from UFOs)

### ⛏ Mining and Picks

Select a pick in the hotbar and **left-click** to mine or attack (mobile: ⚔ or tap).

| Block | Hands / Iron Pick | Blue Iron Pick |
|-------|-------------------|----------------|
| Grass, Moss | 1 hit | 1 hit |
| Dirt, Sand, Glass (including stained glass and glass tiles) | 2 hits | 1 hit |
| Wood, Iron Ore, Blue Calcite | 4 hits | 2 hits |
| Stone | Iron Pick only: 2 hits | 1 hit |
| Emerald | Iron Pick only: 4 hits | 2 hits |
| Dark Glass | Iron Pick only: 2 hits | 1 hit |
| Obsidian | Cannot break | 4 hits |
| Bedrock | Cannot break | Cannot break |

Other blocks retain their existing strengths; the Blue Iron Pick halves their required hits, rounded up.

- **Iron Pick:** craft with 1 Iron Ore + 1 Sand + 1 Torch + 1 Wood. Each left-click use has a **1 in 500** chance of breaking one pick; melee damage is **double** normal damage.
- **Blue Iron Pick:** upgrade with 1 Lava + 1 Iron Pick + 1 Blue Calcite. Each left-click use has a **1 in 100** chance of breaking one pick; melee damage is **triple** normal damage.
- Breakage is rolled once per use, including misses and hits on protected blocks; the current swing still completes.
- **Red lasers** can mine only blocks breakable by hand. **Green lasers** can also mine Stone, Emerald, and Dark Glass, but not Obsidian. **Blue lasers** retain their existing area mining behavior and can damage Obsidian. Bedrock and chunk ownership protections remain in effect.

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

## 🔐 Security & Privacy
- **Local Execution:** For the highest level of security, running SupGalaxy locally (as described above) is recommended.
- **Client-Side Keys:** Your testnet3 wallet private keys (WIF) never leave your browser. They are encrypted and stored locally in your browser's `localStorage` (`sup_iw_v1`). All transaction signing and P2FK encoding happens entirely client-side.

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
| Avatar | `V` | HUD button |
| Craft | `R` | — |
| Teleport | `P` | — |
| Save | `X` | — |
| **Open Chat** | **`/`** | **📢 button** |

**Tips:**  
- 2 sand → 4 glass  
- +10 score per mob defeated  
- Players & mobs spawn in loaded chunks  
- TURN server recommended for multiplayer  
- Press `/` to open chat and talk with other players in your world  

---

# ⚔️ Multiplayer: WebRTC Signaling

There are two ways to connect with other players via WebRTC: **Automated On-Chain Signaling (Testnet3)** and **Manual Drag-and-Drop**.

## Automated On-Chain Signaling (Recommended)
When your Testnet3 wallet is unlocked, WebRTC connection files are automatically negotiated over the Bitcoin testnet3 network using IPFS and P2FK.

### Host
1. Start a world and unlock your Testnet3 wallet.
2. The game automatically monitors for incoming **offers** on your world's keyword.
3. When an offer is detected, the game automatically generates an **answer** and broadcasts it back to the client on-chain.

### Client
1. Unlock your Testnet3 wallet.
2. Open 🌐 **Switch world** → enter the host's handle under **Connect to Friend** → click **Connect to Friend**.
3. The game automatically generates an **offer**, uploads it to IPFS, and broadcasts it on-chain to the host.
4. The game monitors your personal derived keyword (`worldName@userName`) for the host's **answer**.
5. Once the answer is received, the connection is established!

## Manual Drag-and-Drop
If you are playing without a wallet, you can manually exchange connection files.

### Host
1. Start a world.  
2. Receive an **offer** file from a client (via chat, email, etc.).
3. Accept via Pending Connections or drag onto the minimap.  
4. Game creates an **answer** file.  
5. Send the answer back to the client.

### Client
1. Open 🌐 **Switch world** → enter the host's handle under **Connect to Friend** → click **Connect to Friend**.
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

#### IPFS Block Versioning
SupGalaxy uses a **truncated unix date** system to ensure block updates from IPFS remain in correct chronological order:

- **BlockDate from Blockchain**: When chunks are published to the blockchain via IPFS, they receive a BlockDate from the transaction. This BlockDate is returned by GetPublicMessagesByAddress when loading chunks by keyword search.
- **Truncated Unix Date**: Seconds since 2025-09-21 00:00:00 UTC (custom epoch). This provides a compact integer for versioning.
- **Monotonic Ordering**: Block updates are only accepted if they have a strictly newer (larger) truncated unix date than any existing update.
- **Out-of-Order Protection**: If IPFS files arrive or are processed out of order, older updates are automatically skipped.

Helper functions:
```js
// Compute truncated date from a BlockDate timestamp (in milliseconds)
const truncated = computeIpfsTruncatedDate(blockTimestampMs);

// Check if an IPFS update should be applied (returns true if incoming > existing)
if (shouldApplyIpfsUpdate(existingTruncated, incomingTruncated)) {
  // Apply the update
}
```

Run tests in the browser console: `runIpfsVersioningTests()`

### Large Magician’s Stone models

Model dimensions and download size are not triangle counts. A 64 × 128 placement does not
subdivide the artwork, but standing on a dense mesh previously triggered repeated full
triangle scans and five ground raycasts every frame.

- GLB/glTF stone collision is prepared as a triangle BVH in a dedicated Blob worker,
  compatible with both opening `index.html` directly (`file://`) and HTTP(S) hosting.
  Its self-contained builder loads before the collider script; no worker script fetch
  from a file origin is required. Worker Blob URLs are released on success, failure
  or cancellation. Geometry
  extraction yields between batches; original rendering buffers are not transferred or
  detached. Collision becomes active only when preparation is ready. Failed preparation
  leaves collision disabled with a warning, never an expensive unindexed fallback.
  GLTF parsing, image decoding and first GPU uploads still have browser/main-thread costs;
  worker-built collision does not guarantee a stall-free import of arbitrary assets.
- In **3D model performance**, an optional simplified collider URL accepts the same
  IPFS/objkt/HTTPS sources as the visual model. Export it in the visual model’s original
  coordinate system; the visual model’s scale, centering, offsets and orientation apply
  to both. The collider is not rendered. Use real surface geometry for slopes, holes,
  stairs and overhangs, not one bounding box.
- **Frozen import-pose surface** explicitly snapshots collision geometry, including
  skinned/morph geometry, at import. Animations do not move the collider. Use a separate
  static collider or **No collision** where animated surfaces would be misleading.
- Optional texture limits (512/1024/2048 pixels) reduce eligible image textures while
  preserving aspect ratio. Data, compressed, cube and video textures remain unchanged.
  **Original**, unlimited render distance and **Always** animation preserve existing
  visual behavior. Nearby/view-only animation pauses rather than catching up offscreen.
  View/distance policies use the visual model’s import-pose bounds.
- For fewer rendered triangles, supply a lower-detail GLB in the main URL field. This
  does not automatically simplify artwork or add LOD assets. Draco/Meshopt/KTX2 decoder
  integration is not included; compression alone does not reduce rendered triangles.
- Collider and quality settings survive world/session saves and multiplayer sync.

#### Compare CPU collision and rendering cost

In a safe, quiet world, use third-person view to include the imported avatar’s render
cost. Keep the camera and player still, wait for collision preparation and texture uploads,
then record Chrome DevTools **Performance** while running:

```js
const nearby = await compareModelPerformance({ label: 'nearby', seconds: 5 });
// Stand on the model and repeat:
const onTop = await compareModelPerformance({ label: 'on-top', seconds: 5 });
```

Each comparison collects eight local-only combinations of collision on/off, imported/default
local avatar and stone animation on/off. Player pose is held between physics updates so
collision-off samples do not fall through the model. Existing animation settings still
apply; enable stone animation first for a meaningful animation comparison. Enable stone
collision first as well: profiling does not override a saved no-collision setting. Remote avatars
are unchanged. No diagnostic switches are persisted or sent to peers.

Reports include mean/p95 frame time, FPS, body/ground query timings and counts, draw calls,
triangles and renderer geometry/texture counts. The browser trace contains a named capture
range. `renderCpuMs` measures CPU render submission, **not GPU time**; renderer memory counts
are **not bytes**. Keep reports with the device/browser and model used; headless/synthetic
measurements cannot establish FPS on the linked NFT and avatar.

For one sample, use `await startModelPerformanceCapture({ label: 'on-top', seconds: 5,
collision: false, avatar: 'default', animation: false })`.
`stopModelPerformanceCapture()` stops early and restores overrides; world changes or
player death abort the sample. Captures are capped at 60 seconds/3,600 sampled frames.
The documented `runStoneCollisionTests()` console command checks the indexed collision
implementation without requiring an external model, including multistory tower floors,
walls, stairwell openings and step-up surfaces. Run it both from a directly opened
`index.html` and from HTTP hosting to check worker-startup compatibility.
`await runStoneCollisionTests({ benchmark: true })` also compares the old scans against
the BVH on a synthetic 180,000-triangle terrain fixture, reporting separately measured
triangle/node candidate counts and query timings. It deliberately runs expensive reference
scans on the main thread; run it separately from gameplay FPS captures.

---

# 👛 Testnet3 Wallet Integration

SupGalaxy includes a built-in Bitcoin testnet3 wallet (`js/wallet.js`) to handle P2FK messaging and decentralized persistence.

### Wallet Functions
- **Login & Unlock:** You can generate a new testnet3 address or import an existing WIF (Wallet Import Format) private key. Your wallet is protected by a password and stored securely in your browser's local storage.
- **Saving to Testnet3:** Game state and chunks are uploaded to IPFS (via `p2fk.io`), and the resulting URN is broadcasted on-chain using P2FK messages from your wallet.
- **Consolidate Funds:** The wallet includes tools to consolidate funds from change addresses back to your main address (`consolidateChange()`) or prepare funds specifically for messaging (`consolidateForMessaging()`).
- **Export WIF:** You can easily export your private key at any time to back it up or use it in other Sup!? sister projects (like SupSpace or SupRadio).

All exported wallet functions (`generateKey`, `importWallet`, `unlockWallet`, `exportWif`, `consolidateChange`, `sendManyWithWallet`, `signWithWallet`, etc.) are globally accessible via the `window` object for seamless integration with the game logic.

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

### 1.5 Configure Custom IPFS Root (Optional)

By default, SupGalaxy looks for local IPFS files in `C:/Sup/ipfs` when running in Sup!? local mode (with `transactionid` parameter). You can override this location using the `ipfs-path` URL parameter:

**Examples:**
```
# Use default C:/Sup/ipfs
http://127.0.0.1:8080/?transactionid=ABCD

# Use custom Windows path
http://127.0.0.1:8080/?transactionid=ABCD&ipfs-path=D:/MyIPFS

# Use custom Unix path  
http://127.0.0.1:8080/?transactionid=ABCD&ipfs-path=/home/user/ipfs
```

**Note:** The path should use forward slashes (`/`) even on Windows for proper `file:///` URL construction.
  

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
