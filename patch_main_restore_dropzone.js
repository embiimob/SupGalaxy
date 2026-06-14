const fs = require('fs');

let mainContent = fs.readFileSync('js/main.js', 'utf8');
let htmlContent = fs.readFileSync('index.html', 'utf8');

if (!htmlContent.includes('id="dropZone"')) {
    // Add back the drop zone to the login menu
    const dropZoneHtml = `
      <div id="dropZone" class="hidden">
        <p>Drop a save file or connection file here</p>
      </div>
    `;
    htmlContent = htmlContent.replace(/<div id="internalWalletSection">/, dropZoneHtml + '\n<div id="internalWalletSection">');
    fs.writeFileSync('index.html', htmlContent);
}

// In main.js, ensure we bind drag and drop for save files back to dropZone or window
// We already removed dropZone earlier, so let's just make the window accept drag and drop for save JSONs.

let newDropLogic = `
window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (loginOverlay.style.display !== 'none') {
        e.dataTransfer.dropEffect = 'copy';
    }
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (loginOverlay.style.display !== 'none') {
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.worldName && data.worldSeed) {
                        applySaveFile(data, true);
                    }
                } catch(e) {
                    console.error('Invalid save file', e);
                }
            };
            reader.readAsText(file);
        }
    }
});
`;

if (!mainContent.includes("window.addEventListener('drop'")) {
    mainContent += "\n" + newDropLogic;
    fs.writeFileSync('js/main.js', mainContent);
}
