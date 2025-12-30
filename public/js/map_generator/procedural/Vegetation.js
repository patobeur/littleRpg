export function placeTrees(prng, graph, structures, bounds, natureTypes, radius = 5, densityMultiplier = 1.0) {
    const trees = [];
    const active = [];

    const boundsX = bounds.x !== undefined ? bounds.x : bounds;
    const boundsZ = bounds.z !== undefined ? bounds.z : bounds;

    // If no nature types, return empty
    if (!natureTypes || natureTypes.length === 0) return trees;

    const cellSize = radius / Math.sqrt(2);
    // Cols based on Width, Rows based on Depth
    const cols = Math.ceil((boundsX * 2) / cellSize);
    const rows = Math.ceil((boundsZ * 2) / cellSize);
    const grid = new Array(cols * rows).fill(-1);

    function pos2grid(x, z) {
        const c = Math.floor((x + boundsX) / cellSize);
        const r = Math.floor((z + boundsZ) / cellSize);
        return { c, r, idx: r * cols + c };
    }

    function addSample(x, z) {
        // Pick random nature type
        const typeIdx = Math.floor(prng.random() * natureTypes.length);
        const type = natureTypes[typeIdx].id;

        const s = { x, z, type };
        trees.push(s);
        active.push(s);
        const { idx } = pos2grid(x, z);
        if (idx >= 0 && idx < grid.length) grid[idx] = trees.length - 1;
    }

    function isValid(x, z) {
        if (x < -boundsX || x > boundsX || z < -boundsZ || z > boundsZ) return false;

        // 1. Check existing trees (Poisson check)
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

        // 2. Check Structures (Collision)
        for (let s of structures) {
            if ((s.x - x) ** 2 + (s.z - z) ** 2 < 25) return false; // 5m buffer
        }

        // 3. Check Roads (Collision but close allowed)
        // We want trees NEAR roads, but not ON them.
        for (let edge of graph.edges) {
            const nA = graph.nodes[edge.a];
            const nB = graph.nodes[edge.b];
            const l2 = (nA.x - nB.x) ** 2 + (nA.z - nB.z) ** 2;
            if (l2 === 0) continue;
            let t = ((x - nA.x) * (nB.x - nA.x) + (z - nA.z) * (nB.z - nA.z)) / l2;
            t = Math.max(0, Math.min(1, t));
            const distSq = (x - (nA.x + t * (nB.x - nA.x))) ** 2 + (z - (nA.z + t * (nB.z - nA.z))) ** 2;

            if (distSq < 16) return false; // 4m from road center (road is ~4m wide, so 2m clearance)
        }

        return true;
    }

    // CLUSTERING LOGIC
    // Scale count by area roughly? Or avg dimension? 
    // Area makes sense: (2*boundsX * 2*boundsZ) / ReferenceArea
    // Current formula was bounds * 0.8. Let's approximation with average bound
    const avgBound = (boundsX + boundsZ) / 2;
    const clusterCount = Math.floor(avgBound * 0.8 * densityMultiplier);

    for (let i = 0; i < clusterCount; i++) {
        // Pick a center
        const cx = prng.range(-boundsX, boundsX);
        const cz = prng.range(-boundsZ, boundsZ);

        // How many trees in this cluster?
        const size = Math.floor(prng.range(3, 12));

        // Try to place 'size' trees around 'cx, cz'
        for (let j = 0; j < size; j++) {
            // Random offset within cluster radius (e.g. 15m)
            const angle = prng.range(0, Math.PI * 2);
            const dist = prng.range(1, 15);
            const tx = cx + Math.cos(angle) * dist;
            const tz = cz + Math.sin(angle) * dist;

            if (isValid(tx, tz)) {
                addSample(tx, tz);
            }
        }
    }

    // PROXIMITY LOGIC (Roadside / House-side shrubs)
    // Walk along roads and try to place trees/bushes nearby
    graph.edges.forEach(edge => {
        if (prng.random() > 0.6) return; // Not every road
        const nA = graph.nodes[edge.a];
        const nB = graph.nodes[edge.b];

        const midX = (nA.x + nB.x) / 2;
        const midZ = (nA.z + nB.z) / 2;

        // Try placing 1-3 trees near midpoint
        const count = Math.floor(prng.range(1, 3));
        for (let k = 0; k < count; k++) {
            const offX = prng.range(-6, 6);
            const offZ = prng.range(-6, 6);
            if (isValid(midX + offX, midZ + offZ)) {
                addSample(midX + offX, midZ + offZ);
            }
        }
    });

    return trees.map(t => ({ type: t.type, x: t.x, z: t.z }));
}
