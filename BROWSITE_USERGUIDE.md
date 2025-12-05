# Browsite Stone - User Guide

## What is a Browsite Stone?

The **Browsite Stone** is a special block in SupGalaxy that allows you to embed and browse real web pages directly within the game world. It works similarly to the Magician's Stone and Calligraphy Stone, but instead of displaying media or text, it opens an interactive web browser overlay.

## Crafting

**Recipe:** 3 Sand → 1 Browsite

To craft a Browsite stone:
1. Gather at least 3 sand blocks
2. Open your crafting menu (press 'C' or right-click on a crafting table)
3. Find "Browsite" in the recipe list
4. Click to craft
5. The Browsite stone will appear in your inventory

## Placing a Browsite Stone

1. Select the Browsite stone from your hotbar
2. Right-click on a wall, floor, or any block where you want to place it
3. A configuration modal will appear with these options:
   - **URL**: The web address you want to load (must start with http:// or https://)
   - **Size**: Width and Height of the visual representation (in blocks)
   - **Position**: X, Y, Z offsets to fine-tune the placement
4. Enter your desired URL (e.g., `https://wikipedia.org`)
5. Adjust size and position if needed
6. Click "Place" to confirm

The Browsite stone will appear as a blue plane with a browser icon (🌐) and "Browsite" text.

## Using a Browsite Stone

1. **Opening the Browser**: Left-click on any placed Browsite stone to open the in-game browser overlay
2. **Browsing**: Once open, you can:
   - Click links to navigate
   - Scroll using your mouse wheel
   - Type in search boxes and forms
   - Interact with the website normally
3. **Closing the Browser**: 
   - Press **ESC** to close the browser
   - Or click the **"Close (ESC)"** button in the top-right corner

While the browser is open, your camera and movement controls are locked so you can interact with the webpage. They will unlock when you close the browser.

## Examples of What You Can Do

- **Reference Guides**: Place a Browsite stone linking to a wiki or tutorial
- **Music/Radio**: Link to web-based music players or radio stations
- **News & Information**: Display live news feeds or weather websites
- **Social Media**: Access your favorite social platforms in-game
- **Creative Displays**: Showcase your own websites or projects
- **Educational Content**: Link to learning resources or documentaries

## Important Notes

### URL Requirements
- URLs **must** start with `http://` or `https://`
- Example of valid URL: `https://example.com`
- Example of invalid URL: `example.com` (missing protocol)

### Website Compatibility
Some websites may not load properly in the Browsite browser due to security restrictions set by the website itself (X-Frame-Options, Content Security Policy). This is normal browser behavior and not a bug. Websites that are "iframe-friendly" will work best.

### Security
The Browsite browser uses a sandboxed iframe for security. This means:
- Websites cannot access your game data
- Websites cannot execute malicious code outside the iframe
- Your browsing is isolated from the game

### Performance
Loading complex websites may take a few seconds. Be patient while the page loads. Heavy websites with lots of JavaScript may affect game performance slightly while the browser is open.

## Multiplayer

Browsite stones are fully synchronized in multiplayer:
- When you place a Browsite stone, all connected players will see it
- Each player can independently click and browse the same Browsite stones
- The URLs are shared, so everyone sees the same websites

## Persistence

Browsite stones are automatically saved:
- **Session Save (X key)**: Your placed Browsite stones and their URLs are saved
- **IPFS Publishing**: Browsite stones can be published to IPFS along with your world data
- **World Switching**: Browsite stones remain in place when you switch worlds and return

## Removing a Browsite Stone

To remove a placed Browsite stone:
1. Left-click and hold on the stone
2. After several hits (strength = 3), the stone will break
3. The Browsite stone will return to your inventory
4. You can reuse it to place a different URL

## Tips & Tricks

1. **Test URLs First**: Make sure your URL works in a regular browser before placing a Browsite stone
2. **Size Matters**: Larger stones (higher width/height) make websites easier to read
3. **Strategic Placement**: Place Browsite stones near your base or gathering areas for easy access
4. **Multiple Stones**: You can place many Browsite stones with different URLs throughout your world
5. **Combine with Other Stones**: Mix Browsite stones with Magician's Stones and Calligraphy Stones to create rich, multimedia environments

## Troubleshooting

**Problem**: The Browsite modal doesn't appear when I right-click
- **Solution**: Make sure you have the Browsite stone selected in your hotbar and are right-clicking on a valid block surface

**Problem**: URL validation error even though my URL is correct
- **Solution**: Double-check that your URL starts with `http://` or `https://`. The protocol is required.

**Problem**: Website doesn't load in the browser
- **Solution**: Some websites block iframe embedding. Try a different website or check if the site loads in a regular browser.

**Problem**: Can't close the browser
- **Solution**: Press ESC key or click the "Close (ESC)" button. If it still doesn't close, refresh the game page.

**Problem**: Browsite stones don't appear after loading a saved session
- **Solution**: Make sure you saved your session properly before loading. Check that the JSON file includes `browsiteStones` data.

## Technical Details

- **Block ID**: 132
- **Block Color**: #4169E1 (Royal Blue)
- **Strength**: 3 (requires 3 hits to break)
- **Crafting Tier**: Basic (requires only sand)
- **Network**: Full WebRTC synchronization
- **Storage**: JSON serialization for sessions and IPFS

## Credits

The Browsite Stone feature was developed as an extension to SupGalaxy's existing stone types (Magician's Stone and Calligraphy Stone), providing players with a new way to bring external content into their voxel worlds.

---

**Enjoy browsing the web from within SupGalaxy! 🌐✨**
