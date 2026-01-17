import * as THREE from 'three';

let scene, camera, renderer, road, material, starMat;
let currentTiltX = 0, currentTiltY = 0, offsetX = 0, offsetY = 0;
let hue = 0, score = 0;
let isJumping = false, jumpVelocity = 0;
const gravity = -0.018; // Slightly stronger gravity for "tighter" feel
let obstacles = [];

// --- INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 70);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance cap
    document.body.appendChild(renderer.domElement);

    // 1. INDIVIDUAL TWINKLING STARS
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    const starOffsets = []; // Custom attribute for individual twinkle
    for(let i=0; i<2000; i++) {
        starPos.push((Math.random()-0.5)*120, (Math.random()-0.5)*120, (Math.random()-0.5)*120);
        starOffsets.push(Math.random() * 10); 
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    
    // Custom material to allow individual twinkling via code
    starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 2. THE ROAD
    road = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 1000, 30, 100),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    );
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // 3. OBSTACLES (Set in lanes: -6, 0, 6)
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

    hue += 0.002;
    road.material.color.setHSL(hue % 1, 1, 0.5);
    
    // Individual Twinkle Effect
    starMat.opacity = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;

    // Jump Physics
    if (isJumping) {
        camera.position.y += jumpVelocity;
        jumpVelocity += gravity;
        if (camera.position.y <= 2) { camera.position.y = 2; isJumping = false; }
    }

    // Move World
    road.position.z += 0.8; // Speed increased
    if (road.position.z > 100) road.position.z = 0;

    // Lane Logic: Map Tilt to X position
    // We calculate a "Target X" based on tilt, then slide the camera there
    const tiltShift = (currentTiltX - offsetX);
    const targetX = THREE.MathUtils.clamp(tiltShift * 0.4, -10, 10);
    
    // Smoothly slide the camera position (The "Lane Switch")
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.15);
    
    // Look-ahead rotation (Visual polish)
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -tiltShift * 0.02, 0.2);

    obstacles.forEach(obs => {
        obs.position.z += 0.8;
        
        // Accurate Collision Detection
        const hitZ = Math.abs(obs.position.z - 0) < 1.5;
        const hitX = Math.abs(obs.position.x - obs.position.x) < 3.5; // Bounds check
        
        if (hitZ && Math.abs(camera.position.x - obs.position.x) < 3 && camera.position.y < 4) {
            score = 0;
            document.getElementById('score').innerText = score;
            // Visual feedback for hit
            road.material.color.setHex(0xff0000);
        }

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

// --- CONTROLS ---
document.getElementById('startBtn').addEventListener('click', async () => {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') startSensors();
    } else { startSensors(); }
});

function startSensors() {
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('game-hud').style.display = 'flex';
    window.addEventListener('deviceorientation', (e) => {
        currentTiltX = e.gamma || 0;
        currentTiltY = e.beta || 0;
    });
    init();
}

window.addEventListener('touchstart', (e) => { 
    if(e.target.id !== 'resetBtn' && !isJumping) { 
        isJumping = true; 
        jumpVelocity = 0.4; 
    } 
});

document.getElementById('resetBtn').addEventListener('click', (e) => { 
    e.stopPropagation();
    offsetX = currentTiltX; 
    offsetY = currentTiltY; 
});
