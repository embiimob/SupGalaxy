cat << 'INNER_EOF' > js/declare.js.patch
--- js/declare.js
+++ js/declare.js
@@ -700,6 +700,7 @@
     activeChunkLoads = 0,
     maxConcurrentChunkLoads = 2,
     MAX_DISTANCE = 500,
+    isAutoplayPaused = !1,
     magicianStonePlacement = null,
     magicianStones = {},
     magicianStonesLoading = new Set(), // Entity-based deduplication: tracks stones by position key during loading to prevent duplicate instantiation across ALL file types
INNER_EOF
patch js/declare.js < js/declare.js.patch
