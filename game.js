import * as THREE from 'three';

let scene, camera, renderer, road, roadMaterial, starMat;
let score = 0;
let gameActive = true;

// Lane Logic
const LANES = [-5, 0, 5];
let currentLane = 1; // 0: Left, 1: Center, 2: Right

// Movement & Physics
let isJumping = false;
let jumpVelocity = 0;
const gravity = -0.012;
let isSliding = false;

// Entities
let obstacles = [];
let coins = [];
let hue = 0;

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 70);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(LANES[currentLane], 2, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 1. The Road
    const roadGeo = new THREE.PlaneGeometry(20, 2000, 20, 200);
    roadMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    road = new THREE.Mesh(roadGeo, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // 2. The Stars
    const starGeo = new THREE.BufferGeometry();
    const starCoords = [];
    for (let i = 0; i < 2000; i++) {
        starCoords.push((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true });
    scene.add(new THREE.Points(starGeo, starMat));

    // 3. Initial Spawns
    for (let i = 0; i < 8; i++) {
        spawnObstacleOrCoin(-50 - (i * 30));
    }

    setupInput();
    animate();
}

function spawnObstacleOrCoin(zPos) {
    const lane = Math.floor(Math.random() * 3);
    const type = Math.random();

    if (type < 0.4) {
        // Jump Barricade (Low)
        const obs = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 1), new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true }));
        obs.position.set(LANES[lane], 0.75, zPos);
        obs.userData = { type: 'jump' };
        scene.add(obs);
        obstacles.push(obs);
        
        // Add a coin above the jump
        createCoin(LANES[lane], 4, zPos);
    } else if (type < 0.7) {
        // Slide Gate (High)
        const obs = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 1), new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true }));
        obs.position.set(LANES[lane], 3.5, zPos);
        obs.userData = { type: 'slide' };
        scene.add(obs);
        obstacles.push(obs);
    } else {
        // Just Coins
        createCoin(LANES[lane], 1.5, zPos);
    }
}

function createCoin(x, y, z) {
    const coinGeo = new THREE.OctahedronGeometry(0.5);
    const coinMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.position.set(x, y, z);
    scene.add(coin);
    coins.push(coin);
}

function setupInput() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && currentLane > 0) currentLane--;
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && currentLane < 2) currentLane++;
        if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && !isJumping) triggerJump();
        if ((e.code === 'ArrowDown' || e.code === 'KeyS') && !isSliding) triggerSlide();
    });

    // Touch Swipes
    let startX, startY;
    window.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });

    window.addEventListener('touchend', e => {
        const diffX = e.changedTouches[0].clientX - startX;
        const diffY = e.changedTouches[0].clientY - startY;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 40 && currentLane < 2) currentLane++;
            if (diffX < -40 && currentLane > 0) currentLane--;
        } else {
            if (diffY < -40 && !isJumping) triggerJump();
            if (diffY > 40 && !isSliding) triggerSlide();
        }
    });
}

function triggerJump() {
    isJumping = true;
    jumpVelocity = 0.3;
}

function triggerSlide() {
    isSliding = true;
    setTimeout(() => { isSliding = false; }, 800);
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    // 1. Forward Speed
    const speed = 0.6;
    road.position.z += speed;
    if (road.position.z > 100) road.position.z = 0;

    // 2. Camera Positioning (Smooth Lanes & Jump)
    if (isJumping) {
        camera.position.y += jumpVelocity;
        jumpVelocity += gravity;
        if (camera.position.y <= 2) {
            camera.position.y = 2;
            isJumping = false;
        }
    }

    const targetX = LANES[currentLane];
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.15);
    
    // Slide Height
    const targetY = isSliding ? 1.0 : (isJumping ? camera.position.y : 2);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.2);

    // 3. Visuals
    hue += 0.002;
    roadMaterial.color.setHSL(hue % 1, 0.8, 0.5);
    starMat.opacity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;

    // 4. Obstacles Logic
    obstacles.forEach((obs, i) => {
        obs.position.z += speed;
        
        // Collision
        const laneDist = Math.abs(obs.position.x - camera.position.x);
        const zDist = Math.abs(obs.position.z - camera.position.z);
        
        if (laneDist < 2 && zDist < 1) {
            if (obs.userData.type === 'jump' && camera.position.y < 3) gameOver();
            if (obs.userData.type === 'slide' && !isSliding) gameOver();
        }

        if (obs.position.z > 10) {
            scene.remove(obs);
            obstacles.splice(i, 1);
            spawnObstacleOrCoin(-200);
        }
    });

    // 5. Coins Logic
    coins.forEach((coin, i) => {
        coin.position.z += speed;
        coin.rotation.y += 0.05;

        if (camera.position.distanceTo(coin.position) < 2) {
            scene.remove(coin);
            coins.splice(i, 1);
            score += 10;
            document.getElementById('score').innerText = score;
        }

        if (coin.position.z > 10) {
            scene.remove(coin);
            coins.splice(i, 1);
        }
    });

    renderer.render(scene, camera);
}

function gameOver() {
    // Flash Red
    scene.background = new THREE.Color(0xff0000);
    setTimeout(() => {
        scene.background = new THREE.Color(0x000000);
        score = 0;
        document.getElementById('score').innerText = score;
    }, 200);
}

document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('game-hud').style.display = 'flex';
    init();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    location.reload(); // Quick reset
});
