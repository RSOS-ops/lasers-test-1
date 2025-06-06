// Import necessary Three.js modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Clock for animation timing
const clock = new THREE.Clock();

// Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const directionalLightTarget = new THREE.Object3D();
directionalLightTarget.position.set(0, 0, 0);
scene.add(directionalLightTarget);
directionalLight.target = directionalLightTarget;

// Optional: Add a helper to visualize the DirectionalLight.
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 2); // Using a size of 2 for the helper
scene.add(directionalLightHelper);

const spotLightDown = new THREE.SpotLight(0xffffff, 100);
spotLightDown.distance = 3;
spotLightDown.angle = Math.PI / 8; // Adjusted for potentially different model size
spotLightDown.penumbra = 0.5;
spotLightDown.decay = 2;

const spotLightFace = new THREE.SpotLight();
spotLightFace.color.set(0xffffff);
spotLightFace.intensity = 27;
spotLightFace.distance = 0.5;
spotLightFace.angle = Math.PI / 8;
spotLightFace.penumbra = 0.5;
spotLightFace.decay = 0.5;

// Model Setup & Loading
let model;

// Laser Global Variables
let laserLine;
const laserOrigin = new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
const initialLaserDirection = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), laserOrigin).normalize();

// Second Laser Global Variables
let laserLine2;
const laserOrigin2 = new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
const initialLaserDirection2 = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), laserOrigin2).normalize();
const laserMaterial2 = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red laser for the second laser

// Third Laser Global Variables
let laserLine3;
const laserOrigin3 = new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
const initialLaserDirection3 = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), laserOrigin3).normalize();
const laserMaterial3 = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red laser for the third laser

// Fourth Laser Global Variables
let laserLine4;
const laserOrigin4 = new THREE.Vector3(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
const initialLaserDirection4 = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), laserOrigin4).normalize();
const laserMaterial4 = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red laser for the fourth laser

const interactiveObjects = []; // To store objects the laser can hit
const MAX_LASER_LENGTH = 20; // Max length if no hit
const MAX_BOUNCES = 3; // Max number of laser bounces

// Model Rotation Controls State
let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};
const modelRotationSpeed = 0.005;

function adjustCameraForModel() {
    if (!model) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center); // Get the actual center of the model

    // Reposition model to origin
    model.position.sub(center);
    scene.add(model); // Add model to scene *after* repositioning

    if (size.x === 0 && size.y === 0 && size.z === 0) return;

    const modelHeight = size.y;
    const fovInRadians = THREE.MathUtils.degToRad(camera.fov);
    let cameraZ = (modelHeight / 2) / Math.tan(fovInRadians / 2);
    cameraZ *= 2; // Original adjustment for 50% canvas height
    cameraZ *= 2; // Double the distance again, making the model appear half as tall.
    camera.position.set(0, 0, cameraZ);

    // Update controls target to look at the model's new origin (0,0,0)
    controls.target.set(0, 0, 0);
    controls.update();
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}

const gltfLoader = new GLTFLoader();
const modelUrl = 'https://raw.githubusercontent.com/RSOS-ops/lasers-test-1/feat/add-second-red-laser/HoodedCory_NewHood_Darker.DecimatedFace.glb';

// Laser Line Setup
const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red laser
const points = [];
points.push(laserOrigin.clone());
points.push(laserOrigin.clone().add(initialLaserDirection.clone().multiplyScalar(MAX_LASER_LENGTH))); // Initial straight line
const laserGeometry = new THREE.BufferGeometry().setFromPoints(points);
laserLine = new THREE.Line(laserGeometry, laserMaterial);
scene.add(laserLine);

// Second Laser Line Setup
const points2 = [];
points2.push(laserOrigin2.clone());
points2.push(laserOrigin2.clone().add(initialLaserDirection2.clone().multiplyScalar(MAX_LASER_LENGTH)));
const laserGeometry2 = new THREE.BufferGeometry().setFromPoints(points2);
laserLine2 = new THREE.Line(laserGeometry2, laserMaterial2);
scene.add(laserLine2);

// Third Laser Line Setup
const points3 = [];
points3.push(laserOrigin3.clone());
points3.push(laserOrigin3.clone().add(initialLaserDirection3.clone().multiplyScalar(MAX_LASER_LENGTH)));
const laserGeometry3 = new THREE.BufferGeometry().setFromPoints(points3);
laserLine3 = new THREE.Line(laserGeometry3, laserMaterial3);
scene.add(laserLine3);

