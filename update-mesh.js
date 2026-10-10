const fs = require('fs');

let mainJs = fs.readFileSync('js/main.js', 'utf8');

const targetStr = `    } else if (o === 178 || o === 180) {
        // Fix visual for dropped items
        const tempScale = o === 178 ? 0.3 : (o === 180 ? 0.4 : 1.0);
        l.scale.set(1, 1, 1);
        l.geometry = new THREE.BoxGeometry(tempScale, tempScale, tempScale);
    }`;

const replaceStr = `    } else if (o === 178 || o === 180) {
        // Fix visual for dropped items
        if (o === 178) {
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), new THREE.MeshStandardMaterial({color: 0x8b5a33}));
            const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.15), new THREE.MeshStandardMaterial({color: 0xaaaaaa}));
            const fletching = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), new THREE.MeshStandardMaterial({color: 0xffffff}));
            tip.position.z = -0.3;
            fletching.position.z = 0.25;
            l.geometry.dispose();
            l.material.dispose();
            l.geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
            l.material = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
            l.add(shaft, tip, fletching);
        } else if (o === 180) {
            const quill = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.4), new THREE.MeshStandardMaterial({color: 0xaaaaaa}));
            const vane = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.3), new THREE.MeshStandardMaterial({color: 0xffffff}));
            vane.position.z = 0.05;
            l.geometry.dispose();
            l.material.dispose();
            l.geometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
            l.material = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
            l.add(quill, vane);
        }
    }`;

mainJs = mainJs.replace(targetStr, replaceStr);

fs.writeFileSync('js/main.js', mainJs);
