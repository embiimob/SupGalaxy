// This file will contain functions related to procedural world generation.
function makeSeededRandom(e) {
    for (var t = 2166136261, o = 0; o < e.length; o++) t = Math.imul(t ^ e.charCodeAt(o), 16777619) >>> 0;
    return function () {
        t += 1831565813;
        var e = Math.imul(t ^ t >>> 15, 1 | t);
        return (((e ^= e + Math.imul(e ^ e >>> 7, 61 | e)) ^ e >>> 14) >>> 0) / 4294967296
    }
}

function makeNoise(e) {
    makeSeededRandom(e);
    var t = {};

    function o(o, a) {
        var n = o + "," + a;
        if (void 0 !== t[n]) return t[n];
        var r = makeSeededRandom(e + "|" + o + "," + a)();
        return t[n] = r
    }

    function a(e, t, o) {
        return e + o * (o * (3 - 2 * o)) * (t - e)
    }
    return function (e, t) {
        var n = Math.floor(e),
            r = Math.floor(t),
            s = e - n,
            i = t - r,
            l = o(n, r),
            d = o(n + 1, r),
            c = o(n, r + 1),
            u = o(n + 1, r + 1),
            p = a(l, d, s),
            m = a(c, u, s);
        return a(p, m, i)
    }
}

function fbm(e, t, o, a, n) {
    for (var r = 0, s = 1, i = 1, l = 0, d = 0; d < a; d++) r += s * e(t * i, o * i), l += s, s *= n, i *= 2;
    return r / l
}

function modWrap(e, t) {
    return (e % t + t) % t
}

function hashSeed(e) {
    for (var t = 2166136261, o = 0; o < e.length; o++) t = Math.imul(t ^ e.charCodeAt(o), 16777619) >>> 0;
    return t % MAP_SIZE
}

function calculateSpawnPoint(e) {
    var t = makeSeededRandom(e),
        o = Math.floor(t() * MAP_SIZE),
        a = Math.floor(t() * MAP_SIZE);

    if (typeof chunkManager !== 'undefined' && chunkManager) {
        var n = Math.floor(o / CHUNK_SIZE),
            r = Math.floor(a / CHUNK_SIZE),
            s = chunkManager.getChunk(n, r);
        s.generated || chunkManager.generateChunk(s);
        for (var i = MAX_HEIGHT - 1; i > 0 && s.get(o % CHUNK_SIZE, i, a % CHUNK_SIZE) === BLOCK_AIR;) i--;
        return {
            x: o,
            y: i += 2,
            z: a
        };
    } else {
        // Fallback if chunkManager is not yet initialized (e.g., discovery phase)
        // Return a safe default height. Teleport logic will correct it later.
        return {
            x: o,
            y: 100,
            z: a
        };
    }
}

