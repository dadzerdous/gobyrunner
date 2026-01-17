import * as THREE from 'three';

let scene, camera, renderer, road, material, starMat;
let currentTiltX = 0, currentTiltY = 0, offsetX = 0, offsetY = 0;
let hue = 0, score = 0;
let isJumping = false, jumpVelocity = 0;
const gravity = -0.015;
let obstacles = [];

// --- INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for(let i=0; i<3000; i++) {
        starPos.push((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true });
    scene.add(new THREE.Points(starGeo, starMat));

    // Road
    road = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 1000, 30, 100),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    );
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // Obstacles
    for(let i=0; i < 6; i++) spawnObstacle(i);

    camera.position.y = 2;
    animate();
}

function spawnObstacle(i) {
    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(5, 2, 1),
        new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true })
    );
    obs.position.set((Math.random()-0.5)*20, 1, -((i+1)*40));
    scene.add(obs);
    obstacles.push(obs);
}

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);

    hue += 0.002;
    road.material.color.setHSL(hue % 1, 1, 0.5);
    starMat.opacity = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;

    if (isJumping) {
        camera.position.y += jumpVelocity;
        jumpVelocity += gravity;
        if (camera.position.y <= 2) { camera.position.y = 2; isJumping = false; }
    }

    road.position.z += 0.6;
    if (road.position.z > 100) road.position.z = 0;

    obstacles.forEach(obs => {
        obs.position.z += 0.6;
        const playerX = camera.rotation.y * -25; 
        if (Math.abs(obs.position.z) < 1.5 && Math.abs(obs.position.x - playerX) < 3 && camera.position.y < 3) {
            score = 0;
            document.getElementById('score').innerText = score;
        }
        if (obs.position.z > 10) {
            obs.position.z = -200;
            obs.position.x = (Math.random()-0.5)*20;
            score++;
            document.getElementById('score').innerText = score;
        }
    });

    const targetRotY = -(currentTiltX - offsetX) * 0.03;
    const targetRotX = (currentTiltY - offsetY) * 0.015;
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY, 0.1);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX, 0.1);

    renderer.render(scene, camera);
}

// --- PERMISSIONS & INPUT ---
document.getElementById('startBtn').addEventListener('click', async () => {
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') startSensors();
    } else {
        startSensors();
    }
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

window.addEventListener('touchstart', () => { if(!isJumping) { isJumping = true; jumpVelocity = 0.35; } });
document.getElementById('resetBtn').addEventListener('click', () => { offsetX = currentTiltX; offsetY = currentTiltY; });

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