// Fourth Laser Line Setup
const points4 = [];
points4.push(laserOrigin4.clone());
points4.push(laserOrigin4.clone().add(initialLaserDirection4.clone().multiplyScalar(MAX_LASER_LENGTH)));
const laserGeometry4 = new THREE.BufferGeometry().setFromPoints(points4);
laserLine4 = new THREE.Line(laserGeometry4, laserMaterial4);
scene.add(laserLine4);

gltfLoader.load(
    modelUrl,
    (gltf) => {
        model = gltf.scene;

        // Configure and attach the SpotLight to the model
        const spotLightDownTargetObject = new THREE.Object3D();
        model.add(spotLightDownTargetObject);
        spotLightDownTargetObject.position.set(0, 0, 0);

        spotLightDown.target = spotLightDownTargetObject;
        model.add(spotLightDown);

        // Optional: Add a helper to visualize the original SpotLight.
        const spotLightDownHelper = new THREE.SpotLightHelper(spotLightDown);
        scene.add(spotLightDownHelper);

        // Configure and attach the New SpotLight to the model
        const spotLightFaceTargetObject = new THREE.Object3D();
        model.add(spotLightFaceTargetObject); // Add target as a child of the model.
        spotLightFaceTargetObject.position.set(0, 0.13, 0.1); // Target position relative to the model.

        spotLightFace.target = spotLightFaceTargetObject; // Aim the new spotlight at this target.
        model.add(spotLightFace); // Add the new spotlight itself as a child of the model.
        // Position the new spotlight relative to the model's local coordinates.
        spotLightFace.position.set(0, -0.25, 0.2);

        // Optional: Add a helper to visualize the New SpotLight.
        const spotLightFaceHelper = new THREE.SpotLightHelper(spotLightFace);
        scene.add(spotLightFaceHelper);

        interactiveObjects.push(model); // Add model for laser interaction

        adjustCameraForModel(); // Call this after model is processed
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('An error occurred loading the GLB model:', error);
    }
);

// Laser Update Function
function updateLaser() {
    const raycaster = new THREE.Raycaster();
    const points = [];

    let currentOrigin = laserOrigin.clone();
    let currentDirection = initialLaserDirection.clone();

    points.push(currentOrigin.clone());

    for (let i = 0; i < MAX_BOUNCES; i++) {
        raycaster.set(currentOrigin, currentDirection);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const impactPoint = intersection.point;
            points.push(impactPoint.clone());

            const surfaceNormal = intersection.face.normal.clone();
            const worldNormal = new THREE.Vector3();
            worldNormal.copy(surfaceNormal).transformDirection(intersection.object.matrixWorld);

            if (currentDirection.dot(worldNormal) > 0) {
                worldNormal.negate();
            }

            currentDirection.reflect(worldNormal);
            currentOrigin.copy(impactPoint).add(currentDirection.clone().multiplyScalar(0.001)); // Offset for next ray

            if (i === MAX_BOUNCES - 1) { // If it's the last bounce, draw the final segment
                points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
            }
        } else {
            points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
            break;
        }
    }

    laserLine.geometry.setFromPoints(points);
    laserLine.geometry.attributes.position.needsUpdate = true;
}

// Laser Update Function for the second laser
function updateLaser2() {
    const raycaster = new THREE.Raycaster();
    const points = [];

    let currentOrigin = laserOrigin2.clone();
    let currentDirection = initialLaserDirection2.clone();

    points.push(currentOrigin.clone());

    for (let i = 0; i < MAX_BOUNCES; i++) {
        raycaster.set(currentOrigin, currentDirection);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const impactPoint = intersection.point;
            points.push(impactPoint.clone());

            const surfaceNormal = intersection.face.normal.clone();
            const worldNormal = new THREE.Vector3();
            worldNormal.copy(surfaceNormal).transformDirection(intersection.object.matrixWorld);

            if (currentDirection.dot(worldNormal) > 0) {
                worldNormal.negate();
            }

            currentDirection.reflect(worldNormal);
            currentOrigin.copy(impactPoint).add(currentDirection.clone().multiplyScalar(0.001)); // Offset for next ray

            if (i === MAX_BOUNCES - 1) { // If it's the last bounce, draw the final segment
                points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
            }
        } else {
            points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
            break;
        }
    }

    laserLine2.geometry.setFromPoints(points);
    laserLine2.geometry.attributes.position.needsUpdate = true;
}

