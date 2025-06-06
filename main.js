// Import necessary Three.js modules
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Helper Functions for rave-laser-system-1
function getRandomPointOnRaveLaserSystem1OriginSphere(center, radius) {
    const point = new THREE.Vector3(
        Math.random() * 2 - 1, // x in [-1, 1]
        Math.random() * 2 - 1, // y in [-1, 1]
        Math.random() * 2 - 1  // z in [-1, 1]
    );
    if (point.lengthSq() === 0) { // Avoid division by zero if random point is (0,0,0)
        point.x = 1; // Set to a default vector if (0,0,0)
    }
    point.normalize().multiplyScalar(radius).add(center);
    return point;
}

function getRandomRaveLaserSystem1TargetVertex(verticesArray) {
    if (!verticesArray || verticesArray.length === 0) {
        console.warn("getRandomRaveLaserSystem1TargetVertex: modelVertices array is empty or undefined. Returning default Vector3(0,0,0).");
        return new THREE.Vector3(); // Default target if no vertices
    }
    const randomIndex = Math.floor(Math.random() * verticesArray.length);
    return verticesArray[randomIndex].clone(); // Return a clone to avoid modifying original
}

// Clock for animation timing
const clock = new THREE.Clock();

// --- Configuration Parameters ---
const RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS = 10; // Radius for the invisible sphere where rave-laser-system-1 originate
const CAMERA_ROTATION_THRESHOLD = THREE.MathUtils.degToRad(15); // Min camera rotation (radians) to be considered 'significant movement'
const CAMERA_POSITION_THRESHOLD = 0.1; // Min camera position change (world units) for 'significant movement'
const RAVE_LASER_SYSTEM_1_STILLNESS_LIMIT = 1.5; // Duration (seconds) camera must be 'still' to trigger rave-laser-system-1 jump

const BASE_RAVE_LASER_SYSTEM_1_PULSE_FREQUENCY = 0.5; // Base rave-laser-system-1 pulse frequency (cycles per second) when camera is still
const RAVE_LASER_SYSTEM_1_PULSE_FREQUENCY_SENSITIVITY = 5.0; // How much camera movement speed influences pulse frequency
const MIN_RAVE_LASER_SYSTEM_1_BRIGHTNESS = 0.3; // Minimum brightness for pulsing rave-laser-system-1 material (range 0-1)
const MAX_RAVE_LASER_SYSTEM_1_BRIGHTNESS = 1.0; // Maximum brightness for pulsing rave-laser-system-1 material (range 0-1)

// General rave-laser-system-1 Properties
const MAX_RAVE_LASER_SYSTEM_1_LENGTH = 20; // Max length of a rave-laser-system-1 beam segment if it doesn't hit anything
const MAX_BOUNCES = 3; // Max number of times a rave-laser-system-1 can bounce
// --- End Configuration Parameters ---

// Camera Movement Tracking State
let previousCameraPosition = new THREE.Vector3(); // Stores camera position from the previous frame
let previousCameraQuaternion = new THREE.Quaternion(); // Stores camera orientation from the previous frame
let stillnessTimer = 0; // Accumulates time camera has been still

// Raycaster for rave-laser-system-1
const raveLaserSystem1Raycaster = new THREE.Raycaster();

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

// Optional: Add a helper to visualize the DirectionalLight.
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 0); // Using a size of 2 for the helper
// scene.add(directionalLightHelper);

const spotLightDown = new THREE.SpotLight(0xffffff, 50);
spotLightDown.distance = 1; // Adjusted for potentially different model size
spotLightDown.angle = Math.PI / 8; // Adjusted for potentially different model size
spotLightDown.penumbra = 0.5;
spotLightDown.decay = 2;

const spotLightFace = new THREE.SpotLight();
spotLightFace.color.set(0xffffff);
spotLightFace.intensity = 50; // Adjusted intensity for the face spotlight GOOD VALUE IS 150 // spookyvalue 
spotLightFace.distance = 0.85;
spotLightFace.angle = Math.PI / 11.5;
spotLightFace.penumbra = 0.5;
spotLightFace.decay = 0.5;