function createEmberTexture(e) {
    const t = 32,
        o = document.createElement("canvas");
    o.width = t, o.height = t;
    const a = o.getContext("2d"),
        n = makeNoise(e + "_ember"),
        r = a.createImageData(t, t),
        s = r.data,
        i = makeSeededRandom(e + "_ember_color"),
        l = [{
            r: Math.floor(100 * i()),
            g: 0,
            b: 0
        }, {
            r: 255,
            g: Math.floor(150 * i()),
            b: 0
        }, {
            r: 255,
            g: 255,
            b: Math.floor(200 * i())
        }];
    for (let x = 0; x < t; x++)
        for (let y = 0; y < t; y++) {
            const a = fbm(n, x / 8, y / 8, 3, .6),
                r = 4 * (y * t + x);
            let i, d, c;
            if (a < .5) {
                const factor = a / .5;
                i = l[0].r + (l[1].r - l[0].r) * factor, d = l[0].g + (l[1].g - l[0].g) * factor, c = l[0].b + (l[1].b - l[0].b) * factor
            } else {
                const factor = (a - .5) / .5;
                i = l[1].r + (l[2].r - l[1].r) * factor, d = l[1].g + (l[2].g - l[1].g) * factor, c = l[1].b + (l[2].b - l[1].b) * factor
            }
            s[r] = i, s[r + 1] = d, s[r + 2] = c, s[r + 3] = a > .3 ? 255 : 0
        }
    a.putImageData(r, 0, 0);
    const tex = new THREE.CanvasTexture(o);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

function createMobTexture(e, t, o = !1) {
    const a = `${e}:${t}:${o}`;
    if (textureCache.has(a)) return textureCache.get(a);
    const n = 16,
        r = document.createElement("canvas");
    r.width = n, r.height = n;
    const s = r.getContext("2d"),
        i = makeSeededRandom(e + "_mob_texture_" + t);
    let l, d;
    t.includes("body") ? (l = (new THREE.Color).setHSL(i(), .2 + .8 * i(), .2 + .6 * i()), d = l.clone().multiplyScalar(.7 + .2 * i())) : (l = (new THREE.Color).setHSL(.1 * i() + .05, .2 + .2 * i(), .2 + .1 * i()), d = l.clone().multiplyScalar(1.2 + .2 * i())), s.fillStyle = l.getStyle(), s.fillRect(0, 0, n, n);
    const c = makeNoise(e + "_mob_pattern_" + t);
    for (let e = 0; e < 50; e++) {
        const e = Math.floor(i() * n),
            t = Math.floor(i() * n),
            o = c(e / n, t / n) > .5 ? d : l.clone().lerp(d, .5);
        s.fillStyle = o.getStyle(), s.fillRect(e, t, 1, 1)
    }
    if (o) {
        const e = (new THREE.Color).setHSL(i(), .5 + .3 * i(), .2 + .2 * i());
        s.fillStyle = e.getStyle(), s.fillRect(0, 0, n, 1), s.fillRect(0, 15, n, 1), s.fillRect(0, 0, 1, n), s.fillRect(15, 0, 1, n)
    }
    const u = new THREE.CanvasTexture(r);
    return u.magFilter = THREE.NearestFilter, u.minFilter = THREE.NearestFilter, textureCache.set(a, u), u
}

function createBlockTexture(e, t) {
    const o = `${e}:${t}`;
    if (textureCache.has(o)) return textureCache.get(o);
    const blockDef = BLOCKS[t] || { color: "#ff00ff" },
        style = blockDef.textureStyle,
        textureSeedId = blockDef.textureSeedId || t,
        isSeededBrick = style === "weathered_brick" || style === "polished_brick",
        isPolishedBrick = style === "polished_brick",
        a = style ? 32 : 16,
        n = document.createElement("canvas");
    n.width = a, n.height = a;
    const r = n.getContext("2d"),
        s = makeSeededRandom(e + "_block_texture_" + textureSeedId),
        baseColor = new THREE.Color(blockDef.color),
        palette = makeSeededRandom(e + "_block_palette_" + textureSeedId),
        baseHsl = baseColor.getHSL({}),
        hueRange = isPolishedBrick ? .16 : style === "weathered_brick" ? .09 : style === "sand" ? .11 : style ? .045 : .13,
        seededBase = baseColor.clone().setHSL(
            (baseHsl.h + (palette() - .5) * hueRange + 1) % 1,
            Math.max(0, Math.min(1, baseHsl.s + (palette() - .5) * (isPolishedBrick ? .34 : style === "weathered_brick" ? .24 : style ? .16 : .28))),
            Math.max(.08, Math.min(.92, baseHsl.l + (palette() - .5) * (isSeededBrick ? .24 : style ? .14 : .2)))
        ),
        colorAt = (shade) => seededBase.clone().multiplyScalar(shade).getStyle(),
        brickSurfaceNoise = isSeededBrick ? makeNoise(e + "_brick_surface_" + textureSeedId) : null;

    if (style === "sand") {
        r.fillStyle = colorAt(.98);
        r.fillRect(0, 0, a, a);
        const sandNoise = makeNoise(e + "_sand_grain_" + textureSeedId);
        for (let x = 0; x < a; x++) {
            for (let y = 0; y < a; y++) {
                const variation = (sandNoise(x / 7, y / 7) - .5) * .13 + (s() - .5) * .1;
                r.fillStyle = colorAt(.98 + variation);
                r.fillRect(x, y, 1, 1);
            }
        }
        for (let grain = 0; grain < 150; grain++) {
            const shade = .9 + s() * .2,
                size = s() > .9 ? 2 : 1,
                x = Math.floor(s() * a),
                y = Math.floor(s() * a);
            r.fillStyle = colorAt(shade);
            r.fillRect(x, y, size, size);
        }
        for (let ripple = 0; ripple < 3; ripple++) {
            const y = 4 + ripple * 11 + Math.floor(s() * 4);
            r.beginPath();
            r.moveTo(0, y);
            r.quadraticCurveTo(a / 2, y - 2 + s() * 4, a, y + (s() - .5) * 2);
            r.strokeStyle = colorAt(ripple % 2 ? 1.04 : .91);
            r.lineWidth = .7;
            r.stroke();
        }
    } else if (style === "planks" || style === "wood" || style === "beam") {
        const plankHeight = style === "beam" ? 16 : 8;
        r.save();
        r.translate(a / 2, a / 2);
        r.rotate((blockDef.facing || 0) * Math.PI / 2);
        r.translate(-a / 2, -a / 2);
        r.fillStyle = colorAt(.48);
        r.fillRect(0, 0, a, a);
        for (let row = 0; row < a; row += plankHeight) {
            const woodShade = .88 + s() * .3;
            r.fillStyle = colorAt(woodShade);
            r.fillRect(1, row + 1, a - 2, plankHeight - 2);
            r.fillStyle = colorAt(.64);
            r.fillRect(1, row + plankHeight - 1, a - 2, 1);
            r.fillStyle = colorAt(1.12);
            r.fillRect(1, row + 1, a - 2, 1);
            for (let grain = 0; grain < 4; grain++) {
                const y = row + 2 + s() * Math.max(1, plankHeight - 4);
                const drift = (s() - .5) * 2;
                r.beginPath();
                r.moveTo(2, y);
                r.bezierCurveTo(a * .3, y + drift, a * .65, y - drift, a - 2, y + (s() - .5) * 2);
                r.strokeStyle = colorAt(grain % 2 ? .72 : 1.16);
                r.lineWidth = grain % 2 ? 1 : .7;
                r.stroke();
            }
            if (s() > .35) {
                const knotX = 5 + s() * (a - 10);
                const knotY = row + plankHeight / 2;
                r.beginPath();
                r.ellipse(knotX, knotY, 2 + s() * 2, 1, 0, 0, Math.PI * 2);
                r.strokeStyle = colorAt(.7);
                r.lineWidth = .8;
                r.stroke();
                r.beginPath();
                r.ellipse(knotX, knotY, 1, .5, 0, 0, Math.PI * 2);
                r.strokeStyle = colorAt(1.2);
                r.stroke();
            }
        }
        r.restore();
    } else if (style === "sandstone_bricks") {
        r.fillStyle = colorAt(.96);
        r.fillRect(0, 0, a, a);
        const strataNoise = makeNoise(e + "_sandstone_strata_" + textureSeedId);
        for (let x = 0; x < a; x++) {
            for (let y = 0; y < a; y++) {
                const strata = Math.sin((y + strataNoise(x / 9, y / 13) * 5) * Math.PI / 8) * .045;
                const grain = (strataNoise(x / 3, y / 3) - .5) * .11;
                r.fillStyle = colorAt(.96 + strata + grain);
                r.fillRect(x, y, 1, 1);
            }
        }
        for (let band = 0; band < 4; band++) {
            const y = 3 + band * 8 + Math.floor(s() * 3);
            r.beginPath();
            r.moveTo(0, y);
            r.bezierCurveTo(a * .3, y + (s() - .5) * 4, a * .7, y + (s() - .5) * 4, a, y + (s() - .5) * 3);
            r.strokeStyle = colorAt(band % 2 ? .84 : 1.08);
            r.globalAlpha = .45;
            r.lineWidth = band % 2 ? 1 : 2;
            r.stroke();
        }
        r.globalAlpha = 1;
        for (let grain = 0; grain < 45; grain++) {
            const shade = .76 + s() * .44;
            r.fillStyle = colorAt(shade);
            r.fillRect(Math.floor(s() * a), Math.floor(s() * a), s() > .88 ? 2 : 1, 1);
        }
    } else if (style === "brick" || style === "weathered_brick" || style === "polished_brick" || style === "stone_bricks" || style === "mossy_bricks" || style === "limestone_bricks" || style === "battlement" || style === "chiseled_stone" || style === "cobble") {
        const brickWidth = style === "cobble" ? 11 : 16,
            courseHeight = style === "brick" || isPolishedBrick || style === "weathered_brick" ? 8 : 10,
            isWeathered = style === "weathered_brick";
        r.fillStyle = colorAt(.48);
        r.fillRect(0, 0, a, a);
        for (let row = 0, course = 0; row < a; course++) {
            const currentCourseHeight = Math.min(a - row, courseHeight + (isWeathered ? Math.floor(s() * 5) - 2 : 0));
            const offset = course % 2 ? -brickWidth / 2 : 0;
            for (let x = offset; x < a; x += brickWidth) {
                const left = Math.max(1, x + 1 + (isWeathered ? Math.floor(s() * 4) : 0)),
                    right = Math.min(a - 1, x + brickWidth - 1 - (isWeathered ? Math.floor(s() * 4) : 0)),
                    top = row + 1,
                    bottom = Math.min(a - 1, row + currentCourseHeight - 1);
                if (right <= left || bottom <= top) continue;
                const seedVariation = brickSurfaceNoise ? (brickSurfaceNoise(x / 5, row / 5) - .5) * (isPolishedBrick ? .42 : .3) : 0;
                const variation = .88 + s() * .28 + seedVariation;
                r.fillStyle = colorAt(variation);
                r.fillRect(left, top, right - left, bottom - top);
                if (style === "cobble") {
                    r.strokeStyle = colorAt(.58);
                    r.lineWidth = 1;
                    r.strokeRect(left + 1, top + 1, Math.max(1, right - left - 2), Math.max(1, bottom - top - 2));
                    r.fillStyle = colorAt(variation * 1.08);
                    r.fillRect(left + 2 + Math.floor(s() * 3), top + 2, Math.max(1, right - left - 5), 1);
                    continue;
                }
                r.fillStyle = colorAt(variation * 1.12);
                r.fillRect(left, top, right - left, 1);
                r.fillStyle = colorAt(variation * .72);
                r.fillRect(left, bottom - 1, right - left, 1);
                if (isWeathered) {
                    if (s() > .35) {
                        const chipX = left + Math.floor(s() * Math.max(1, right - left - 2)),
                            chipY = top + Math.floor(s() * Math.max(1, bottom - top - 2));
                        r.fillStyle = colorAt(.48);
                        r.fillRect(chipX, chipY, 1 + Math.floor(s() * 4), 1 + Math.floor(s() * 3));
                    }
                    for (let stain = 0; stain < 3; stain++) {
                        if (s() > .35) {
                            const stainX = left + Math.floor(s() * Math.max(1, right - left - 1)),
                                stainY = top + Math.floor(s() * Math.max(1, bottom - top - 1));
                            r.fillStyle = colorAt(.56 + s() * .18);
                            r.fillRect(stainX, stainY, 1 + Math.floor(s() * 3), 1 + Math.floor(s() * 2));
                        }
                    }
                }
                if (isPolishedBrick) {
                    for (let streak = 0; streak < 3; streak++) {
                        const streakX = left + 2 + Math.floor(s() * Math.max(1, right - left - 5)),
                            streakY = top + 2 + Math.floor(s() * Math.max(1, bottom - top - 4));
                        r.fillStyle = colorAt(streak % 2 ? 1.18 : .78);
                        r.globalAlpha = .45;
                        r.fillRect(streakX, streakY, 2 + Math.floor(s() * 5), 1);
                    }
                    r.globalAlpha = 1;
                }
                if (style === "chiseled_stone") {
                    r.strokeStyle = colorAt(.68);
                    r.lineWidth = 1;
                    r.strokeRect(left + 3, top + 2, Math.max(1, right - left - 6), Math.max(1, bottom - top - 4));
                }
                if (style === "mossy_bricks" && s() > .42) {
                    r.fillStyle = `rgba(67, 103, 58, ${.18 + s() * .24})`;
                    r.fillRect(left + s() * Math.max(1, right - left - 4), top + s() * Math.max(1, bottom - top - 3), 2 + s() * 3, 1 + s() * 2);
                }
            }
            row += currentCourseHeight;
        }
    } else if (style === "roof_tiles") {
        r.fillStyle = colorAt(.48);
        r.fillRect(0, 0, a, a);
        for (let row = -10, course = 0; row < a; row += 10, course++) {
            const offset = course % 2 ? -8 : 0;
            for (let x = offset; x < a; x += 8) {
                const left = x + 1,
                    top = row + 1;
                r.beginPath();
                r.moveTo(left, top + 4);
                r.quadraticCurveTo(left + 3, top - 1, left + 6, top + 4);
                r.lineTo(left + 6, top + 10);
                r.lineTo(left, top + 10);
                r.closePath();
                r.fillStyle = colorAt(.86 + s() * .3);
                r.fill();
                r.strokeStyle = colorAt(.62);
                r.lineWidth = .8;
                r.stroke();
                r.beginPath();
                r.moveTo(left + 1, top + 5);
                r.quadraticCurveTo(left + 3, top + 1, left + 5, top + 5);
                r.strokeStyle = colorAt(1.12);
                r.stroke();
            }
        }
    } else if (style === "marble" || style === "obsidian") {
        r.fillStyle = colorAt(.92);
        r.fillRect(0, 0, a, a);
        const veinCount = style === "marble" ? 5 : 3;
        for (let vein = 0; vein < veinCount; vein++) {
            const startY = s() * a,
                drift = (s() - .5) * 12;
            r.beginPath();
            r.moveTo(0, startY);
            r.bezierCurveTo(a * .25, startY + drift, a * .7, startY - drift, a, startY + (s() - .5) * 8);
            r.strokeStyle = colorAt(vein % 2 ? .72 : 1.12);
            r.globalAlpha = .3 + s() * .35;
            r.lineWidth = vein % 2 ? 1 : 2;
            r.stroke();
        }
        r.globalAlpha = 1;
    } else if (style === "concrete" || style === "polished_stone" || style === "limestone") {
        r.fillStyle = colorAt(.94);
        r.fillRect(0, 0, a, a);
        for (let speckle = 0; speckle < (style === "concrete" ? 70 : 24); speckle++) {
            r.fillStyle = colorAt(.72 + s() * .58);
            r.fillRect(Math.floor(s() * a), Math.floor(s() * a), 1 + Math.floor(s() * 2), 1);
        }
        if (style !== "concrete") {
            r.strokeStyle = colorAt(.78);
            r.lineWidth = 1;
            r.strokeRect(1, 1, a - 2, a - 2);
        }
    } else if (style === "metal") {
        r.fillStyle = colorAt(.54);
        r.fillRect(0, 0, a, a);
        for (let panel = 0; panel < 4; panel++) {
            const y = panel * 8;
            r.fillStyle = colorAt(.88 + s() * .18);
            r.fillRect(1, y + 1, a - 2, 6);
            r.fillStyle = colorAt(.55);
            r.fillRect(1, y + 6, a - 2, 1);
            for (let grain = 0; grain < 5; grain++) {
                r.fillStyle = colorAt(grain % 2 ? .78 : 1.1);
                r.fillRect(2 + Math.floor(s() * (a - 4)), y + 1 + Math.floor(s() * 5), 1, 1);
            }
        }
    } else {
        r.fillStyle = seededBase.getStyle(), r.fillRect(0, 0, a, a);
        let l = (new THREE.Color).setHSL(s(), .5 + .3 * s(), .2 + .3 * s());
    const d = Math.floor(5 * s()),
        c = makeNoise(e + "_pattern_noise_" + t);
        for (let x = 0; x < a; x += 2)
            for (let y = 0; y < a; y += 2) {
                const grain = c(x / 5, y / 5) - .5;
                if (Math.abs(grain) > .24) {
                    r.fillStyle = colorAt(1 + grain * .22);
                    r.fillRect(x, y, 1, 1);
                }
            }
        if (r.strokeStyle = l.getStyle(), r.lineWidth = 1 + Math.floor(2 * s()), 0 === d)
        for (let e = 2; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < a; t++) c(t / 8, e / 8) > .4 && (r.moveTo(t, e), r.lineTo(t + 1, e));
            r.stroke()
        } else if (1 === d)
        for (let e = 2; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < a; t++) c(e / 8, t / 8) > .4 && (r.moveTo(e, t), r.lineTo(e, t + 1));
            r.stroke()
        } else if (2 === d)
        for (let e = -16; e < a; e += 4) {
            r.beginPath();
            for (let t = 0; t < 32; t++) c(e / 8, t / 8) > .6 && (r.moveTo(e + t, t), r.lineTo(e + t + 1, t + 1));
            r.stroke()
        } else if (3 === d)
        for (let e = 0; e < a; e += 4) {
            r.beginPath(), r.moveTo(0, e);
            for (let t = 0; t < a; t++) {
                const o = 2 * Math.sin(t / 4 + 10 * s());
                c(t / 8, e / 8) > .3 ? r.lineTo(t, e + o) : r.moveTo(t, e + o)
            }
            r.stroke()
        }
    if (s() > .8) {
        const e = baseColor.clone().multiplyScalar(.7);
        r.strokeStyle = e.getStyle(), r.lineWidth = 1, r.strokeRect(.5, .5, 15, 15)
    }
    }
    const u = new THREE.CanvasTexture(n);
    return u.magFilter = THREE.NearestFilter, u.minFilter = THREE.NearestFilter, textureCache.set(o, u), u
}

