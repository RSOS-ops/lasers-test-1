// Ensure Three.js is loaded
if (typeof THREE === 'undefined') {
    console.error('Three.js has not been loaded. Check your script tags.');
}

// Scene, Camera, Renderer
let scene, camera, renderer;

// Text variables
let textMesh;
let model; // For GLTF model
const textContent = 'Cory Richard';
const fontName = 'Roboto'; // Should match the font loaded in index.html
const fontWeight = 'Regular'; // or 'Bold' etc. if you chose a specific weight

function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50; // Initial Z position, will be adjusted

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('text-container').appendChild(renderer.domElement);

    // Instantiate GLTFLoader
    const loader = new THREE.GLTFLoader();

    // Load GLTF model
    loader.load(
        'https://raw.githubusercontent.com/RSOS-ops/lasers-test-1/initial-structure/cube-beveled-silver.glb',
        function (gltf) {
            model = gltf.scene;
            model.position.set(0, 0, 0); // Adjust as needed
            scene.add(model);
            // Ensure model is rendered even if text creation is pending font loading
        },
        undefined, // onProgress callback
        function (error) {
            console.error('An error happened while loading the GLTF model:', error);
        }
    );

    // Load Font
    const fontLoader = new THREE.FontLoader();
    const fontPath = 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json'; // Placeholder, will load Roboto

    // Directional Light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // White light, intensity 1
    directionalLight.position.set(10, 10, 10); // Position: up, right, and in front of the origin
    directionalLight.target.position.set(0, 0, 0); // Target the origin (where the model is)

    scene.add(directionalLight);
    scene.add(directionalLight.target); // Important to add the target to the scene as well

    fontLoader.load(
        // THREE.js examples use specific JSON font files.
        // For Google Fonts like Roboto, you typically use a tool to convert TTF to this JSON format.
        // For simplicity in this step, we'll use a standard Three.js font (helvetiker)
        // and aim to replace it or adjust if direct Google Font loading in Three.js is straightforward.
        // Alternatively, HTML/CSS text can be overlaid if direct font loading is complex for this stage.
        // Let's proceed with Helvetiker for now to get the text rendering, then refine font.
        'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', // Using a default Three.js font for now
        function (font) {
            createText(font);
            animate();
        },
        undefined, // onProgress callback
        function (error) {
            console.error('Error loading font:', error);
            // Fallback: Display simple HTML text if font loading fails
            const container = document.getElementById('text-container');
            container.innerHTML = `<p style="color: white; font-size: 5vw; text-align: center; margin-top: 40vh;">${textContent}</p>`;
            container.style.fontFamily = 'Roboto, sans-serif';
        }
    );

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function createText(font) {
    const textGeometry = new THREE.TextGeometry(textContent, {
        font: font,
        size: 10, // Initial size, will be scaled
        height: 0.1, // Minimal height to keep it "flat"
        curveSegments: 12,
        bevelEnabled: false
    });

    textGeometry.computeBoundingBox();
    const textMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // White
    textMesh = new THREE.Mesh(textGeometry, textMaterial);

    // Scale and position text
    scaleAndPositionText(font); // Pass font to allow recreation with centering

    scene.add(textMesh);
}

function scaleAndPositionText(font) { // Added font parameter
    if (!textMesh && !font) return; // Ensure font is available if textMesh needs recreation

    // Camera and scene setup for scaling calculation
    camera.updateProjectionMatrix();
    // textMesh.position.z = 0; // Text is placed at z=0 by default after new TextGeometry and centering.
    // The camera.position.z is taken from its current setting (e.g., 50 from init())

    const distance = camera.position.z - (textMesh.position.z || 0); // textMesh.position.z should be 0 here
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
    const visibleWidth = visibleHeight * camera.aspect;
    const desiredTextScreenWidth = visibleWidth * 0.6; // New trial value, make text smaller

    // Re-create text geometry for centering and proper scaling
    // This ensures that scaling is applied correctly after centering.
    if (font) { // Only recreate if font is passed (e.g., during init or if needed on resize)
        scene.remove(textMesh); // Remove old mesh

        const newTextGeometry = new THREE.TextGeometry(textContent, {
            font: font,
            size: 10, // Base size, will be scaled
            height: 0.01, // Very flat
            curveSegments: 12,
            bevelEnabled: false
        });
        newTextGeometry.center(); // Center the geometry

        // Use the existing material or create a new one if it wasn't created yet
        const material = textMesh ? textMesh.material : new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        textMesh = new THREE.Mesh(newTextGeometry, material);
        scene.add(textMesh); // Add new mesh to scene
    }


    // Ensure the bounding box is up to date for the current geometry
    textMesh.geometry.computeBoundingBox();
    const boundingBox = textMesh.geometry.boundingBox;
    const currentTextWidth = boundingBox.max.x - boundingBox.min.x;

    if (currentTextWidth > 0) {
        const scale = desiredTextScreenWidth / currentTextWidth;
        textMesh.scale.set(scale, scale, scale); // Uniform scaling for simplicity, adjust Z scale if depth is an issue
    }

    // Position the centered and scaled mesh
    // Move text up by 25% of visible height from the center of the screen.
    const verticalOffset = visibleHeight * 0.25;
    textMesh.position.set(0, verticalOffset, 0); // X=0 due to geometry centering, Z=0 for flatness
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Re-calculate scale and position on resize to maintain 80% width
    // Pass the font loaded during init to allow re-creation of text geometry
    if (textMesh && textMesh.geometry.parameters.options.font) {
        scaleAndPositionText(textMesh.geometry.parameters.options.font);
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Start the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    if (typeof THREE.GLTFLoader === 'function') {
        init();
    } else {
        console.error('THREE.GLTFLoader is not available. Check script loading order and availability.');
        // Optionally, provide a user-friendly message on the page
        const container = document.getElementById('text-container');
        if (container) {
            container.innerHTML = '<p style="color: white; font-size: 2vw; text-align: center; margin-top: 40vh;">Error: Could not load essential 3D components. Please try refreshing.</p>';
        }
    }
});
