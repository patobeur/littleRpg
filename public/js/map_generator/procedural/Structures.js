export function placeHouses(prng, graph) {
    const items = [];
    const occupied = [];

    function collides(x, z, r) {
        for (let o of occupied) {
            const dx = o.x - x;
            const dz = o.z - z;
            if (dx * dx + dz * dz < (o.r + r) * (o.r + r)) return true;
        }
        return false;
    }

    graph.edges.forEach(edge => {
        const nA = graph.nodes[edge.a];
        const nB = graph.nodes[edge.b];

        const dx = nB.x - nA.x;
        const dz = nB.z - nA.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const dir = { x: dx / dist, z: dz / dist };
        const norm = { x: -dir.z, z: dir.x };

        const startOffset = 8;
        const endOffset = 8;

        for (let t = startOffset; t < dist - endOffset; t += prng.range(12, 18)) {
            // Left Check
            if (prng.random() > 0.3) {
                const setback = prng.range(6, 10);
                const hx = nA.x + dir.x * t + norm.x * setback;
                const hz = nA.z + dir.z * t + norm.z * setback;
                const angle = Math.atan2(dir.x, dir.z);

                if (!collides(hx, hz, 6)) {
                    items.push({ type: 'house', x: hx, z: hz, rot: angle });
                    occupied.push({ x: hx, z: hz, r: 6 });
                }
            }

            // Right Check
            if (prng.random() > 0.3) {
                const setback = -prng.range(6, 10);
                const hx = nA.x + dir.x * t + norm.x * setback;
                const hz = nA.z + dir.z * t + norm.z * setback;
                const angle = Math.atan2(dir.x, dir.z) + Math.PI;

                if (!collides(hx, hz, 6)) {
                    items.push({ type: 'house', x: hx, z: hz, rot: angle });
                    occupied.push({ x: hx, z: hz, r: 6 });
                }
            }
        }
    });

    return items;
}