function drawCracksOnCanvas(canvas) {
    const size = canvas.width;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)"; // More opaque
    ctx.lineWidth = 1; // Thinner
    ctx.beginPath();

    const centerX = size / 2;
    const centerY = size / 2;

    // Draw 2 new major cracks each time this is called
    for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const length = (Math.random() * 0.4 + 0.1) * size;

        ctx.moveTo(centerX, centerY);
        const endX = centerX + length * Math.cos(angle);
        const endY = centerY + length * Math.sin(angle);
        ctx.lineTo(endX, endY);

        // Add smaller splinters
        for (let j = 0; j < Math.random() * 2; j++) {
            ctx.moveTo(endX, endY);
            const splinterAngle = angle + (Math.random() - 0.5) * (Math.PI / 2);
            const splinterLength = length * (Math.random() * 0.3 + 0.3);
            ctx.lineTo(endX + splinterLength * Math.cos(splinterAngle), endY + splinterLength * Math.sin(splinterAngle));
        }
    }
    ctx.stroke();
}

function createCloudTexture(e) {
    const t = 256,
        o = document.createElement("canvas");
    o.width = t, o.height = t;
    const a = o.getContext("2d"),
        n = makeNoise(e + "_clouds");
    for (let e = 0; e < t; e++)
        for (let o = 0; o < t; o++) {
            const t = 255 * fbm(n, e / 32, o / 32, 4, .5),
                r = Math.max(0, t - 128);
            a.fillStyle = `rgba(255, 255, 255, ${r / 128})`, a.fillRect(e, o, 1, 1)
        }
    return new THREE.CanvasTexture(o)
}