// Laser Update Function for the third laser
function updateLaser3() {
    const raycaster = new THREE.Raycaster();
    const points = [];

    let currentOrigin = laserOrigin3.clone();
    let currentDirection = initialLaserDirection3.clone();

    points.push(currentOrigin.clone());

    for (let i = 0; i < MAX_BOUNCES; i++) {
        raycaster.set(currentOrigin, currentDirection);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const impactPoint = intersection.point;
            points.push(impactPoint.clone());

            const surfaceNormal = intersection.face.normal.clone();
            const worldNormal = new THREE.Vector3();
            worldNormal.copy(surfaceNormal).transformDirection(intersection.object.matrixWorld);

            if (currentDirection.dot(worldNormal) > 0) {
                worldNormal.negate();
            }

            currentDirection.reflect(worldNormal);
            currentOrigin.copy(impactPoint).add(currentDirection.clone().multiplyScalar(0.001)); // Offset for next ray

            if (i === MAX_BOUNCES - 1) { // If it's the last bounce, draw the final segment
                points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
            }
        } else {
            points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
            break;
        }
    }

    laserLine3.geometry.setFromPoints(points);
    laserLine3.geometry.attributes.position.needsUpdate = true;
}

// Laser Update Function for the fourth laser
function updateLaser4() {
    const raycaster = new THREE.Raycaster();
    const points = [];

    let currentOrigin = laserOrigin4.clone();
    let currentDirection = initialLaserDirection4.clone();

    points.push(currentOrigin.clone());

    for (let i = 0; i < MAX_BOUNCES; i++) {
        raycaster.set(currentOrigin, currentDirection);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (intersects.length > 0) {
            const intersection = intersects[0];
            const impactPoint = intersection.point;
            points.push(impactPoint.clone());

            const surfaceNormal = intersection.face.normal.clone();
            const worldNormal = new THREE.Vector3();
            worldNormal.copy(surfaceNormal).transformDirection(intersection.object.matrixWorld);

            if (currentDirection.dot(worldNormal) > 0) {
                worldNormal.negate();
            }

            currentDirection.reflect(worldNormal);
            currentOrigin.copy(impactPoint).add(currentDirection.clone().multiplyScalar(0.001)); // Offset for next ray

            if (i === MAX_BOUNCES - 1) { // If it's the last bounce, draw the final segment
                points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
            }
        } else {
            points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
            break;
        }
    }

    laserLine4.geometry.setFromPoints(points);
    laserLine4.geometry.attributes.position.needsUpdate = true;
}

const rotationSpeed = (2 * Math.PI) / 12; // Radians per second

// Animation Loop
function animate() {
    const deltaTime = clock.getDelta(); // Get time elapsed since last frame
    requestAnimationFrame(animate);

    if (model) { // Check if the model is loaded
    }

    updateLaser(); // Call the new laser update function
    updateLaser2(); // Call the second laser update function
    updateLaser3(); // Call the third laser update function
    updateLaser4(); // Call the fourth laser update function

    renderer.render(scene, camera);
}
animate();

// Event Listeners
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (model) {
        adjustCameraForModel();
    } else {
        camera.updateProjectionMatrix();
    }
});

renderer.domElement.addEventListener('mousedown', (event) => {
    isDragging = true;
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
});

renderer.domElement.addEventListener('mousemove', (event) => {
    if (isDragging && model) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        // Rotation around the world Y axis based on horizontal mouse movement
        const deltaQuaternionY = new THREE.Quaternion();
        // Axis is (0,1,0) for Y; angle is deltaX scaled by rotationSpeed
        deltaQuaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * modelRotationSpeed);

        // Rotation around the world X axis based on vertical mouse movement
        const deltaQuaternionX = new THREE.Quaternion();
        // Axis is (1,0,0) for X; angle is deltaY scaled by rotationSpeed
        deltaQuaternionX.setFromAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * modelRotationSpeed);

        // Apply the rotations to the model's quaternion.
        // Pre-multiply applies the rotation relative to the world coordinate system.
        // The order of Y then X is a common choice, but can be swapped to change the feel.
        model.quaternion.premultiply(deltaQuaternionY);
        model.quaternion.premultiply(deltaQuaternionX);

        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
    }
});

renderer.domElement.addEventListener('mouseup', () => {
    isDragging = false;
});

renderer.domElement.addEventListener('mouseout', () => {
    isDragging = false;
});
