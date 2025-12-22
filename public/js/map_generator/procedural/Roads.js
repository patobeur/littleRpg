export function growRoads(prng, center, steps, bounds) {
    const nodes = [];
    const edges = [];
    const SNAP_DIST = 5;

    function addNode(x, z) {
        for (let i = 0; i < nodes.length; i++) {
            const dx = nodes[i].x - x;
            const dz = nodes[i].z - z;
            if (dx * dx + dz * dz < SNAP_DIST * SNAP_DIST) {
                return i;
            }
        }
        nodes.push({ x, z, id: nodes.length });
        return nodes.length - 1;
    }

    const startNode = addNode(center.x, center.z);

    let agents = [{
        pos: { x: center.x, z: center.z },
        dir: { x: prng.range(-1, 1), z: prng.range(-1, 1) },
        nodeIndex: startNode,
        life: steps
    }];

    function normalize(d) {
        const l = Math.sqrt(d.x * d.x + d.z * d.z);
        return l > 0 ? { x: d.x / l, z: d.z / l } : { x: 1, z: 0 };
    }
    agents[0].dir = normalize(agents[0].dir);

    for (let i = 0; i < steps * 2; i++) {
        if (agents.length === 0) break;

        const agentIndex = Math.floor(prng.random() * agents.length);
        const agent = agents[agentIndex];

        const turnAngle = prng.range(-0.5, 0.5);
        const ca = Math.cos(turnAngle);
        const sa = Math.sin(turnAngle);

        let newDir = {
            x: agent.dir.x * ca - agent.dir.z * sa,
            z: agent.dir.x * sa + agent.dir.z * ca
        };
        newDir = normalize(newDir);

        const len = prng.range(15, 30);
        const newPos = {
            x: agent.pos.x + newDir.x * len,
            z: agent.pos.z + newDir.z * len
        };

        if (newPos.x < -bounds || newPos.x > bounds || newPos.z < -bounds || newPos.z > bounds) {
            agent.life = 0;
            agents.splice(agentIndex, 1);
            continue;
        }

        const newNodeIndex = addNode(newPos.x, newPos.z);

        if (newNodeIndex !== agent.nodeIndex) {
            edges.push({ a: agent.nodeIndex, b: newNodeIndex });
        }

        if (prng.random() > 0.8 && agents.length < 5) {
            const branchDir = { x: -newDir.z, z: newDir.x };
            agents.push({
                pos: newPos,
                dir: branchDir,
                nodeIndex: newNodeIndex,
                life: agent.life - 5
            });
        }

        agent.pos = newPos;
        agent.dir = newDir;
        agent.nodeIndex = newNodeIndex;
        agent.life--;

        if (agent.life <= 0) {
            agents.splice(agentIndex, 1);
        }
    }

    return { nodes, edges };
}
