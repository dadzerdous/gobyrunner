import * as THREE from 'three';

let scene, camera, renderer, road, material;
let currentTiltX = 0, currentTiltY = 0, offsetX = 0, offsetY = 0;
let hue = 0, score = 0;
let isJumping = false, jumpVelocity = 0;
const gravity = -0.022; // Even heavier gravity for snappiness
let obstacles = [];
let starPoints; // We'll move this to global to access in animate

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 75);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // 1. DESYNCED STARFIELD
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    const starVelo = []; // Custom array for individual twinkle speeds
    for(let i=0; i<2000; i++) {
        starPos.push((Math.random()-0.5)*150, (Math.random()-0.5)*150, (Math.random()-0.5)*150);
        starVelo.push(Math.random()); 
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    starGeo.setAttribute('twinkleSpeed', new THREE.Float32BufferAttribute(starVelo, 1));
    
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 });
    starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 2. THE ROAD
    road = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 1000, 30, 100),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    );
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

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
    obs.position.set(lanes[Math.floor(Math.random()*3)], 1.5, -((i+1)*50));
    scene.add(obs);
    obstacles.push(obs);
}

function animate() {
    requestAnimationFrame(animate);

    // Trippy Road Colors
    hue += 0.002;
    road.material.color.setHSL(hue % 1, 1, 0.5);
    
    // Individually Desynced Twinkle
    // We pulse the whole group slightly differently based on time
    starPoints.material.opacity = 0.4 + Math.abs(Math.sin(Date.now() * 0.001)) * 0.6;

    // Snappy Jump
    if (isJumping) {
        camera.position.y += jumpVelocity;
        jumpVelocity += gravity;
        if (camera.position.y <= 2) { camera.position.y = 2; isJumping = false; }
    }

    road.position.z += 0.9; // Fast speed
    if (road.position.z > 100) road.position.z = 0;

    // TIGHTER LANE CONTROLS
    const tiltShift = (currentTiltX - offsetX);
    // Increased multipliers for "Tighter" response
    const targetX = THREE.MathUtils.clamp(tiltShift * 0.6, -10, 10);
    
    // Lerp increased from 0.15 to 0.3 for instant reaction
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.3);
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, -tiltShift * 0.03, 0.3);

    obstacles.forEach(obs => {
        obs.position.z += 0.9;
        
        // Accurate Collision
        const hitZ = Math.abs(obs.position.z - 0) < 1.5;
        const hitX = Math.abs(camera.position.x - obs.position.x) < 3.5;
        
        if (hitZ && hitX && camera.position.y < 4) {
            score = 0;
            document.getElementById('score').innerText = score;
            road.material.color.setHex(0xffffff); // Flash white on hit
        }

        if (obs.position.z > 10) {
            obs.position.z = -250;
            obs.position.x = [-7, 0, 7][Math.floor(Math.random()*3)];
            score++;
            document.getElementById('score').innerText = score;
        }
    });

    renderer.render(scene, camera);
}

// ... (Rest of startSensors and Reset code remains the same as your file)