// Model Setup & Loading
let model;
let modelVertices = []; // To store world coordinates of model vertices

// rave-laser-system-1 Global Variables
// const laserOffset1 = new THREE.Vector3(-0.8, 0.8, -1); // Top-left - REMOVED
// const laserOffset2 = new THREE.Vector3(0.8, 0.8, -1);  // Top-right - REMOVED
// const laserOffset3 = new THREE.Vector3(-0.8, -0.8, -1);// Bottom-left - REMOVED
// const laserOffset4 = new THREE.Vector3(0.8, -0.8, -1); // Bottom-right - REMOVED

// Laser 1
let raveLaserSystem1Line; // THREE.Line object
let raveLaserSystem1Origin1; // THREE.Vector3 - Current origin of the laser
let raveLaserSystem1InitialDirection1; // THREE.Vector3 - Current direction of the laser
let raveLaserSystem1TargetVertex1; // THREE.Vector3 - Target vertex on the model
let raveLaserSystem1PulseIntensity1 = 1.0; // Current pulse intensity (0-1)

// rave-laser-system-1 2
let raveLaserSystem1Line2;
let raveLaserSystem1Origin2;
let raveLaserSystem1InitialDirection2;
let raveLaserSystem1TargetVertex2;
let raveLaserSystem1PulseIntensity2 = 1.0;
const raveLaserSystem1Material2 = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red rave-laser-system-1 for the second rave-laser-system-1

// rave-laser-system-1 3
let raveLaserSystem1Line3;
let raveLaserSystem1Origin3;
let raveLaserSystem1InitialDirection3;
let raveLaserSystem1TargetVertex3;
let raveLaserSystem1PulseIntensity3 = 1.0;
const raveLaserSystem1Material3 = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red rave-laser-system-1 for the third rave-laser-system-1

// rave-laser-system-1 4
let raveLaserSystem1Line4;
let raveLaserSystem1Origin4;
let raveLaserSystem1InitialDirection4;
let raveLaserSystem1TargetVertex4;
let raveLaserSystem1PulseIntensity4 = 1.0;
const raveLaserSystem1Material4 = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red rave-laser-system-1 for the fourth rave-laser-system-1

// Spotlight Lasers
let spotlightDownLaserLine;
let spotlightFaceLaserLine;
// We will use the existing raveLaserSystem1Material for their color.

const interactiveObjects = []; // To store objects the rave-laser-system-1 can hit (currently just the model)

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
const modelUrl = 'HoodedCory_NewStart_NewHood_DecimatedCreasedHood-1.glb';

// rave-laser-system-1 Line Setup
const raveLaserSystem1Material = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red rave-laser-system-1
const spotlightDownLaserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const spotlightFaceLaserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const points = [];
// points.push(laserOrigin.clone()); // laserOrigin will be undefined here
// points.push(laserOrigin.clone().add(initialLaserDirection.clone().multiplyScalar(MAX_LASER_LENGTH))); // Initial straight line
const raveLaserSystem1Geometry = new THREE.BufferGeometry().setFromPoints(points);
raveLaserSystem1Line = new THREE.Line(raveLaserSystem1Geometry, raveLaserSystem1Material);
scene.add(raveLaserSystem1Line);

// Second rave-laser-system-1 Line Setup
const points2 = [];
// points2.push(laserOrigin2.clone()); // laserOrigin2 will be undefined here
// points2.push(laserOrigin2.clone().add(initialLaserDirection2.clone().multiplyScalar(MAX_LASER_LENGTH)));
const raveLaserSystem1Geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
raveLaserSystem1Line2 = new THREE.Line(raveLaserSystem1Geometry2, raveLaserSystem1Material2);
scene.add(raveLaserSystem1Line2);

