const fs = require('fs');

let code = fs.readFileSync('js/worker.js', 'utf8');
code = code.replace(/window\.worker = new Worker\(URL\.createObjectURL\(new Blob\(\[\`/, '');
code = code.substring(0, code.lastIndexOf('\`\]\)\)\);'));

// remove postMessage calls to prevent reference errors
code = code.replace(/self\.postMessage/g, '// self.postMessage');

// Write out the stripped down js
fs.writeFileSync('temp_worker.js', code);

// Now require it and run our stuff
eval(fs.readFileSync('temp_worker.js', 'utf8'));

const worldSeed = 'test';

let chunkCount = 50;
let biomeCounts = {};
let biomeWeightsData = {};
let minEle = 999;
let maxEle = -999;
let totalRiverDrops = 0;

const elevationNoise = makeNoise(worldSeed + '_earth_elevation');
const temperatureNoise = makeNoise(worldSeed + '_earth_temperature');
const moistureNoise = makeNoise(worldSeed + '_earth_moisture');
const riverNoise = makeNoise(worldSeed + '_earth_river');

for (let cx = 0; cx < chunkCount; cx++) {
    for (let cz = 0; cz < chunkCount; cz++) {

        var baseX = cx * 16;
        var baseZ = cz * 16;

        for (var lx = 0; lx < 16; lx++) {
            for (var lz = 0; lz < 16; lz++) {
                var wx = baseX + lx;
                var wz = baseZ + lz;
                var nx = (wx % 16384) / 16384 * 10000;
                var nz = (wz % 16384) / 16384 * 10000;

                const biomeNoiseScale = 0.003;
                var rawElevation = fbm(elevationNoise, nx * biomeNoiseScale, nz * biomeNoiseScale, 5, 0.6);
                var elevation = rawElevation * 1.3 - 0.15;
                if(elevation < minEle) minEle = elevation;
                if(elevation > maxEle) maxEle = elevation;

                var temperature = fbm(temperatureNoise, nx * biomeNoiseScale * 0.8, nz * biomeNoiseScale * 0.8, 4, 0.5);
                var moisture = fbm(moistureNoise, nx * biomeNoiseScale * 0.8, nz * biomeNoiseScale * 0.8, 4, 0.5);

                let weights = {};
                weights['mountain'] = Math.max(0, (elevation - 0.55) * 10);
                weights['snow'] = Math.max(0, (0.35 - temperature) * 10);
                weights['desert'] = Math.max(0, (temperature - 0.55) * 10) * Math.max(0, (0.4 - moisture) * 10);
                weights['swamp'] = Math.max(0, (moisture - 0.55) * 10) * Math.max(0, (temperature - 0.35) * 10);
                weights['forest'] = Math.max(0, (moisture - 0.45) * 10);
                weights['prairie'] = Math.max(0, (0.7 - elevation) * 10) * Math.max(0, (0.6 - moisture) * 10) * Math.max(0, (temperature - 0.3) * 10);
                weights['plains'] = 0.5;

                let maxW = 0;
                let best = 'plains';
                for(let k in weights) {
                    if(weights[k] > maxW) { maxW = weights[k]; best = k; }
                }

                biomeCounts[best] = (biomeCounts[best] || 0) + 1;

                var rNoise = fbm(riverNoise, nx * 0.005, nz * 0.005, 4, 0.5);
                var riverValley = Math.abs(rNoise - 0.5) * 2.0;
                if (riverValley < 0.10) {
                    totalRiverDrops++;
                }
            }
        }
    }
}
console.log('Biomes:', biomeCounts);
console.log('Elevation: Min', minEle, 'Max', maxEle);
console.log('River Hits:', totalRiverDrops);
