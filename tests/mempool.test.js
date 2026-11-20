const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');

const source = fs.readFileSync('js/mempool.js', 'utf8');

function harness(fetch) {
    let now = 0;
    let id = 0;
    const timers = new Map();
    const context = vm.createContext({
        fetch, AbortController, console,
        performance: { now: () => now },
        Date: class extends Date { static now() { return now; } },
        setTimeout(fn, delay) {
            const key = ++id;
            timers.set(key, { fn, at: now + delay });
            return key;
        },
        clearTimeout(key) { timers.delete(key); }
    });
    vm.runInContext(source, context);
    return {
        context,
        api: vm.runInContext('Mempool', context),
        async advance(ms) {
            now += ms;
            const ready = [...timers.entries()].filter(([, timer]) => timer.at <= now);
            for (const [key, timer] of ready) {
                if (timers.delete(key)) timer.fn();
            }
            for (let i = 0; i < 500; i++) await Promise.resolve();
        },
        now: () => now
    };
}

function response(status, text = '', retryAfter = null) {
    return { status, ok: status >= 200 && status < 300, headers: { get: () => retryAfter }, body: null, text: async () => text };
}

test('shares a rolling limit across concurrent requests', async () => {
    const starts = [];
    const h = harness(async url => { starts.push(h.now()); return response(200, url); });
    const requests = Array.from({ length: 11 }, (_, i) => h.api.request('/' + i));
    await h.advance(0);
    assert.equal(starts.length, 10);
    await h.advance(9999);
    assert.equal(starts.length, 10);
    await h.advance(1);
    await Promise.all(requests);
    assert.deepEqual(starts, [...Array(10).fill(0), 10000]);
});

test('fails over on timeout and server errors and keeps the working node', async () => {
    const urls = [];
    const h = harness((url, options) => {
        urls.push(url);
        if (urls.length === 1) return new Promise((resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(new Error('aborted')));
        });
        return Promise.resolve(response(urls.length === 2 ? 503 : 200, '{"ok":true}'));
    });
    const first = h.api.json('/address/test');
    await h.advance(0);
    await h.advance(10000);
    assert.equal((await first).ok, true);
    await h.api.json('/v1/fees/recommended');
    assert.deepEqual(urls, [
        'https://mempool.space/testnet/api/address/test',
        'https://node201.va1.mempool.space/testnet/api/address/test',
        'https://node202.va1.mempool.space/testnet/api/address/test',
        'https://node202.va1.mempool.space/testnet/api/v1/fees/recommended'
    ]);
});

test('429 pauses the shared queue using Retry-After and retries without switching nodes', async () => {
    const calls = [];
    const h = harness(async url => {
        calls.push([h.now(), url]);
        return calls.length === 1 ? response(429, '', '12') : response(200, 'ok');
    });
    const first = h.api.request('/first');
    await h.advance(0);
    const second = h.api.request('/second');
    await h.advance(11999);
    assert.equal(calls.length, 1);
    await h.advance(1);
    assert.equal(await first, 'ok');
    assert.equal(await second, 'ok');
    assert.equal(calls.length, 3);
    assert.ok(calls.slice(1).every(([time, url]) => time === 12000 && url.startsWith('https://mempool.space/testnet/api/')));
});

test('client errors are surfaced without failover', async () => {
    let calls = 0;
    const h = harness(async () => { calls++; return response(400, 'bad transaction'); });
    await assert.rejects(h.api.request('/tx', { method: 'POST' }), /HTTP 400.*bad transaction/);
    assert.equal(calls, 1);
});

test('repeated 429 responses fail after three attempts without switching nodes', async () => {
    const calls = [];
    const h = harness(async url => { calls.push(url); return calls.length <= 3 ? response(429) : response(200, 'ok'); });
    const rejection = assert.rejects(h.api.request('/address/test'), /HTTP 429/);
    await h.advance(0);
    await h.advance(10000);
    await h.advance(10000);
    await rejection;
    assert.equal(calls.length, 3);
    assert.equal(new Set(calls).size, 1);
    const next = h.api.request('/next');
    await h.advance(10000);
    assert.equal(await next, 'ok');
});

test('all 47 alternates are attempted before reporting failure', async () => {
    const urls = [];
    const h = harness(async url => { urls.push(url); throw new Error('offline'); });
    const result = h.api.request('/address/test');
    const rejection = assert.rejects(result, /All Mempool Testnet3 endpoints failed.*offline/);
    for (let i = 0; i < 6; i++) await h.advance(10000);
    await rejection;
    assert.equal(urls.length, 48);
    assert.equal(new Set(urls).size, 48);
    assert.ok(urls.every(url => url.includes('/testnet/api/')));
});

test('worker polling shares the wallet queue and receives request errors', async () => {
    const calls = [];
    const h = harness(async url => {
        calls.push([h.now(), url]);
        return url.endsWith('/error') ? response(400, 'bad request') : response(200, '[]');
    });
    let workerContext;
    class Worker {
        constructor(code) {
            const self = { postMessage: message => this.onmessage({ data: message }) };
            workerContext = vm.createContext({ self, console, Map, Set, Uint8Array, TextEncoder, TextDecoder });
            vm.runInContext(code, workerContext);
        }
        postMessage(message) { workerContext.self.onmessage({ data: message }); }
    }
    const page = vm.createContext({
        Mempool: h.api, Worker,
        Blob: class { constructor(parts) { this.code = parts[0]; } },
        URL: { createObjectURL: blob => blob.code }
    });
    page.window = page;
    vm.runInContext(fs.readFileSync('js/worker.js', 'utf8'), page);

    const walletRequests = Array.from({ length: 10 }, (_, i) => h.api.json('/wallet/' + i));
    const workerRequest = vm.runInContext("getMempoolJson('/worker')", workerContext);
    await h.advance(0);
    assert.equal(calls.length, 10);
    await h.advance(10000);
    await Promise.all([...walletRequests, workerRequest]);
    assert.equal(calls.length, 11);
    assert.equal(calls[10][0], 10000);
    await assert.rejects(vm.runInContext("getMempoolJson('/error')", workerContext), /HTTP 400.*bad request/);
});

test('broadcast retries preserve transaction bytes and recognize already-known transactions', async () => {
    const raw = '01020304';
    const expected = createHash('sha256').update(createHash('sha256').update(Buffer.from(raw, 'hex')).digest()).digest().reverse().toString('hex');
    const bodies = [];
    const h = harness(async (url, options) => {
        bodies.push(options.body);
        return bodies.length === 1 ? response(503) : response(400, 'txn-already-in-mempool');
    });
    Object.assign(h.context, { window: h.context, crypto: webcrypto, Uint8Array, TextEncoder });
    vm.runInContext(fs.readFileSync('js/wallet.js', 'utf8'), h.context);
    h.context.raw = raw;
    const txid = await vm.runInContext('broadcastMempoolTx(raw)', h.context);
    assert.equal(txid, expected);
    assert.deepEqual(bodies, [raw, raw]);
});