function initSky() {
    const e = makeSeededRandom(worldSeed + "_sky"),
        t = e(),
        o = .5 + .5 * e(),
        a = .6 + .2 * e(),
        n = .05 + .05 * e();
    skyProps = {
        dayColor: (new THREE.Color).setHSL(t, o, a),
        nightColor: (new THREE.Color).setHSL(t, .8 * o, n),
        cloudColor: (new THREE.Color).setHSL(e(), .2 + .3 * e(), .8),
        suns: [],
        moons: []
    };
    const r = 1 + Math.floor(3 * e());
    for (let t = 0; t < r; t++) {
        const t = 80 + 120 * e(),
            o = (new THREE.Color).setHSL(e(), .8 + .2 * e(), .6 + .2 * e()),
            a = new THREE.Mesh(new THREE.SphereGeometry(t, 32, 32), new THREE.MeshBasicMaterial({
                color: o
            }));
        const light = new THREE.DirectionalLight(o, 0);
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.camera.left = -80;
        light.shadow.camera.right = 80;
        light.shadow.camera.top = 80;
        light.shadow.camera.bottom = -80;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 5000;
        light.shadow.camera.updateProjectionMatrix();
        light.shadow.bias = -0.0005;
        light.shadow.normalBias = 0.02;
        skyProps.suns.push({
            mesh: a,
            light,
            angleOffset: e() * Math.PI * 2
        }), scene.add(a), scene.add(light), scene.add(light.target)
    }
    const s = Math.floor(4 * e());
    for (let t = 0; t < s; t++) {
        const o = 40 + 60 * e(),
            a = (new THREE.Color).setHSL(e(), .1 + .2 * e(), .7 + .2 * e()),
            n = new THREE.SphereGeometry(o, 32, 32),
            r = makeNoise(worldSeed + "_moon_" + t),
            s = n.attributes.position,
            i = new THREE.Vector3;
        for (let e = 0; e < s.count; e++) {
            i.fromBufferAttribute(s, e);
            const t = .8,
                o = fbm(r, .05 * i.x, .05 * i.y, 3, .5) + fbm(r, .05 * i.y, .05 * i.z, 3, .5) + fbm(r, .05 * i.z, .05 * i.x, 3, .5),
                a = .15 * fbm(r, .3 * i.x, .3 * i.y, 3, .5);
            i.multiplyScalar(1 + o / 3 * t - a), s.setXYZ(e, i.x, i.y, i.z)
        }
        n.computeVertexNormals();
        const l = new THREE.Mesh(n, new THREE.MeshBasicMaterial({
            color: a
        }));
        const light = new THREE.DirectionalLight(a, 0);
        light.castShadow = true;
        light.shadow.mapSize.set(512, 512);
        light.shadow.camera.left = -80;
        light.shadow.camera.right = 80;
        light.shadow.camera.top = 80;
        light.shadow.camera.bottom = -80;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 5000;
        light.shadow.camera.updateProjectionMatrix();
        light.shadow.bias = -0.0005;
        light.shadow.normalBias = 0.02;
        skyProps.moons.push({
            mesh: l,
            light,
            angleOffset: e() * Math.PI * 2
        }), scene.add(l), scene.add(light), scene.add(light.target)
    }
    stars = new THREE.Group;
    const i = new THREE.BufferGeometry,
        l = [],
        d = makeNoise(worldSeed + "_stars");
    for (let t = 0; t < 5e3; t++) {
        const t = e() * Math.PI * 2,
            o = Math.acos(2 * e() - 1),
            a = 4e3 * Math.sin(o) * Math.cos(t),
            n = 4e3 * Math.sin(o) * Math.sin(t),
            r = 4e3 * Math.cos(o);
        d(.005 * a, .005 * r) > .7 && l.push(a, n, r)
    }
    i.setAttribute("position", new THREE.Float32BufferAttribute(l, 3));
    const c = new THREE.PointsMaterial({
        color: 16777215,
        size: 2 + 3 * e()
    }),
        u = new THREE.Points(i, c);
    stars.add(u), scene.add(stars), clouds = new THREE.Group;
    const p = createCloudTexture(worldSeed),
        m = Math.floor(80 * e());
    for (let t = 0; t < m; t++) {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(200 + 300 * e(), 100 + 150 * e()), new THREE.MeshBasicMaterial({
            map: p,
            color: skyProps.cloudColor,
            transparent: !0,
            opacity: .6 + .3 * e(),
            side: THREE.DoubleSide
        }));
        t.position.set(8e3 * (e() - .5), 200 + 150 * e(), 8e3 * (e() - .5)), t.rotation.y = e() * Math.PI * 2, clouds.add(t)
    }
    scene.add(clouds)
}

