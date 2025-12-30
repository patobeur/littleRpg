export function placeEnemies(prng, graph, structures, trees, bounds, enemyTypes) {
    const enemies = [];

    // If no enemy types are available, return empty
    if (!enemyTypes || enemyTypes.length === 0) return enemies;

    const count = Math.floor(bounds * 0.5); // Density heuristic

    for (let i = 0; i < count; i++) {
        const x = prng.range(-bounds, bounds);
        const z = prng.range(-bounds, bounds);

        // Simple validity check: avoid overlap with structures and trees
        let valid = true;

        // 1. Check Structures
        for (let s of structures) {
            const dx = s.x - x;
            const dz = s.z - z;
            if (dx * dx + dz * dz < 64) { // 8m radius buffer
                valid = false;
                break;
            }
        }
        if (!valid) continue;

        // 2. Check Trees (optional, maybe enemies like trees?)
        // Let's avoid checking all trees for perf, just rough density check?
        // Actually, let's just let them be near trees, it's fine.

        // 3. Check Roads (keep them off the road slightly)
        for (let edge of graph.edges) {
            const nA = graph.nodes[edge.a];
            const nB = graph.nodes[edge.b];

            // Dist to segment
            const l2 = (nA.x - nB.x) ** 2 + (nA.z - nB.z) ** 2;
            if (l2 == 0) continue;
            let t = ((x - nA.x) * (nB.x - nA.x) + (z - nA.z) * (nB.z - nA.z)) / l2;
            t = Math.max(0, Math.min(1, t));
            const distSq = (x - (nA.x + t * (nB.x - nA.x))) ** 2 + (z - (nA.z + t * (nB.z - nA.z))) ** 2;

            if (distSq < 16) { // 4m radius from road center
                valid = false;
                break;
            }
        }

        if (valid) {
            // Pick random enemy type
            // enemyTypes should be an array of objects: { id, scale, ... }
            const typeIndex = Math.floor(prng.random() * enemyTypes.length);
            const type = enemyTypes[typeIndex].id;

            enemies.push({
                type: type,
                x: x,
                z: z,
                rot: prng.range(0, Math.PI * 2)
            });
        }
    }

    return enemies;
}
