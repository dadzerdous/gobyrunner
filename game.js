import * as THREE from 'three';

let scene, camera, renderer, road, roadMaterial;
let gameActive = true;

// --- PROGRESSION & STATS ---
let score = 0; 
let currency = 0; 
let jumpXP = 0;
let jumpLevel = 1;
const MAX_JUMP_LEVEL = 10;

// --- LANES & MOVEMENT ---
const LANES = [-5, 0, 5];
let currentLane = 1;
let isJumping = false;
let jumpVelocity = 0;
let baseGravity = -0.012; 
let isSliding = false;

// --- ENTITIES ---
let obstacles = [];
let coins = [];
let stars = [];
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
    const roadGeo = new THREE.PlaneGeometry(30, 2000, 30, 200);
    roadMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    road = new THREE.Mesh(roadGeo, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // 2. Starfield
    for (let g = 0; g < 3; g++) {
        const starGeo = new THREE.BufferGeometry();
        const coords = [];
        for (let i = 0; i < 600; i++) {
            coords.push((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
        }
        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
        const sMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true });
        const sPoints = new THREE.Points(starGeo, sMat);
        sPoints.userData = { offset: Math.random() * 10 }; 
        scene.add(sPoints);
        stars.push(sPoints);
    }

    // 3. Initial Spawn
    for (let i = 0; i < 10; i++) {
        spawnObstacleAndCoin(-60 - (i * 45));
    }

    setupInput();
    animate();
}

function spawnObstacleAndCoin(zPos) {
    const lane = Math.floor(Math.random() * 3);
    const isHighGate = Math.random() > 0.5;

    if (isHighGate) {
        const gate = new THREE.Mesh(new THREE.BoxGeometry(5, 2.5, 1), new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true }));
        gate.position.set(LANES[lane], 4.0, zPos);
        gate.userData = { type: 'slide' };
        scene.add(gate);
        obstacles.push(gate);
        createCoin(LANES[lane], 1.2, zPos);
    } else {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 1.8, 1), new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true }));
        wall.position.set(LANES[lane], 0.9, zPos);
        wall.userData = { type: 'jump' };
        scene.add(wall);
        obstacles.push(wall);
        createCoin(LANES[lane], 5.0, zPos);
    }
}

function createCoin(x, y, z) {
    const coin = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    coin.position.set(x, y, z);
    scene.add(coin);
    coins.push(coin);
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && currentLane > 0) currentLane--;
        if ((e.code === 'ArrowRight' || e.code === 'KeyD') && currentLane < 2) currentLane++;
        if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') && !isJumping) triggerJump();
        if ((e.code === 'ArrowDown' || e.code === 'KeyS') && !isSliding) triggerSlide();
    });

    let sX, sY;
    window.addEventListener('touchstart', e => { sX = e.touches[0].clientX; sY = e.touches[0].clientY; });
    window.addEventListener('touchend', e => {
        if (!gameActive) return;
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
    jumpVelocity = 0.32;
    jumpXP++;
    
    const xpNeeded = jumpLevel * 10; 
    let progress = (jumpXP / xpNeeded) * 100;

    if (jumpXP >= xpNeeded && jumpLevel < MAX_JUMP_LEVEL) {
        jumpLevel++;
        jumpXP = 0;
        progress = 0;
        document.getElementById('xp-bar').style.background = '#fff';
        setTimeout(() => { document.getElementById('xp-bar').style.background = '#0f0'; }, 500);
    }

    document.getElementById('xp-bar').style.width = progress + "%";
    document.getElementById('skill-label').innerText = `JUMP SKILL LVL ${jumpLevel}`;
}

function triggerSlide() {
    isSliding = true;
    setTimeout(() => { isSliding = false; }, 850);
}

function animate() {
    if (!gameActive) return;
    requestAnimationFrame(animate);

    const speed = 0.75; 
    score += 0.15;
    document.getElementById('score').innerText = Math.floor(score);

    if (isJumping) {
        camera.position.y += jumpVelocity;
        const gravityEffect = baseGravity / (1 + (jumpLevel * 0.15));
        jumpVelocity += gravityEffect;
        if (camera.position.y <= 2) {
            camera.position.y = 2;
            isJumping = false;
        }
    }

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, LANES[currentLane], 0.18);
    const targetY = isSliding ? 1.0 : (isJumping ? camera.position.y : 2);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.2);

    road.position.z += speed;
    if (road.position.z > 100) road.position.z = 0;
    hue += 0.002;
    roadMaterial.color.setHSL(hue % 1, 0.8, 0.5);
    stars.forEach(s => {
        s.material.opacity = 0.2 + Math.sin((Date.now() * 0.003) + s.userData.offset) * 0.5;
    });

    obstacles.forEach((obs, i) => {
        obs.position.z += speed;
        const isNearZ = obs.position.z > 4.5 && obs.position.z < 5.5;
        const isSameLane = Math.abs(obs.position.x - camera.position.x) < 2.0;

        if (isNearZ && isSameLane) {
            if (obs.userData.type === 'jump' && camera.position.y < 3.2) gameOver();
            if (obs.userData.type === 'slide' && !isSliding) gameOver();
        }

        if (obs.position.z > 20) {
            scene.remove(obs);
            obstacles.splice(i, 1);
            spawnObstacleAndCoin(-400);
        }
    });

    coins.forEach((coin, i) => {
        coin.position.z += speed;
        coin.rotation.y += 0.06;
        if (camera.position.distanceTo(coin.position) < 2.5) {
            scene.remove(coin);
            coins.splice(i, 1);
            currency += 5;
            document.getElementById('currency-display').innerText = currency;
        }
        if (coin.position.z > 20) {
            scene.remove(coin);
            coins.splice(i, 1);
        }
    });

    renderer.render(scene, camera);
}

