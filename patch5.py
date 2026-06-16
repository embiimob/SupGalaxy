import re

with open('js/main.js', 'r') as f:
    content = f.read()

# iOS specific issue: if a button doesn't have an explicitly defined cursor pointer, or if we prevent default, it might fail.
# Another issue: maybe `e.preventDefault()` inside onclick breaks mobile Safari. Let's just do it cleanly.

replace_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
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

search_pattern = """        const testnetWifLoginBtn = document.getElementById("testnetWifLoginBtn");
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

if search_pattern in content:
    with open('js/main.js', 'w') as f:
        f.write(content.replace(search_pattern, replace_pattern))
    print("Replaced with click and touchend!")
else:
    print("Pattern not found!")