// Night follows the local clock and the primary sun's offset; usable before the first updateSky.
function computeIsNightNow() {
    const t = new Date;
    const o = (t.getHours() + t.getMinutes() / 60) / 24 * Math.PI * 2;
    const offset = skyProps && skyProps.suns && skyProps.suns.length > 0 ? skyProps.suns[0].angleOffset : 0;
    return Math.sin(o + offset) < -.1;
}

function updateSky(e) {
    const t = new Date;
    const o = (t.getHours() + t.getMinutes() / 60) / 24 * Math.PI * 2,
        n = Math.sin(o + (skyProps.suns.length > 0 ? skyProps.suns[0].angleOffset : 0));
    isNight = n < -.1, skyProps.suns.forEach((e => {
        const t = o + e.angleOffset;
        e.mesh.position.set(camera.position.x + 4e3 * Math.cos(t), camera.position.y + 4e3 * Math.sin(t), camera.position.z + 1500 * Math.sin(t)), e.mesh.visible = Math.sin(t) > -.1
        const altitude = Math.sin(t);
        e.light.position.copy(e.mesh.position);
        e.light.target.position.copy(camera.position);
        e.light.target.updateMatrixWorld();
        e.baseIntensity = 0.95 * Math.max(0, Math.min(1, (altitude + 0.1) / 0.3)) / Math.max(1, skyProps.suns.length);
    })), skyProps.moons.forEach((e => {
        const t = o + e.angleOffset + Math.PI;
        e.mesh.position.set(camera.position.x + 3800 * Math.cos(t), camera.position.y + 3800 * Math.sin(t), camera.position.z + 1200 * Math.sin(t)), e.mesh.visible = Math.sin(t) > -.1
        const altitude = Math.sin(t);
        e.light.position.copy(e.mesh.position);
        e.light.target.position.copy(camera.position);
        e.light.target.updateMatrixWorld();
        e.baseIntensity = 0.12 * Math.max(0, Math.min(1, (altitude + 0.1) / 0.3)) / Math.max(1, skyProps.moons.length);
    })), stars.visible = isNight, stars.rotation.y += .005 * e, clouds.children.forEach((t => {
        t.position.x = modWrap(t.position.x + e * (15 + 10 * Math.random()), 8e3)
    }));
    const r = Math.max(0, n);

    let targetTransition = 0;
    if (typeof chunkManager !== 'undefined' && chunkManager && camera) {
        const context = lightManager.getUndergroundContext(camera.position.x, camera.position.y, camera.position.z);
        if (context.isUnderground) {
            if (!context.centerCovered || context.depth <= 2) {
                targetTransition = 0.25;
            } else if (context.depth >= 4) {
                targetTransition = 1.0;
            } else {
                targetTransition = 0.25 + ((context.depth - 2) / 2.0) * 0.75;
            }
        }
    }

    window.undergroundTransition = window.undergroundTransition || 0;
    window.undergroundTransition += (targetTransition - window.undergroundTransition) * e * 5.0;
    let ug = window.undergroundTransition;
    for (const body of [...skyProps.suns, ...skyProps.moons]) {
        body.light.intensity = body.baseIntensity * (1 - ug);
        body.light.castShadow = body.light.intensity > 0.02;
    }

    let currentBgColor = (new THREE.Color).copy(skyProps.dayColor).lerp(skyProps.nightColor, 1 - r);
    scene.background = currentBgColor.lerp(new THREE.Color(0x000000), ug);
    let s = (n - -.2) / .4;
    s = Math.max(0, Math.min(1, s));
    const i = scene.getObjectByProperty("type", "AmbientLight"),
        d = scene.getObjectByProperty("type", "HemisphereLight");
    if (i && (i.intensity = (.01 + .19 * s) * (1 - ug)), d) {
        const e = .6,
            t = .02;
        d.intensity = (t + (e - t) * s) * (1 - ug);
    }
    for (let o = blockParticles.length - 1; o >= 0; o--) {
        const a = blockParticles[o];
        a.velocity.y -= gravity * e, a.mesh.position.add(a.velocity.clone().multiplyScalar(e)), (a.mesh.position.y < -10 || Date.now() - a.createdAt > 1e3) && (scene.remove(a.mesh), disposeObject(a.mesh), blockParticles.splice(o, 1))
    }
}

