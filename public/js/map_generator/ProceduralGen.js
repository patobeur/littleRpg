import * as THREE from 'three';

// ------------------------------------------------------------------
// Utils: PRNG (Mulberry32)
// ------------------------------------------------------------------
class PRNG {
    constructor(seed) {
        this.seed = seed;
    }

    // Returns a number between 0 and 1
    random() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // Range [min, max)
    range(min, max) {
        return min + this.random() * (max - min);
    }
}

// ------------------------------------------------------------------
// 1. Road Generation (Agent Based)
// ------------------------------------------------------------------
function growRoads(prng, center, steps, bounds) {
    const nodes = []; // { x, z, id }
    const edges = []; // { a: nodeIndex, b: nodeIndex }
    const SNAP_DIST = 5;

    function addNode(x, z) {
        for (let i = 0; i < nodes.length; i++) {
            const dx = nodes[i].x - x;
            const dz = nodes[i].z - z;
            if (dx * dx + dz * dz < SNAP_DIST * SNAP_DIST) {
                return i; // Snap to existing
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

// ------------------------------------------------------------------
// 2. House Placement
// ------------------------------------------------------------------
function placeHouses(prng, graph) {
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
                const angle = Math.atan2(dir.x, dir.z); // align to road

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

// ------------------------------------------------------------------
// 3. Tree Placement (Poisson Disk Sampling)
// ------------------------------------------------------------------
function placeTrees(prng, graph, structures, bounds, radius = 5, k = 15) {
    const trees = [];
    const active = [];
    // Increase cell size or safety checks
    const cellSize = radius / Math.sqrt(2);
    // Ensure grid size is reasonable
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

        // Tree Neighbors
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

        // Roads
        for (let edge of graph.edges) {
            const nA = graph.nodes[edge.a];
            const nB = graph.nodes[edge.b];
            const l2 = (nA.x - nB.x) ** 2 + (nA.z - nB.z) ** 2;
            if (l2 === 0) continue;
            let t = ((x - nA.x) * (nB.x - nA.x) + (z - nA.z) * (nB.z - nA.z)) / l2;
            t = Math.max(0, Math.min(1, t));
            const distSq = (x - (nA.x + t * (nB.x - nA.x))) ** 2 + (z - (nA.z + t * (nB.z - nA.z))) ** 2;
            if (distSq < 36) return false; // Road clearance
        }

        // Structures
        for (let s of structures) {
            if ((s.x - x) ** 2 + (s.z - z) ** 2 < 49) return false; // House clearance
        }

        return true;
    }

    // Attempt start
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

// ------------------------------------------------------------------
// Main Entry
// ------------------------------------------------------------------
export function generateOrganicVillage(seed = 12345, size = 100) {
    const prng = new PRNG(seed);

    // 1. Roads
    const graph = growRoads(prng, { x: 0, z: 0 }, 40, size);

    // 2. Houses
    const structures = placeHouses(prng, graph);

    // 3. Trees
    const trees = placeTrees(prng, graph, structures, size, 12, 12);

    return {
        roads: graph,
        structures: structures,
        trees: trees
    };
}
