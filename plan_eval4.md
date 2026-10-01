Okay, that addresses the internal edges on chunk borders caused by adjacent chunks not updating when a neighboring chunk finishes generating!

Now for **New Issue 1 - Underwater Color**:
We need a highly transparent, light blue-green tint overlay when `window.playerInWater === true`.
We can dynamically add a `div` to `document.body` if it doesn't exist, and toggle its visibility in `js/main.js` inside `gameLoop`.
Alternatively, we can create it once during `initThree` or `initUI` and just toggle it.
Let's see if there's an `initUI` or similar. I can just inject it right in `js/main.js` at the top or during setup.
