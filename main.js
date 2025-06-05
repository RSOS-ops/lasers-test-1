let scene, camera, renderer;
let textMesh;
let model; // For GLTF model
const textContent = 'Cory Richard';
// const fontName = 'Roboto'; // Should match the font loaded in index.// Ensure Three.js is loaded
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
}); // Not used
// const fontWeight = 'Regular'; // or 'Bold' etc. if you chose a specific weight // Not used

// Group Three.js setup
function setupThreeJS() {
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

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // White light, intensity 1
    directionalLight.position.set(10, 10, 10); // Position: up, right, and in front of the origin
    directionalLight.target.position.set(0, 0, 0); // Target the origin (where the model is)

    scene.add(directionalLight);
    scene.add(directionalLight.target); // Important to add the target to the scene as well
}

function init() {
    setupThreeJS();

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
        undefined, // onProgress callback
        function (error) {
            console.error('An error happened while loading the GLTF model:', error);
            // Fallback: Display simple HTML text if model loading fails
            const container = document.getElementById('text-container');
            if (container && !container.querySelector('p')) { // Avoid overwriting font fallback
                container.innerHTML = `<p style="color: white; font-size: 2vw; text-align: center; margin-top: 40vh;">Failed to load 3D model. Please try refreshing.</p>`;
            }
        }
    );

    // Load Font
    const fontLoader = new THREE.FontLoader();
    // const fontPath = 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json'; // Placeholder, will load Roboto // Not used

    fontLoader.load(
        // THREE.js examples use specific JSON font files.
        'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
        function (font) {
            createText(font);
        },
        undefined,
        function (error) {
            console.error('Error loading font:', error);
            // Fallback: Display simple HTML text if font loading fails
            const container = document.getElementById('text-container');
            // Avoid overwriting the model loading error message if it was already displayed
            if (container && !container.querySelector('p')) {
                container.innerHTML = `<p style="color: white; font-size: 5vw; text-align: center; margin-top: 40vh;">${textContent}</p>`;
                container.style.fontFamily = 'Roboto, sans-serif'; // Ensure this matches your desired fallback font
            }
            // Call animate even if font loading fails, to render the scene (e.g. the model)
            animate();
        }
    );

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function createText(font) {
    // Create text geometry
    const textGeometry = new THREE.TextGeometry(textContent, {
        font: font,
        size: 10,       // Initial size, will be scaled by scaleAndPositionText
        height: 0.1,    // Minimal height to keep it "flat"
        curveSegments: 12,
        bevelEnabled: false
    });

    // Center the geometry. This is important for rotation and scaling around the center.
    textGeometry.center();

    // Pre-compute bounding box. center() should do this, but explicit call ensures it.
    textGeometry.computeBoundingBox();

    // Create material for the text
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // White

    // Create the mesh
    textMesh = new THREE.Mesh(textGeometry, textMaterial);

    // Add to scene before scaling and positioning,
    // as scaleAndPositionText might rely on camera properties relative to the scene.
    scene.add(textMesh);

    // Initial scale and position calculation
    scaleAndPositionText(); // No longer needs font parameter
}

// Scales and positions the existing textMesh.
// This function assumes textMesh has already been created and its geometry is centered.
function scaleAndPositionText() {
    // Ensure essential components are ready.
    if (!textMesh || !textMesh.geometry || !camera) {
        console.warn('scaleAndPositionText: textMesh, its geometry, or camera not ready. Skipping.');
        return;
    }

    // Update camera projection matrix for accurate calculations.
    camera.updateProjectionMatrix();

    // Calculate the visible height and width at the Z-depth of the text.
    // The text is at z=0 relative to its parent (which is the scene).
    // The camera's Z position determines the distance.
    const distance = camera.position.z - textMesh.position.z; // textMesh.position.z is 0 because it's centered and placed at origin initially

    // Calculate visible height in world units at the text's distance
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
    // Calculate visible width based on camera's aspect ratio
    const visibleWidth = visibleHeight * camera.aspect;

    // Set the desired screen width for the text (e.g., 60% of visible width).
    const desiredTextScreenWidth = visibleWidth * 0.6;

    // Ensure the bounding box is up to date for the current geometry.
    if (!textMesh.geometry.boundingBox) {
        textMesh.geometry.computeBoundingBox();
    }
    const boundingBox = textMesh.geometry.boundingBox;

    // If boundingBox is null (e.g., empty geometry or error), exit.
    if (!boundingBox) {
        console.warn('scaleAndPositionText: boundingBox is null. Skipping scaling.');
        return;
    }

    // Get the current width of the text from its bounding box.
    const currentTextWidth = boundingBox.max.x - boundingBox.min.x;

    // Calculate and apply scale.
    if (currentTextWidth > 0) {
        const scale = desiredTextScreenWidth / currentTextWidth;
        textMesh.scale.set(scale, scale, scale); // Uniform scaling
    } else {
        // If currentTextWidth is 0 (e.g., empty text string or issue with bounding box),
        // set a default scale to avoid division by zero or NaN scales.
        textMesh.scale.set(1, 1, 1);
    }

    // Position the text.
    // We want to move the text up by 25% of the visible height from the center of the screen.
    // Since the text geometry is centered, its local origin (0,0,0) is its visual center.
    // Positioning it at (0, verticalOffset, 0) in world space achieves the desired layout.
    const verticalOffset = visibleHeight * 0.25;
    textMesh.position.set(0, verticalOffset, 0); // X=0 (centered), Y=offset, Z=0 (at scene origin plane)
}

function onWindowResize() {
    if (camera && renderer) { // Ensure camera and renderer are initialized
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Re-calculate scale and position on resize.
        // textMesh is scaled and positioned based on the new window dimensions.
        if (textMesh) { // Ensure textMesh exists before trying to scale/position it
            scaleAndPositionText(); // No longer needs font parameter
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    // Ensure scene and camera are ready before rendering
    if (scene && camera && renderer) {
        renderer.render(scene, camera);
    }
}

// Start the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => { // Removed event parameter as it's not used
    if (typeof THREE.GLTFLoader === 'function') {
        init();
    } else {
        console.error('THREE.GLTFLoader is not available. Check script loading order and availability.');
        const container = document.getElementById('text-container');
        if (container) {
            container.innerHTML = '<p style="color: white; font-size: 2vw; text-align: center; margin-top: 40vh;">Error: Could not load essential 3D components. Please try refreshing.</p>';
        }
    }
});
