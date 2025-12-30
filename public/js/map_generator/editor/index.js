import { UI } from './UI.js';
import * as THREE from 'three';
import { initThree, onWindowResize, updateEnvironment, updateGrid } from './Scene.js';
import { initEvents } from './Input.js';
import { state } from './State.js';
import { TransformGizmo } from '../tools/Gizmo.js';
import { addStructure, addSpawn, addEnemy, addNature, addNPC, addContainer, deleteSelected, addExit, addDefaultSpawnsAndExits, checkAndAddDefaultSpawnsAndExits, addPointLight } from './Objects.js';
import { refreshMapList, saveMap, loadSelectedMap } from './IO.js';
import { generateOrganicVillage } from '../procedural/index.js';
import { refreshScenarioList, refreshScenarioMapSelect } from './Scenario.js';

function init() {
    initThree();

    // Tools
    state.gizmo = new TransformGizmo(state.scene, state.camera, state.renderer.domElement);
    state.gizmo.attachToScene(state.scene);

    // Gizmo Events (Custom Class)
    state.gizmo.onDragStart = () => {
        state.controls.enabled = false;
    };

    state.gizmo.onDragEnd = () => {
        state.controls.enabled = true;
    };

    state.gizmo.onChange = () => {
        if (state.selectedObject) {
            UI.updateSelection(state.selectedObject);

            // AUTO-UPDATE ROADS
            if (state.selectedObject.userData.type === 'road_joint' || state.selectedObject.userData.type === 'skeleton_node') {
                import('./RoadNetwork.js').then(m => m.RoadNetwork.updateNode(state.selectedObject));
            }
        }
    };

    // Events
    initEvents();

    // Resize Handle
    window.addEventListener('resize', () => {
        onWindowResize();
    });

    // UI Bindings
    UI.initBindings(
        // Callback when Transform inputs change -> update Gizmo
        () => state.gizmo.updatePosition(),
        // Callback when Env inputs change -> update Scene
        (settings) => updateEnvironment(settings)
    );

    // Expose Global API for UI
    window.generateMap = generateMap;
    window.saveMap = saveMap;
    window.addStructure = addStructure;
    window.addSpawn = addSpawn;
    window.addEnemy = addEnemy;
    window.addNature = addNature;
    window.addNPC = addNPC; // Expose NPC function
    window.addContainer = addContainer; // Expose Container function
    window.addExit = addExit;
    window.deleteSelected = deleteSelected;
    window.refreshMapList = refreshMapList;
    window.loadSelectedMap = loadSelectedMap;
    window.checkAndAddDefaultSpawnsAndExits = checkAndAddDefaultSpawnsAndExits;
    window.addPointLight = addPointLight;

    // Make functions available globally for HTML buttons
    window.generateRoadsOnly = generateRoadsOnly;
    window.generateStructuresOnly = generateStructuresOnly;
    window.generateNatureOnly = generateNatureOnly;
    window.clearMap = clearMap;
    window.newMap = newMap;

    animate();

    console.log('Map Generator Initialized (Refactored)');

    // Initial Gen
    newMap(); // Initialize with default UI values (10x10)
    refreshMapList();
    refreshScenarioList();
    refreshScenarioMapSelect();
    refreshStructureList();
    refreshEnemyList();
    refreshNatureList();
    refreshNPCList();
    refreshContainerList();

    // Display values for all sliders
    document.querySelectorAll('input[type=range]').forEach(input => {
        // Create bubble element
        if (input.nextElementSibling && input.nextElementSibling.classList.contains('value-bubble')) return; // Avoid duplicates

        const bubble = document.createElement('span');
        bubble.classList.add('value-bubble');
        bubble.innerText = input.value;
        input.parentNode.appendChild(bubble);

        // Update on change
        input.addEventListener('input', () => {
            bubble.innerText = input.value;
        });

        // Also update if value is set programmatically (mutation observer or manual trigger needed usually, but we'll hook into common updates if needed)
        // For now, listener covers user interaction.
    });

    // Fetch Game Config
    fetch('/api/config/client')
        .then(r => r.json())
        .then(config => {
            window.gameConfig = config;
            console.log('Game Config Loaded:', config);
        })
        .catch(err => console.error('Failed to load game config:', err));
}

// Global cache for structure and enemy metadata
window.structureMetadata = new Map();
window.enemyMetadata = new Map();
window.natureMetadata = new Map();
window.containerMetadata = new Map();

