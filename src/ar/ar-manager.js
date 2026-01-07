/**
 * AR Manager - Gerencia sessão WebXR e renderização Three.js
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let renderer = null;
let scene = null;
let camera = null;
let xrSession = null;
let xrReferenceSpace = null;
let xrHitTestSource = null;
let reticle = null;
let monsterModel = null;
let monsterMixer = null;
let weaponModel = null;
let weaponMixer = null;
let clock = null;
let isARActive = false;

// Callbacks
let onMonsterPlaced = null;
let onAREnd = null;

// Cache de modelos carregados
const modelCache = new Map();

/**
 * Verifica se AR está disponível
 * @returns {Promise<boolean>}
 */
export async function isARSupported() {
    if (!navigator.xr) return false;
    try {
        return await navigator.xr.isSessionSupported('immersive-ar');
    } catch {
        return false;
    }
}

/**
 * Inicializa a cena Three.js para AR
 */
function initScene() {
    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Adiciona canvas ao AR screen
    const arScreen = document.getElementById('ar-screen');
    if (arScreen) {
        // Remove canvas anterior se existir
        const existingCanvas = arScreen.querySelector('canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        arScreen.insertBefore(renderer.domElement, arScreen.firstChild);
    }

    // Scene
    scene = new THREE.Scene();

    // Camera (será controlada pelo WebXR)
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Luzes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Reticle (indicador de posicionamento)
    const reticleGeometry = new THREE.RingGeometry(0.1, 0.12, 32);
    const reticleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide
    });
    reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);

    // Clock para animações
    clock = new THREE.Clock();
}

/**
 * Carrega o modelo GLB do monstro
 * @param {string} modelPath - Caminho para o arquivo GLB
 * @returns {Promise<THREE.Group>}
 */
export async function loadMonsterModel(modelPath = '/assets/models/monster.glb') {
    console.log('📦 Carregando modelo:', modelPath);

    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        // Configura compressão Draco
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/assets/draco/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            modelPath,
            (gltf) => {
                console.log('✅ Modelo carregado com sucesso!');
                const model = gltf.scene;

                // Escala o modelo
                model.scale.set(1.0, 1.0, 1.0);

                // Configura sombras
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Configura animações se houver
                if (gltf.animations && gltf.animations.length > 0) {
                    monsterMixer = new THREE.AnimationMixer(model);
                    const action = monsterMixer.clipAction(gltf.animations[0]);
                    action.play();
                }

                monsterModel = model;
                resolve(model);
            },
            (progress) => {
                if (progress.total > 0) {
                    console.log('⏳ Carregando modelo:', (progress.loaded / progress.total * 100).toFixed(0) + '%');
                }
            },
            (error) => {
                console.error('❌ Erro ao carregar modelo GLB:', error);
                console.error('❌ Caminho tentado:', modelPath);
                // Cria modelo placeholder se falhar
                const geometry = new THREE.BoxGeometry(0.3, 0.5, 0.3);
                const material = new THREE.MeshStandardMaterial({
                    color: 0xff0000,
                    emissive: 0x330000
                });
                const placeholder = new THREE.Mesh(geometry, material);
                placeholder.castShadow = true;
                monsterModel = placeholder;
                resolve(placeholder);
            }
        );
    });
}

/**
 * Carrega o modelo GLB de uma arma
 * @param {string} modelPath - Caminho para o arquivo GLB da arma
 * @returns {Promise<THREE.Group>}
 */
export async function loadWeaponModel(modelPath) {
    if (!modelPath) {
        console.log('⚔️ Nenhum modelo de arma especificado');
        return null;
    }

    console.log('⚔️ Carregando modelo de arma:', modelPath);

    // Verifica cache
    if (modelCache.has(modelPath)) {
        console.log('✅ Modelo de arma carregado do cache');
        const cachedModel = modelCache.get(modelPath).clone();
        return cachedModel;
    }

    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        // Configura compressão Draco
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/assets/draco/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            modelPath,
            (gltf) => {
                console.log('✅ Modelo de arma carregado!');
                const model = gltf.scene;

                // Escala menor para armas (na mão do jogador)
                model.scale.set(0.15, 0.15, 0.15);

                // Configura sombras
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = false;
                    }
                });

                // Salva no cache
                modelCache.set(modelPath, model.clone());

                // Configura animações se houver
                if (gltf.animations && gltf.animations.length > 0) {
                    weaponMixer = new THREE.AnimationMixer(model);
                    const action = weaponMixer.clipAction(gltf.animations[0]);
                    action.play();
                }

                weaponModel = model;
                resolve(model);
            },
            (progress) => {
                if (progress.total > 0) {
                    console.log('⏳ Carregando arma:', (progress.loaded / progress.total * 100).toFixed(0) + '%');
                }
            },
            (error) => {
                console.error('❌ Erro ao carregar modelo de arma:', error);
                resolve(null);
            }
        );
    });
}

