Wait, let's verify if `inWater` works nicely when looking up. `inWater` is true if `getBlockAt` is 6 for BOTH `player.y + 0.5` and `player.y + 1.5`.
If the player's camera is at `player.y + 1.62` (as per `camera.position.set(player.x, player.y + 1.62, player.z)`), then checking `player.y + 1.5` is extremely close to the camera. It means the water overlay will trigger exactly when the player is submerged up to their eyes. This matches perfectly with what the user wants for "underwater vision"!

Let's do a quick pre-commit check.