// Load available structures from server
function refreshStructureList() {
    const selector = document.getElementById('structureType');
    if (!selector) return;

    selector.innerHTML = '<option>Loading...</option>';

    fetch('/api/structures')
        .then(r => {
            if (r.status === 401 || r.status === 403) {
                window.location.href = '/login.html';
                throw new Error('Unauthorized');
            }
            return r.json();
        })
        .then(structures => {
            selector.innerHTML = '';
            if (structures.length === 0) {
                selector.innerHTML = '<option value="">No structures found</option>';
                return;
            }
            structures.forEach(struct => {
                // Cache metadata
                window.structureMetadata.set(struct.id, struct);

                const opt = document.createElement('option');
                opt.value = struct.id; // Use ID as value
                // Display name with scale info
                opt.innerText = `${struct.name.charAt(0).toUpperCase() + struct.name.slice(1)} (scale: ${struct.scale})`;
                selector.appendChild(opt);
            });
            console.log(`Loaded ${structures.length} structure types`);
        })
        .catch(err => {
            console.error('Failed to load structures:', err);
            selector.innerHTML = '<option value="house">House</option><option value="rock">Rock</option>';
        });
}

// Load available enemies from server
function refreshEnemyList() {
    const selector = document.getElementById('enemyType');
    if (!selector) return;

    selector.innerHTML = '<option>Loading...</option>';

    fetch('/api/enemies')
        .then(r => r.json())
        .then(enemies => {
            selector.innerHTML = '';
            if (enemies.length === 0) {
                selector.innerHTML = '<option value="">No enemies found</option>';
                return;
            }
            enemies.forEach(enemy => {
                // Cache metadata
                window.enemyMetadata.set(enemy.id, enemy);

                const opt = document.createElement('option');
                opt.value = enemy.id;
                opt.innerText = `${enemy.name} (scale: ${enemy.scale})`;
                selector.appendChild(opt);
            });
            console.log(`Loaded ${enemies.length} enemy types`);
        })
        .catch(err => {
            console.error('Failed to load enemies:', err);
            selector.innerHTML = '<option value="Alistar">Alistar</option>';
        });
}

// Load available natures from server
function refreshNatureList() {
    const selector = document.getElementById('natureType');
    if (!selector) return;

    selector.innerHTML = '<option>Loading...</option>';

    fetch('/api/natures')
        .then(r => r.json())
        .then(natures => {
            selector.innerHTML = '';
            if (natures.length === 0) {
                selector.innerHTML = '<option value="">No natures found</option>';
                return;
            }
            natures.forEach(nature => {
                // Cache metadata
                window.natureMetadata.set(nature.id, nature);

                const opt = document.createElement('option');
                opt.value = nature.id;
                opt.innerText = `${nature.name.charAt(0).toUpperCase() + nature.name.slice(1)} (scale: ${nature.scale})`;
                selector.appendChild(opt);
            });
            console.log(`Loaded ${natures.length} nature types`);
        })
        .catch(err => {
            console.error('Failed to load natures:', err);
            selector.innerHTML = '<option value="tree">Tree</option>';
        });
}

// Load available NPCs from server
function refreshNPCList() {
    const selector = document.getElementById('npcType');
    if (!selector) return;

    selector.innerHTML = '<option>Loading...</option>';

    fetch('/api/npcs')
        .then(r => r.json())
        .then(npcs => {
            selector.innerHTML = '';
            if (npcs.length === 0) {
                selector.innerHTML = '<option value="">No NPCs found</option>';
                return;
            }
            npcs.forEach(npc => {
                const opt = document.createElement('option');
                opt.value = npc.id;
                opt.innerText = npc.name;
                selector.appendChild(opt);
            });
            console.log(`Loaded ${npcs.length} NPC types`);
        })
        .catch(err => {
            console.error('Failed to load NPCs:', err);
            selector.innerHTML = '<option value="Peter">Peter</option>';
        });
}

