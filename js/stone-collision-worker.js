/* A static world-space median BVH. Only copied collision data enters this worker. */
'use strict';
function buildStoneCollisionIndex(event) {
    try {
        const { triangles, sides, normalY } = event.data;
        const count = sides.length;
        const order = new Uint32Array(count);
        const triangleBounds = new Float64Array(count * 6);
        for (let i = 0; i < count; i++) {
            order[i] = i;
            for (let axis = 0; axis < 3; axis++) {
                const a = triangles[i * 9 + axis], b = triangles[i * 9 + 3 + axis], c = triangles[i * 9 + 6 + axis];
                triangleBounds[i * 6 + axis] = Math.min(a, b, c);
                triangleBounds[i * 6 + axis + 3] = Math.max(a, b, c);
            }
        }
        // Median splits need far fewer nodes than triangles; avoid a 2N-node allocation.
        const maxNodes = 2 * Math.pow(2, Math.ceil(Math.log2(Math.max(1, count / 12)))) - 1;
        const bounds = new Float64Array(maxNodes * 6);
        const nodes = new Int32Array(maxNodes * 4);
        let used = 0;
        const center = (id, axis) => triangleBounds[id * 6 + axis] + triangleBounds[id * 6 + axis + 3];
        function partition(start, end, middle, axis) {
            let left = start, right = end - 1;
            while (left < right) {
                const pivot = center(order[(left + right) >>> 1], axis);
                let a = left, b = right;
                while (a <= b) {
                    while (center(order[a], axis) < pivot) a++;
                    while (center(order[b], axis) > pivot) b--;
                    if (a <= b) {
                        const tmp = order[a]; order[a++] = order[b]; order[b--] = tmp;
                    }
                }
                if (middle <= b) right = b;
                else if (middle >= a) left = a;
                else break;
            }
        }
        function build(start, end) {
            const node = used++, offset = node * 6;
            bounds.fill(Infinity, offset, offset + 3);
            bounds.fill(-Infinity, offset + 3, offset + 6);
            for (let i = start; i < end; i++) {
                const t = order[i] * 6;
                for (let axis = 0; axis < 3; axis++) {
                    bounds[offset + axis] = Math.min(bounds[offset + axis], triangleBounds[t + axis]);
                    bounds[offset + axis + 3] = Math.max(bounds[offset + axis + 3], triangleBounds[t + axis + 3]);
                }
            }
            nodes[node * 4] = -1;
            nodes[node * 4 + 1] = -1;
            nodes[node * 4 + 2] = start;
            nodes[node * 4 + 3] = end - start;
            if (end - start > 12) {
                let axis = 0;
                for (let j = 1; j < 3; j++) {
                    if (bounds[offset + j + 3] - bounds[offset + j] > bounds[offset + axis + 3] - bounds[offset + axis]) axis = j;
                }
                const mid = (start + end) >>> 1;
                partition(start, end, mid, axis);
                nodes[node * 4] = build(start, mid);
                nodes[node * 4 + 1] = build(mid, end);
            }
            return node;
        }
        if (count) build(0, count);
        const result = { triangles, sides, normalY, order, bounds: bounds.slice(0, used * 6), nodes: nodes.slice(0, used * 4) };
        self.postMessage(result, Object.values(result).map(array => array.buffer));
    } catch (error) {
        self.postMessage({ error: error.message || String(error) });
    }
}

if (typeof window === 'undefined') self.onmessage = buildStoneCollisionIndex;
