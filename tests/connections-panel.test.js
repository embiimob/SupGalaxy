const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");

const source = fs.readFileSync("js/web-rtc.js", "utf8");

function makePanel({ server = false } = {}) {
    const elements = new Map();
    class Element {
        constructor() {
            this.style = {};
            this.children = [];
            this.classList = { add() {} };
        }
        set innerHTML(value) {
            this.children = [];
            for (const [, id] of value.matchAll(/id="([^"]+)"/g)) {
                const element = new Element();
                element.id = id;
                const parent = new Element();
                parent.appendChild(element);
                this.appendChild(parent);
                elements.set(id, element);
            }
        }
        appendChild(child) {
            child.parentElement?.removeChild(child);
            this.children.push(child);
            child.parentElement = this;
            if (child.id) elements.set(child.id, child);
            return child;
        }
        removeChild(child) { this.children.splice(this.children.indexOf(child), 1); }
        prepend(child) { this.appendChild(child); }
        querySelector(selector) { return elements.get(selector.slice(1)); }
        addEventListener() {}
        focus() {}
        remove() {
            this.removed = true;
            this.parentElement?.removeChild(this);
            elements.delete(this.id);
        }
    }
    const calls = [];
    const context = vm.createContext({
        window: {}, console: { log() {} }, Map, Set, WeakMap,
        document: {
            body: new Element(),
            createElement: () => new Element(),
            getElementById: id => elements.get(id)
        },
        userName: "alice", worldName: "earth", isPromptOpen: true,
        spawnChunks: new Map(), knownWorlds: new Map(),
        openGalaxyAtlas() {},
        calculateSpawnPoint(key) {
            calls.push(["calculate", key]);
            return { x: 12, y: 70, z: 34 };
        },
        switchWorld(world, spawn) {
            calls.push(["switch", world, { ...spawn }]);
            context.worldName = world;
        },
        respawnPlayer(x, y, z) { calls.push(["respawn", context.worldName, x, y, z]); },
        addMessage(message) { calls.push(["message", message]); }
    });
    vm.runInContext(source, context);
    vm.runInContext(`
        enableWebRtcPolling = () => {};
        updateDedicatedServerDialog = () => {};
    `, context);
    if (server) vm.runInContext("dedicatedServer = { connected: true }", context);
    return {
        context, calls,
        addPlayer(name, world) {
            context.userPositions[name] = { world };
            if (!server) context.peers.set(name, {});
        },
        open() { context.openUsersModal(); },
        rows() { return elements.get("usersList").children[1].children[1].children; },
        modal() { return elements.get("usersModal"); }
    };
}

for (const server of [false, true]) {
    test(`visiting a different world switches before teleporting (${server ? "server" : "P2P"})`, () => {
        const panel = makePanel({ server });
        panel.addPlayer("bob", "mars");
        panel.context.spawnChunks.set("bob@earth", { spawn: { x: 1, y: 2, z: 3 } });
        panel.context.spawnChunks.set("bob@mars", { spawn: { x: 90, y: 75, z: 80 } });
        panel.open();
        const [label, button] = panel.rows()[0].children;
        assert.match(label.innerText, /World: mars at \(90, 75, 80\)/);
        button.onclick();
        assert.deepEqual(panel.calls, [
            ["switch", "mars", { x: 90, y: 100, z: 80 }],
            ["respawn", "mars", 90, 100, 80]
        ]);
        assert.equal(panel.modal(), undefined);
        assert.equal(panel.context.isPromptOpen, false);
    });
}

test("same-world visits calculate the selected player's spawn without switching", () => {
    const panel = makePanel();
    panel.addPlayer("bob", "earth");
    panel.addPlayer("carol", "mars");
    panel.open();
    panel.calls.length = 0;
    panel.rows()[0].children[1].onclick();
    assert.deepEqual(panel.calls, [
        ["calculate", "bob@earth"],
        ["respawn", "earth", 12, 100, 34]
    ]);
});

test("visits use the latest world and spawn if the player moves while the panel is open", () => {
    const panel = makePanel();
    panel.addPlayer("bob", "mars");
    panel.open();
    panel.context.userPositions.bob.world = "moon";
    panel.context.spawnChunks.set("bob@moon", { spawn: { x: 55, y: 60, z: 65 } });
    panel.calls.length = 0;
    panel.rows()[0].children[1].onclick();
    assert.deepEqual(panel.calls, [
        ["switch", "moon", { x: 55, y: 100, z: 65 }],
        ["respawn", "moon", 55, 100, 65]
    ]);
});

test("unknown worlds disable visits and losing a player's world reports an error", () => {
    const panel = makePanel();
    panel.addPlayer("bob", undefined);
    panel.addPlayer("carol", "mars");
    panel.open();
    const [bob, carol] = panel.rows();
    assert.match(bob.children[0].innerText, /World: Unknown/);
    assert.equal(bob.children[1].disabled, true);
    delete panel.context.userPositions.carol;
    panel.calls.length = 0;
    carol.children[1].onclick();
    assert.equal(panel.calls.length, 1);
    assert.equal(panel.calls[0][0], "message");
    assert.match(panel.calls[0][1], /world is unavailable/);
    assert.ok(panel.modal());
});
