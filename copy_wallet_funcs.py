import re

with open('/tmp/SupTV/index.html', 'r') as f:
    content = f.read()

funcs_to_extract = [
    'buildP2fkRecipientsAndCost',
    'sendManyWithWallet',
    'signWithWallet'
]

extracted = ""

for func in funcs_to_extract:
    # We look for the function definition. Since JS is tricky, we can try to grab it based on indentation or braces.
    # Actually, let's just use regex to find async function <name> { ... }
    # This is a bit fragile, let's just find the start and parse braces.
    start_idx = content.find(f"async function {func}")
    if start_idx == -1:
        start_idx = content.find(f"function {func}")

    if start_idx != -1:
        brace_count = 0
        in_string = False
        string_char = ''
        i = content.find('{', start_idx)
        if i != -1:
            brace_count = 1
            i += 1
            while i < len(content) and brace_count > 0:
                char = content[i]
                if in_string:
                    if char == '\\':
                        i += 2
                        continue
                    if char == string_char:
                        in_string = False
                else:
                    if char in ["'", '"', '`']:
                        in_string = True
                        string_char = char
                    elif char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                i += 1
            extracted += content[start_idx:i] + "\n\n"

with open('extracted_wallet_funcs.js', 'w') as f:
    f.write(extracted)
