const fs = require('fs');
let code = `
function makeSeededRandom(seed) {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
        return function () {
            h += 0x6D2B79F5;
            var t = Math.imul(h ^ (h >>> 15), 1 | h);
            t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
}

function makeNoise(seed) {
        var rnd = makeSeededRandom(seed);
        var cache = {};
        function corner(ix, iy) {
            var k = ix + ',' + iy;
            if (cache[k] !== undefined) return cache[k];
            var s = seed + '|' + ix + ',' + iy;
            var r = makeSeededRandom(s)();
            return cache[k] = r;
        }
        function interp(a, b, t) { return a + (b - a) * (t * (t * (3 - 2 * t))); }
        return function (x, y) {
            var ix = Math.floor(x), iy = Math.floor(y);
            var fx = x - ix, fy = y - iy;
            var a = corner(ix, iy), b = corner(ix + 1, iy), c = corner(ix, iy + 1), d = corner(ix + 1, iy + 1);
            var ab = interp(a, b, fx), cd = interp(c, d, fx);
            return interp(ab, cd, fy);
        };
}

function fbm(noiseFn, x, y, oct, persistence) {
        var sum = 0, amp = 1, freq = 1, max = 0;
        for (var i = 0; i < oct; i++) {
            sum += noiseFn(x * freq, y * freq) * amp;
            max += amp;
            amp *= persistence;
            freq *= 2;
        }
        return sum / max;
}

const worldSeed = 'test2';

let chunkCount = 50;
let minEle = 999;
let maxEle = -999;
let baseHeights = [];

const elevationNoise = makeNoise(worldSeed + '_earth_elevation');
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
                var elevation = rawElevation * 1.5 - 0.25;
                if(elevation < minEle) minEle = elevation;
                if(elevation > maxEle) maxEle = elevation;

                let heightScale = 1.0;
                let baseHeight = 40;
                if (elevation < 0.45) {
                    var oceanDepth = (0.45 - elevation) / 0.45;
                    baseHeight = 40 - (oceanDepth * 40); // Drop lower
                }
                var height = Math.floor(elevation * baseHeight * heightScale + 8);

                var rNoise = fbm(riverNoise, nx * 0.005, nz * 0.005, 4, 0.5);
                var riverValley = Math.abs(rNoise - 0.5) * 2.0;
                if (riverValley < 0.08) { // Narrower
                    var depthT = Math.pow((0.08 - riverValley) / 0.08, 1.5);
                    var dropAmount = (height - 16 + 8) * depthT; // Target height = 8
                    if (dropAmount > 0) height -= dropAmount;
                }

                baseHeights.push(Math.floor(height));
            }
        }
    }
}
console.log('Elevation: Min', minEle, 'Max', maxEle);
baseHeights.sort((a,b) => a-b);
console.log('Sampled Heights:', baseHeights.slice(0, 5), '...', baseHeights.slice(-5));
`;
eval(code);
