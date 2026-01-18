import * as THREE from 'three';

let scene, camera, renderer, road, roadMaterial;
let gameActive = true;

// Progression & Stats
let score = 0; // Distance
let currency = 0; // Coins collected
let jumpXP = 0;
let jumpLevel = 1;
const MAX_JUMP_LEVEL = 10;

// Lanes & Movement
const LANES = [-5, 0, 5];
let currentLane = 1;
let isJumping = false;
let jumpVelocity = 0;
let baseGravity = -0.012; // Lower gravity = longer air time
let isSliding = false;

// Entities
let obstacles = [];
let coins = [];
let stars = []; // Array to hold individual star groups for twinkling
let hue = 0;

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 80);

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

    // 2. Varied Twinkling Stars
    createStarfield();

    // 3. Initial Spawns (Start obstacles further out)
    for (let i = 0; i < 10; i++) {
        spawnObstacleAndCoin(-60 - (i * 40));
    }

    setupInput();
    animate();
}

function createStarfield() {
    // Create 3 separate star groups with different "twinkle" offsets
    for (let g = 0; g < 3; g++) {
        const starGeo = new THREE.BufferGeometry();
        const coords = [];
        for (let i = 0; i < 600; i++) {
            coords.push((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
        const sMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true });
        const sPoints = new THREE.Points(starGeo, sMat);
        sPoints.userData = { offset: Math.random() * 10 }; // Random timing offset
        scene.add(sPoints);
        stars.push(sPoints);
    }
}

function spawnObstacleAndCoin(zPos) {
    const lane = Math.floor(Math.random() * 3);
    const isHigh = Math.random() > 0.5;

    if (isHigh) {
        // High Gate: Slide Under
        const gate = new THREE.Mesh(new THREE.BoxGeometry(5, 2, 1), new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true }));
        gate.position.set(LANES[lane], 3.8, zPos);
        gate.userData = { type: 'slide' };
        scene.add(gate);
        obstacles.push(gate);
        // Coin is UNDER the gate
        createCoin(LANES[lane], 1.2, zPos);
    } else {
        // Low Barricade: Jump Over
        const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 1), new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true }));
        wall.position.set(LANES[lane], 0.75, zPos);
        wall.userData = { type: 'jump' };
        scene.add(wall);
        obstacles.push(wall);
        // Coin is OVER the wall
        createCoin(LANES[lane], 4.5, zPos);
    }
}

function createCoin(x, y, z) {
    const coin = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    coin.position.set(x, y, z);
    scene.add(coin);
    coins.push(coin);
}

function setupInput() {
    // Simple Keyboard Logic
    window.addEventListener('keydown', (e) => {
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && currentLane > 0) currentLane--;
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && currentLane < 2) currentLane++;
        if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && !isJumping) triggerJump();
        if ((e.code === 'ArrowDown' || e.code === 'KeyS') && !isSliding) triggerSlide();
    });

    // Touch Swipe Logic
    let sX, sY;
    window.addEventListener('touchstart', e => { sX = e.touches[0].clientX; sY = e.touches[0].clientY; });
    window.addEventListener('touchend', e => {
        const dX = e.changedTouches[0].clientX - sX;
        const dY = e.changedTouches[0].clientY - sY;
        if (Math.abs(dX) > Math.abs(dY)) {
            if (dX > 40 && currentLane < 2) currentLane++;
            if (dX < -40 && currentLane > 0) currentLane--;
        } else {
            if (dY < -40 && !isJumping) triggerJump();
            if (dY > 40 && !isSliding) triggerSlide();
        }
    });
}

function triggerJump() {
    isJumping = true;
    // Skill usage improvement:
    jumpXP++;
    if (jumpXP >= jumpLevel * 5 && jumpLevel < MAX_JUMP_LEVEL) {
        jumpLevel++;
        jumpXP = 0;
        console.log("Jump Upgraded to Level " + jumpLevel);
    }
    jumpVelocity = 0.3;
}

function triggerSlide() {
    isSliding = true;
    setTimeout(() => { isSliding = false; }, 800);
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    const speed = 0.7; // Constant game speed
    score += 0.1; // Distance score
    document.getElementById('score').innerText = Math.floor(score);

    // 1. Gravity Logic (Air time increases with jumpLevel)
    if (isJumping) {
        camera.position.y += jumpVelocity;
        // Gravity gets weaker as level goes up (Divide base gravity by level factor)
        const gravityEffect = baseGravity / (1 + (jumpLevel * 0.1));
        jumpVelocity += gravityEffect;
        
        if (camera.position.y <= 2) {
            camera.position.y = 2;
            isJumping = false;
        }
    }

    // 2. Smooth Positioning
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, LANES[currentLane], 0.15);
    const targetY = isSliding ? 1.0 : (isJumping ? camera.position.y : 2);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.2);

    // 3. Entity Movement & Recycling
    road.position.z += speed;
    if (road.position.z > 100) road.position.z = 0;

    // Twinkling Stars Logic (Randomized)
    stars.forEach(s => {
        s.material.opacity = 0.3 + Math.sin((Date.now() * 0.003) + s.userData.offset) * 0.4;
    });

    // Obstacles
    obstacles.forEach((obs, i) => {
        obs.position.z += speed;
        // Collision
        if (Math.abs(obs.position.z) < 1.2 && Math.abs(obs.position.x - camera.position.x) < 2) {
            if (obs.userData.type === 'jump' && camera.position.y < 3.2) gameOver();
            if (obs.userData.type === 'slide' && !isSliding) gameOver();
        }
        // Recycle
        if (obs.position.z > 15) {
            scene.remove(obs);
            obstacles.splice(i, 1);
            spawnObstacleAndCoin(-350); // Respawn far back
        }
    });

    // Coins
    coins.forEach((coin, i) => {
        coin.position.z += speed;
        coin.rotation.y += 0.05;
        if (camera.position.distanceTo(coin.position) < 2.5) {
            scene.remove(coin);
            coins.splice(i, 1);
            currency++; // This is your upgrade money
            console.log("Currency: " + currency);
        }
        if (coin.position.z > 15) {
            scene.remove(coin);
            coins.splice(i, 1);
        }
    });

    renderer.render(scene, camera);
}

function gameOver() {
    gameActive = false;
    scene.background = new THREE.Color(0x330000);
    alert("CRASH! Distance: " + Math.floor(score) + " | Currency Collected: " + currency);
    location.reload();
}

document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('game-hud').style.display = 'flex';
    init();
});
