// Ensure Three.js is loaded
if (typeof THREE === 'undefined') {
    console.error('Three.js has not been loaded. Check your script tags.');
}

// Scene, Camera, Renderer
let scene, camera, renderer;

// Text variables
// let textMesh; // Removed
let model; // For GLTF model
// const textContent = 'Cory Richard'; // Removed
// const fontName = 'Roboto'; // Removed
// const fontWeight = 'Regular'; // Removed

function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 20, 50); // Adjusted for the cube model
    camera.lookAt(0, 0, 0); // Ensure camera targets the origin

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('text-container').appendChild(renderer.domElement);

    // Instantiate GLTFLoader
    const loader = new THREE.GLTFLoader();

    // Load GLTF model
    loader.load(
        'https://raw.githubusercontent.com/RSOS-ops/lasers-test-1/main/cube-beveled-silver.glb', // New URL
        function (gltf) {
            model = gltf.scene;
            model.position.set(0, 0, 0);

            // --- Start of new scaling logic ---
            // Ensure the camera's projection matrix is up to date for calculations
            camera.updateMatrixWorld(); // Important for getting correct world positions/orientations
            camera.updateProjectionMatrix();

            // Calculate the model's bounding box and size
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);

            // Calculate visible height and width at the model's Z position (0)
            // The camera is at camera.position.set(20, 20, 50);
            // The target is (0,0,0)
            // The effective Z distance for FOV calculation to the Z=0 plane is camera.position.z
            const distanceToModelPlane = Math.abs(camera.position.z - model.position.z); // Should be 50 if model at z=0

            const vFOV = THREE.MathUtils.degToRad(camera.fov); // camera.fov is in degrees
            const heightAtDepth = 2 * Math.tan(vFOV / 2) * distanceToModelPlane;
            const widthAtDepth = heightAtDepth * camera.aspect;

            // Target model width: 50% of the calculated visible screen width
            const targetModelWidth = widthAtDepth * 0.5;

            // Calculate scale factor (uniform scaling based on width)
            let scale = 1;
            if (size.x > 0) {
                scale = targetModelWidth / size.x;
            } else if (size.y > 0) { // Fallback to height if width is 0
                const targetModelHeight = heightAtDepth * 0.5; // Assuming 50% of height as well
                scale = targetModelHeight / size.y;
            } else if (size.z > 0) { // Fallback to depth if width and height are 0
                // Using widthAtDepth for Z is not ideal, but as a last resort scale based on depth
                scale = (widthAtDepth * 0.25) / size.z; // Scaled to 25% of width for depth
            }

            model.scale.set(scale, scale, scale);
            // --- End of new scaling logic ---

            scene.add(model);
            animate(); // Start animation loop after model is loaded
        },
        undefined,
        function (error) {
            console.error('An error happened while loading the GLTF model:', error);
            // Display a more generic error on screen if model loading fails
            const container = document.getElementById('text-container');
            if (container) {
                container.innerHTML = '<p style="color: white; font-size: 2vw; text-align: center; margin-top: 40vh;">Error: Could not load 3D model. Please check the console for details.</p>';
            }
        }
    );

    // Directional Light (remains)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 4.0);
    directionalLight.position.set(10, 10, 10);
    directionalLight.target.position.set(0, 0, 0);
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    // Removed animate() call from here, it's now called after successful model load.
    // If model doesn't load, animation doesn't start.
}

// Removed createText(font) function
// Removed scaleAndPositionText(font) function

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (model) { // Optional: only render if model is loaded, though renderer.render is safe
        // Any model-specific animation updates would go here
    }
    renderer.render(scene, camera);
}

// Start the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    if (typeof THREE.GLTFLoader === 'function') {
        init();
    } else {
        console.error('THREE.GLTFLoader is not available. Check script loading order and availability.');
        const container = document.getElementById('text-container');
        if (container) {
            container.innerHTML = '<p style="color: white; font-size: 2vw; text-align: center; margin-top: 40vh;">Error: Essential 3D loading component (GLTFLoader) failed. Please try refreshing.</p>';
        }
    }
});
