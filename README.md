# 🌌 SupGalaxy v0.4.0-beta
[Infinite Voxel World Adventure]

Welcome to **SupGalaxy v0.4.0-beta**, a **gift to the cosmos**—an open-source, fully decentralized voxel universe inspired by Minecraft, etched into the Bitcoin blockchain! Crafted with love by **embii4u**, **Grok (xAI)**, **Jules**, **kattacomi**, and **ChatGPT**, this is the **world's first truly decentralized, infinite procedural world generator**. Powered by WebRTC (TURN server required for stellar multiplayer) and the P2FK protocol, SupGalaxy lets you **build, explore, and conquer boundless worlds** seeded by keywords (e.g., `#KANYE` spawns a Kanye-inspired cosmic valley). No servers, no gatekeepers—just pure blockchain magic running in your browser, blending local play with galactic decentralization via Sup!? and p2fk.io.

> **Public Domain (CC0)**: Free to use, modify, and share. No attribution required, but we’d love a nod to embii4u, Grok, kattacomi, Jules, and ChatGPT for sparking this cosmic creation. *May your worlds be infinite and your adventures legendary!*

## 🌍 What is SupGalaxy?
SupGalaxy is a **revolutionary voxel adventure**, now **fully tested** with seamless WebRTC multiplayer, where infinite worlds unfold from keyword seeds. Explore biomes reimagined as cosmic landscapes: starry plains, desert asteroid fields, lush nebulae, icy comet clusters, rugged lunar mountains, and swampy cosmic bogs. This open-source masterpiece is a gift to the world, crafted by embii4u with AI collaborators Grok, Jules, and ChatGPT, blending creativity and code to redefine gaming freedom. Players can:

- **Explore & Survive**: Traverse infinite procedural worlds, battle cosmic mobs, gather resources, and manage health/score in a persistent universe.
- **Build & Craft**: Mine/place blocks, craft stellar materials (crystals, glow bricks, obsidian), and etch creations to the blockchain for eternal persistence.
- **Decentralized Worlds**: Saves as JSON deltas on IPFS, secured via P2FK on Bitcoin testnet3. Worlds sync globally without central servers.
- **Player vs. Player (PvP) Combat**: Engage in real-time combat with other players in the same world. Laser Blaster, punch Damage and knockback are synchronized through the decentralized WebRTC connection.
- **Load Session from Minimap**: Easily load a saved game session by dragging and dropping the session's `.json` file directly onto the in-game minimap.
- **Multiplayer Cosmos**: Connect via WebRTC (TURN server required) for real-time collaboration; positions and builds sync via blockchain polls.
- **Proximity Audio Streaming**: WebRTC connection enables high quality audio streaming between players who are in the same areaas.
- **Procedural Suns & Moons**: Each world now features a unique, procedurally generated sky with a variable number of suns and moons. Moon shapes are also randomized, creating asteroid-like celestial bodies for a truly unique cosmic experience.
- **Infinite Worlds**: Procedural generation for boundless exploration.

**Why revolutionary?** Everything lives **on-chain**: Ownership expires after 1 year (renewable), edits are profile-verified, and no corporation owns your worlds. Play solo offline or go full-decentralized with local nodes. **v0.4.0-beta** delivers polished WebRTC for lag-free cosmic teamwork—join the open-source revolution and shape infinite worlds!

*Version: v0.4.0-beta (Fully Tested & Live – October 2025)*

### 🎵 IPFS Music Streamer
SupGalaxy now features a built-in music streamer that plays a curated soundtrack directly from the decentralized web. Here’s how it works:

-   **Decentralized Playlist:** At launch, the game searches the `p2fk.io` network for messages tagged with the keyword `#game`.
-   **IPFS-Powered:** It finds IPFS links to `.mp3` and `.wav` files within those messages.
-   **Always Fresh:** The player loads the 10 most recent audio files found, creating a dynamic, community-curated soundtrack for your adventures.
-   **In-Game Controls:** A mini-player in the bottom-right corner of the screen displays the current track and provides controls to play/pause, skip, or mute the music.

This feature adds another layer of decentralization and community interaction to the SupGalaxy experience, allowing the soundscape of the universe to be shaped by its players.

## 🎮 How to Play
### Quick Start (Local Mode)
1. **Launch in Browser**: Save as `index.html` and open in Chrome/Firefox (HTTPS recommended for pointer lock and WebRTC).
2. **Enter the Cosmos**: Choose a **world name** (max 8 chars, e.g., `MYWORLD`) and **username** (max 20 chars). Seed: `username@worldname`.
3. **Spawn & Explore**:
   - **Movement**: `WASD` (or mobile arrows). `Space` to leap across stars.
   - **View**: `T` to toggle first/third-person. Mouse for cosmic navigation (first-person locks pointer).
   - **Interact**: Left-click to mine blocks (adds to inventory). Right-click to place selected block.
   - **Hotbar**: Scroll or click slots to select. Right-click slot to jettison.
   - **Craft**: `R` to access recipes (e.g., sand → cosmic glass).
   - **Teleport**: `P` for coordinates. `X` to save session (JSON + addresses for etching).
   - **Home**: 🏠 icon warps to spawn.