// Load available containers from server
function refreshContainerList() {
    const selector = document.getElementById('containerType');
    if (!selector) return;

    selector.innerHTML = '<option>Loading...</option>';

    fetch('/api/containers')
        .then(r => r.json())
        .then(containers => {
            selector.innerHTML = '';
            if (containers.length === 0) {
                selector.innerHTML = '<option value="">No containers found</option>';
                return;
            }
            containers.forEach(container => {
                // Cache metadata
                window.containerMetadata.set(container.id, container);

                const opt = document.createElement('option');
                opt.value = container.id;
                opt.innerText = container.name;
                selector.appendChild(opt);
            });
            console.log(`Loaded ${containers.length} container types`);
        })
        .catch(err => {
            console.error('Failed to load containers:', err);
            selector.innerHTML = '<option value="1box_0">1box_0</option>';
        });
}

function animate() {
    requestAnimationFrame(animate);
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
}

// Logic bridging (Generators to Scene)
// Logic bridging (Generators to Scene)
// --- GENERATION HANDLERS ---
import { PRNG } from '../procedural/PRNG.js';
import { generateRoadsData, generateStructuresData, generateNatureData } from '../procedural/index.js';

function clearMap() {
    // Remove all standard allowed objects
    const toRemove = state.objects.filter(o =>
        o.userData.type === 'structure' ||
        o.userData.type === 'nature' ||
        o.userData.type === 'enemy' ||
        o.userData.type === 'road_joint' ||
        o.userData.type === 'road' ||
        o.userData.type === 'skeleton_node' ||
        o.userData.type === 'spawn' ||
        o.userData.type === 'exit' ||
        o.userData.type === 'npc' ||
        o.userData.type === 'container' ||
        o.userData.type === 'light'
    );

    // Also remove roads which are usually not in state.objects directly but in RoadNetwork internal + scene
    // RoadNetwork.clear() should handle this ideally, but for now we rely on re-init.
    // If RoadNetwork has meshes, we need to clear them.
    import('./RoadNetwork.js').then(m => {
        m.RoadNetwork.clear();
        // Force reset graph
        m.RoadNetwork.graph = null;
    });

    toRemove.forEach(o => {
        state.scene.remove(o);
        const idx = state.objects.indexOf(o);
        if (idx > -1) state.objects.splice(idx, 1);
    });

    if (state.skeletonGroup) {
        state.scene.remove(state.skeletonGroup);
        state.skeletonGroup = null;
    }

    state.selectedObject = null;
    state.gizmo.detach();
    addDefaultSpawnsAndExits();
}

function newMap() {
    clearMap();
    const w = parseInt(document.getElementById('genWidth').value) || 10;
    const d = parseInt(document.getElementById('genDepth').value) || 10;
    updateGrid(w, d);
    resetEnvironment();
}

function resetEnvironment() {
    // Reset UI Inputs
    if (document.getElementById('ambInt')) document.getElementById('ambInt').value = 5.0; // Max intensity as requested
    if (document.getElementById('ambColor')) document.getElementById('ambColor').value = '#ffffff';
    if (document.getElementById('sunInt')) document.getElementById('sunInt').value = 1.0;
    if (document.getElementById('sunColor')) document.getElementById('sunColor').value = '#ffffff';
    if (document.getElementById('bgColor')) document.getElementById('bgColor').value = '#111111';
    if (document.getElementById('fogEnabled')) document.getElementById('fogEnabled').checked = false;

    // Apply to Scene
    updateEnvironment({
        ambInt: 5.0, // Max
        ambColor: '#ffffff',
        sunInt: 1.0,
        sunColor: '#ffffff',
        bgColor: '#111111',
        fogEnabled: false
    });
}


function generateRoadsOnly() {
    clearMap();

    const w = parseInt(document.getElementById('genWidth').value) || 10;
    const d = parseInt(document.getElementById('genDepth').value) || 10;
    const bounds = { x: w * 5, z: d * 5 };

    // Update Grid/Ground to match
    updateGrid(w, d);

    const roadWidth = parseFloat(document.getElementById('genRoadWidth').value) || 3.5;
    const roadSmooth = parseInt(document.getElementById('genRoadSmooth').value) || 8;
    const config = { roadWidth, roadSmooth };

    const prng = new PRNG(Date.now());
    const roadsData = generateRoadsData(prng, bounds);

    import('./RoadNetwork.js').then(m => {
        m.RoadNetwork.build(roadsData, config);
    });
}

