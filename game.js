import * as THREE from 'three';

let scene, camera, renderer, road, material, starMat;
let currentTiltX = 0, currentTiltY = 0, offsetX = 0, offsetY = 0;
let hue = 0, score = 0;
let isJumping = false, jumpVelocity = 0;
const gravity = -0.022; // Increased gravity for snappier feel
let obstacles = [];

// --- INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 75);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
    document.body.appendChild(renderer.domElement);

    // 1. DESYNCED STARFIELD
    // We use one geometry but a pulsing material to simulate a living void
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for(let i=0; i<2500; i++) {
        starPos.push((Math.random()-0.5)*150, (Math.random()-0.5)*150, (Math.random()-0.5)*150);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 2. THE ROAD
    road = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 1000, 30, 100),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    );
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // 3. OBSTACLES (Pre-set in lanes: -7, 0, 7)
    for(let i=0; i < 6; i++) spawnObstacle(i);

    camera.position.y = 2;
    animate();
}

function spawnObstacle(i) {
    const lanes = [-7, 0, 7];
    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(6, 3, 1),
        new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true })
    );
    const randomLane = lanes[Math.floor(Math.random() * lanes.length)];
    obs.position.set(randomLane, 1.5, -((i+1)*50));
    scene.add(obs);
    obstacles.push(obs);
}

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Visual Effects
    hue += 0.002;
    road.material.color.setHSL(hue % 1, 1, 0.5);
    
    // Simulating desynced twinkle by modulating alpha with a fast Sine
    starMat.opacity = 0.3 + Math.abs(Math.sin(Date.now() * 0.0012)) * 0.7;

    // Jump Physics (Higher gravity = Tighter feel)
    if (isJumping) {
        camera.position.y += jumpVelocity;
        jumpVelocity += gravity;
        if (camera.position.y <= 2) { 
            camera.position.y = 2; 
            isJumping = false; 
        }
    }

    // World Speed
    const gameSpeed = 0.95; 
    road.position.z += gameSpeed;
    if (road.position.z > 100) road.position.z = 0;

    // --- LANE SWITCHING LOGIC ---
    // Calculate how far we are from our 'Calibrated' center
    const tiltShift = (currentTiltX - offsetX);
    
    // Map tilt to a physical X position (-10 to 10)
    const targetX = THREE.MathUtils.clamp(tiltShift * 0.6, -11, 11);
    
    // LERP: 0.3 makes it 2x faster than the previous build
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.3);
    
    // Add a slight 'lean' when switching lanes
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -tiltShift * 0.03, 0.25);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, tiltShift * 0.01, 0.2);

    obstacles.forEach(obs => {
        obs.position.z += gameSpeed;
        
        // Lane-Based Collision Detection
        const hitZ = Math.abs(obs.position.z - 0) < 1.8;
        const hitX = Math.abs(camera.position.x - obs.position.x) < 3.8;
        
        if (hitZ && hitX && camera.position.y < 3.8) {
            score = 0;
            document.getElementById('score').innerText = score;
            // Visual feedback: Flash the road white on impact
            road.material.color.setHex(0xffffff);
        }

        // Recycle obstacles once they pass the player
        if (obs.position.z > 10) {
            obs.position.z = -250;
            const lanes = [-7, 0, 7];
            obs.position.x = lanes[Math.floor(Math.random() * lanes.length)];
            score++;
            document.getElementById('score').innerText = score;
        }
    });

    renderer.render(scene, camera);
}

// --- CONTROLS & PERMISSIONS ---
document.getElementById('startBtn').addEventListener('click', async () => {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') startSensors();
    } else {
        startSensors(); // Works for Android or Desktops
    }
});

function startSensors() {
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('game-hud').style.display = 'flex';
    
    window.addEventListener('deviceorientation', (e) => {
        // Gamma is the side-to-side tilt
        currentTiltX = e.gamma || 0;
        currentTiltY = e.beta || 0;
    });
    init();
}

// Jump Trigger (Tap anywhere on screen)
window.addEventListener('touchstart', (e) => { 
    if(e.target.id !== 'resetBtn' && !isJumping) { 
        isJumping = true; 
        jumpVelocity = 0.42; 
    } 
});

// Calibration Trigger
document.getElementById('resetBtn').addEventListener('click', (e) => { 
    e.stopPropagation(); // Prevents jump when clicking reset
    offsetX = currentTiltX; 
    offsetY = currentTiltY; 
});

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