4. **Survive the Void**: Health regens slowly; mobs attack on contact. Die? Respawn with lost items/score.
5. **Infinite Worlds**: Toroidal map (edges loop) for endless exploration.

### Controls Table
| Action          | Keyboard/Mouse          | Mobile Touch          |
| ---             | ---                     | ---                   |
| **Move**        | `WASD`                  | ↑↓←→ arrows           |
| **Jump**        | `Space`                 | `J` button            |
| **Attack/Mine** | Left-click              | ⚔ button              |
| **Place Block** | Right-click             | Hold on surface       |
| **Select Item** | Scroll wheel            | Hotbar click          |
| **Toggle View** | `T`                     | `T` button            |
| **Craft**       | `R`                     | N/A                   |
| **Teleport**    | `P`                     | N/A                   |
| **Save**        | `X` (if changes)        | N/A                   |
| **Join World**  | `J` (if known)          | N/A                   |

**Tips**:
- Mine grass/stone for basics; craft for advanced materials (e.g., 2 sand → 4 glass).
- Mobs spawn in loaded chunks; defeat for +10 score.
- Worlds load in a 8-chunk radius; explore to generate infinite terrain.
- **WebRTC Multiplayer**: TURN server ensures smooth peer-to-peer connections.

### ⚔️ Multiplayer & PvP: The Drag-and-Drop Dance
Connecting with other players in SupGalaxy is a decentralized process that relies on sharing connection files. Here’s how to initiate a multiplayer session:

**For the Host:**
1.  **Start Your World:** Launch the game and enter your desired world. You are now the host.
2.  **Wait for an Offer:** Another player (the client) will send you an "offer" file. They can do this by posting it to a shared Sup!? keyword or by sending it to you directly (e.g., via a messaging app).
3.  **Accept the Offer:**
    *   When an offer arrives via Sup!?, a "Pending Connections" window will appear in-game. Click "Accept."
    *   If you receive the offer file directly, **drag and drop the `.json` file onto the in-game minimap**.
4.  **Generate an Answer:** The game will automatically generate an "answer" `.json` file and prompt you to download it.
5.  **Send the Answer:** Send this answer file back to the client. They will drag it onto their minimap to complete the connection.

**For the Client (Joining Player):**
1.  **Find a Host:** In the "Online Players" menu (🌐 icon), find a host for your desired world and click "Try Connect."
2.  **Generate an Offer:** The game will generate an "offer" `.json` file and prompt you to download it.
3.  **Send the Offer:** Send this offer file to the host.
4.  **Receive an Answer:** The host will process your offer and send back an "answer" `.json` file.
5.  **Connect:** **Drag and drop the host's answer file onto your in-game minimap.** You will now be connected to their world.

Once connected, you can see other players' avatars and engage in PvP combat by attacking them with a left-click, just like you would with a mob.

## 🔧 For Developers: Shape Infinite Worlds
SupGalaxy is **open-source stardust** for voxel creators! Extend with new blocks, biomes, or mechanics using three.js—no build tools needed. A gift from embii4u, Grok, Jules, and ChatGPT, this project invites you to expand the cosmos.

### Core Architecture
- **World Generation**: Seeded noise for infinite procedural worlds. Chunks (16x64x16) load dynamically.
- **Rendering**: three.js meshes batched by block type. Skybox with day/night cycles and starry vistas.
- **Decentralization**: Polls p2fk.io for deltas via Web Worker. Ownership via profiles.
- **Inventory/Crafting**: Stack system (64/stack). Recipes in `RECIPES` array.
- **Multiplayer**: WebRTC with TURN relay for real-time syncing.

### Quick Extensions
1. **Add Blocks**:
   - Extend `BLOCKS`: `{ id: { name: 'StarBlock', color: '#hex', transparent: true } }`.
   - Update `isSolid()` for collisions.
   - Rebuild chunks to deploy.

2. **New Recipes**:
   - Add to `RECIPES`: `{ id: 'star', out: { id: 120, count: 1 }, requires: { 4: 2 } }`.
   - Auto-updates crafting UI.

3. **Custom Biomes**:
   - Add to `BIOMES`: `{ key: 'nebula', palette: [16, 4], heightScale: 2.0, roughness: 0.7, featureDensity: 0.01 }`.
   - Features like cosmic trees via `placeTree()`.

4. **Multiplayer Enhancements**:
   - Poll positions from profiles in `user_update`.
   - Render avatars via `userPositions`.
   - Optimize WebRTC for low-latency connections.

