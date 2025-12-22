import * as THREE from 'three';

export class TransformGizmo {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        this.gizmoGroup = new THREE.Group();
        this.gizmoGroup.visible = false;
        this.scene.add(this.gizmoGroup);

        this.attachedObject = null;
        this.isDragging = false;
        this.dragAxis = null;

        this.dragPlane = new THREE.Plane();
        this.dragStartPoint = new THREE.Vector3();
        this.objectStartPos = new THREE.Vector3();

        this.raycaster = new THREE.Raycaster();

        // Callback for when object changes (to update UI)
        this.onChange = () => { };
        this.onDragStart = () => { };
        this.onDragEnd = () => { };

        this.initVisuals();
        this.setupEvents();
    }

    initVisuals() {
        // Common Material Props for Gizmo "Always On Top"
        const matProps = { depthTest: false, depthWrite: false, transparent: true, opacity: 0.8 };

        // X Axis (Red)
        const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 4, 0xff0000, 1, 0.5);
        // ArrowHelper sub-materials need traversal to apply depthTest
        arrowX.line.material.depthTest = false;
        arrowX.cone.material.depthTest = false;
        arrowX.line.material.depthWrite = false;
        arrowX.cone.material.depthWrite = false;
        arrowX.userData = { axis: 'X', isGizmo: true };

        const colliderX = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4), new THREE.MeshBasicMaterial({ visible: false }));
        colliderX.rotation.z = -Math.PI / 2;
        colliderX.position.x = 2;
        colliderX.userData = { axis: 'X', isGizmo: true };
        this.gizmoGroup.add(arrowX, colliderX);

        // Z Axis (Blue)
        const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 4, 0x0000ff, 1, 0.5);
        arrowZ.line.material.depthTest = false;
        arrowZ.cone.material.depthTest = false;
        arrowZ.line.material.depthWrite = false;
        arrowZ.cone.material.depthWrite = false;

        arrowZ.userData = { axis: 'Z', isGizmo: true };
        const colliderZ = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4), new THREE.MeshBasicMaterial({ visible: false }));
        colliderZ.rotation.x = Math.PI / 2;
        colliderZ.position.z = 2;
        colliderZ.userData = { axis: 'Z', isGizmo: true };
        this.gizmoGroup.add(arrowZ, colliderZ);

        // Y Axis (Green) - Rotation
        const ringGeo = new THREE.TorusGeometry(3, 0.1, 16, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, ...matProps });
        const ringY = new THREE.Mesh(ringGeo, ringMat);
        ringY.rotation.x = Math.PI / 2;
        ringY.userData = { axis: 'rotateY', isGizmo: true };
        this.gizmoGroup.add(ringY);

        // Ensure render order is last
        this.gizmoGroup.renderOrder = 999;
    }

    setupEvents() {
        document.addEventListener('pointerup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                if (this.onDragEnd) this.onDragEnd();
            }
        });

        document.addEventListener('pointermove', (event) => {
            this.onPointerMove(event);
        });
    }

    attach(object) {
        this.attachedObject = object;
        if (object) {
            this.gizmoGroup.visible = true;
            this.updatePosition();
        } else {
            this.gizmoGroup.visible = false;
        }
    }

    detach() {
        this.attach(null);
    }

    updatePosition() {
        if (this.attachedObject && this.gizmoGroup.visible) {
            this.gizmoGroup.position.copy(this.attachedObject.position);
        }
    }

    attachToScene(scene) {
        this.scene = scene;
        this.scene.add(this.gizmoGroup);
    }

    // Returns true if the gizmo consumed the click
    onPointerDown(event, raycaster) {
        if (!this.gizmoGroup.visible) return false;

        // Uses passed raycaster which is updated in Input.js
        const intersects = raycaster.intersectObjects(this.gizmoGroup.children, true);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (hit.userData.isGizmo) {
                // Determine mouse
                // We re-calculate mouse for dragStart
                const rect = this.domElement.getBoundingClientRect();
                const mouse = new THREE.Vector2(
                    ((event.clientX - rect.left) / rect.width) * 2 - 1,
                    -((event.clientY - rect.top) / rect.height) * 2 + 1
                );
                this.startDrag(hit.userData.axis, mouse);
                return true;
            }
        }
        return false;
    }

    startDrag(axis, mouse) {
        this.isDragging = true;
        if (this.onDragStart) this.onDragStart();
        this.dragAxis = axis;

        // Define drag plane based on axis
        // For X and Z movement, we use a flat horizontal plane at the object's height
        this.dragPlane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0),
            this.attachedObject.position
        );

        this.raycaster.setFromCamera(mouse, this.camera);
        this.raycaster.ray.intersectPlane(this.dragPlane, this.dragStartPoint);
        this.objectStartPos.copy(this.attachedObject.position);
    }

    onPointerMove(event) {
        if (!this.isDragging || !this.attachedObject) return;

        // Re-calculate mouse normalized coordinates from event
        // (Assuming full screen for simplicity, or we can pass mouse)
        // We need to replicate the mouse calculation logic from main.js or pass it
        // To be safe, let's recalculate based on domElement
        const rect = this.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        this.raycaster.setFromCamera(mouse, this.camera);

        const currentPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, currentPoint)) {
            const diff = currentPoint.clone().sub(this.dragStartPoint);

            if (this.dragAxis === 'X') {
                this.attachedObject.position.x = this.objectStartPos.x + diff.x;
            } else if (this.dragAxis === 'Z') {
                this.attachedObject.position.z = this.objectStartPos.z + diff.z;
            } else if (this.dragAxis === 'rotateY') {
                // Rotation is special, drag distance mapping
                const sensitivity = 0.05;
                this.attachedObject.rotation.y += event.movementX * sensitivity;
            }

            this.updatePosition();
            if (this.onChange) this.onChange();
        }
    }
}
