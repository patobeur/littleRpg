// Utility functions

export function getClassName(charClass) {
    switch (charClass) {
        case 'Warrior': return 'Guerrier';
        case 'Mage': return 'Mage';
        case 'Healer': return 'Soigneur';
        default: return charClass;
    }
}

// Utility: Animate model opacity over time
export function fadeModel(model, targetOpacity, duration = 1000) {
    const startOpacity = getModelOpacity(model);
    const startTime = Date.now();

    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentOpacity = startOpacity + (targetOpacity - startOpacity) * progress;

        setModelOpacity(model, currentOpacity);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    animate();
}

// Utility: Set model opacity (requires enabling transparency on materials)
export function setModelOpacity(model, opacity) {
    model.traverse((child) => {
        if (child.isMesh && child.material) {
            // Enable transparency if not already enabled
            if (!child.material.transparent) {
                child.material.transparent = true;
                // child.material.needsUpdate = true; // Often needed if changing transparent property
            }
            child.material.opacity = opacity;
        }
    });
}

// Get current model opacity
export function getModelOpacity(model) {
    let opacity = 1;
    model.traverse((child) => {
        if (child.isMesh && child.material) {
            opacity = child.material.opacity || 1;
            return; // Just get the first mesh's opacity
        }
    });
    return opacity;
}