// Third rave-laser-system-1 Line Setup
const points3 = [];
// points3.push(laserOrigin3.clone()); // laserOrigin3 will be undefined here
// points3.push(laserOrigin3.clone().add(initialLaserDirection3.clone().multiplyScalar(MAX_LASER_LENGTH)));
const raveLaserSystem1Geometry3 = new THREE.BufferGeometry().setFromPoints(points3);
raveLaserSystem1Line3 = new THREE.Line(raveLaserSystem1Geometry3, raveLaserSystem1Material3);
scene.add(raveLaserSystem1Line3);

// Fourth rave-laser-system-1 Line Setup
const points4 = [];
// points4.push(laserOrigin4.clone()); // laserOrigin4 will be undefined here
// points4.push(laserOrigin4.clone().add(initialLaserDirection4.clone().multiplyScalar(MAX_LASER_LENGTH)));
const raveLaserSystem1Geometry4 = new THREE.BufferGeometry().setFromPoints(points4);
raveLaserSystem1Line4 = new THREE.Line(raveLaserSystem1Geometry4, raveLaserSystem1Material4);
scene.add(raveLaserSystem1Line4);

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
        // scene.add(spotLightDownHelper);

        // Configure and attach the New SpotLight to the model
        const spotLightFaceTargetObject = new THREE.Object3D();
        model.add(spotLightFaceTargetObject); // Add target as a child of the model.
        spotLightFaceTargetObject.position.set(0, 0.4, 0.0); // Target position relative to the model.

        spotLightFace.target = spotLightFaceTargetObject; // Aim the new spotlight at this target.
        model.add(spotLightFace); // Add the new spotlight itself as a child of the model.
        // Position the new spotlight relative to the model's local coordinates.
        spotLightFace.position.set(0, -0.6, 0.5);

        // Optional: Add a helper to visualize the New SpotLight.
        const spotLightFaceHelper = new THREE.SpotLightHelper(spotLightFace);
        // scene.add(spotLightFaceHelper);

        interactiveObjects.push(model); // Add model for rave-laser-system-1 interaction

        adjustCameraForModel(); // Call this after model is processed

        // Extract model vertices
        model.updateMatrixWorld(true); // Ensure world matrices are up-to-date
        model.traverse(function (child) {
            if (child.isMesh) {
                const positions = child.geometry.attributes.position;
                const worldMatrix = child.matrixWorld;
                for (let i = 0; i < positions.count; i++) {
                    const localVertex = new THREE.Vector3().fromBufferAttribute(positions, i);
                    const worldVertex = localVertex.applyMatrix4(worldMatrix);
                    modelVertices.push(worldVertex);
                }
            }
        });
        console.log('Extracted ' + modelVertices.length + ' vertices from the model.');

        initializeLasers(); // Initialize rave-laser-system-1 now that model vertices are available
        // initializeSpotlightLasers(); // Add this call
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('An error occurred loading the GLB model:', error);
    }
);

