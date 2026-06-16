import re

with open('js/main.js', 'r') as f:
    content = f.read()

# Try touchend instead of touchstart and stop propagation to prevent double firing.
# The user said the button flashes but doesn't display the UI. This happens if the event fires twice,
# effectively toggling it (if it was a toggle) or if there's an error. But it just sets display block and none.
# Wait, if we set testnetWifLoginBtn.style.display = "none", maybe it causes issues if we intercept pointerdown or touchstart.
# It works on desktop now either because pointerdown/click on desktop might fire both,
# and the second one fails if the button is hidden? No, if it's hidden, the second event shouldn't fire on it.
# Let's revert to a simple inline `onclick` handler in HTML for testnetWifLoginBtn, which is robust across browsers.
# Let's check `startGame` and other buttons. They use standard event listeners.
# Let's remove preventDefault because that can break click.

replace_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
        if (testnetWifLoginBtn && wmb) {
            testnetWifLoginBtn.onclick = function(e) {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
                return false;
            };
        }"""

search_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
        if (testnetWifLoginBtn && wmb) {
            const handleLoginBtn = (e) => {
                if (e) e.preventDefault();
                wmb.style.display = "block";
                testnetWifLoginBtn.style.display = "none";
            };
            testnetWifLoginBtn.addEventListener("click", handleLoginBtn);
            testnetWifLoginBtn.addEventListener("pointerdown", handleLoginBtn);
        }"""

if search_pattern in content:
    with open('js/main.js', 'w') as f:
        f.write(content.replace(search_pattern, replace_pattern))
    print("Replaced with onclick!")
else:
    print("Pattern not found!")
