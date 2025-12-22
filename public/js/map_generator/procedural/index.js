import { PRNG } from './PRNG.js';
import { growRoads } from './Roads.js';
import { placeHouses } from './Structures.js';
import { placeTrees } from './Vegetation.js';

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
