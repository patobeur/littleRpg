export function growRoads(prng, center, steps, bounds) {
    // Bounds can be scalar (old square) or object {x, z} (new rectangle)
    const boundsX = bounds.x !== undefined ? bounds.x : bounds;
    const boundsZ = bounds.z !== undefined ? bounds.z : bounds;

    const nodes = [];
    const edges = [];

    function addNode(x, z) {
        // Snap to existing nodes if very close (Road merging/Loop closing)
        for (let i = 0; i < nodes.length; i++) {
            const dx = nodes[i].x - x;
            const dz = nodes[i].z - z;
            if (dx * dx + dz * dz < 25) return i; // Snap radius 5m (was 1)
        }
        nodes.push({ x, z, id: nodes.length });
        return nodes.length - 1;
    }

    function addEdge(i1, i2) {
        if (i1 === i2) return;
        // Check duplicate
        if (edges.some(e => (e.a === i1 && e.b === i2) || (e.a === i2 && e.b === i1))) return;
        edges.push({ a: i1, b: i2 });
    }

    // --- 1. Central Plaza (Ring Road) ---
    const radius = 12;
    const segments = 8;
    const ringIndices = [];

    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = center.x + Math.cos(theta) * radius;
        const z = center.z + Math.sin(theta) * radius;
        ringIndices.push(addNode(x, z));
    }

    for (let i = 0; i < segments; i++) {
        addEdge(ringIndices[i], ringIndices[(i + 1) % segments]);
    }

    // --- 2. Organic Expansion (Agents) ---
    // Start agents from the ring
    let agents = [];

    // Create 4-6 main avenues
    const avenueCount = Math.floor(prng.range(4, 7));
    for (let i = 0; i < avenueCount; i++) {
        const idx = Math.floor(i * segments / avenueCount);
        const nodeIdx = ringIndices[idx % segments];
        const n = nodes[nodeIdx];

        // Direction away from center
        const dx = n.x - center.x;
        const dz = n.z - center.z;
        const mag = Math.sqrt(dx * dx + dz * dz);
        const dir = { x: dx / mag, z: dz / mag };

        agents.push({
            startNode: nodeIdx,
            pos: { x: n.x, z: n.z },
            dir: dir,
            life: prng.range(5, 10), // How many segments
            segmentLen: 12,
            type: 'avenue'
        });
    }

    // Processing Loop
    const maxIter = 200;
    let iter = 0;

    while (agents.length > 0 && iter < maxIter) {
        iter++;
        const agent = agents.shift();

        if (agent.life <= 0) continue;

        // Turn slightly (Reduced wiggle for straighter avenues)
        const wiggleRange = agent.type === 'avenue' ? 0.1 : 0.25;
        const angle = prng.range(-wiggleRange, wiggleRange);

        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const ndx = agent.dir.x * ca - agent.dir.z * sa;
        const ndz = agent.dir.x * sa + agent.dir.z * ca;
        agent.dir.x = ndx;
        agent.dir.z = ndz;

        // Normalize
        const mag = Math.sqrt(agent.dir.x * agent.dir.x + agent.dir.z * agent.dir.z);
        agent.dir.x /= mag;
        agent.dir.z /= mag;

        // Project new position
        // Longer segments for bigger blocks -> more room for houses
        const segmentLen = agent.type === 'avenue' ? 18 : 14;
        const nextX = agent.pos.x + agent.dir.x * segmentLen;
        const nextZ = agent.pos.z + agent.dir.z * segmentLen;

        // Bounds Check
        if (nextX < -boundsX || nextX > boundsX || nextZ < -boundsZ || nextZ > boundsZ) continue;

        // Add Node (with snapping)
        const nextNodeIdx = addNode(nextX, nextZ);

        // Add Edge
        addEdge(agent.startNode, nextNodeIdx);

        // Setup for next step
        const nextNode = nodes[nextNodeIdx];
        agent.pos.x = nextNode.x;
        agent.pos.z = nextNode.z;
        agent.startNode = nextNodeIdx;
        agent.life--;

        // Decrease cooldown if any (using property on agent)
        if (agent.cooldown > 0) agent.cooldown--;

        // Branching Logic
        // Only branch if we have life, probability, AND no cooldown
        if (agent.life > 1 && prng.random() > 0.6 && (!agent.cooldown || agent.cooldown <= 0)) {
            // Spawn a side street (perpendicular-ish)
            const sideSign = prng.random() > 0.5 ? 1 : -1;
            const sideDirX = -agent.dir.z * sideSign;
            const sideDirZ = agent.dir.x * sideSign;

            agents.push({
                startNode: nextNodeIdx,
                pos: { x: nextNode.x, z: nextNode.z },
                dir: { x: sideDirX, z: sideDirZ },
                life: prng.range(2, 4), // Shorter life for streets
                segmentLen: 14,
                type: 'street',
                cooldown: 0
            });

            // Set cooldown on parent so it doesn't branch again immediately
            agent.cooldown = 2; // Wait 2 segments
        }

        // Re-queue agent
        agents.push(agent);
    }

    return { nodes, edges };
}