function createBlockParticles(e, t, o, a) {
    const n = BLOCKS[a];
    if (!n) return;
    const r = createBlockTexture(worldSeed, a);
    for (let s = 0; s < 10; s++) {
        const a = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .1), new THREE.MeshBasicMaterial({
            map: r
        }));
        a.position.set(e + .5, t + .5, o + .5);
        const i = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(2);
        blockParticles.push({
            mesh: a,
            velocity: i,
            createdAt: Date.now()
        }), scene.add(a)
    }
}

function createFlameParticles(e, t, o) {
    const a = new THREE.BufferGeometry,
        n = new Float32Array(60),
        r = [];
    for (let a = 0; a < 20; a++) n[3 * a] = e, n[3 * a + 1] = t, n[3 * a + 2] = o, r.push({
        x: .01 * (Math.random() - .5),
        y: .05 * Math.random(),
        z: .01 * (Math.random() - .5),
        life: 1 * Math.random()
    });
    a.setAttribute("position", new THREE.BufferAttribute(n, 3)), a.velocities = r;
    const s = new THREE.PointsMaterial({
        color: 16755251,
        size: .2,
        transparent: !0,
        blending: THREE.AdditiveBlending,
        depthWrite: !1
    }),
        i = new THREE.Points(a, s);
    return i.position.set(e, t, o), i
}

function createSmokeParticle(e, t, o, a) {
    const n = new THREE.BufferGeometry,
        r = new Float32Array(3 * a),
        s = [],
        i = new Float32Array(a);
    for (let n = 0; n < a; n++) r[3 * n] = e + 10 * (Math.random() - .5), r[3 * n + 1] = t + 5 * (Math.random() - .5), r[3 * n + 2] = o + 10 * (Math.random() - .5), i[n] = 1, s.push({
        x: 4 * (Math.random() - .5),
        y: 10 + 15 * Math.random(),
        z: 4 * (Math.random() - .5),
        life: 6 + 6 * Math.random()
    });
    n.setAttribute("position", new THREE.BufferAttribute(r, 3)), n.setAttribute("alpha", new THREE.BufferAttribute(i, 1)), n.velocities = s;
    const l = new THREE.PointsMaterial({
        size: 4,
        map: new THREE.CanvasTexture(document.createElement("canvas")),
        blending: THREE.NormalBlending,
        depthWrite: !1,
        transparent: !0,
        vertexColors: !0,
        color: 8947848
    }),
        d = document.createElement("canvas");
    d.width = 64, d.height = 64;
    const c = d.getContext("2d"),
        u = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    u.addColorStop(0, "rgba(200, 200, 200, 0.5)"), u.addColorStop(1, "rgba(200, 200, 200, 0)"), c.fillStyle = u, c.fillRect(0, 0, 64, 64), l.map.image = d, l.map.needsUpdate = !0;
    const p = new THREE.Points(n, l);
    return p.position.set(0, 0, 0), p
}

function handleLavaEruption(e) {
    const t = makeSeededRandom(e.seed),
        o = 20 + Math.floor(20 * t());
    for (let a = 0; a < o; a++) {
        const o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({
            color: BLOCKS[16].color
        }));
        o.position.set(e.volcano.x + 10 * (t() - .5), e.volcano.y, e.volcano.z + 10 * (t() - .5));
        const a = new THREE.Vector3(2 * (t() - .5), 20 + 20 * t(), 2 * (t() - .5));
        eruptedBlocks.push({
            mesh: o,
            velocity: a,
            createdAt: Date.now()
        }), scene.add(o)
    }
}

function createPebble(e, t, o, a) {
    const n = a ? .2 : .1,
        r = a ? 16738816 : 3355443,
        s = a ? new THREE.MeshBasicMaterial({
            color: r
        }) : new THREE.MeshStandardMaterial({
            color: r
        }),
        i = new THREE.Mesh(new THREE.BoxGeometry(n, n, n), s);
    return i.position.set(e, t, o), i
}

function handlePebbleRain(e) {
    const t = makeSeededRandom(e.seed),
        o = 100 + Math.floor(100 * t());
    for (let a = 0; a < o; a++) {
        const o = t() < .2,
            a = 32 * t(),
            n = t() * Math.PI * 2,
            r = e.volcano.x + Math.cos(n) * a,
            s = e.volcano.z + Math.sin(n) * a,
            i = createPebble(r, e.volcano.y + 20 + 20 * t(), s, o),
            l = new THREE.Vector3(0, -5 - 5 * t(), 0);
        pebbles.push({
            mesh: i,
            velocity: l,
            createdAt: Date.now(),
            isGlowing: o
        }), scene.add(i)
    }
}

function handleVolcanoEvent(e) {
    let t;
    switch (e.eventType) {
        case "lava_eruption":
            handleLavaEruption(e), t = "rumble0";
            break;
        case "pebble_rain":
            handlePebbleRain(e), t = "rumble1";
            break;
        case "boulder_eruption":
            handleBoulderEruption(e);
            const o = ["rumble2", "rumble3", "rumble4", "rumble5"];
            t = o[Math.floor(Math.random() * o.length)]
    }
    if (t) {
        const o = Date.now(),
            a = document.getElementById(t);
        if (a) {
            const n = {
                id: o,
                volcano: e.volcano,
                soundId: t
            };
            const distance = Math.hypot(player.x - e.volcano.x, player.y - e.volcano.y, player.z - e.volcano.z);
            a.volume = distance < maxAudioDistance ? Math.pow(1 - distance / maxAudioDistance, rolloffFactor) : 0;
            activeEruptions.push(n), a.currentTime = 0, safePlayAudio(a), a.onended = () => {
                console.log(`[Audio] Sound ${t} finished playing.`), activeEruptions = activeEruptions.filter((e => e.id !== o)), a.onended = null
            }
        }
    }
}

