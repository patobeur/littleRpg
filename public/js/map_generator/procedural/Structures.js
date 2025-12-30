export function placeHouses(prng, graph, structureTypes, spacing = 15) {
    const items = [];
    const occupied = [];

    // If no structure types, return empty
    if (!structureTypes || structureTypes.length === 0) return items;

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

        const startOffset = 2;
        const endOffset = 2;

        for (let t = startOffset; t < dist - endOffset; t += prng.range(spacing, spacing + 6)) {
            // Pick a random structure type for this attempt
            const typeIdx = Math.floor(prng.random() * structureTypes.length);
            const structDef = structureTypes[typeIdx];
            const structRadius = (structDef.radius || 2) * (structDef.scale || 1) * 3; // Approx buffer

            // Left Check
            if (prng.random() > 0.3) {
                const setback = prng.range(6, 10);
                const hx = nA.x + dir.x * t + norm.x * setback;
                const hz = nA.z + dir.z * t + norm.z * setback;
                const angle = Math.atan2(dir.x, dir.z);

                if (!collides(hx, hz, structRadius)) {
                    items.push({ type: structDef.id, x: hx, z: hz, rot: angle });
                    occupied.push({ x: hx, z: hz, r: structRadius });
                }
            }

            // Right Check
            if (prng.random() > 0.3) {
                const setback = -prng.range(6, 10);
                const hx = nA.x + dir.x * t + norm.x * setback;
                const hz = nA.z + dir.z * t + norm.z * setback;
                const angle = Math.atan2(dir.x, dir.z) + Math.PI;

                if (!collides(hx, hz, structRadius)) {
                    items.push({ type: structDef.id, x: hx, z: hz, rot: angle });
                    occupied.push({ x: hx, z: hz, r: structRadius });
                }
            }
        }
    });

    return items;
}
