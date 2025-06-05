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
const MAX_BOUNCES = 3; // Reverted from 1
const FAR_AWAY_DISTANCE = 1000; // For extending final laser segments

const laserConfigs = [];
const LASER_COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff]; // Red, Green, Blue, Purple (Magenta)

// Removed getScreenCornerInWorld function

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

// Removed SCREEN_CORNERS constant

gltfLoader.load(
    modelUrl,
    (gltf) => {
        model = gltf.scene;

        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // If material is an array (MultiMaterial)
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.side = THREE.DoubleSide;
                        mat.needsUpdate = true;
                    });
                } else { // Single material
                    child.material.side = THREE.DoubleSide;
                    child.material.needsUpdate = true;
                }
            }
        });

        // Configure and attach the SpotLight to the model
        const spotLightTargetObject = new THREE.Object3D();
        model.add(spotLightTargetObject);
        spotLightTargetObject.position.set(0, 0, 0);

        spotLight.target = spotLightTargetObject;
        model.add(spotLight);

        // Model centering and scene addition (assuming this was already here or intended)
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        scene.add(model); // Ensure model is added to scene after potential repositioning

        interactiveObjects.push(model); // Add model for laser interaction
        // console.log('Model added to interactiveObjects:', model); // Removed
        // console.log('Model children:', model.children); // Removed

        adjustCameraForModel(); // Camera is now set relative to the model

        // >>> START OF MODIFIED LASER INITIALIZATION BLOCK <<<
        console.log("Starting laser initialization (camera-based origins)...");

        // Loop 4 times (or based on LASER_COLORS.length)
        for (let i = 0; i < LASER_COLORS.length; i++) {
            const laserColor = LASER_COLORS[i];
            const laserMaterial = new THREE.LineBasicMaterial({ color: laserColor });

            // Placeholder geometry - will be updated in the first frame
            const initialPoints = [new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,1)];
            const laserGeometry = new THREE.BufferGeometry().setFromPoints(initialPoints);
            const line = new THREE.Line(laserGeometry, laserMaterial);
            scene.add(line);

            laserConfigs.push({
                line: line,
                origin: new THREE.Vector3(), // Placeholder, will be updated each frame
                direction: new THREE.Vector3(), // Placeholder, will be updated each frame
                color: laserColor
            });
            // console.log(`Laser ${i} structure initialized.`); // Optional: can be kept or removed
        }
        console.log("Laser structures initialization complete. Total lasers:", laserConfigs.length);
        // >>> END OF MODIFIED LASER INITIALIZATION BLOCK <<<

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
    if (model) {
        model.updateMatrixWorld(true); // Force update of model's and its children's world matrices
    }

    const cameraRight = new THREE.Vector3();
    camera.getWorldDirection(new THREE.Vector3()); // Ensure matrixWorld is up to date for camera.
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0); // Column 0 is the X-axis (right)
    cameraRight.normalize(); // Ensure it's a unit vector

    const raycaster = new THREE.Raycaster(); // Can still be one raycaster reused

    let targetPosition;
    if (model && model.position) { // Check if model is loaded and has a position
        targetPosition = model.position.clone();
    } else {
        targetPosition = new THREE.Vector3(0, 0, 0); // Default target if model not ready
    }

    laserConfigs.forEach((config, laserIndex) => { // Added laserIndex directly
        const separation = 0.01; // New, much smaller value
        const numLasers = LASER_COLORS.length;
        const offsetAmount = (laserIndex - (numLasers - 1) / 2) * separation;

        const laserOriginOffset = cameraRight.clone().multiplyScalar(offsetAmount);
        const currentLaserOrigin = camera.position.clone().add(laserOriginOffset);

        // config.origin is no longer used from laserConfigs for path calculation starting point
        // config.direction is no longer used from laserConfigs for path calculation starting point

        let currentDirection = new THREE.Vector3().subVectors(targetPosition, currentLaserOrigin).normalize();

        console.log(`Laser ${laserIndex} - Frame Start: Dynamic Origin: (${currentLaserOrigin.x.toFixed(2)}, ${currentLaserOrigin.y.toFixed(2)}, ${currentLaserOrigin.z.toFixed(2)}), Dynamic Direction: (${currentDirection.x.toFixed(2)}, ${currentDirection.y.toFixed(2)}, ${currentDirection.z.toFixed(2)})`);

        const points = [];
        points.push(currentLaserOrigin.clone());

        // Initialize loop variables with the dynamic origin/direction
        let loopOrigin = currentLaserOrigin.clone();
        let loopDirection = currentDirection.clone();

        for (let i = 0; i < MAX_BOUNCES; i++) {
            raycaster.set(loopOrigin, loopDirection);

            if (interactiveObjects.length === 0) {
                 if (i === 0) points.push(loopOrigin.clone().add(loopDirection.clone().multiplyScalar(MAX_LASER_LENGTH))); // Use MAX_LASER_LENGTH for initial segment if no objects
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

                if (loopDirection.dot(worldNormal) > 0) {
                    worldNormal.negate();
                }

                loopDirection.reflect(worldNormal);
                loopOrigin.copy(impactPoint).add(loopDirection.clone().multiplyScalar(0.001));

                if (i === MAX_BOUNCES - 1) {
                    points.push(loopOrigin.clone().add(loopDirection.clone().multiplyScalar(FAR_AWAY_DISTANCE)));
                }
            } else {
                points.push(loopOrigin.clone().add(loopDirection.clone().multiplyScalar(FAR_AWAY_DISTANCE)));
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