function createEruptionSmoke(e, t, o, a) {
    const n = new THREE.BufferGeometry,
        r = new Float32Array(3 * a),
        s = new Float32Array(3 * a),
        i = [],
        l = new Float32Array(a),
        d = [new THREE.Color(16777215), new THREE.Color(8947848)];
    for (let n = 0; n < a; n++) {
        r[3 * n] = e + 15 * (Math.random() - .5), r[3 * n + 1] = t + 10 * (Math.random() - .5), r[3 * n + 2] = o + 15 * (Math.random() - .5), l[n] = 1;
        const a = d[Math.floor(Math.random() * d.length)];
        s[3 * n] = a.r, s[3 * n + 1] = a.g, s[3 * n + 2] = a.b, i.push({
            x: 3 * (Math.random() - .5),
            y: 10 + 10 * Math.random(),
            z: 3 * (Math.random() - .5),
            life: 5 + 5 * Math.random()
        })
    }
    n.setAttribute("position", new THREE.BufferAttribute(r, 3)), n.setAttribute("color", new THREE.BufferAttribute(s, 3)), n.setAttribute("alpha", new THREE.BufferAttribute(l, 1)), n.velocities = i;
    const c = new THREE.PointsMaterial({
        size: 5,
        blending: THREE.NormalBlending,
        depthWrite: !1,
        transparent: !0,
        vertexColors: !0
    }),
        u = document.createElement("canvas");
    u.width = 64, u.height = 64;
    const p = u.getContext("2d"),
        m = p.createRadialGradient(32, 32, 0, 32, 32, 32);
    m.addColorStop(0, "rgba(200, 200, 200, 0.5)"), m.addColorStop(1, "rgba(200, 200, 200, 0)"), p.fillStyle = m, p.fillRect(0, 0, 64, 64), c.map = new THREE.CanvasTexture(u), c.map.needsUpdate = !0;
    const y = new THREE.Points(n, c);
    return y.position.set(0, 0, 0), y
}

function handleBoulderEruption(e) {
    const t = createEruptionSmoke(e.volcano.x, e.volcano.y, e.volcano.z, 150);
    t.userData.chunkKey = e.volcano.chunkKey, t.createdAt = Date.now(), smokeParticles.push(t), scene.add(t);
    const o = makeSeededRandom(e.seed),
        a = 10 + Math.floor(10 * o());
    for (let t = 0; t < a; t++) {
        const a = o();
        let n, r;
        a < .5 ? (n = 1 + .5 * o(), r = 1) : a < .85 ? (n = 2 + 1 * o(), r = 2) : (n = 3 + 1.5 * o(), r = 4);
        const s = new THREE.Mesh(new THREE.BoxGeometry(n, n, n), new THREE.MeshStandardMaterial({
            color: 5592405,
            map: createBlockTexture(worldSeed, 4)
        })),
            i = o() * Math.PI * 2,
            l = 9 + 5 * o(),
            d = 22 + 6 * o(),
            c = new THREE.Vector3(Math.cos(i) * l, d, Math.sin(i) * l),
            launchRadius = 2 * o(),
            x = e.volcano.x + Math.cos(i) * launchRadius,
            z = e.volcano.z + Math.sin(i) * launchRadius;
        s.position.set(x, Math.max(e.volcano.y, chunkManager.getSurfaceY(x, z)) + n / 2 + .2, z);
        const u = "boulder_" + JSON.stringify([e.seed, e.volcano.x, e.volcano.z, t]);
        eruptedBlocks.push({
            id: u,
            mesh: s,
            velocity: c,
            createdAt: Date.now(),
            type: "boulder",
            size: n,
            mass: r,
            angularVelocity: new THREE.Vector3(Math.sin(i), o() - .5, -Math.cos(i)).multiplyScalar(1 + o()),
            isRolling: !1,
            targetPosition: s.position.clone(),
            targetQuaternion: s.quaternion.clone(),
            lastUpdate: 0
        }), scene.add(s)
    }
}

function updateBoulder(boulder, delta) {
    const elapsed = (boulder.physicsRemainder || 0) + Math.min(delta, .1),
        steps = Math.floor(elapsed * 120 + 1e-9);
    boulder.physicsRemainder = Math.max(0, elapsed - steps / 120);
    if (steps <= 0) return;
    const dt = 1 / 120,
        radius = boulder.size / 2,
        position = boulder.mesh.position,
        velocity = boulder.velocity,
        normal = new THREE.Vector3(),
        previous = new THREE.Vector3();
    for (let step = 0; step < steps; step++) {
        previous.copy(position);
        const ground = chunkManager.getSurfaceYForBoulders(position.x, position.z) + radius;
        if (boulder.isRolling && position.y <= ground + .6) {
            // Sample across the boulder's footprint so voxel terraces still have a downhill slope.
            const span = Math.max(2, boulder.size);
            normal.set(
                chunkManager.getSurfaceYForBoulders(position.x - span, position.z) - chunkManager.getSurfaceYForBoulders(position.x + span, position.z),
                2 * span,
                chunkManager.getSurfaceYForBoulders(position.x, position.z - span) - chunkManager.getSurfaceYForBoulders(position.x, position.z + span)
            ).normalize();
            velocity.y = -(velocity.x * normal.x + velocity.z * normal.z) / normal.y;
            velocity.y -= gravity * dt;
            velocity.addScaledVector(normal, gravity * normal.y * dt);
            velocity.multiplyScalar(Math.exp(-.8 * dt));
            velocity.clampLength(0, 8);
        } else {
            boulder.isRolling = false;
            velocity.y -= gravity * dt;
        }
        position.addScaledVector(velocity, dt);
        const surface = chunkManager.getSurfaceYForBoulders(position.x, position.z) + radius;
        if (position.y < surface && surface - ground > .6 && previous.y < surface) {
            // Hit a cliff face rather than teleporting to the top of its column.
            position.x = previous.x;
            position.z = previous.z;
            velocity.x *= -.25;
            velocity.z *= -.25;
        }
        const contact = chunkManager.getSurfaceYForBoulders(position.x, position.z) + radius;
        if (position.y <= contact && velocity.y <= 0) {
            position.y = contact;
            if (!boulder.isRolling && velocity.y < -6) {
                velocity.y *= -.25;
                velocity.x *= .75;
                velocity.z *= .75;
            } else {
                boulder.isRolling = true;
                velocity.y = 0;
            }
        } else if (boulder.isRolling) {
            if (position.y - contact <= .6) position.y = contact;
            else boulder.isRolling = false;
        }
        if (boulder.isRolling) {
            normal.set(position.z - previous.z, 0, previous.x - position.x);
            const distance = normal.length();
            if (distance > 0) boulder.mesh.rotateOnWorldAxis(normal.divideScalar(distance), distance / radius);
        } else {
            const spin = boulder.angularVelocity.length();
            if (spin > 0) boulder.mesh.rotateOnWorldAxis(normal.copy(boulder.angularVelocity).divideScalar(spin), spin * dt);
        }
    }
}

