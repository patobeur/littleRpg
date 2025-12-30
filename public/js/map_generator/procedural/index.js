import { PRNG } from './PRNG.js';
import { growRoads } from './Roads.js';
import { placeHouses } from './Structures.js';
import { placeTrees } from './Vegetation.js';
import { placeEnemies } from './Enemies.js';

// Main Wrapper (Legacy support if needed, or master gen)
export function generateOrganicVillage(seed = 12345, size = 100, assets = {}, density = 50) {
    const prng = new PRNG(seed);
    const roads = generateRoadsData(prng, size);

    // Legacy mapping for density to avoid breaking
    const houseSpacing = Math.max(8, 45 - (density * 0.4));
    const treeMultiplier = density / 50;

    const structures = generateStructuresData(prng, roads, assets.structureTypes, houseSpacing);
    const trees = generateNatureData(prng, roads, structures, size, assets.natureTypes, treeMultiplier);

    return { roads, structures, trees };
}

// --- Granular Exporters ---

export function generateRoadsData(prng, size) {
    // size can be {x, z} now
    // 1. Roads
    return growRoads(prng, { x: 0, z: 0 }, 40, size);
}

export function generateStructuresData(prng, graph, structureTypes, spacing) {
    if (!graph) return [];

    // Filter structures here or pass filtered?
    // Let's filter here for safety if raw list passed
    const houseTypes = structureTypes ? structureTypes.filter(s => {
        const id = s.id.toLowerCase();
        return !id.includes('castle') && !id.includes('tower');
    }) : [];

    return placeHouses(prng, graph, houseTypes, spacing);
}

export function generateNatureData(prng, graph, structures, size, natureTypes, densityMultiplier) {
    // size can be {x, z}
    if (!graph) return [];
    return placeTrees(prng, graph, structures, size, natureTypes, 12, densityMultiplier);
}
