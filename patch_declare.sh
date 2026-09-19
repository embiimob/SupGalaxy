cat << 'INNER_EOF' > js/declare.js.patch
--- js/declare.js
+++ js/declare.js
@@ -948,3 +948,25 @@

     console.log(`[MagicianStone] Cleaned up resources for key ${key}`);
 }
+
+/**
+ * Globally available function to cleanly remove a Calligraphy Stone and all its associated resources.
+ * @param {Object} stone - The calligraphy stone object to clean up
+ * @param {string} key - The key of the stone (for logging purposes)
+ */
+function cleanupCalligraphyStone(stone, key) {
+    if (!stone) return;
+    if (stone.mesh) {
+        scene.remove(stone.mesh);
+        disposeObject(stone.mesh);
+    }
+}
+
+/**
+ * Globally available function to cleanly remove a Chest and all its associated resources.
+ * @param {Object} chest - The chest object to clean up
+ * @param {string} key - The key of the chest (for logging purposes)
+ */
+function cleanupChest(chest, key) {
+    if (!chest) return;
+    if (chest.mesh) {
+        scene.remove(chest.mesh);
+        disposeObject(chest.mesh);
+    }
+}
INNER_EOF
patch js/declare.js < js/declare.js.patch
