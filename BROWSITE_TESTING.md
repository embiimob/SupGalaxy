# Browsite Stone - Manual Testing Guide

## Overview
This document provides comprehensive testing instructions for the new Browsite Stone feature in SupGalaxy.

## Test Prerequisites
1. Open the game in a modern web browser (Chrome/Firefox recommended)
2. Create or load a world
3. Ensure you have at least 3 sand blocks in your inventory

## Test Cases

### Test 1: Crafting the Browsite Stone
**Objective:** Verify that the browsite stone can be crafted using the correct recipe.

**Steps:**
1. Open the crafting table (press 'C' or right-click crafting table)
2. Look for "Browsite" in the crafting recipes list
3. Verify the recipe shows: 3 Sand → 1 Browsite
4. Ensure you have at least 3 sand blocks
5. Click on the Browsite recipe to craft it
6. Verify that:
   - 3 sand blocks are consumed from your inventory
   - 1 Browsite stone is added to your inventory
   - The Browsite stone has a blue color (#4169E1)

**Expected Result:** Browsite stone is successfully crafted and appears in inventory.

---

### Test 2: Placing the Browsite Stone
**Objective:** Verify that the browsite stone can be placed and opens the configuration modal.

**Steps:**
1. Select the Browsite stone from your hotbar
2. Right-click on a wall or floor to place it
3. Verify that a modal appears with the title "Browsite"
4. Check that the modal contains:
   - URL input field (placeholder: "https://example.com")
   - Width and Height inputs (default: 3 and 2)
   - Position offset inputs (X, Y, Z - defaults: 0, 2, 0)
   - Cancel and Place buttons

**Expected Result:** Modal appears with all configuration options.

---

### Test 3: URL Validation
**Objective:** Verify that URL validation works correctly.

**Steps:**
1. Place a browsite stone to open the modal
2. Try to save with an empty URL
   - **Expected:** Error message "URL is required."
3. Try to save with an invalid URL (e.g., "example.com" without protocol)
   - **Expected:** Error message "URL must start with http:// or https://"
4. Enter a valid URL (e.g., "https://example.com")
5. Click "Place"
   - **Expected:** Modal closes, stone is placed, inventory count decreases

**Expected Result:** Only valid http:// or https:// URLs are accepted.

---

### Test 4: Stone Placement and Visual Appearance
**Objective:** Verify that the browsite stone appears correctly in the world.

**Steps:**
1. Place a browsite stone with URL "https://example.com"
2. Use default size (3×2) and offset values
3. After placement, observe the stone in the world
4. Verify that:
   - A blue rectangular plane appears in the world
   - The plane shows a browser icon (🌐) and "Browsite" text
   - The size matches the configured width and height
   - The plane faces the player (based on placement direction)
   - The plane is positioned at the correct offset from the block

**Expected Result:** Browsite stone appears as a blue plane with browser icon.

---

### Test 5: Opening the In-Game Browser
**Objective:** Verify that clicking the browsite stone opens the in-game browser overlay.

**Steps:**
1. Place a browsite stone with a valid URL (e.g., "https://www.wikipedia.org")
2. Left-click on the placed browsite stone
3. Verify that:
   - A browser overlay appears covering the full screen
   - The header shows "Browsite Browser" and a "Close (ESC)" button
   - An iframe loads the specified URL
   - A message appears: "Opening Browsite..."
   - Camera and movement controls are locked (player cannot move/look around)

**Expected Result:** In-game browser opens with the specified URL loaded in an iframe.

---

### Test 6: Browser Interaction
**Objective:** Verify that the player can interact with the loaded webpage.

**Steps:**
1. Open a browsite stone with a URL like "https://www.wikipedia.org"
2. Wait for the page to load in the iframe
3. Try the following interactions:
   - Click on links within the webpage
   - Scroll the page using mouse wheel or scrollbar
   - Type text into search boxes or input fields (if available)
   - Navigate between pages using browser links

**Expected Result:** Full browser interaction works within the iframe.

---

### Test 7: Closing the Browser with ESC
**Objective:** Verify that the ESC key closes the browser and restores game controls.

**Steps:**
1. Open a browsite stone to display the browser overlay
2. Press the ESC key
3. Verify that:
   - The browser overlay closes immediately
   - The iframe is cleared (src set to "about:blank")
   - Camera and movement controls are unlocked
   - Player can move and look around normally again

**Expected Result:** Browser closes and game controls are restored.

---

### Test 8: Closing the Browser with Close Button
**Objective:** Verify that the close button works the same as ESC key.

**Steps:**
1. Open a browsite stone to display the browser overlay
2. Click the "Close (ESC)" button in the header
3. Verify that the browser closes and controls are restored (same as Test 7)

**Expected Result:** Browser closes via close button.

---

### Test 9: Destroying the Browsite Stone
**Objective:** Verify that the browsite stone can be removed and returns to inventory.

**Steps:**
1. Place a browsite stone
2. Left-click and hold on the placed stone to break it
3. Verify that:
   - The stone breaks after the appropriate number of hits (strength = 3)
   - The browsite stone is added back to your inventory
   - The visual plane is removed from the world
   - A message appears: "Picked up Browsite"

**Expected Result:** Stone is destroyed and returned to inventory.

---

### Test 10: Persistence - Session Save and Load
**Objective:** Verify that browsite stones are saved and restored correctly.

**Steps:**
1. Place multiple browsite stones with different URLs and positions
2. Note the positions and URLs used
3. Press 'X' to save the session
4. Choose "Save Full Session" or "Save Player Changes Only"
5. Download and save the JSON file
6. Reload the page or restart the game
7. Upload the saved JSON file to restore the session
8. Verify that:
   - All browsite stones reappear at their original positions
   - Each stone has the correct URL stored
   - Clicking each stone opens the correct URL

**Expected Result:** Browsite stones persist correctly across sessions.

---

### Test 11: Multiplayer Synchronization
**Objective:** Verify that browsite stones sync across multiplayer connections.

**Steps:**
1. Set up a multiplayer session (host and client)
2. As the host, place a browsite stone
3. On the client, verify that:
   - The browsite stone appears in the same position
   - The stone has the same size and appearance
   - Clicking the stone opens the same URL
4. As the client, place a different browsite stone
5. On the host, verify the client's stone appears and works

**Expected Result:** Browsite stones synchronize correctly between host and clients.

---

### Test 12: IPFS Integration
**Objective:** Verify that browsite stones can be published to and loaded from IPFS.

**Steps:**
1. Place several browsite stones in a world
2. Save the session to a JSON file
3. Publish the JSON file to IPFS using the game's IPFS publishing feature
4. In a new session, load chunks from IPFS
5. Verify that:
   - Browsite stones appear from the IPFS data
   - Each stone has the correct URL
   - Clicking stones opens the correct URLs

**Expected Result:** Browsite stones persist and load correctly from IPFS.

---

### Test 13: Edge Cases and Error Handling

**Test 13.1: Invalid URL After Placement**
1. Place a browsite with URL "https://invalid.nonexistent.domain.test"
2. Click the stone
3. **Expected:** Browser overlay opens, but iframe shows connection error (browser's built-in error page)

**Test 13.2: Very Long URLs**
1. Place a browsite with a very long but valid URL (e.g., 500+ characters)
2. Verify placement works
3. Click the stone and verify it loads

**Test 13.3: Special Characters in URL**
1. Place a browsite with URL containing query parameters (e.g., "https://example.com?test=1&foo=bar")
2. Verify it works correctly

**Test 13.4: Multiple Browsite Stones**
1. Place 10+ browsite stones with different URLs
2. Verify all can be clicked and opened independently
3. Verify no memory leaks or performance issues

**Expected Result:** All edge cases are handled gracefully.

---

### Test 14: Security - Iframe Sandbox
**Objective:** Verify that the iframe is properly sandboxed for security.

**Steps:**
1. Inspect the HTML of the browsite browser overlay
2. Check the iframe element
3. Verify it has the `sandbox` attribute
4. Verify the sandbox allows: `allow-scripts allow-same-origin allow-forms allow-popups`
5. Test that malicious sites cannot break out of the iframe

**Expected Result:** Iframe is properly sandboxed for security.

---

## Test Summary Checklist

- [ ] Test 1: Crafting works correctly
- [ ] Test 2: Placement modal appears
- [ ] Test 3: URL validation works
- [ ] Test 4: Visual appearance is correct
- [ ] Test 5: Browser overlay opens
- [ ] Test 6: Browser interaction works
- [ ] Test 7: ESC key closes browser
- [ ] Test 8: Close button works
- [ ] Test 9: Stone can be destroyed
- [ ] Test 10: Session persistence works
- [ ] Test 11: Multiplayer sync works
- [ ] Test 12: IPFS integration works
- [ ] Test 13: Edge cases handled
- [ ] Test 14: Security sandbox works

---

## Known Limitations

1. **Browser Compatibility:** The browsite feature relies on iframes, which may have limitations depending on the target website's security policies (X-Frame-Options, CSP).

2. **CORS Restrictions:** Some websites may not load in the iframe due to CORS policies. This is expected browser behavior and not a bug.

3. **Keyboard Input:** While browsing, all keyboard input is directed to the iframe. This is intentional to allow typing in forms.

---

## Reporting Issues

If you encounter any issues during testing, please report them with:
1. Test case number and name
2. Steps to reproduce
3. Expected vs. actual behavior
4. Browser and version
5. Console errors (F12 developer tools)
6. Screenshots if applicable
