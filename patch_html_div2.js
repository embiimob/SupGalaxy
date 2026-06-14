const fs = require('fs');

let htmlContent = fs.readFileSync('index.html', 'utf8');

const strToFind = `          <div class="compose-row" id="internalActionsRow" style="display: none;">
            <button type="button" id="internalLockBtn">Lock</button>
            <button type="button" id="internalConsolidateBtn">Consolidate change</button>
            <button type="button" id="internalConsolidateMessagingBtn">Consolidate for messaging</button>
            <button type="button" id="internalExportKeyBtn">Export key</button>
            <button type="button" id="internalForgetBtn">Forget key</button>
          </div>


        </div>
    </div>`;

const replaceWith = `          <div class="compose-row" id="internalActionsRow" style="display: none;">
            <button type="button" id="internalLockBtn">Lock</button>
            <button type="button" id="internalConsolidateBtn">Consolidate change</button>
            <button type="button" id="internalConsolidateMessagingBtn">Consolidate for messaging</button>
            <button type="button" id="internalExportKeyBtn">Export key</button>
            <button type="button" id="internalForgetBtn">Forget key</button>
          </div>
        </div>
    </div>
</div>`; // close internalWalletSection, loginCard, and loginOverlay!

if (htmlContent.includes(strToFind)) {
    console.log("Found strToFind!");
    // wait, if I add another `</div>`, then `videoMenuModal` will be a sibling to `loginOverlay`.
    // And `hud`, `hotbar` will ALSO be siblings to `loginOverlay`!
    htmlContent = htmlContent.replace(strToFind, replaceWith);
    fs.writeFileSync('index.html', htmlContent);
} else {
    console.log("Did not find strToFind. Let's look closer.");
    console.log(htmlContent.substring(htmlContent.indexOf('internalForgetBtn'), htmlContent.indexOf('internalForgetBtn') + 500));
}
