const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");

const source = fs.readFileSync("js/web-rtc.js", "utf8");

function makeClient(name, outgoing) {
    class Stream {
        constructor(tracks = []) { this.tracks = tracks; }
        getTracks() { return this.tracks; }
        getAudioTracks() { return this.tracks.filter(track => track.kind === "audio"); }
        getVideoTracks() { return this.tracks.filter(track => track.kind === "video"); }
    }
    const track = kind => ({ kind, readyState: "live", stop() { this.readyState = "ended"; } });
    const transceiver = kind => ({
        receiver: { track: track(kind) },
        sender: { async replaceTrack(value) { this.track = value; } },
        direction: "sendrecv"
    });
    class PeerConnection {
        constructor() { this.connectionState = "new"; this.transceivers = []; }
        addTransceiver(kind) {
            const result = transceiver(kind);
            this.transceivers.push(result);
            return result;
        }
        getTransceivers() { return this.transceivers; }
        async createOffer() { return { type: "offer", sdp: "test" }; }
        async createAnswer() { return { type: "answer", sdp: "test" }; }
        async setLocalDescription(description) {
            this.localDescription = description;
            this.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: "candidate" }) } });
            if (description.type === "answer") this.connectionState = "connected";
        }
        async setRemoteDescription(description) {
            this.remoteDescription = description;
            if (description.type === "offer") {
                this.transceivers = [transceiver("audio"), transceiver("video")];
            } else {
                this.connectionState = "connected";
            }
            for (const item of this.transceivers) this.ontrack?.({ track: item.receiver.track });
        }
        async addIceCandidate(candidate) {
            assert.ok(this.remoteDescription, "ICE requires a remote description");
            this.receivedCandidate = candidate;
        }
        close() { this.connectionState = "closed"; }
    }
    const elements = new Map();
    const element = () => ({ style: {}, remove() {}, srcObject: null });
    const context = vm.createContext({
        window: {}, console, Map, Set, WeakMap, Date, Math, Promise,
        setTimeout, clearTimeout, setInterval, clearInterval,
        crypto: { randomUUID }, RTCPeerConnection: PeerConnection, MediaStream: Stream,
        Audio: class { remove() {} },
        document: {
            body: { appendChild() {} },
            createElement: element,
            getElementById(id) {
                if (!elements.has(id)) elements.set(id, element());
                return elements.get(id);
            }
        },
        navigator: { mediaDevices: { async getUserMedia(options) {
            return new Stream([track(options.audio ? "audio" : "video")]);
        } } },
        userName: name, worldName: "earth", player: { x: 0, y: 0, z: 0 },
        maxAudioDistance: 32, addMessage() {}, updateHudButtons() {},
        clearDisconnectedPlayerPets() {}, scene: { remove() {} }, disposeObject() {}
    });
    vm.runInContext(source, context);
    context.send = message => outgoing.push(message);
    vm.runInContext(`
        dedicatedServer = { connected: true };
        peers.set(SERVER_PEER, { dc: { readyState: "open", send: value => send(JSON.parse(value)) } });
    `, context);
    return {
        context,
        run: code => vm.runInContext(code, context),
        addPeer(other, distance = 1) {
            context.other = other;
            context.distance = distance;
            vm.runInContext(`
                peers.set(other, { pc: null, dc: null });
                userPositions[other] = { world: "earth", targetX: distance, targetY: 0, targetZ: 0 };
            `, context);
        }
    };
}

async function drain(messages, clients) {
    for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setImmediate(resolve));
        if (!messages.length) {
            await new Promise(resolve => setImmediate(resolve));
            if (!messages.length) return;
        }
        while (messages.length) {
            const message = messages.shift();
            clients[message.to].context.message = message;
            clients[message.to].run("queueDedicatedMediaSignal(message)");
        }
    }
    throw new Error("Signaling did not settle");
}

test("nearby server players negotiate audio and camera without renegotiating the server", async () => {
    const messages = [];
    const alice = makeClient("alice", messages);
    const bob = makeClient("bob", messages);
    const clients = { alice, bob };
    alice.addPeer("bob");
    bob.addPeer("alice");
    alice.run("updateDedicatedProximityMedia()");
    bob.run("updateDedicatedProximityMedia()");
    await drain(messages, clients);

    for (const [client, other] of [[alice, "bob"], [bob, "alice"]]) {
        client.context.other = other;
        assert.equal(client.run("dedicatedMediaPeers.get(other).pc.connectionState"), "connected");
        assert.equal(client.run("dedicatedMediaPeers.get(other).pc.receivedCandidate.candidate"), "candidate");
        assert.equal(client.run("userAudioStreams.has(other)"), true);
        assert.equal(client.run("userVideoStreams.has(other)"), false);
    }
    await alice.run("toggleCamera()");
    await drain(messages, clients);
    assert.equal(bob.run("userVideoStreams.has('alice')"), true);
    await alice.run("toggleCamera()");
    await drain(messages, clients);
    assert.equal(bob.run("userVideoStreams.has('alice')"), false);

    alice.run("userPositions.bob.targetX = 33; lastDedicatedMediaUpdate = 0; updateDedicatedProximityMedia()");
    await drain(messages, clients);
    assert.equal(alice.run("dedicatedMediaPeers.size"), 0);
    assert.equal(bob.run("dedicatedMediaPeers.size"), 0);
    assert.equal(bob.run("userAudioStreams.size"), 0);
});

test("out of range and different worlds do not start media connections", async () => {
    const messages = [];
    const alice = makeClient("alice", messages);
    alice.addPeer("bob", 33);
    alice.run("updateDedicatedProximityMedia()");
    await drain(messages, {});
    assert.equal(alice.run("dedicatedMediaPeers.size"), 0);
    alice.run("userPositions.bob.targetX = 1; userPositions.bob.world = 'mars'; lastDedicatedMediaUpdate = 0; updateDedicatedProximityMedia()");
    await drain(messages, {});
    assert.equal(alice.run("dedicatedMediaPeers.size"), 0);
});

test("world transitions close media and provide stationary player positions", async () => {
    const messages = [];
    const alice = makeClient("alice", messages);
    const bob = makeClient("bob", messages);
    alice.addPeer("bob");
    bob.addPeer("alice");
    alice.run("updateDedicatedProximityMedia()");
    await drain(messages, { alice, bob });
    bob.run("handleDedicatedWorldSwitch('alice', 'mars')");
    await drain(messages, { alice, bob });
    assert.equal(bob.run("dedicatedMediaPeers.size"), 0);
    assert.equal(bob.run("userPositions.alice.world"), "mars");
    assert.equal(bob.run("isDedicatedMediaNearby('alice')"), false);
    bob.run("handleDedicatedWorldSwitch('alice', 'earth')");
    assert.equal(messages.length, 1);
    assert.equal(messages[0].type, "player_move");
    assert.equal(messages[0].to, "alice");
    assert.equal(messages[0].world, "earth");
    assert.equal(messages[0].x, 0);
});
