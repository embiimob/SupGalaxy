const fs = require('fs');

let mainContent = fs.readFileSync('js/main.js', 'utf8');

// The parsing of the handle was failing for addresses that returned non-ASCII gibberish, causing the username to be set to that gibberish.
// If the key is not ASCII/Alphanumeric, we shouldn't use it, or fallback to the address.
// Let's modify the onInternalUnlock logic.

const replacement = `
        const urnProfile = await GetProfileByAddress(addr);
        let handle = addr;
        if (urnProfile && urnProfile.URN) {
            handle = urnProfile.URN;
        } else {
            const keys = await GetKeywordByPublicAddress(addr);
            if (keys && /^"[a-zA-Z0-9_@.,-]+"/i.test(keys)) {
                 handle = keys.split(',')[0].replace(/^"|"$/g, '').split('@')[0];
            }
        }

        // Remove non-alphanumeric characters for username input to prevent startup crash
        handle = handle.replace(/[^a-zA-Z0-9]/g, '');

        const userInput = document.getElementById("userInput");
        if (userInput && !userInput.value) {
            userInput.value = handle;
        }
`;

mainContent = mainContent.replace(/const urnProfile = await GetProfileByAddress\(addr\);[\s\S]*?if \(userInput && !userInput\.value\) \{\s*userInput\.value = handle;\s*\}/, replacement);

fs.writeFileSync('js/main.js', mainContent);