function gameOver() {
    gameActive = false;
    
    const shop = document.createElement('div');
    shop.id = "shop-ui";
    shop.style = "position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.95); border:3px solid #0f0; padding:30px; color:#0f0; text-align:center; z-index:100; font-family:monospace; min-width:300px; box-shadow: 0 0 20px #0f0;";
    shop.innerHTML = `
        <h2 style="text-shadow: 0 0 10px #0f0;">SYSTEM CRASH</h2>
        <p>DISTANCE: ${Math.floor(score)}m</p>
        <p>CURRENCY: <span id="shop-currency">${currency}</span></p>
        <hr style="border-color:#0f0">
        <h3>PERMANENT UPGRADES</h3>
        <p>Stay-Air Level: <span id="shop-lvl">${jumpLevel}</span></p>
        <button id="upgradeBtn" style="background:transparent; border:1px solid #0f0; color:#0f0; padding:10px; cursor:pointer; width:100%;">BUY JUMP (100 Coins)</button>
        <br><br>
        <button id="restartBtn" style="background:#0f0; color:#000; border:none; padding:15px; cursor:pointer; width:100%; font-weight:bold; font-size:1.1rem;">RETRY MISSION</button>
    `;
    document.body.appendChild(shop);

    document.getElementById('upgradeBtn').addEventListener('click', () => {
        if (currency >= 100) {
            currency -= 100;
            jumpLevel++;
            document.getElementById('shop-currency').innerText = currency;
            document.getElementById('shop-lvl').innerText = jumpLevel;
            document.getElementById('currency-display').innerText = currency;
            document.getElementById('skill-label').innerText = `JUMP SKILL LVL ${jumpLevel}`;
        }
    });

    document.getElementById('restartBtn').addEventListener('click', () => {
        // Clear all obstacles/coins from scene for fresh start
        obstacles.forEach(o => scene.remove(o));
        coins.forEach(c => scene.remove(c));
        obstacles = [];
        coins = [];
        
        // Reset Run Stats
        score = 0;
        currentLane = 1;
        camera.position.set(LANES[currentLane], 2, 5);
        
        // Remove Shop UI and Restart
        document.body.removeChild(shop);
        gameActive = true;
        animate(); 

        // Respawn initial blocks
        for (let i = 0; i < 10; i++) {
            spawnObstacleAndCoin(-60 - (i * 45));
        }
    });
}

document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('game-hud').style.display = 'flex';
    init();
});