function disposeObject(e) {
    e.traverse((function (e) {
        e.geometry && e.geometry.dispose(), e.material && (Array.isArray(e.material) ? e.material.forEach((function (e) {
            e.dispose()
        })) : e.material.dispose())
    }))
}

function safePlayAudio(e) {
    // Don't attempt to play if autoplay is paused due to browser restrictions
    if (isAutoplayPaused) return;
    
    if (e) {
        var t = e.play();
        void 0 !== t && t.catch((function (err) {
            // Check if this is an autoplay restriction error
            if (typeof isAutoplayError === 'function' && isAutoplayError(err)) {
                isAutoplayPaused = true;
                console.log('[AutoplayPause] Sound effect blocked by browser, waiting for user interaction');
            } else {
                audioErrorLogged || (addMessage("Audio playback issue detected", 3e3), audioErrorLogged = !0);
            }
        }))
    }
}

function safePlayAudioAt(audio, position, maxDistance = maxAudioDistance, volumeScale = 1) {
    if (!audio || !position || !player || isAutoplayPaused) return;
    const x = Number.isFinite(position.x) ? position.x : null;
    const y = Number.isFinite(position.y) ? position.y : null;
    const z = Number.isFinite(position.z) ? position.z : null;
    if (x === null || y === null || z === null) return;

    const distance = Math.hypot(player.x - x, player.y - y, player.z - z);
    if (distance >= maxDistance) return;

    const sound = audio.cloneNode(true);
    sound.volume = audio.volume * volumeScale * Math.pow(Math.max(0, 1 - distance / maxDistance), rolloffFactor);
    sound.onended = () => sound.remove();
    const playPromise = sound.play();
    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => sound.remove());
    }
}

function getAudioPositionForPlayer(username) {
    if (username === userName) return player;
    const position = userPositions[username];
    if (!position) return null;
    return {
        x: Number.isFinite(position.targetX) ? position.targetX : position.x,
        y: Number.isFinite(position.targetY) ? position.targetY : position.y,
        z: Number.isFinite(position.targetZ) ? position.targetZ : position.z
    };
}

function manageTreeSeeds() {
    if (isHost || 0 === peers.size) {
        const now = Date.now();
        const state = typeof getCurrentWorldState !== "undefined" ? getCurrentWorldState() : null;
        if (!state || !state.treeSeeds) return;

        for (const [key, seedData] of state.treeSeeds.entries()) {
            if (now - seedData.plantedTime >= 300000) { // 5 minutes
                // Grow tree
                const cx = seedData.x;
                const cy = seedData.y;
                const cz = seedData.z;
                const originSeed = seedData.originSeed;

                // Determine tree shape
                const rnd = makeSeededRandom(originSeed + "_tree_" + cx + "_" + cy + "_" + cz);
                const treeHeight = 5 + Math.floor(rnd() * 6);
                const canopySize = 2 + Math.floor(rnd() * 2);

                // Clear the seed block
                chunkManager.setBlockGlobal(cx, cy, cz, BLOCK_AIR, true, null, 'local');
                if (state.foreignBlockOrigins.has(key)) state.foreignBlockOrigins.delete(key);

                // Place trunk
                for (let i = 0; i < treeHeight; i++) {
                    const trunkKey = `${cx},${cy+i},${cz}`;
                    chunkManager.setBlockGlobal(cx, cy + i, cz, 7, true, originSeed, 'local');
                    if (originSeed && originSeed !== worldSeed) {
                        state.foreignBlockOrigins.set(trunkKey, originSeed);
                    }
                }

                // Place canopy
                for (let dy = -canopySize; dy <= canopySize; dy++) {
                    for (let dx = -canopySize; dx <= canopySize; dx++) {
                        for (let dz = -canopySize; dz <= canopySize; dz++) {
                            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (d <= canopySize + 0.5 * rnd()) {
                                const rx = cx + dx;
                                const ry = cy + treeHeight + dy;
                                const rz = cz + dz;
                                // Only place leaves in air
                                if (getBlockAt(rx, ry, rz) === BLOCK_AIR) {
                                    const leafKey = `${rx},${ry},${rz}`;
                                    chunkManager.setBlockGlobal(rx, ry, rz, 8, true, originSeed, 'local');
                                    if (originSeed && originSeed !== worldSeed) {
                                        state.foreignBlockOrigins.set(leafKey, originSeed);
                                    }
                                }
                            }
                        }
                    }
                }

                // Remove from treeSeeds
                state.treeSeeds.delete(key);
            }
        }
    }
}

function manageVolcanoes() {
    if (isHost || 0 === peers.size) {
        if (Date.now() - lastVolcanoManagement < 1e4) return;
        lastVolcanoManagement = Date.now();
        const e = [{
            x: player.x,
            y: player.y,
            z: player.z
        }];
        for (const t of Object.values(userPositions)) t.targetX && e.push({
            x: t.targetX,
            y: t.targetY,
            z: t.targetZ
        });
        for (const t of volcanoes) {
            if (e.some((e => Math.hypot(t.x - e.x, t.z - e.z) < 256))) {
                const e = Date.now();
                if (e - (t.lastEventTime || 0) < 6e4) continue;
                const o = makeSeededRandom(worldSeed + "_volcano_event_" + t.chunkKey + "_" + Math.floor(e / 6e4));
                if (o() < .05) {
                    t.lastEventTime = e;
                    const a = o();
                    let n;
                    n = a < .33 ? "lava_eruption" : a < .66 ? "pebble_rain" : "boulder_eruption", console.log(`[Volcano] Triggering event: ${n} at volcano ${t.chunkKey}`);
                    const r = {
                        type: "volcano_event",
                        volcano: {
                            x: t.x,
                            y: t.y,
                            z: t.z
                        },
                        eventType: n,
                        seed: worldSeed + "_event_" + e
                    };
                    handleVolcanoEvent(r);
                    for (const [e, t] of peers.entries()) t.dc && "open" === t.dc.readyState && t.dc.send(JSON.stringify(r))
                }
            }
        }
    }
}
