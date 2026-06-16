import re

with open('js/main.js', 'r') as f:
    content = f.read()

# For best compatibility across iOS and Desktop, simply binding to pointerdown might be best if we don't preventDefault,
# OR we can bind to click ONLY, and ensure touch-action allows clicks by removing preventDefault on touch events.
# Actually, the user says the button depresses on iPhone, meaning it gets a CSS :active state, but it doesn't open.
# This means the click event IS firing, but perhaps wmb is null? No, it works on desktop.
# What if the iOS device has an older JS engine and something inside renderWalletUI throws an error?
# Wait! In `renderWalletUI`, we have:
# `const locked=!S.priv;`
# `const stored=localStorage.getItem(WALLET_KEY);`
# `S.keyring?.changes?.length` -- this uses optional chaining!
# Optional chaining `?.` is supported in iOS Safari 13.4+. If they have an older iPhone, it throws a SyntaxError during parsing!
# Let's check `js/wallet.js` for optional chaining.

replace_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
        if (testnetWifLoginBtn && wmb) {
            const showWallet = function(e) {
                if (e && e.type === 'touchstart') e.preventDefault();
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
            };
            testnetWifLoginBtn.addEventListener('click', showWallet);
            testnetWifLoginBtn.addEventListener('touchstart', showWallet, { passive: false });
        }"""

search_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
        if (testnetWifLoginBtn && wmb) {
            testnetWifLoginBtn.addEventListener('click', function(e) {
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
            });
            testnetWifLoginBtn.addEventListener('touchend', function(e) {
                e.preventDefault();
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
            });
        }"""

if search_pattern in content:
    with open('js/main.js', 'w') as f:
        f.write(content.replace(search_pattern, replace_pattern))
    print("Replaced!")
else:
    print("Pattern not found!")
