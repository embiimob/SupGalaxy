with open('js/mobs.js', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "this.mesh.position.set(x, y, z);" in line and "this.originalColor = null;" in new_lines[-1]:
        # Actually this is a bit messy, let's just use string replace on whole content
        pass
    else:
        new_lines.append(line)

with open('js/mobs.js', 'w') as f:
    f.writelines(new_lines)

with open('js/mobs.js', 'r') as f:
    content = f.read()

# Make sure this.pos exists! In the original code, the Mob constructor had:
# this.id = Math.random().toString(36).substr(2, 9), this.type = t, this.pos = new THREE.Vector3(e, s, i), this.velocity = new THREE.Vector3, this.isAggressive = !1;
# wait, wait. Let's see the beginning of the constructor.
