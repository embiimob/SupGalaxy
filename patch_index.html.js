const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const btnHTML = `
                <button id="publishTestnetBtn" style="display: none; padding: 16px; background: #886ce4; color: #fff; border: 0; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 15px;">
                    <div style="font-size: 16px; margin-bottom: 4px;">🚀 Publish to Testnet3</div>
                    <div style="font-size: 12px; font-weight: normal; opacity: 0.8;">Upload changes to IPFS and save directly to the blockchain</div>
                </button>
`;

if (!html.includes('publishTestnetBtn')) {
    html = html.replace('</button>\n            </div>\n            <div style="margin-top: 16px; text-align: center;">\n                <button id="closeSaveOptionsModal"',
                        `</button>${btnHTML}            </div>\n            <div style="margin-top: 16px; text-align: center;">\n                <button id="closeSaveOptionsModal"`);
    fs.writeFileSync('index.html', html);
    console.log("Patched index.html");
} else {
    console.log("Already patched index.html");
}
