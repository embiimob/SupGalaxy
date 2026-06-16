import re

with open('js/main.js', 'r') as f:
    content = f.read()

# We might be firing touchstart and click very close together, or maybe the walletModalBody is not correctly updated in all cases.
# Also e.preventDefault() on touchstart might block the subsequent click if it's a tap, but let's change it so we do e.stopPropagation() too, or just use pointerdown instead of touchstart/click separately.

replace_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
        if (testnetWifLoginBtn && wmb) {
            const handleLoginBtn = (e) => {
                if (e && e.preventDefault) e.preventDefault();
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
            };
            testnetWifLoginBtn.addEventListener("click", handleLoginBtn);
            testnetWifLoginBtn.addEventListener("touchstart", handleLoginBtn, { passive: false });
        }"""

search_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
        if (testnetWifLoginBtn && wmb) {
            testnetWifLoginBtn.addEventListener("click", () => {
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
            });
            testnetWifLoginBtn.addEventListener("touchstart", (e) => {
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