/**
 * Exibe a arma equipada na tela AR (canto inferior)
 * @param {string} modelPath - Caminho para o modelo da arma
 */
export async function showEquippedWeapon(modelPath) {
    if (!scene || !camera) return;

    // Remove arma anterior se existir
    const existingWeapon = scene.getObjectByName('equipped-weapon');
    if (existingWeapon) {
        scene.remove(existingWeapon);
    }

    if (!modelPath) return;

    const weapon = await loadWeaponModel(modelPath);
    if (!weapon) return;

    weapon.name = 'equipped-weapon';

    // Posiciona a arma no canto inferior direito da visão
    // A posição será atualizada no renderFrame para seguir a câmera
    scene.add(weapon);

    console.log('⚔️ Arma equipada exibida na tela');
}

/**
 * Atualiza a posição da arma equipada para seguir a câmera
 */
function updateWeaponPosition() {
    const weapon = scene?.getObjectByName('equipped-weapon');
    if (!weapon || !camera) return;

    // Posiciona a arma na frente e abaixo da câmera (simulando estar na mão)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    // Offset para parecer que está na mão direita do jogador
    const rightOffset = new THREE.Vector3();
    rightOffset.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

    weapon.position.copy(cameraPosition)
        .add(cameraDirection.multiplyScalar(0.4)) // À frente (mais longe para evitar clipping)
        .add(rightOffset.multiplyScalar(0.10))    // À direita (menos offset lateral)
        .add(new THREE.Vector3(0, -0.10, 0));     // Abaixo (mais alto)

    // Rotaciona para apontar na direção da câmera
    weapon.lookAt(
        weapon.position.x + cameraDirection.x,
        weapon.position.y,
        weapon.position.z + cameraDirection.z
    );
    weapon.rotation.z = Math.PI / 4; // Inclina levemente
}

/**
 * Anima a arma ao atacar
 */
export function animateWeaponAttack() {
    const weapon = scene?.getObjectByName('equipped-weapon');
    if (!weapon) return;

    const originalRotation = weapon.rotation.z;
    const originalScale = weapon.scale.clone();

    // Animação de swing
    let progress = 0;
    const duration = 300; // ms
    const startTime = performance.now();

    function animate() {
        const elapsed = performance.now() - startTime;
        progress = Math.min(elapsed / duration, 1);

        // Swing arc (vai e volta)
        const swing = Math.sin(progress * Math.PI) * 0.8;
        weapon.rotation.z = originalRotation - swing;

        // Leve aumento de escala no impacto
        const scaleBoost = 1 + Math.sin(progress * Math.PI) * 0.2;
        weapon.scale.copy(originalScale).multiplyScalar(scaleBoost);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            weapon.rotation.z = originalRotation;
            weapon.scale.copy(originalScale);
        }
    }

    animate();
}

/**
 * Inicia a sessão AR
 * @param {Object} options
 * @param {string} options.monsterId - ID do template do monstro (ex: 'goblin')
 * @param {Function} options.onPlaced - Callback quando monstro é posicionado
 * @param {Function} options.onEnd - Callback quando AR termina
 */
export async function startARSession({ monsterId, onPlaced, onEnd } = {}) {
    if (!await isARSupported()) {
        console.error('AR não suportado neste dispositivo');
        return false;
    }

    onMonsterPlaced = onPlaced;
    onAREnd = onEnd;

    // Inicializa a cena se necessário
    if (!scene) {
        initScene();
    }

    try {
        // Solicita sessão AR
        xrSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test', 'local-floor'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        });

        // Configura o renderer para a sessão
        renderer.xr.setReferenceSpaceType('local-floor');
        await renderer.xr.setSession(xrSession);

        // Obtém o reference space
        xrReferenceSpace = await xrSession.requestReferenceSpace('local-floor');

        // Configura hit-test
        const viewerSpace = await xrSession.requestReferenceSpace('viewer');
        xrHitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

        // Handle session end
        xrSession.addEventListener('end', () => {
            isARActive = false;
            xrSession = null;
            xrHitTestSource = null;
            if (onAREnd) onAREnd();
        });

        // Inicia o loop de renderização
        isARActive = true;
        renderer.setAnimationLoop(renderFrame);

        // Carrega o modelo específico do monstro
        const modelPath = monsterId
            ? `/assets/models/${monsterId}.glb`
            : '/assets/models/monster.glb';
        await loadMonsterModel(modelPath);

        console.log('✅ Sessão AR iniciada com sucesso');
        return true;

    } catch (error) {
        console.error('Erro ao iniciar sessão AR:', error);
        return false;
    }
}

/**
 * Posiciona o monstro na cena
 * @param {THREE.Matrix4} hitMatrix - Matriz de posição do hit test
 */
