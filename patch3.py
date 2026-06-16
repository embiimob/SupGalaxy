import re

with open('js/main.js', 'r') as f:
    content = f.read()

# Let's switch from touchstart and click to pointerdown, as iOS pointer events can sometimes be more reliable, or just use click with touch-action: manipulation.
# Let's see if the problem is `preventDefault()` in click preventing default browser behaviors like input focus if we are doing this.
# Let's just use click and pointerdown.

replace_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
        if (testnetWifLoginBtn && wmb) {
            const handleLoginBtn = (e) => {
                if (e) e.preventDefault();
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
            };
            testnetWifLoginBtn.addEventListener("click", handleLoginBtn);
            testnetWifLoginBtn.addEventListener("pointerdown", handleLoginBtn);
        }"""

search_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
        if (testnetWifLoginBtn && wmb) {
            const handleLoginBtn = (e) => {
                if (e && e.preventDefault) e.preventDefault();
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
            };
            testnetWifLoginBtn.addEventListener("click", handleLoginBtn);
            testnetWifLoginBtn.addEventListener("touchstart", handleLoginBtn, { passive: false });
        }"""

if search_pattern in content:
    with open('js/main.js', 'w') as f:
        f.write(content.replace(search_pattern, replace_pattern))
    print("Replaced!")
else:
    print("Pattern not found!")
