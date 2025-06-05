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

// Screen Corner Coordinates for Laser Origins (Global, as it's used in callback now)
const SCREEN_CORNERS = [
    { x: -1, y: 1 },  // Top-left
    { x: 1, y: 1 },   // Top-right
    { x: -1, y: -1 }, // Bottom-left
    { x: 1, y: -1 }   // Bottom-right
];

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

        // >>> START OF MOVED LASER INITIALIZATION BLOCK <<<
        console.log("Starting laser initialization after model load and camera adjustment...");
        // Define target for lasers (e.g., center of the scene) - can be inside or outside if used only here
        const laserTargetPosition = new THREE.Vector3(0, 0, 0);

        SCREEN_CORNERS.forEach((corner, index) => {
            // console.log(`Laser Init ${index}: Camera Position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`); // Removed
            // console.log(`Laser Init ${index}: Camera Near/Far: ${camera.near}/${camera.far}`); // Removed
            // console.log(`Laser Init ${index}: Input Screen Corner (Normalized): (${corner.x}, ${corner.y})`); // Removed

            const laserOriginPoint = getScreenCornerInWorld(corner.x, corner.y, camera);

            // console.log(`Laser Init ${index}: Calculated World Origin for Laser: (${laserOriginPoint.x.toFixed(2)}, ${laserOriginPoint.y.toFixed(2)}, ${laserOriginPoint.z.toFixed(2)})`); // Removed

            const laserDirectionVector = new THREE.Vector3();
            laserDirectionVector.subVectors(laserTargetPosition, laserOriginPoint).normalize();
            // console.log(`Laser Init ${index}: Origin: (${laserOriginPoint.x.toFixed(2)}, ${laserOriginPoint.y.toFixed(2)}, ${laserOriginPoint.z.toFixed(2)}), Target: (${laserTargetPosition.x.toFixed(2)}, ${laserTargetPosition.y.toFixed(2)}, ${laserTargetPosition.z.toFixed(2)}), Calculated Direction: (${laserDirectionVector.x.toFixed(2)}, ${laserDirectionVector.y.toFixed(2)}, ${laserDirectionVector.z.toFixed(2)})`); // Removed

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
            // console.log(`Laser ${index} initialized. Origin: (${laserOriginPoint.x.toFixed(2)}, ${laserOriginPoint.y.toFixed(2)}, ${laserOriginPoint.z.toFixed(2)})`); // Removed
        });
        console.log("Laser initialization complete. Total lasers:", laserConfigs.length);
        // >>> END OF MOVED LASER INITIALIZATION BLOCK <<<

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
        // console.log('Model matrixWorld (after forced update):', model.matrixWorld); // Removed
    }

    const raycaster = new THREE.Raycaster(); // Can still be one raycaster reused

    let targetPosition;
    if (model && model.position) { // Check if model is loaded and has a position
        targetPosition = model.position.clone();
    } else {
        targetPosition = new THREE.Vector3(0, 0, 0); // Default target if model not ready
    }

    laserConfigs.forEach((config, laserIndex) => { // Added laserIndex directly
        // Dynamically update the laser's primary direction for this frame
        config.direction.subVectors(targetPosition, config.origin).normalize();
        // console.log(`Laser Update ${laserIndex}: Origin: (${config.origin.x.toFixed(2)}, ${config.origin.y.toFixed(2)}, ${config.origin.z.toFixed(2)}), Target: (${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}), Updated Direction: (${config.direction.x.toFixed(2)}, ${config.direction.y.toFixed(2)}, ${config.direction.z.toFixed(2)})`); // Removed

        const points = [];

        // currentOrigin will be the static config.origin for the start of the beam
        let currentOrigin = config.origin.clone();
        // currentDirection will be the newly calculated config.direction for the first segment
        let currentDirection = config.direction.clone();

        // const laserIndex = laserConfigs.indexOf(config); // No longer needed here, obtained from forEach

        // console.log(`Laser ${laserIndex} - Frame Start: Using config.origin:`, config.origin.x, config.origin.y, config.origin.z, `as currentOrigin.`); // Removed

        // console.log(`Laser ${laserIndex}: Ray Origin:`, currentOrigin.x, currentOrigin.y, currentOrigin.z); // Removed
        // console.log(`Laser ${laserIndex}: Ray Direction:`, currentDirection.x, currentDirection.y, currentDirection.z); // Removed

        points.push(currentOrigin.clone());

        for (let i = 0; i < MAX_BOUNCES; i++) {
            raycaster.set(currentOrigin, currentDirection);

            if (interactiveObjects.length === 0) {
                 if (i === 0) points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(MAX_LASER_LENGTH)));
                break;
            }
            const intersects = raycaster.intersectObjects(interactiveObjects, true);
            // console.log(`Laser ${laserIndex}, Bounce ${i}: Intersects found:`, intersects.length); // Removed

            if (intersects.length > 0) {
                const intersection = intersects[0];
                // console.log(`Laser ${laserIndex}, Bounce ${i}: Hit at:`, intersection.point.x, intersection.point.y, intersection.point.z); // Removed
                // console.log(`Laser ${laserIndex}, Bounce ${i}: Hit object name:`, intersection.object.name); // Removed
                // console.log(`Laser ${laserIndex}, Bounce ${i}: Hit face normal:`, intersection.face.normal.x, intersection.face.normal.y, intersection.face.normal.z); // Removed

                const impactPoint = intersection.point;
                points.push(impactPoint.clone());

                const surfaceNormal = intersection.face.normal.clone();
                const worldNormal = new THREE.Vector3();
                worldNormal.copy(surfaceNormal).transformDirection(intersection.object.matrixWorld);
                // console.log(`Laser ${laserIndex}, Bounce ${i}: Original World Normal:`, worldNormal.x, worldNormal.y, worldNormal.z); // Removed

                if (currentDirection.dot(worldNormal) > 0) {
                    // console.log(`Laser ${laserIndex}, Bounce ${i}: Negating worldNormal.`); // Removed
                    worldNormal.negate();
                }
                // console.log(`Laser ${laserIndex}, Bounce ${i}: Corrected World Normal:`, worldNormal.x, worldNormal.y, worldNormal.z); // Removed

                const incomingForReflection = currentDirection.clone(); // Direction that hit the surface
                currentDirection.reflect(worldNormal); // currentDirection is now the reflected vector

                // console.log(`Laser ${laserIndex}, Bounce ${i}: Incoming for Reflection:`, incomingForReflection.x, incomingForReflection.y, incomingForReflection.z); // Removed
                // console.log(`Laser ${laserIndex}, Bounce ${i}: Reflected Direction:`, currentDirection.x, currentDirection.y, currentDirection.z); // Removed

                currentOrigin.copy(impactPoint).add(currentDirection.clone().multiplyScalar(0.001));

                if (i === MAX_BOUNCES - 1) {
                    points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(FAR_AWAY_DISTANCE))); // Use FAR_AWAY_DISTANCE
                }
            } else {
                points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(FAR_AWAY_DISTANCE))); // Use FAR_AWAY_DISTANCE
                break;
            }
        }

        // if (laserIndex === 0) { // Log only for the first laser to avoid excessive output
            // const logPoints = points.map(p => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`);
            // console.log(`Laser 0 Path Construction: Points: [${logPoints.join(' -> ')}]`);
        // } // Removed

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
