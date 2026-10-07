# 🌌 SupGalaxy v1.3.0

**SupGalaxy** is an open-source, serverless voxel world—**Minecraft-style gameplay fused with satoshi-grade decentralization**. Worlds generate from simple keyword seeds and sync globally through **IPFS + P2FK** on Bitcoin testnet3. No accounts. No servers. No gatekeepers. Just your browser and an infinite procedural cosmos.

Built with ❤️ by **embii4u**, **kattacomi**, **Grok (xAI)**, **Jules**, **ChatGPT** and **github CoPilot**.

> **License: CC0 (Public Domain)**  
> Use, modify, remix, or commercialize freely.  
> **Demo: https://supgalaxy.org**

---

## 🆕 What's New in v1.3.0

- **⛏ Iron & Blue Iron Picks** — real mining tools with per-block hit counts, melee damage multipliers, breakage odds and a glowing Blue Iron head (see [Mining and Picks](#-mining-and-picks)).
- **🏰 Castle building set** — doors that open and close, oak & castle-stone stairs, portcullis gates, castle bricks, battlements, limestone, roof tiles, support beams and rose stained glass (see [Building Blocks](#-building-blocks-stairs-doors--castles)).
- **👹 Level 2 mobs (score ≥ 500)** — every world type gets a new mob modelled on a different voxel game: Bone Archers (night), Timber Wolves, Dust Vultures, Crater Hoppers, Ember Drifters and Moss Brutes. Dust Vultures are the first **flying** mobs (see [Mob Evolution](#-mob-evolution--elite-mobs)).
- **❓ …and more beyond** — keep raising your score. Rumour has it that stranger, deadlier things wait at higher tiers.
- **👀 Longer player view** — other players' avatars are now drawn up to 64 blocks away (was 32).
- **🦴 Bones** — scattered under Dust Vulture roosts. Pick them up and keep them as a crafting item.

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
  Its glowing head lights the mining area with the same blue light as Blue Calcite, in first person, third person, and multiplayer.
- Breakage is rolled once per use, including misses and hits on protected blocks; the current swing still completes.
- **Red lasers** can mine only blocks breakable by hand. **Green lasers** can also mine Stone, Emerald, and Dark Glass, but not Obsidian. **Blue lasers** mine an area, and one blast breaks any breakable block (including castle bricks). Obsidian resists and needs 4 blasts. Bedrock and chunk ownership protections remain in effect.

### 🏰 Building Blocks: Stairs, Doors & Castles

Directional blocks (doors, stairs, portcullis) face the way your camera is looking when you place them.

| Block | Recipe | Notes |
|-------|--------|-------|
| Oak Door | 5 Wooden Planks + 1 Iron Ore → 1 | Two blocks tall. **Right-click** to open/close; it won't close on top of a player. Toggles sync in multiplayer and respect chunk ownership. |
| Oak Stairs | 6 Wooden Planks → 4 | Walk up them without jumping. |
| Castle Stone Stairs | 6 Castle Stone Bricks → 4 | Stone variant of stairs. |
| Portcullis | 4 Iron Ore + 1 Coal → 1 | See-through iron gate grid. |
| Castle Stone Bricks | 3 Stone + 1 Brick → 4 | Core castle wall block. |
| Mossy Castle Bricks | 3 Castle Stone Bricks + 1 Moss → 4 | Weathered walls. |
| Battlement Stone | 3 Castle Stone Bricks + 1 Smooth Stone → 4 | Crenellated wall tops. |
| Chiseled Limestone | 2 Marble + 1 Coal → 2 | Decorative trim. |
| Polished Limestone | 3 Smooth Stone + 1 Sand → 4 | Clean pale stone. |
| Red Roof Tile | 2 Brick + 1 Clay → 4 | Roofing. |
| Slate Roof Tile | 2 Cobblestone + 1 Coal → 4 | Roofing. |
| Oak Support Beam | 2 Wood + 2 Wooden Planks → 4 | Timber framing. |
| Rose Stained Glass | 2 Glass + 1 Flower → 2 | Tinted castle windows. |

---

## 👹 Mob Evolution & Elite Mobs

The galaxy fights back as you get stronger. Mob tiers unlock from the **highest score of any player in an area** (players within ~96 blocks of each other), so a veteran raises the danger for everyone nearby.

| Tier | Score | Effect |
|------|-------|--------|
| 1 | 0 – 499 | The starting mobs (below) |
| 2 | 500+ | One **level-2 mob** per world type joins the existing spawns (always hostile, moderate difficulty) |
| ? | ??? | *Higher scores awaken things that are not listed here. Go find them.* |

You get a warning message whenever your score crosses into a new tier. Dying resets your score, and elite mobs leave once no nearby player meets their tier.

### Level 1 — starting mobs

| Mob | Where / when | Notes |
|-----|--------------|-------|
| **Bee** | 🌍 Earth by day, 🗿 Massive by night | Gathers pollen and makes honey. |
| **Crawley** | Night on 🌍 Earth, 🏜 Desert and 🗿 Massive; day on 🌙 Moon; any time on 🌋 Vulcan | Hunts honey and smashes hives, and fears torchlight. Eye colour shows its toughness: **green** (5 HP), **red** (10 HP) or **blue** (15 HP, rare). |
| **Spider** | 🌋 Vulcan | Eight-legged hunter. |
| **Grub** | 🏜 Desert (max 2 per loaded map) | A segmented giant that eats cactus and glows at night. |
| **Fish & Whales** | Water (every world but the Moon) | Schools of fish, rare fish and whales that feed on them. |
| **UFO** | Once per player per game session, after one hour idle | Approaches for 90 seconds before firing blue lasers for up to 150 seconds, then leaves. Drops Blue Calcite for the Blue Laser Gun. |

### Level 2 (score 500+)

Each mob is based on a different voxel game and borrows that game's way of fighting.

| World | Mob | Inspired by | How it fights | HP | Score | Drop |
|-------|-----|-------------|---------------|----|-------|------|
| 🌍 Earth / 🗿 Massive | **Bone Archer** *(night only)* | *Minecraft* Skeleton | Keeps about 6–15 blocks away, strafes around you and backs off if you rush it. It then draws its bow and fires **arcing arrows**. Break line of sight or close in fast. Leaves at sunrise. | 20 | 40 | Iron Ore (50%) |
| 🌍 Earth / 🗿 Massive / 🏜 Desert | **Timber Wolf** *(pack / pet)* | *Veloren* Wolf | Hunts players and all other mobs, except wolves, day or night. Wolves **circle prey 4–6 blocks out**, then **lunge in for a bite**. A wild wolf below 30% HP **breaks off and flees**. Select a **Bone** and left-click a wild wolf: each bone has a **1 in 3** chance of taming it, up to **3 pets**. | 12 | 25 | 2 Bones (60%) |
| 🏜 Desert | **Dust Vulture** *(flying)* | *7 Days to Die* Vultures | The flock **circles a roost far out at the edge of the loaded map** (about 60–75 blocks away; easy to spot in third person). There are never more than **4 per world**. Get within ~26 blocks of the roost and they **dive-bomb** you for a bite, then climb away. They follow you up to ~40 blocks from the roost. **Bones** lie scattered on the ground under every roost. | 12 | 30 | 2 Bones (60%) |
| 🌙 Moon / 🌍 Earth swamps | **Crater Hopper** | *Cube World* Slime | A wobbling jelly cube. It **squashes down, then bounces at you** in long low-gravity arcs, damaging you if it lands on you. Sidestep while it's in the air. On Earth it only appears in **swamp** biomes, is green, and drops Green Crystal instead. | 10 | 25 | Blue Crystal (50%) · Green Crystal on Earth (50%) |
| 🌋 Vulcan | **Ember Drifter** | *Vintage Story* Drifter | A hunched, ash-grey shambler with a smouldering chest. It's rare, and only **notices you within 11 blocks** (it keeps chasing out to 22 once engaged). It **lobs glowing cinders** and **claws** you up close. | 14 | 25 | 2 Torches (60%) |
| 🗿 Massive | **Moss Brute** | *Hytale* Trork | A tusked, club-carrying brute. It **roars (0.85 s warning), then charges** in a straight line. Dodge sideways and it **stumbles, dazed**, for about 1.7 s. Up close it **swings its club**. | 22 | 30 | 3 Leaves (60%) |

**Wolf companions:** Pets actively hunt mobs and award their owner the kill score. They follow you across planets and respawn nearby when more than **32 blocks** away. **Every bone fed adds 10 HP**, even if taming fails; keep feeding pets to increase their HP without a cap. Session saves restore your pets and their HP alongside your inventory, score and HP. Pet wolves never attack players; while you have a pet, wild wolves also leave you alone (but still hunt players without pets). Mobs treat wolves like players, including only retaliating when attacked if normally passive. A pet defeated in combat is removed from your roster and future saves.

### Wide-ranging Mobs & Despawning

Grubs (max **2**) and Dust Vultures (max **4**) are counted across the **whole loaded map**, not just near each player. They **don't despawn when you walk away**. They leave only when their chunk unloads from the authority's loaded (third-person viewable) map, or when no player in the world still meets their tier. Other mobs still despawn beyond ~96 blocks.

Elite mobs are built from Three.js meshes (spheres, cylinders, cones, tori), not only voxel boxes. They have animated rigs (bow draw, slime squash-and-stretch, cinder throw, charge, wing flaps) and flash red when hit. Arrows and cinders are real projectiles that arc under gravity. Elite projectiles never destroy blocks, can be blocked by walls, and carry **no dynamic lights**: adding or removing a scene light recompiles every material and causes a visible freeze. Hits spawn a small shard burst instead.

**UFO riding:** Land or teleport onto the large blue-laser UFO's hull to walk around and ride its existing flight animation. Riders cannot steer it. It carries you beyond the map boundary during departure; when it disappears, you fall. Surviving, destroying it, moving again, or changing planets does not grant another encounter until a new game session.

**Idle logout:** Being killed by this UFO ends your game session, disconnects the dedicated server and all WebRTC peers, stops microphone/camera capture, and returns you to login. Ordinary deaths still offer normal respawning.

### 🦴 Bones

Bones (item ID 176) appear on the ground under Dust Vulture roosts. The roost's spawning authority keeps about 3 there and announces them to peers via `item_dropped`. Walk over a bone to pick it up. Bones are an **item-only crafting ingredient**: you can't place them, and their recipes are coming in a future update.

### Multiplayer Behaviour

- Elites use the shared mob pipeline (`mob_spawn` / `mob_update_batch` / `mob_hit` / `mob_kill` / `mob_despawn`). Only the mob's **authority** runs its AI (the area spawner, or the host as fallback). Everyone else interpolates its position and aiState, so animations match on every screen.
- In dedicated-server mode, the elected **world authority** spawns and simulates wild mobs, including grubs. **Pet wolves are simulated only by their owner**, including pets restored from session saves; other clients, even the world authority, interpolate the owner's updates.
- Ranged attacks travel as `laser_fired_batch` projectiles. Each client checks hits **against its own player only**, so a dodge on your screen is a real dodge.
- Melee and area attacks (vulture bite, hopper squash, drifter claw, brute charge/club, wolf bite and more) are sent as `elite_mob_attack` messages. The host relays them by world, and each client checks its own player once, with deduplication.
- A player's projectile hit on a mob is reported **once, by the shooter**, to the mob's authority.
- Player scores and the held item ride along with `player_move` (also sent when you switch hotbar slots while standing still), so every spawner knows the area's tier and what each player is holding.

### Adding the Next Tiers

1. Add a definition to `ELITE_MOB_TYPES` and its builder/`think`/animation code in `js/mob-evolution.js`. Fields include `archetypes`, day/night, HP, score, drop, hitbox, and the optional `provoke: "armed" | "attacked"`, `grudgeMs`, `worldMax`, `wideRange`, `biomes`, per-world `drops`, `roost` and `burrows`.
2. Append a tier to `MOB_EVOLUTION_TIERS` (e.g. `{ level: 5, minScore: 5000, introduces: [...], retires: [...] }`).

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
- +10 score per mob defeated (elite mobs: +25 to +220)  
- Players & mobs spawn in loaded chunks  
- TURN server recommended for multiplayer  
- Press `/` to open chat and talk with other players in your world  

---

# ⚔️ Multiplayer: WebRTC Signaling

There are three ways to connect with other players via WebRTC: **Dedicated Server**, **Automated On-Chain Signaling (Testnet3)**, and **Manual Drag-and-Drop**.

## Dedicated Server Mode
Instead of connecting directly to peers, you can connect through a central dedicated server. This allows for instant, always-on connections without exchanging files or using a wallet.
- **Default Server**: `https://play.supgalaxy.org:55555`
- **Host Your Own**: You can run your own instance. Check out the project site at [https://github.com/embiimob/SupGalaxy-Server](https://github.com/embiimob/SupGalaxy-Server).

**To join a server:**
1. Open 🌐 **Switch world** → click **Connect to Server**.
2. Enter the server address (e.g., `https://play.supgalaxy.org:55555`).
3. Click **Connect**.

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