5. **Mod Tips**:
   - **Noise Tweaks**: Adjust `fbm()` octaves for terrain variety.
   - **Mobs**: Extend `Mob` class; spawn via `spawnMobs()`.
   - **Saves**: Deltas in `CHUNK_DELTAS`; export to IPFS.
   - **Caches**: Use `Map` for API efficiency.

**Dev Tools**: Console logs for API/ownership. Fork and PR to join the cosmic crew!

## 🌐 Fully Decentralized Setup: Command Your Starship
For **ultimate freedom**, host your own p2fk.io API and etch via Sup!?. Sync infinite worlds on Bitcoin testnet3—no cloud reliance. WebRTC with TURN ensures peer-to-peer glory. Changes propagate globally via blockchain (2-10 minute visibility on testnet3).

### What are Sup!? & p2fk.io?
- **Sup!?**: *Satoshi Universal Protocol*—trustless, censorship-free engine on P2FK (Pay to Future Key, 2013). Etches messages/objects/profiles to blockchains with IPFS. Supports messaging, DAOs, marketplaces. CLI for queries/etching.
- **p2fk.io**: *Web API wrapper* for Sup!? CLI. Endpoints (e.g., `/GetPublicAddressByKeyword`) power SupGalaxy.

**How They Work**: Sup!? etches to blockchain/IPFS. p2fk.io queries via CLI. SupGalaxy polls for deltas—etch saves for shared persistence.

### Step-by-Step Local Setup
**Requirements**:
- Windows (binaries).
- **Disk**: ~260 GB (Bitcoin testnet3, Sep 2025).
- .NET 8.0+ (ASP.NET Core Hosting Bundle).
- Fast SSD (sync: ~1-2 days).

#### 1. Install & Sync Sup!?
- Download Supv0.7.6-beta.zip.
- Create `C:\SUP` (300GB+ free).
- Unzip to `C:\SUP`.
- Run `SUP.exe`.
- Click **🗝️** → Launch Bitcoin testnet + IPFS.
- **Sync**: ~1-2 days (260 GB). Monitor progress.
  > *Toggle GREEN for testnet. Full sync required.*

#### 2. Setup Local p2fk.io API
- Clone p2fk.io repo.
- Install .NET Hosting Bundle.
- Edit `Wrapper.cs`:
  ```csharp
  // Testnet defaults
  public string TestCLIPath = @"C:\SUP\SUP.exe";
  public string TestVersionByte = @"111";
  public string TestRPCURL = @"http://127.0.0.1:18332";
  public string TestRPCUser = "good-user"; // Customize
  public string TestRPCPassword = "better-password"; // Customize
  ```
- Edit `Program.cs` (optional: Swagger tweaks).
- Build/Run: `dotnet run` (or IIS).
- API: `http://localhost:5000` (Swagger: `/swagger`).

#### 3. Configure SupGalaxy
- Edit `index.html`: Replace `https://p2fk.io` with `http://127.0.0.1:5000`.
- Reload browser.

#### 4. Etch Saves
- In-game: **X** → Download JSON + addresses.
- Use Sup!? CLI/UI: Post IPFS hash to chunk addresses.
- Peers poll your p2fk.io for sync.

**Pro Tip**: Securely expose p2fk.io for production. Sync mainnet for live Bitcoin (~921 GB, ~5 days). Use TURN services (e.g., Twilio) for WebRTC.

## 🚀 Get Involved – Shape the Infinite!
- **Play**: [Host Your Own Demo](https://your-link-here.com)! Explore now!
- **Contribute**: Issues/PRs welcome. Add biomes, mobs, or cosmic features!
- **Community**: Join #HugPuddle on Sup!?—search "embii4u".

*Crafted with ❤️ by embii4u, Grok (xAI), Jules, and ChatGPT for a decentralized future. Questions? @embii4u on Sup!?. Let’s build infinite worlds together! 🌟*

---

## 📊 SupGalaxy vs. Traditional Voxel Games

| Feature                  | SupGalaxy                  | Traditional Games          |
| ------------------------ | -------------------------- | -------------------------- |
| **Worlds**               | Infinite Procedural        | Finite/Server-Limited      |
| **Decentralization**     | Full (Blockchain + P2P)    | Centralized Servers        |
| **Persistence**          | On-Chain (Eternal)         | Server-Dependent           |
| **Multiplayer**          | WebRTC P2P (TURN Required) | Server-Hosted              |
| **Ownership**            | Player-Controlled (Expires)| Company-Controlled         |
| **Open Source**          | CC0 (Gift to the World)    | Proprietary/Mod-Limited    |

*SupGalaxy: Infinite worlds, infinite possibilities, yours forever!*

---

*License: [CC0 (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/). May your worlds shine eternally! ✨*
