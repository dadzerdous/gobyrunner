import * as THREE from 'three';

        let scene, camera, renderer, road, material, starMat;
        let currentTiltX = 0, offsetX = 0, keyboardX = 0;
        let hue = 0, score = 0;
        let isJumping = false, jumpVelocity = 0;
        const gravity = -0.015;
        let obstacles = [];

        function init() {
            scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x000000, 5, 60);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);

            // 1. Trippy Road
            const roadGeo = new THREE.PlaneGeometry(25, 1000, 25, 100);
            material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
            road = new THREE.Mesh(roadGeo, material);
            road.rotation.x = -Math.PI / 2;
            scene.add(road);

            // 2. Twinkling Stars
            const starGeo = new THREE.BufferGeometry();
            const coords = [];
            for(let i=0; i<3000; i++) {
                coords.push((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
            }
            starGeo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
            starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true });
            scene.add(new THREE.Points(starGeo, starMat));

            // 3. Setup Obstacles
            for(let i=0; i<5; i++) createObstacle(i);

            camera.position.y = 2;
            setupControls();
            animate();
        }

        function createObstacle(i) {
            const obs = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 1), new THREE.MeshBasicMaterial({ color: 0xff0055, wireframe: true }));
            obs.position.set((Math.random()-0.5)*15, 1, -((i+1)*35));
            scene.add(obs);
            obstacles.push(obs);
        }

        function setupControls() {
            // PC Keyboard
            window.addEventListener('keydown', (e) => {
                if(e.code === 'ArrowLeft' || e.code === 'KeyA') keyboardX = -20;
                if(e.code === 'ArrowRight' || e.code === 'KeyD') keyboardX = 20;
                if(e.code === 'Space' && !isJumping) jump();
            });
            window.addEventListener('keyup', () => keyboardX = 0);
            
            // Mobile Tap
            window.addEventListener('touchstart', () => { if(!isJumping) jump(); });
        }

        function jump() {
            isJumping = true;
            jumpVelocity = 0.35;
        }

        function animate() {
            requestAnimationFrame(animate);

            // Visuals
            hue += 0.002;
            material.color.setHSL(hue % 1, 1, 0.5);
            starMat.opacity = 0.4 + Math.sin(Date.now() * 0.005) * 0.3;

            // Physics
            if (isJumping) {
                camera.position.y += jumpVelocity;
                jumpVelocity += gravity;
                if (camera.position.y <= 2) { camera.position.y = 2; isJumping = false; }
            }

            road.position.z += 0.6;
            if (road.position.z > 100) road.position.z = 0;

            // Combined Input (Tilt + Keyboard)
            const inputX = currentTiltX - offsetX + keyboardX;
            const targetRotY = -inputX * 0.02;
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY, 0.1);

            // Obstacles & Collision
            obstacles.forEach(obs => {
                obs.position.z += 0.6;
                const playerX = camera.rotation.y * -20;
                if (Math.abs(obs.position.z) < 1 && Math.abs(obs.position.x - playerX) < 2.5 && camera.position.y < 3.5) {
                    score = 0; // Hit!
                    document.getElementById('score').innerText = score;
                }
                if (obs.position.z > 10) {
                    obs.position.z = -150;
                    obs.position.x = (Math.random()-0.5)*15;
                    score++;
                    document.getElementById('score').innerText = score;
                }
            });

            renderer.render(scene, camera);
        }

        document.getElementById('startBtn').addEventListener('click', async () => {
            if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
                const p = await DeviceOrientationEvent.requestPermission();
                if (p === 'granted') start();
            } else start();
        });

        function start() {
            document.getElementById('ui-overlay').style.display = 'none';
            document.getElementById('game-hud').style.display = 'flex';
            window.addEventListener('deviceorientation', (e) => { currentTiltX = e.gamma; });
            init();
        }

        document.getElementById('resetBtn').addEventListener('click', () => offsetX = currentTiltX);