function initializeLasers() {
    if (modelVertices.length === 0) {
        console.warn("initializeLasers called before model vertices were extracted. rave-laser-system-1 will use default initialization.");
        // Default initialization if vertices aren't ready
        raveLaserSystem1Origin1 = new THREE.Vector3(0,0,RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS); // Assign to raveLaserSystem1Origin1
        raveLaserSystem1TargetVertex1 = new THREE.Vector3();

        raveLaserSystem1Origin2 = new THREE.Vector3(0,0,RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
        raveLaserSystem1TargetVertex2 = new THREE.Vector3();

        raveLaserSystem1Origin3 = new THREE.Vector3(0,0,RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
        raveLaserSystem1TargetVertex3 = new THREE.Vector3();

        raveLaserSystem1Origin4 = new THREE.Vector3(0,0,RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
        raveLaserSystem1TargetVertex4 = new THREE.Vector3();

    } else {
        // rave-laser-system-1 1
        raveLaserSystem1Origin1 = getRandomPointOnRaveLaserSystem1OriginSphere(controls.target, RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
        raveLaserSystem1TargetVertex1 = getRandomRaveLaserSystem1TargetVertex(modelVertices);

        // rave-laser-system-1 2
        raveLaserSystem1Origin2 = getRandomPointOnRaveLaserSystem1OriginSphere(controls.target, RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
        raveLaserSystem1TargetVertex2 = getRandomRaveLaserSystem1TargetVertex(modelVertices);

        // rave-laser-system-1 3
        raveLaserSystem1Origin3 = getRandomPointOnRaveLaserSystem1OriginSphere(controls.target, RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
        raveLaserSystem1TargetVertex3 = getRandomRaveLaserSystem1TargetVertex(modelVertices);

        // rave-laser-system-1 4
        raveLaserSystem1Origin4 = getRandomPointOnRaveLaserSystem1OriginSphere(controls.target, RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
        raveLaserSystem1TargetVertex4 = getRandomRaveLaserSystem1TargetVertex(modelVertices);
    }

    // Common for all rave-laser-system-1, calculate initial directions
    if (raveLaserSystem1Origin1 && raveLaserSystem1TargetVertex1) raveLaserSystem1InitialDirection1 = new THREE.Vector3().subVectors(raveLaserSystem1TargetVertex1, raveLaserSystem1Origin1).normalize(); // Use raveLaserSystem1Origin1
    else raveLaserSystem1InitialDirection1 = new THREE.Vector3(0,0,-1);

    if (raveLaserSystem1Origin2 && raveLaserSystem1TargetVertex2) raveLaserSystem1InitialDirection2 = new THREE.Vector3().subVectors(raveLaserSystem1TargetVertex2, raveLaserSystem1Origin2).normalize();
    else raveLaserSystem1InitialDirection2 = new THREE.Vector3(0,0,-1);

    if (raveLaserSystem1Origin3 && raveLaserSystem1TargetVertex3) raveLaserSystem1InitialDirection3 = new THREE.Vector3().subVectors(raveLaserSystem1TargetVertex3, raveLaserSystem1Origin3).normalize();
    else raveLaserSystem1InitialDirection3 = new THREE.Vector3(0,0,-1);

    if (raveLaserSystem1Origin4 && raveLaserSystem1TargetVertex4) raveLaserSystem1InitialDirection4 = new THREE.Vector3().subVectors(raveLaserSystem1TargetVertex4, raveLaserSystem1Origin4).normalize();
    else raveLaserSystem1InitialDirection4 = new THREE.Vector3(0,0,-1);

    console.log("rave-laser-system-1 initialized.");
}

// function initializeSpotlightLasers() {
//     if (!model || !spotLightDown || !spotLightFace || !spotLightDown.target || !spotLightFace.target) {
//         console.warn("initializeSpotlightLasers: Model or spotlights not ready.");
//         return;
//     }
//
//     const worldSpotLightDownPos = new THREE.Vector3();
//     spotLightDown.getWorldPosition(worldSpotLightDownPos);
//
//     const worldSpotLightDownTargetPos = new THREE.Vector3();
//     spotLightDown.target.getWorldPosition(worldSpotLightDownTargetPos);
//
//     const worldSpotLightFacePos = new THREE.Vector3();
//     spotLightFace.getWorldPosition(worldSpotLightFacePos);
//
//     const worldSpotLightFaceTargetPos = new THREE.Vector3();
//     spotLightFace.target.getWorldPosition(worldSpotLightFaceTargetPos);
//
//     // Spotlight Down Laser
//     const spotlightDownLaserPoints = [];
//     spotlightDownLaserPoints.push(worldSpotLightDownPos.clone());
//     spotlightDownLaserPoints.push(worldSpotLightDownTargetPos.clone());
//     const spotlightDownLaserGeometry = new THREE.BufferGeometry().setFromPoints(spotlightDownLaserPoints);
//     // Using existing raveLaserSystem1Material for red color as requested
//     spotlightDownLaserLine = new THREE.Line(spotlightDownLaserGeometry, spotlightDownLaserMaterial);
//     spotlightDownLaserLine.name = "spotlight-down-laser"; // Assign name
//     scene.add(spotlightDownLaserLine);
//
//     // Spotlight Face Laser
//     const spotlightFaceLaserPoints = [];
//     spotlightFaceLaserPoints.push(worldSpotLightFacePos.clone());
//     spotlightFaceLaserPoints.push(worldSpotLightFaceTargetPos.clone());
//     const spotlightFaceLaserGeometry = new THREE.BufferGeometry().setFromPoints(spotlightFaceLaserPoints);
//     // Using existing raveLaserSystem1Material for red color
//     spotlightFaceLaserLine = new THREE.Line(spotlightFaceLaserGeometry, spotlightFaceLaserMaterial);
//     spotlightFaceLaserLine.name = "spotlight-face-laser"; // Assign name
//     scene.add(spotlightFaceLaserLine);
//
//     console.log("Spotlight lasers initialized.");
// }

// Reusable rave-laser-system-1 Update Function
function updateLaserLineGeometry(laserLineObj, origin, direction, raycaster, interactiveObjectsArr, maxBounces, raveLaserSystem1MaxLaserLength) {
    const points = [];
    let currentOrigin = origin.clone();
    let currentDirection = direction.clone();

    points.push(currentOrigin.clone());

    for (let i = 0; i < maxBounces; i++) {
        raycaster.set(currentOrigin, currentDirection);
        const intersects = raycaster.intersectObjects(interactiveObjectsArr, true);

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

            if (i === maxBounces - 1) { // If it's the last bounce, draw the final segment
                points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(raveLaserSystem1MaxLaserLength)));
            }
        } else {
            points.push(currentOrigin.clone().add(currentDirection.clone().multiplyScalar(raveLaserSystem1MaxLaserLength)));
            break;
        }
    }

    laserLineObj.geometry.setFromPoints(points);
    laserLineObj.geometry.attributes.position.needsUpdate = true;
}

const rotationSpeed = (2 * Math.PI) / 12; // Radians per second

function handleLaserJumpLogic() {
    if (modelVertices.length === 0) {
        // console.warn("handleLaserJumpLogic called before model vertices were extracted. Cannot update laser targets.");
        // Optionally, just jump origins if no vertices, or do nothing.
        // For now, let's only proceed if vertices are available for robust targeting.
        return;
    }

    // console.log("rave-laser-system-1 are JUMPING!"); // For debugging

    // rave-laser-system-1 1
    raveLaserSystem1Origin1 = getRandomPointOnRaveLaserSystem1OriginSphere(controls.target, RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
    raveLaserSystem1TargetVertex1 = getRandomRaveLaserSystem1TargetVertex(modelVertices);
    if (raveLaserSystem1Origin1 && raveLaserSystem1TargetVertex1 && raveLaserSystem1InitialDirection1) { // Ensure all are valid before calculating direction
         raveLaserSystem1InitialDirection1.subVectors(raveLaserSystem1TargetVertex1, raveLaserSystem1Origin1).normalize();
    } else if (raveLaserSystem1InitialDirection1) { // Fallback if origin/target somehow invalid but direction vector exists
        raveLaserSystem1InitialDirection1.set(0,0,-1); // Default direction
    }

    // rave-laser-system-1 2
    raveLaserSystem1Origin2 = getRandomPointOnRaveLaserSystem1OriginSphere(controls.target, RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
    raveLaserSystem1TargetVertex2 = getRandomRaveLaserSystem1TargetVertex(modelVertices);
    if (raveLaserSystem1Origin2 && raveLaserSystem1TargetVertex2 && raveLaserSystem1InitialDirection2) {
        raveLaserSystem1InitialDirection2.subVectors(raveLaserSystem1TargetVertex2, raveLaserSystem1Origin2).normalize();
    } else if (raveLaserSystem1InitialDirection2) {
        raveLaserSystem1InitialDirection2.set(0,0,-1);
    }

    // rave-laser-system-1 3
    raveLaserSystem1Origin3 = getRandomPointOnRaveLaserSystem1OriginSphere(controls.target, RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
    raveLaserSystem1TargetVertex3 = getRandomRaveLaserSystem1TargetVertex(modelVertices);
    if (raveLaserSystem1Origin3 && raveLaserSystem1TargetVertex3 && raveLaserSystem1InitialDirection3) {
        raveLaserSystem1InitialDirection3.subVectors(raveLaserSystem1TargetVertex3, raveLaserSystem1Origin3).normalize();
    } else if (raveLaserSystem1InitialDirection3) {
        raveLaserSystem1InitialDirection3.set(0,0,-1);
    }

    // rave-laser-system-1 4
    raveLaserSystem1Origin4 = getRandomPointOnRaveLaserSystem1OriginSphere(controls.target, RAVE_LASER_SYSTEM_1_ORIGIN_SPHERE_RADIUS);
    raveLaserSystem1TargetVertex4 = getRandomRaveLaserSystem1TargetVertex(modelVertices);
    if (raveLaserSystem1Origin4 && raveLaserSystem1TargetVertex4 && raveLaserSystem1InitialDirection4) {
        raveLaserSystem1InitialDirection4.subVectors(raveLaserSystem1TargetVertex4, raveLaserSystem1Origin4).normalize();
    } else if (raveLaserSystem1InitialDirection4) {
        raveLaserSystem1InitialDirection4.set(0,0,-1);
    }
}

// Animation Loop
function animate() {
    const deltaTime = clock.getDelta(); // Get time elapsed since last frame
    requestAnimationFrame(animate);

    if (controls.enableDamping) {
        controls.update();
    }

    // Initialize deltaRotation and deltaPosition to ensure they are defined in the animate scope
    let deltaRotation = 0;
    let deltaPosition = 0;

    // Camera stillness/movement detection
    if (camera && previousCameraPosition && previousCameraQuaternion) { // Ensure camera is available
        // Initialize previous states on the first valid frame
        if (previousCameraPosition.lengthSq() === 0 && previousCameraQuaternion.x === 0 && previousCameraQuaternion.y === 0 && previousCameraQuaternion.z === 0 && previousCameraQuaternion.w === 1) {
            previousCameraPosition.copy(camera.position);
            previousCameraQuaternion.copy(camera.quaternion);
        }

        // Calculate actual deltas if previous state is valid
        deltaRotation = previousCameraQuaternion.angleTo(camera.quaternion);
        deltaPosition = previousCameraPosition.distanceTo(camera.position);
        let hasCameraMovedSignificantly = false;

        if (deltaRotation > CAMERA_ROTATION_THRESHOLD || deltaPosition > CAMERA_POSITION_THRESHOLD) {
            stillnessTimer = 0;
            hasCameraMovedSignificantly = true;
            // console.log("Camera moved significantly: Rotation or Position delta exceeded threshold.");
        } else {
            stillnessTimer += deltaTime;
            if (stillnessTimer >= RAVE_LASER_SYSTEM_1_STILLNESS_LIMIT) {
                stillnessTimer = 0; // Reset timer
                hasCameraMovedSignificantly = true; // Trigger jump due to stillness
                // console.log("Stillness limit reached, triggering jump.");
            }
        }

        if (hasCameraMovedSignificantly) {
            if (typeof handleLaserJumpLogic === 'function') {
                handleLaserJumpLogic();
            } else {
                // This console log is useful if handleLaserJumpLogic is not yet defined
                // console.log("Camera moved significantly or stillness limit reached: handleLaserJumpLogic() would be called here.");
            }
        }

        // Update previous state for next frame
        previousCameraPosition.copy(camera.position);
        previousCameraQuaternion.copy(camera.quaternion);
    }


    if (model) { // Check if the model is loaded
    }

    // Camera-parenting logic for rave-laser-system-1 origins - REMOVED
    // const worldLaserOrigin1 = new THREE.Vector3();
    // worldLaserOrigin1.copy(laserOffset1);
    // worldLaserOrigin1.applyMatrix4(camera.matrixWorld);
    // raveLaserSystem1Origin1 = worldLaserOrigin1;
    //
    // const worldLaserOrigin2 = new THREE.Vector3();
    // worldLaserOrigin2.copy(laserOffset2);
    // worldLaserOrigin2.applyMatrix4(camera.matrixWorld);
    // raveLaserSystem1Origin2 = worldLaserOrigin2;
    //
    // const worldLaserOrigin3 = new THREE.Vector3();
    // worldLaserOrigin3.copy(laserOffset3);
    // worldLaserOrigin3.applyMatrix4(camera.matrixWorld);
    // raveLaserSystem1Origin3 = worldLaserOrigin3;
    //
    // const worldLaserOrigin4 = new THREE.Vector3();
    // worldLaserOrigin4.copy(laserOffset4);
    // worldLaserOrigin4.applyMatrix4(camera.matrixWorld);
    // raveLaserSystem1Origin4 = worldLaserOrigin4;

    // Update rave-laser-system-1 directions to point from new origins to control target
    // This will be updated in the next step based on new origin calculation method
    // For now, direction calculation is handled by initializeLasers and handleLaserJumpLogic
    // if (raveLaserSystem1Origin1 && controls.target) { // Temporary check
    //     const direction1 = new THREE.Vector3();
    //     direction1.subVectors(controls.target, raveLaserSystem1Origin1).normalize();
    //     raveLaserSystem1InitialDirection1 = direction1;
    // }
    // ... (similar for other rave-laser-system-1) ...


    // rave-laser-system-1 Pulsing Logic
    // Note: deltaPosition and deltaRotation are available from the camera tracking logic block above
    let cameraSpeed = 0;
    if (deltaTime > 0) { // deltaTime is from clock.getDelta() at the start of animate()
        // Simple speed estimation based on change in position and rotation
        cameraSpeed = (deltaPosition / deltaTime) + (deltaRotation / deltaTime);
    }
    // Clamp cameraSpeed to prevent excessively fast pulsing, e.g., on first frame or after a lag spike
    cameraSpeed = Math.min(cameraSpeed, 10.0);

    const currentPulseFrequency = BASE_RAVE_LASER_SYSTEM_1_PULSE_FREQUENCY + (cameraSpeed * RAVE_LASER_SYSTEM_1_PULSE_FREQUENCY_SENSITIVITY);

    // Calculate a single pulse intensity to be used by all rave-laser-system-1 for synchronization
    const sharedPulseIntensity = (Math.sin(clock.elapsedTime * currentPulseFrequency * Math.PI * 2) + 1) / 2; // Results in range [0, 1]

    // Assign to individual rave-laser-system-1 pulse intensities (can be used for other effects if needed)
    raveLaserSystem1PulseIntensity1 = sharedPulseIntensity;
    raveLaserSystem1PulseIntensity2 = sharedPulseIntensity;
    raveLaserSystem1PulseIntensity3 = sharedPulseIntensity;
    raveLaserSystem1PulseIntensity4 = sharedPulseIntensity;

    // Apply pulsing to rave-laser-system-1 materials by modulating color brightness
    const brightnessScalar = MIN_RAVE_LASER_SYSTEM_1_BRIGHTNESS + (sharedPulseIntensity * (MAX_RAVE_LASER_SYSTEM_1_BRIGHTNESS - MIN_RAVE_LASER_SYSTEM_1_BRIGHTNESS));

    if (raveLaserSystem1Line.material) {
        raveLaserSystem1Line.material.color.setHex(0xff0000).multiplyScalar(brightnessScalar);
    }
    if (raveLaserSystem1Line2.material) {
        raveLaserSystem1Line2.material.color.setHex(0xff0000).multiplyScalar(brightnessScalar);
    }
    if (raveLaserSystem1Line3.material) {
        raveLaserSystem1Line3.material.color.setHex(0xff0000).multiplyScalar(brightnessScalar);
    }
    if (raveLaserSystem1Line4.material) {
        raveLaserSystem1Line4.material.color.setHex(0xff0000).multiplyScalar(brightnessScalar);
    }

    // Update Spotlight Lasers
    // if (spotlightDownLaserLine && spotLightDown && spotLightDown.target && spotLightDown.parent === model) { // Check if model is parent
    //     const worldSpotLightDownPos = new THREE.Vector3();
    //     spotLightDown.getWorldPosition(worldSpotLightDownPos);
    //
    //     const worldSpotLightDownTargetPos = new THREE.Vector3();
    //     spotLightDown.target.getWorldPosition(worldSpotLightDownTargetPos);
    //
    //     const points = [];
    //     points.push(worldSpotLightDownPos.clone());
    //     points.push(worldSpotLightDownTargetPos.clone());
    //     spotlightDownLaserLine.geometry.setFromPoints(points);
    //     spotlightDownLaserLine.geometry.attributes.position.needsUpdate = true;
    // }

    // if (spotlightFaceLaserLine && spotLightFace && spotLightFace.target && spotLightFace.parent === model) { // Check if model is parent
    //     const worldSpotLightFacePos = new THREE.Vector3();
    //     spotLightFace.getWorldPosition(worldSpotLightFacePos);
    //
    //     const worldSpotLightFaceTargetPos = new THREE.Vector3();
    //     spotLightFace.target.getWorldPosition(worldSpotLightFaceTargetPos);
    //
    //     const points = [];
    //     points.push(worldSpotLightFacePos.clone());
    //     points.push(worldSpotLightFaceTargetPos.clone());
    //     spotlightFaceLaserLine.geometry.setFromPoints(points);
    //     spotlightFaceLaserLine.geometry.attributes.position.needsUpdate = true;
    // }

    // Update all rave-laser-system-1 lines using the new reusable function
    if (raveLaserSystem1Origin1 && raveLaserSystem1InitialDirection1) { // Ensure origin and direction are calculated for rave-laser-system-1 1
        updateLaserLineGeometry(raveLaserSystem1Line, raveLaserSystem1Origin1, raveLaserSystem1InitialDirection1, raveLaserSystem1Raycaster, interactiveObjects, MAX_BOUNCES, MAX_RAVE_LASER_SYSTEM_1_LENGTH);
    }
    if (raveLaserSystem1Origin2 && raveLaserSystem1InitialDirection2) {
        updateLaserLineGeometry(raveLaserSystem1Line2, raveLaserSystem1Origin2, raveLaserSystem1InitialDirection2, raveLaserSystem1Raycaster, interactiveObjects, MAX_BOUNCES, MAX_RAVE_LASER_SYSTEM_1_LENGTH);
    }
    if (raveLaserSystem1Origin3 && raveLaserSystem1InitialDirection3) {
        updateLaserLineGeometry(raveLaserSystem1Line3, raveLaserSystem1Origin3, raveLaserSystem1InitialDirection3, raveLaserSystem1Raycaster, interactiveObjects, MAX_BOUNCES, MAX_RAVE_LASER_SYSTEM_1_LENGTH);
    }
    if (raveLaserSystem1Origin4 && raveLaserSystem1InitialDirection4) {
        updateLaserLineGeometry(raveLaserSystem1Line4, raveLaserSystem1Origin4, raveLaserSystem1InitialDirection4, raveLaserSystem1Raycaster, interactiveObjects, MAX_BOUNCES, MAX_RAVE_LASER_SYSTEM_1_LENGTH);
    }

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
