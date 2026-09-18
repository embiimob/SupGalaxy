const fs = require('fs');

let mainCode = fs.readFileSync('js/main.js', 'utf8');

const searchCodeMagician = `    // Mark as loading to prevent duplicate loads during async operations.
    // This guard applies to ALL asset types, not just .glb files.
    magicianStonesLoading.add(key);`;

const replaceCodeMagician = `    // Mark as loading to prevent duplicate loads during async operations.
    // This guard applies to ALL asset types, not just .glb files.
    magicianStonesLoading.add(key);

    if (typeof window.magicianStoneGenerations === 'undefined') {
        window.magicianStoneGenerations = {};
    }
    window.magicianStoneGenerations[key] = (window.magicianStoneGenerations[key] || 0) + 1;
    const generationId = window.magicianStoneGenerations[key];`;

const searchCodeMagicianGlb = `                // Post-async-load deduplication check: another load may have completed while this one was in progress.
                // This check is entity-based (using position key) and independent of file extension.
                if (magicianStones[key] && magicianStones[key].mesh) {`;

const replaceCodeMagicianGlb = `                // Check generation ID to prevent race condition when block was removed during async loading
                if (generationId !== window.magicianStoneGenerations[key]) {
                    console.log(\`[MagicianStone] Async load aborted for key \${key} - block was replaced during load\`);
                    magicianStonesLoading.delete(key);
                    disposeObject(gltf.scene);
                    return;
                }

                // Post-async-load deduplication check: another load may have completed while this one was in progress.
                // This check is entity-based (using position key) and independent of file extension.
                if (magicianStones[key] && magicianStones[key].mesh) {`;

const searchCodeMagicianGif = `        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();`;

const replaceCodeMagicianGif = `        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            // Check generation ID to prevent race condition when block was removed during async loading
            if (generationId !== window.magicianStoneGenerations[key]) {
                console.log(\`[MagicianStone] Async load aborted for key \${key} - block was replaced during load\`);
                magicianStonesLoading.delete(key);
                return;
            }`;

const searchCodeMagicianImg = `        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = function() {`;

const replaceCodeMagicianImg = `        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = function() {
            // Check generation ID to prevent race condition when block was removed during async loading
            if (generationId !== window.magicianStoneGenerations[key]) {
                console.log(\`[MagicianStone] Async load aborted for key \${key} - block was replaced during load\`);
                magicianStonesLoading.delete(key);
                return;
            }`;

mainCode = mainCode.replace(searchCodeMagician, replaceCodeMagician);
mainCode = mainCode.replace(searchCodeMagicianGlb, replaceCodeMagicianGlb);
mainCode = mainCode.replace(searchCodeMagicianGif, replaceCodeMagicianGif);
mainCode = mainCode.replace(searchCodeMagicianImg, replaceCodeMagicianImg);

const searchCodeCalligraphy = `    // Mark as loading to prevent duplicate loads
    calligraphyStonesLoading.add(key);`;

const replaceCodeCalligraphy = `    // Mark as loading to prevent duplicate loads
    calligraphyStonesLoading.add(key);

    if (typeof window.calligraphyStoneGenerations === 'undefined') {
        window.calligraphyStoneGenerations = {};
    }
    window.calligraphyStoneGenerations[key] = (window.calligraphyStoneGenerations[key] || 0) + 1;
    const generationId = window.calligraphyStoneGenerations[key];`;

const searchCodeCalligraphyFont = `        document.fonts.add(newFont);
        await newFont.load();
    } catch (e) {`;

const replaceCodeCalligraphyFont = `        document.fonts.add(newFont);
        await newFont.load();

        // Check generation ID to prevent race condition when block was removed during async font loading
        if (generationId !== window.calligraphyStoneGenerations[key]) {
            console.log(\`[CalligraphyStone] Async load aborted for key \${key} - block was replaced during font load\`);
            calligraphyStonesLoading.delete(key);
            return;
        }
    } catch (e) {`;

mainCode = mainCode.replace(searchCodeCalligraphy, replaceCodeCalligraphy);
mainCode = mainCode.replace(searchCodeCalligraphyFont, replaceCodeCalligraphyFont);

fs.writeFileSync('js/main.js', mainCode);
console.log('Successfully patched js/main.js');