function placeMonster(hitMatrix) {
    if (!monsterModel || !scene) return;

    // Remove modelo anterior se existir
    const existingMonster = scene.getObjectByName('monster');
    if (existingMonster) {
        scene.remove(existingMonster);
    }

    // Adiciona o modelo na posição do hit test
    monsterModel.name = 'monster';
    monsterModel.position.setFromMatrixPosition(hitMatrix);
    monsterModel.updateMatrix();
    scene.add(monsterModel);

    // Esconde o reticle
    reticle.visible = false;

    // Callback
    if (onMonsterPlaced) {
        onMonsterPlaced(monsterModel);
    }
}

/**
 * Frame de renderização AR
 * @param {number} time 
 * @param {XRFrame} frame 
 */
function renderFrame(time, frame) {
    if (!frame || !xrSession) return;

    // Atualiza animações
    const delta = clock.getDelta();
    if (monsterMixer) {
        monsterMixer.update(delta);
    }
    if (weaponMixer) {
        weaponMixer.update(delta);
    }

    // Hit test para posicionar o reticle
    if (xrHitTestSource) {
        const hitTestResults = frame.getHitTestResults(xrHitTestSource);

        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const hitPose = hit.getPose(xrReferenceSpace);

            if (hitPose) {
                reticle.visible = true;
                reticle.matrix.fromArray(hitPose.transform.matrix);
                reticle.matrix.decompose(reticle.position, reticle.quaternion, reticle.scale);

                // Se o monstro ainda não foi posicionado, usa o primeiro hit válido
                if (!scene.getObjectByName('monster')) {
                    const hitMatrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
                    placeMonster(hitMatrix);
                }
            }
        } else {
            reticle.visible = false;
        }
    }

    // Atualiza a animação do monstro (pulsação para indicar que está vivo)
    const monster = scene.getObjectByName('monster');
    if (monster) {
        // Pequena animação de "respiração"
        const breathe = Math.sin(time * 0.002) * 0.02;
        monster.scale.setScalar(0.5 + breathe);

        // Faz o monstro olhar para a câmera
        const cameraPosition = new THREE.Vector3();
        camera.getWorldPosition(cameraPosition);
        monster.lookAt(cameraPosition.x, monster.position.y, cameraPosition.z);
    }

    // Atualiza a posição da arma equipada
    updateWeaponPosition();

    // Renderiza
    renderer.render(scene, camera);
}

/**
 * Mostra efeito de dano no monstro
 * @param {number} damage 
 * @param {boolean} isCritical 
 */
export function showMonsterDamageEffect(damage, isCritical = false) {
    const monster = scene?.getObjectByName('monster');
    if (!monster) return;

    // Flash vermelho
    monster.traverse((child) => {
        if (child.isMesh && child.material) {
            const originalColor = child.material.color.clone();
            child.material.color.set(isCritical ? 0xffd700 : 0xff0000);

            setTimeout(() => {
                child.material.color.copy(originalColor);
            }, 150);
        }
    });

    // Shake do monstro
    const originalPos = monster.position.clone();
    const shakeIntensity = isCritical ? 0.1 : 0.05;

    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
        monster.position.x = originalPos.x + (Math.random() - 0.5) * shakeIntensity;
        monster.position.z = originalPos.z + (Math.random() - 0.5) * shakeIntensity;
        shakeCount++;

        if (shakeCount > 5) {
            clearInterval(shakeInterval);
            monster.position.copy(originalPos);
        }
    }, 50);
}

/**
 * Mostra efeito de morte do monstro
 */
export function showMonsterDeathEffect() {
    const monster = scene?.getObjectByName('monster');
    if (!monster) return;

    // Animação de morte (shrink + fade)
    const duration = 1000;
    const startTime = performance.now();

    function animate() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        monster.scale.setScalar(0.5 * (1 - progress));
        monster.rotation.y += 0.1;

        monster.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.opacity = 1 - progress;
                child.material.transparent = true;
            }
        });

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            scene.remove(monster);
        }
    }

    animate();
}

/**
 * Encerra a sessão AR
 */
export async function endARSession() {
    if (xrSession) {
        await xrSession.end();
        xrSession = null;
    }

    // Limpa a cena
    if (scene) {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }

    // Remove o canvas
    if (renderer?.domElement) {
        renderer.domElement.remove();
    }

    isARActive = false;
    monsterModel = null;
    monsterMixer = null;
    weaponModel = null;
    weaponMixer = null;
}

/**
 * Verifica se AR está ativo
 * @returns {boolean}
 */
export function isARSessionActive() {
    return isARActive;
}

/**
 * Obtém a posição do monstro na cena
 * @returns {THREE.Vector3|null}
 */
export function getMonsterPosition() {
    const monster = scene?.getObjectByName('monster');
    return monster ? monster.position.clone() : null;
}
