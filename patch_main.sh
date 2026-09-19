cat << 'INNER_EOF' > js/main.js.patch
--- js/main.js
+++ js/main.js
@@ -2432,10 +2432,7 @@
         if (a === 128) {
             const key = `${e},${t},${o}`;
             if (calligraphyStones[key]) {
-                if (calligraphyStones[key].mesh) {
-                    scene.remove(calligraphyStones[key].mesh);
-                    disposeObject(calligraphyStones[key].mesh);
-                }
+                cleanupCalligraphyStone(calligraphyStones[key], key);
                 delete calligraphyStones[key];

                 const message = JSON.stringify({
@@ -2466,10 +2463,7 @@
                         createDroppedItemOrb(dropId, pos, item.id, item.originSeed, userName, item.count);
                     }
                 }
-                if (chest.mesh) {
-                    scene.remove(chest.mesh);
-                    disposeObject(chest.mesh);
-                }
+                cleanupChest(chests[key], key);
                 delete chests[key];
             }
         }
INNER_EOF
patch js/main.js < js/main.js.patch
