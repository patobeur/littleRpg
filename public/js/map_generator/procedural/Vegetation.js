export function placeTrees(prng, graph, structures, bounds, radius = 5, k = 15) {
    const trees = [];
    const active = [];
    const cellSize = radius / Math.sqrt(2);
    const cols = Math.ceil((bounds * 2) / cellSize);
    const rows = Math.ceil((bounds * 2) / cellSize);
    const grid = new Array(cols * rows).fill(-1);

    function pos2grid(x, z) {
        const c = Math.floor((x + bounds) / cellSize);
        const r = Math.floor((z + bounds) / cellSize);
        return { c, r, idx: r * cols + c };
    }

    function addSample(x, z) {
        const s = { x, z };
        trees.push(s);
        active.push(s);
        const { idx } = pos2grid(x, z);
        if (idx >= 0 && idx < grid.length) grid[idx] = trees.length - 1;
    }

    function isValid(x, z) {
        if (x < -bounds || x > bounds || z < -bounds || z > bounds) return false;
        const { c, r } = pos2grid(x, z);
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
                const nc = c + i;
                const nr = r + j;
                if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
                    const idx = nr * cols + nc;
                    if (grid[idx] !== -1) {
                        const neighbor = trees[grid[idx]];
                        const dx = neighbor.x - x;
                        const dz = neighbor.z - z;
                        if (dx * dx + dz * dz < radius * radius) return false;
                    }
                }
            }
        }
        for (let edge of graph.edges) {
            const nA = graph.nodes[edge.a];
            const nB = graph.nodes[edge.b];
            const l2 = (nA.x - nB.x) ** 2 + (nA.z - nB.z) ** 2;
            if (l2 === 0) continue;
            let t = ((x - nA.x) * (nB.x - nA.x) + (z - nA.z) * (nB.z - nA.z)) / l2;
            t = Math.max(0, Math.min(1, t));
            const distSq = (x - (nA.x + t * (nB.x - nA.x))) ** 2 + (z - (nA.z + t * (nB.z - nA.z))) ** 2;
            if (distSq < 36) return false;
        }
        for (let s of structures) {
            if ((s.x - x) ** 2 + (s.z - z) ** 2 < 49) return false;
        }
        return true;
    }

    addSample(prng.range(-bounds, bounds), prng.range(-bounds, bounds));

    while (active.length > 0) {
        const idx = Math.floor(prng.random() * active.length);
        const center = active[idx];
        let found = false;
        for (let i = 0; i < k; i++) {
            const angle = prng.range(0, Math.PI * 2);
            const dist = prng.range(radius, 2 * radius);
            const cx = center.x + Math.cos(angle) * dist;
            const cz = center.z + Math.sin(angle) * dist;
            if (isValid(cx, cz)) {
                addSample(cx, cz);
                found = true;
                break;
            }
        }
        if (!found) active.splice(idx, 1);
    }
    return trees.map(t => ({ type: 'tree', x: t.x, z: t.z }));
}
