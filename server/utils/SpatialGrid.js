/**
 * Spatial Grid - Area of Interest (AOI) System
 * Efficiently track entities in 2D space for distance-based filtering
 */

class SpatialGrid {
    constructor(mapWidth, mapHeight, cellSize = 25) {
        this.width = mapWidth;
        this.height = mapHeight;
        this.cellSize = cellSize;

        // Calculate grid dimensions
        this.cols = Math.ceil(mapWidth / cellSize);
        this.rows = Math.ceil(mapHeight / cellSize);

        // Grid storage: Map<cellKey, Set<entityId>>
        this.grid = new Map();

        // Entity tracking: Map<entityId, { x, z, cellKey }>
        this.entities = new Map();

        console.log(`[SpatialGrid] Created ${this.cols}x${this.rows} grid (${this.cols * this.rows} cells, ${cellSize}m cells)`);
    }

    /**
     * Get cell key from position
     */
    getCellKey(x, z) {
        // Offset to handle negative coordinates
        const offsetX = x + this.width / 2;
        const offsetZ = z + this.height / 2;

        const col = Math.floor(offsetX / this.cellSize);
        const row = Math.floor(offsetZ / this.cellSize);

        // Clamp to grid bounds
        const clampedCol = Math.max(0, Math.min(this.cols - 1, col));
        const clampedRow = Math.max(0, Math.min(this.rows - 1, row));

        return `${clampedCol},${clampedRow}`;
    }

    /**
     * Parse cell key back to col/row
     */
    parseCellKey(cellKey) {
        const [col, row] = cellKey.split(',').map(Number);
        return { col, row };
    }

    /**
     * Add or update entity position
     */
    updateEntity(entityId, x, z) {
        const newCellKey = this.getCellKey(x, z);
        const existing = this.entities.get(entityId);

        // If entity exists and hasn't moved cells, no update needed
        if (existing && existing.cellKey === newCellKey) {
            existing.x = x;
            existing.z = z;
            return;
        }

        // Remove from old cell if exists
        if (existing) {
            const oldCell = this.grid.get(existing.cellKey);
            if (oldCell) {
                oldCell.delete(entityId);
                if (oldCell.size === 0) {
                    this.grid.delete(existing.cellKey);
                }
            }
        }

        // Add to new cell
        if (!this.grid.has(newCellKey)) {
            this.grid.set(newCellKey, new Set());
        }
        this.grid.get(newCellKey).add(entityId);

        // Update entity tracking
        this.entities.set(entityId, { x, z, cellKey: newCellKey });
    }

    /**
     * Remove entity from grid
     */
    removeEntity(entityId) {
        const existing = this.entities.get(entityId);
        if (!existing) return;

        const cell = this.grid.get(existing.cellKey);
        if (cell) {
            cell.delete(entityId);
            if (cell.size === 0) {
                this.grid.delete(existing.cellKey);
            }
        }

        this.entities.delete(entityId);
    }

    /**
     * Get all entities within radius of a position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @param {number} radius - Search radius
     * @returns {Array} Array of entity IDs within radius
     */
    getEntitiesInRadius(x, z, radius) {
        const result = [];
        const centerCell = this.parseCellKey(this.getCellKey(x, z));

        // Calculate how many cells to check based on radius
        const cellsToCheck = Math.ceil(radius / this.cellSize);

        // Check surrounding cells
        for (let dRow = -cellsToCheck; dRow <= cellsToCheck; dRow++) {
            for (let dCol = -cellsToCheck; dCol <= cellsToCheck; dCol++) {
                const checkRow = centerCell.row + dRow;
                const checkCol = centerCell.col + dCol;

                // Skip out of bounds cells
                if (checkRow < 0 || checkRow >= this.rows || checkCol < 0 || checkCol >= this.cols) {
                    continue;
                }

                const cellKey = `${checkCol},${checkRow}`;
                const cell = this.grid.get(cellKey);

                if (cell) {
                    // Check each entity in cell for actual distance
                    cell.forEach(entityId => {
                        const entity = this.entities.get(entityId);
                        if (entity) {
                            const dist = Math.hypot(entity.x - x, entity.z - z);
                            if (dist <= radius) {
                                result.push(entityId);
                            }
                        }
                    });
                }
            }
        }

        return result;
    }

    /**
     * Get entity position
     */
    getEntityPosition(entityId) {
        return this.entities.get(entityId);
    }

    /**
     * Get all entities in grid
     */
    getAllEntities() {
        return Array.from(this.entities.keys());
    }

    /**
     * Clear entire grid
     */
    clear() {
        this.grid.clear();
        this.entities.clear();
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalCells: this.cols * this.rows,
            occupiedCells: this.grid.size,
            totalEntities: this.entities.size,
            avgEntitiesPerCell: this.entities.size / Math.max(1, this.grid.size)
        };
    }
}

module.exports = SpatialGrid;
