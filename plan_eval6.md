Looking at `z-index`, most UI panels are `z-index: 200` to `240`. `damageFlash` is `9999`. So if I use `z-index: 900`, `waterOverlay` will render OVER the UI panels (which includes the chat, crosshair, health, etc.).
We probably want `waterOverlay` to only cover the canvas, NOT the UI.
Let's see what `z-index` the canvas has. It doesn't have an explicit one, so it's auto (0).
Let's change `waterOverlay` to `z-index: 10` so it is above the canvas (0) but below the UI (which usually starts around 100+). Wait, what if other UI elements don't have a `z-index` specified, but they appear later in the DOM?
If the canvas is appended to `document.body` later, it might appear over `waterOverlay` if `z-index` is 0.
Wait, `renderer.domElement` is appended to `body` in `initThree`, *after* I append `waterOverlay`.
```javascript
    document.body.appendChild(waterOverlay);
    // ...
    document.body.appendChild(renderer.domElement)
```
If `waterOverlay` has no `z-index` or `z-index: 0`, and the canvas has no `z-index` or `0`, the canvas will be on top.
So `waterOverlay.style.zIndex = "10";` will ensure it's on top of the canvas, but below `z-index: 200` UI elements. Wait, do we want the water overlay to cover the hotbar? Usually in games, the HUD is not tinted by water. So yes, `z-index: 10` is perfect!

Let's do that.
