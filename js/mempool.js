// Shared by the wallet and the worker's mempool requests.
const Mempool = (() => {
    const interval = 10000;
    const burst = 10;
    const endpoints = [
        'https://mempool.space/testnet/api',
        ...[
            ['va1', [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214]],
            ['sv1', [201, 202, 203, 205, 206]],
            ['hnl', [201, 202, 203, 204]],
            ['fra', [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214]],
            ['tk7', [201, 202, 203, 204, 205, 206]],
            ['sg1', [201, 202, 203, 204]]
        ].flatMap(([region, nodes]) => nodes.map(node =>
            `https://node${node}.${region}.mempool.space/testnet/api`))
    ];
    let preferred = 0;
    let backoffUntil = 0;
    let queue = Promise.resolve();
    const starts = [];

    function schedule(start) {
        const ready = queue.then(async () => {
            for (;;) {
                const now = performance.now();
                while (starts.length && now - starts[0] >= interval) starts.shift();
                const next = Math.max(backoffUntil, starts.length >= burst ? starts[0] + interval : 0);
                if (now >= next) {
                    starts.push(now);
                    return { result: start() };
                }
                await new Promise(resolve => setTimeout(resolve, Math.min(next - now, 2147483647)));
            }
        });
        queue = ready.then(() => {}, () => {});
        return ready.then(({ result }) => result);
    }

    function backOff(retryAfter) {
        const delay = /^\d+$/.test(retryAfter || '') ? Number(retryAfter) * 1000
            : Date.parse(retryAfter || '') - Date.now();
        const wait = Number.isFinite(delay) ? Math.max(interval, delay) : interval;
        backoffUntil = Math.max(backoffUntil, performance.now() + wait);
    }

    async function attempt(url, options) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), interval);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store', redirect: 'error' });
            if (response.status === 429) backOff(response.headers.get('Retry-After'));
            if (response.status === 429 || response.status === 408 || response.status >= 500) {
                if (response.body) void response.body.cancel().catch(() => controller.abort());
                return { status: response.status, ok: false, text: '' };
            }
            return { status: response.status, ok: response.ok, text: await response.text() };
        } catch (error) {
            if (controller.signal.aborted) throw new Error(`Mempool request timed out: ${url}`);
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    async function request(path, options = {}) {
        let endpoint;
        let lastError;
        const start = () => {
            if (endpoint === undefined) endpoint = preferred;
            return attempt(endpoints[endpoint] + path, options);
        };
        for (let tried = 0; tried < endpoints.length; tried++) {
            let response;
            try {
                for (let retry = 0; retry < 3; retry++) {
                    response = undefined;
                    response = await schedule(start);
                    if (response.status !== 429) break;
                }
            } catch (error) {
                lastError = error;
            }
            if (response) {
                if (response.ok) return response.text;
                lastError = new Error(`Mempool HTTP ${response.status} for ${path}${response.text ? `: ${response.text.trim()}` : ''}`);
                if (response.status !== 408 && response.status < 500) throw lastError;
            }
            const next = (endpoint + 1) % endpoints.length;
            if (preferred === endpoint) preferred = next;
            endpoint = next;
        }
        throw new Error(`All Mempool Testnet3 endpoints failed for ${path}: ${lastError.message}`, { cause: lastError });
    }

    return {
        request,
        async json(path) { return JSON.parse(await request(path)); }
    };
})();