function generateStructuresOnly() {
    // 1. Clear existing structures
    const toRemove = state.objects.filter(o =>
        o.userData.type === 'structure' ||
        o.userData.type === 'house' ||
        (window.structureMetadata && window.structureMetadata.has(o.userData.type))
    );
    toRemove.forEach(o => {
        state.scene.remove(o);
        state.objects.splice(state.objects.indexOf(o), 1);
    });

    import('./RoadNetwork.js').then(m => {
        if (!m.RoadNetwork.graph) {
            alert("No roads found! Generate roads first.");
            return;
        }

        const houseDensity = parseInt(document.getElementById('genHouseDensity').value) || 50;
        // Formula: 100 density -> 5 spacing, 10 density -> 50 spacing
        // linear interp: density 10 -> 45, density 100 -> 5
        const spacing = Math.max(5, 50 - (houseDensity * 0.45));

        const prng = new PRNG(Date.now());
        const structureTypes = Array.from(window.structureMetadata.values());

        const structuresData = generateStructuresData(prng, m.RoadNetwork.graph, structureTypes, spacing);

        // Build
        structuresData.forEach(s => {
            import('./Objects.js').then(mod => {
                mod.addStructureResult(s.type, s.x, s.z).then(obj => {
                    obj.rotation.y = s.rot;
                });
            });
        });

    });
}

function generateNatureOnly() {
    // 1. Clear existing nature
    const toRemove = state.objects.filter(o => o.userData.type === 'nature');
    toRemove.forEach(o => {
        state.scene.remove(o);
        state.objects.splice(state.objects.indexOf(o), 1);
    });

    import('./RoadNetwork.js').then(m => {
        if (!m.RoadNetwork.graph) {
            alert("No roads found! Generate roads first.");
            return;
        }

        const w = parseInt(document.getElementById('genWidth').value) || 10;
        const d = parseInt(document.getElementById('genDepth').value) || 10;
        const bounds = { x: w * 5, z: d * 5 };

        // Ensure grid matches
        updateGrid(w, d);

        const natureDensity = parseInt(document.getElementById('genNatureDensity').value) || 100;
        // 100 -> 1.0, 200 -> 2.0
        const multiplier = natureDensity / 100.0;

        const prng = new PRNG(Date.now());
        const natureTypes = Array.from(window.natureMetadata.values());

        // We need existing structures for collision avoidance
        // Let's gather them from scene objects
        const existingStructures = state.objects
            .filter(o => o.userData.type === 'structure')
            .map(o => ({ x: o.position.x, z: o.position.z }));

        const natureData = generateNatureData(prng, m.RoadNetwork.graph, existingStructures, bounds, natureTypes, multiplier);

        // Build
        natureData.forEach(t => {
            const type = t.type || 'tree';
            import('./Objects.js').then(mod => mod.addNature(type, t.x, t.z));
        });
    });
}

// Deprecated or keep for legacy "Generate All" if we kept the button?
// We removed the button, so we can remove this or keep as alias.
function generateMap() {
    generateRoadsOnly();
    // Chain with timeouts or promises if we wanted full gen? 
    // But user wants manual control now.
}

async function buildGeneratedMap(data, config) {
    if (data.roads) {
        // Delegate to RoadNetwork manager
        import('./RoadNetwork.js').then(m => m.RoadNetwork.build(data.roads, config));
    }

    if (data.structures) {
        for (let s of data.structures) {
            import('./Objects.js').then(m => {
                m.addStructureResult(s.type, s.x, s.z).then(obj => {
                    obj.rotation.y = s.rot;
                });
            });
        }
    }

    if (data.trees) {
        data.trees.forEach(t => {
            // Use the specific type if available, else 'tree'
            const type = t.type || 'tree';
            import('./Objects.js').then(m => m.addNature(type, t.x, t.z));
        });
    }

    if (data.enemies) {
        data.enemies.forEach(e => {
            import('./Objects.js').then(m => {
                const obj = m.addEnemy(e.type, e.x, e.z);
                // Note: addEnemy returns the group directly (not a promise) 
                // but loading is async. We can set rotation immediately on group container
                if (obj) obj.rotation.y = e.rot;
            });
        });
    }
}

function generateVillage(size) {
    const assets = {
        structureTypes: Array.from(window.structureMetadata.values()),
        natureTypes: Array.from(window.natureMetadata.values()),
        enemyTypes: Array.from(window.enemyMetadata.values())
    };
    const data = generateOrganicVillage(12345, size * 5, assets);
    buildGeneratedMap(data);
}

init();
