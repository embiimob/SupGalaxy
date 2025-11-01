function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

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
        sum += amp * noiseFn(x * freq, y * freq);
        max += amp;
        amp *= persistence;
        freq *= 2;
    }
    return sum / max;
}

function modWrap(n, m) {
    return ((n % m) + m) % m;
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return [r, g, b];
}

function isMobile() { return /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent); }

function disposeObject(obj) {
    obj.traverse(function (c) {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach(function (m) { m.dispose(); });
            else c.material.dispose();
        }
    });
}
