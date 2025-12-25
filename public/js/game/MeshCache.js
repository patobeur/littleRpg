import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

/**
 * Centralized mesh cache system to prevent loading the same 3D models multiple times
 * Loads each unique mesh once and provides clones for subsequent instances
 */
export class MeshCache {
    constructor() {
        this.cache = new Map(); // path -> loaded mesh
        this.fbxLoader = new FBXLoader();
    }

    /**
     * Load an FBX model, using cache if available
     * @param {string} path - Path to the FBX file
     * @returns {Promise<THREE.Object3D>} The loaded mesh
     */
    async loadFBX(path) {
        // Check if already in cache
        if (this.cache.has(path)) {
            console.log(`[MeshCache] ♻️ Cache HIT: ${path}`);
            return this.cache.get(path);
        }

        console.log(`[MeshCache] 📦 Cache MISS: Loading ${path}`);

        // Load the mesh
        const mesh = await new Promise((resolve, reject) => {
            this.fbxLoader.load(path, resolve, undefined, reject);
        });

        // Store in cache
        this.cache.set(path, mesh);
        console.log(`[MeshCache] ✓ Cached: ${path}`);

        return mesh;
    }

    /**
     * Get a clone of a cached mesh
     * @param {string} path - Path to the FBX file
     * @returns {Promise<THREE.Object3D>} A clone of the cached mesh
     */
    async clone(path) {
        const original = await this.loadFBX(path);
        const cloned = original.clone();

        // Clone materials to avoid conflicts between instances
        cloned.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(mat => mat.clone());
                } else {
                    child.material = child.material.clone();
                }
            }
        });

        return cloned;
    }

    /**
     * Clear the cache
     */
    clear() {
        this.cache.clear();
        console.log('[MeshCache] Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        return {
            cachedMeshes: this.cache.size,
            paths: Array.from(this.cache.keys())
        };
    }
}

// Singleton instance
export const meshCache = new MeshCache();
