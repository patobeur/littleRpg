import { state } from './State.js';

let currentScenario = {
    id: null,
    name: "New Scenario",
    maps: [],
    active: true
};

export function refreshScenarioList() {
    const selector = document.getElementById('scenarioList');
    if (!selector) return;

    selector.innerHTML = '<option>Loading...</option>';

    // Load all scenarios (including inactive) for map generator
    fetch('/api/scenarios?showAll=true')
        .then(r => r.json())
        .then(files => {
            selector.innerHTML = '';
            // Add "New" option or just list
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.innerText = "-- Select Scenario --";
            selector.appendChild(defaultOpt);

            files.forEach(sc => {
                const opt = document.createElement('option');
                opt.value = sc.id;
                opt.innerText = sc.name;
                selector.appendChild(opt);
            });
        })
        .catch(err => {
            console.error(err);
            selector.innerHTML = '<option>Error</option>';
        });
}

export function loadSelectedScenario() {
    const id = document.getElementById('scenarioList').value;
    if (!id) return;

    fetch(`/api/scenarios/${id}`)
        .then(r => r.json())
        .then(data => {
            currentScenario = data;
            updateScenarioUI();

            // Should we clear the scene? Yes, user said "empty scene when nothing loaded"
            // But here we loaded a scenario. Does it load a map? 
            // Probably not automatically, or maybe the first one?
            // For now, let's clear scene to indicate context switch or just keep it.
            // User: "pense a vidé la scene quand rien n'est chargé".
            // Maybe clear scene when switching to Scenario tab?
        });
}

export function createNewScenario() {
    currentScenario = {
        id: `scenario_${Date.now()}`,
        name: "New Scenario",
        maps: [],
        active: true
    };
    updateScenarioUI();
}

export function saveScenario() {
    const nameInput = document.getElementById('scenarioName');
    if (nameInput) currentScenario.name = nameInput.value;

    // Get active status from checkbox
    const activeCheckbox = document.getElementById('scenarioActive');
    if (activeCheckbox) currentScenario.active = activeCheckbox.checked;

    // Ensure ID exists
    if (!currentScenario.id) currentScenario.id = `scenario_${Date.now()}`;

    fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentScenario)
    })
        .then(r => r.json())
        .then(res => {
            alert(res.message);
            refreshScenarioList();
        })
        .catch(err => alert('Error saving scenario'));
}

export function addCurrentMapToScenario() {
    // Get current map name from input
    // But map might not be saved?
    // We should pick from map list or assume current loaded file.
    // Let's use the map list selector value or mapName input.
    // mapName input is just a string, might not match file.
    // Better to use the Map Selection dropdown in the File tab?
    // Or just a specific dropdown in Scenario tab?

    // Changing approach: Use a dropdown in Scenario tab to pick map to add.
    const mapToAdd = document.getElementById('scenarioMapSelect').value;
    if (mapToAdd) {
        currentScenario.maps.push(mapToAdd);
        updateScenarioUI();
    }
}

export function removeMapFromScenario(index) {
    currentScenario.maps.splice(index, 1);
    updateScenarioUI();
}

export function moveMapInScenario(index, direction) {
    if (index + direction < 0 || index + direction >= currentScenario.maps.length) return;

    const temp = currentScenario.maps[index];
    currentScenario.maps[index] = currentScenario.maps[index + direction];
    currentScenario.maps[index + direction] = temp;
    updateScenarioUI();
}

function updateScenarioUI() {
    document.getElementById('scenarioName').value = currentScenario.name;

    // Update active checkbox
    const activeCheckbox = document.getElementById('scenarioActive');
    if (activeCheckbox) {
        activeCheckbox.checked = currentScenario.active !== false; // Default to true if undefined
    }

    const list = document.getElementById('scenarioMapList');
    list.innerHTML = '';

    currentScenario.maps.forEach((mapId, index) => {
        const div = document.createElement('div');
        div.className = 'scenario-map-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '5px';
        div.style.marginBottom = '2px';

        div.innerHTML = `
            <span style="flex-grow:1; font-size:0.9rem;">${index + 1}. ${mapId}</span>
            <button onclick="Scenario.moveMapInScenario(${index}, -1)" class="tiny-btn"><i class="fas fa-arrow-up"></i></button>
            <button onclick="Scenario.moveMapInScenario(${index}, 1)" class="tiny-btn"><i class="fas fa-arrow-down"></i></button>
            <button onclick="Scenario.removeMapFromScenario(${index})" class="tiny-btn" style="color:#ff4444;"><i class="fas fa-times"></i></button>
        `;
        list.appendChild(div);
    });
}

// Populate map select for scenario
export function refreshScenarioMapSelect() {
    const selector = document.getElementById('scenarioMapSelect');
    if (!selector) return;

    fetch('/api/maps')
        .then(r => r.json())
        .then(files => {
            selector.innerHTML = '';
            files.forEach(file => {
                const name = file.replace('.json', '');
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                selector.appendChild(opt);
            });
        });
}

// Expose to window for UI
window.Scenario = {
    refreshScenarioList,
    loadSelectedScenario,
    createNewScenario,
    saveScenario,
    addCurrentMapToScenario,
    removeMapFromScenario,
    moveMapInScenario,
    refreshScenarioMapSelect
};
