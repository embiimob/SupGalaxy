const fs = require('fs');

let htmlContent = fs.readFileSync('index.html', 'utf8');

htmlContent = htmlContent.replace(/<div class="compose-row" id="internalImportRow">/g, '<div class="compose-row" id="internalImportRow" style="display: none;">');
htmlContent = htmlContent.replace(/<div class="compose-row" id="internalImportPwdRow">/g, '<div class="compose-row" id="internalImportPwdRow" style="display: none;">');
htmlContent = htmlContent.replace(/<div class="compose-row" id="internalUnlockRow">/g, '<div class="compose-row" id="internalUnlockRow" style="display: none;">');
htmlContent = htmlContent.replace(/<div class="compose-row" id="internalActionsRow">/g, '<div class="compose-row" id="internalActionsRow" style="display: none;">');

fs.writeFileSync('index.html', htmlContent);
