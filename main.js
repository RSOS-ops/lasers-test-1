// Import necessary Three.js modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

// Controls Setup
let controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

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

const spotLight = new THREE.SpotLight(0xffffff, 100);
spotLight.distance = 3;
spotLight.angle = Math.PI / 8; // Adjusted for potentially different model size
spotLight.penumbra = 0.5;
spotLight.decay = 2;

// Model Setup & Loading
let model;

// Laser Global Variables
// let laserLine; // Commented out for multiple lasers
// const laserOrigin = new THREE.Vector3(-10, 1, 0); // Commented out for multiple lasers
// const initialLaserDirection = new THREE.Vector3(1, 0, 0).normalize(); // Commented out for multiple lasers

const interactiveObjects = []; // To store objects the laser can hit - Shared by all lasers
const MAX_LASER_LENGTH = 20; // Max length if no hit - Shared
const MAX_BOUNCES = 3; // Max number of laser bounces - Shared

const laserConfigs = [];
const LASER_COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]; // Red, Green, Blue, Yellow

// Function to get world coordinates for a screen corner
function getScreenCornerInWorld(screenX, screenY, camera) {
    // screenX, screenY are -1 to 1. Z=-1 is near plane in NDC.
    const vec = new THREE.Vector3(screenX, screenY, -1.0);
    vec.unproject(camera);
    return vec;
}

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
    cameraZ *= 2; // Further adjustment to make it 50% smaller than current
    camera.position.set(0, 0, cameraZ);

    // Update controls target to look at the model's new origin (0,0,0)
    controls.target.set(0, 0, 0);
    controls.update();
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
}

const gltfLoader = new GLTFLoader();
const modelUrl = 'https://raw.githubusercontent.com/RSOS-ops/lasers-test-1/main/cube-beveled-silver.glb';

// Screen Corner Coordinates for Laser Origins
const SCREEN_CORNERS = [
    { x: -1, y: 1 },  // Top-left
    { x: 1, y: 1 },   // Top-right
    { x: -1, y: -1 }, // Bottom-left
    { x: 1, y: -1 }   // Bottom-right
];

// Initialize Lasers
// This needs to run after the camera is set up.
// Define target for lasers (e.g., center of the scene)
const laserTargetPosition = new THREE.Vector3(0, 0, 0);

SCREEN_CORNERS.forEach((corner, index) => {
    const laserOriginPoint = getScreenCornerInWorld(corner.x, corner.y, camera);

    const laserDirectionVector = new THREE.Vector3();
    laserDirectionVector.subVectors(laserTargetPosition, laserOriginPoint).normalize();

    const laserColor = LASER_COLORS[index % LASER_COLORS.length]; // Cycle through colors
    const laserMaterial = new THREE.LineBasicMaterial({ color: laserColor });

    const initialPoints = [];
    initialPoints.push(laserOriginPoint.clone());
    initialPoints.push(laserOriginPoint.clone().add(laserDirectionVector.clone().multiplyScalar(MAX_LASER_LENGTH)));

    const laserGeometry = new THREE.BufferGeometry().setFromPoints(initialPoints);
    const line = new THREE.Line(laserGeometry, laserMaterial);
    scene.add(line);

    laserConfigs.push({
        line: line,
        origin: laserOriginPoint,       // Initial origin
        direction: laserDirectionVector, // Initial direction
        color: laserColor
        // currentOrigin and currentDirection will be managed per frame in updateLaser
    });
});

gltfLoader.load(
    modelUrl,
    (gltf) => {
        model = gltf.scene;

        // Configure and attach the SpotLight to the model
        const spotLightTargetObject = new THREE.Object3D();
        model.add(spotLightTargetObject);
        spotLightTargetObject.position.set(0, 0, 0);

        spotLight.target = spotLightTargetObject;
        model.add(spotLight);

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
function updateLasers() {    // New function
    const raycaster = new THREE.Raycaster(); // Can still be one raycaster reused

    let targetPosition;
    if (model && model.position) { // Check if model is loaded and has a position
        targetPosition = model.position.clone();
    } else {
        targetPosition = new THREE.Vector3(0, 0, 0); // Default target if model not ready
    }

    laserConfigs.forEach(config => {
        // Dynamically update the laser's primary direction for this frame
        config.direction.subVectors(targetPosition, config.origin).normalize();

        const points = [];

        // currentOrigin will be the static config.origin for the start of the beam
        let currentOrigin = config.origin.clone();
        // currentDirection will be the newly calculated config.direction for the first segment
        let currentDirection = config.direction.clone();

        points.push(currentOrigin.clone());

        for (let i = 0; i < MAX_BOUNCES; i++) {
            raycaster.set(currentOrigin, currentDirection);

            if (interactiveObjects.length === 0) {
                 if (i === 0) points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
                break;
            }
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
                currentOrigin.copy(impactPoint).add(currentDirection.clone().multiplyScalar(0.001));

                if (i === MAX_BOUNCES - 1) {
                    points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
                }
            } else {
                points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
                break;
            }
        }

        config.line.geometry.setFromPoints(points);
        config.line.geometry.attributes.position.needsUpdate = true;
    });
}

const rotationSpeed = (2 * Math.PI) / 12; // Radians per second

// Animation Loop
function animate() {
    const deltaTime = clock.getDelta(); // Get time elapsed since last frame
    requestAnimationFrame(animate);

    if (controls.enableDamping) {
        controls.update();
    }

    if (model) { // Check if the model is loaded
        model.rotation.x += rotationSpeed * deltaTime;
        model.rotation.y += rotationSpeed * deltaTime;
    }

    updateLasers(); // New call

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
