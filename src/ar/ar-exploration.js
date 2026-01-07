/**
 * AR Exploration Manager - Gerencia sessão AR para exploração interativa
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let renderer = null;
let scene = null;
let camera = null;
let xrSession = null;
let xrReferenceSpace = null;
let xrHitTestSource = null;
let reticle = null;
let explorationObject = null;
let explorationMixer = null;
let clock = null;
let explorationARActive = false;
let isObjectPlaced = false;

// Callbacks
let onObjectFound = null;
let onObjectClicked = null;
let onExplorationEnd = null;

// Raycaster para detecção de clique
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Mapeamento de eventos para modelos 3D
const EVENT_MODELS = {
    'ancient_chest': {
        model: null, // Usaremos geometria procedural
        color: 0x8B4513,
        geometry: 'box',
        scale: 0.3
    },
    'magic_glyph': {
        model: null,
        color: 0x00FFFF,
        geometry: 'circle',
        scale: 0.4,
        emissive: 0x006666
    },
    'monster_tracks': {
        model: null,
        color: 0x654321,
        geometry: 'tracks',
        scale: 0.3
    },
    'abandoned_shrine': {
        model: null,
        color: 0x808080,
        geometry: 'shrine',
        scale: 0.4
    }
};

/**
 * Verifica se AR está disponível
 * @returns {Promise<boolean>}
 */
export async function isExplorationARSupported() {
    if (!navigator.xr) return false;
    try {
        return await navigator.xr.isSessionSupported('immersive-ar');
    } catch {
        return false;
    }
}

/**
 * Inicializa a cena Three.js para exploração AR
 */
function initExplorationScene() {
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
    const arScreen = document.getElementById('exploration-ar-screen');
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
    scene.add(directionalLight);

    // Reticle (indicador de posicionamento)
    const reticleGeometry = new THREE.RingGeometry(0.1, 0.12, 32);
    const reticleMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
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
 * Cria o objeto de exploração baseado no evento
 * @param {Object} event - Evento de exploração
 * @returns {THREE.Group}
 */
function createExplorationObject(event) {
    const group = new THREE.Group();
    const config = EVENT_MODELS[event.id] || EVENT_MODELS['ancient_chest'];

    let mesh;

    switch (config.geometry) {
        case 'box': // Baú
            const boxGeom = new THREE.BoxGeometry(0.3, 0.2, 0.2);
            const boxMat = new THREE.MeshStandardMaterial({
                color: config.color,
                roughness: 0.7,
                metalness: 0.3
            });
            mesh = new THREE.Mesh(boxGeom, boxMat);

            // Tampa do baú
            const lidGeom = new THREE.BoxGeometry(0.32, 0.05, 0.22);
            const lidMat = new THREE.MeshStandardMaterial({
                color: 0x5C4033,
                roughness: 0.6
            });
            const lid = new THREE.Mesh(lidGeom, lidMat);
            lid.position.y = 0.125;
            group.add(lid);

            // Detalhes metálicos
            const stripGeom = new THREE.BoxGeometry(0.02, 0.21, 0.22);
            const stripMat = new THREE.MeshStandardMaterial({
                color: 0xCD7F32,
                metalness: 0.8,
                roughness: 0.2
            });
            const strip1 = new THREE.Mesh(stripGeom, stripMat);
            strip1.position.x = -0.1;
            const strip2 = strip1.clone();
            strip2.position.x = 0.1;
            group.add(strip1, strip2);
            break;

        case 'circle': // Glifo mágico
            const circleGeom = new THREE.CircleGeometry(0.25, 32);
            const circleMat = new THREE.MeshStandardMaterial({
                color: config.color,
                emissive: config.emissive,
                emissiveIntensity: 0.5,
                side: THREE.DoubleSide
            });
            mesh = new THREE.Mesh(circleGeom, circleMat);
            mesh.rotation.x = -Math.PI / 2;

            // Anel externo
            const ringGeom = new THREE.RingGeometry(0.28, 0.32, 32);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                emissive: 0x886600,
                emissiveIntensity: 0.3,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.01;
            group.add(ring);

            // Símbolos internos (runas simples)
            for (let i = 0; i < 6; i++) {
                const runeGeom = new THREE.BoxGeometry(0.02, 0.01, 0.08);
                const runeMat = new THREE.MeshStandardMaterial({
                    color: 0xFFD700,
                    emissive: 0x886600,
                    emissiveIntensity: 0.5
                });
                const rune = new THREE.Mesh(runeGeom, runeMat);
                const angle = (i / 6) * Math.PI * 2;
                rune.position.x = Math.cos(angle) * 0.15;
                rune.position.z = Math.sin(angle) * 0.15;
                rune.position.y = 0.02;
                rune.rotation.y = angle;
                group.add(rune);
            }
            break;

        case 'tracks': // Rastros
            // Pegadas
            for (let i = 0; i < 4; i++) {
                const pawGeom = new THREE.CircleGeometry(0.05, 8);
                const pawMat = new THREE.MeshStandardMaterial({
                    color: config.color,
                    roughness: 1
                });
                const paw = new THREE.Mesh(pawGeom, pawMat);
                paw.rotation.x = -Math.PI / 2;
                paw.position.x = (i % 2) * 0.12 - 0.06;
                paw.position.z = Math.floor(i / 2) * 0.15 - 0.075;
                paw.position.y = 0.01;
                group.add(paw);

                // Garras
                for (let j = 0; j < 3; j++) {
                    const clawGeom = new THREE.CircleGeometry(0.015, 6);
                    const claw = new THREE.Mesh(clawGeom, pawMat);
                    claw.rotation.x = -Math.PI / 2;
                    claw.position.x = paw.position.x + (j - 1) * 0.025;
                    claw.position.z = paw.position.z + 0.06;
                    claw.position.y = 0.01;
                    group.add(claw);
                }
            }

            // Marca de arranhão
            const scratchGeom = new THREE.BoxGeometry(0.15, 0.01, 0.02);
            const scratchMat = new THREE.MeshStandardMaterial({
                color: 0x3d2817
            });
            const scratch = new THREE.Mesh(scratchGeom, scratchMat);
            scratch.position.z = 0.2;
            scratch.position.y = 0.01;
            scratch.rotation.z = 0.3;
            group.add(scratch);

            mesh = group.children[0]; // Referência para o primeiro elemento
            break;

        case 'shrine': // Santuário
            // Base
            const baseGeom = new THREE.CylinderGeometry(0.2, 0.25, 0.1, 8);
            const baseMat = new THREE.MeshStandardMaterial({
                color: config.color,
                roughness: 0.9
            });
            const base = new THREE.Mesh(baseGeom, baseMat);
            group.add(base);

            // Pilar central
            const pillarGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8);
            const pillar = new THREE.Mesh(pillarGeom, baseMat);
            pillar.position.y = 0.2;
            group.add(pillar);

            // Topo (esfera brilhante)
            const orbGeom = new THREE.SphereGeometry(0.08, 16, 16);
            const orbMat = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                emissive: 0x88FF88,
                emissiveIntensity: 0.5,
                roughness: 0.1,
                metalness: 0.5
            });
            const orb = new THREE.Mesh(orbGeom, orbMat);
            orb.position.y = 0.43;
            orb.name = 'orb';
            group.add(orb);

            mesh = base;
            break;

        default:
            const defaultGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const defaultMat = new THREE.MeshStandardMaterial({
                color: 0x888888
            });
            mesh = new THREE.Mesh(defaultGeom, defaultMat);
    }

    if (mesh && config.geometry !== 'tracks' && config.geometry !== 'shrine') {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    }

    group.scale.setScalar(config.scale);
    group.name = 'explorationObject';
    group.userData = { event: event, clickable: true };

    return group;
}

/**
 * Inicia a sessão AR de exploração
 * @param {Object} options
 * @param {Object} options.event - Evento de exploração
 * @param {Function} options.onFound - Callback quando objeto é posicionado
 * @param {Function} options.onClick - Callback quando objeto é clicado
 * @param {Function} options.onEnd - Callback quando AR termina
 */
export async function startExplorationAR({ event, onFound, onClick, onEnd } = {}) {
    if (!await isExplorationARSupported()) {
        console.error('AR não suportado neste dispositivo');
        return false;
    }

    onObjectFound = onFound;
    onObjectClicked = onClick;
    onExplorationEnd = onEnd;
    isObjectPlaced = false;

    // Inicializa a cena se necessário
    if (!scene) {
        initExplorationScene();
    }

    try {
        // Solicita sessão AR
        xrSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test', 'local-floor'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.getElementById('exploration-ar-screen') }
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
            explorationARActive = false;
            xrSession = null;
            xrHitTestSource = null;
            if (onExplorationEnd) onExplorationEnd();
        });

        // Configura detecção de clique/toque
        xrSession.addEventListener('select', handleSelect);

        // Cria o objeto de exploração
        explorationObject = createExplorationObject(event);

        // Inicia o loop de renderização
        explorationARActive = true;
        renderer.setAnimationLoop(renderExplorationFrame);

        console.log('✅ Sessão AR de exploração iniciada');
        return true;

    } catch (error) {
        console.error('Erro ao iniciar sessão AR de exploração:', error);
        return false;
    }
}

/**
 * Handler de seleção (clique/toque) na sessão AR
 */
function handleSelect(event) {
    if (!isObjectPlaced) {
        // Se o objeto ainda não foi posicionado, posiciona agora
        return;
    }

    // Verifica se clicou no objeto
    const object = scene.getObjectByName('explorationObject');
    if (object && object.userData.clickable) {
        // Notifica que o objeto foi clicado
        if (onObjectClicked) {
            onObjectClicked(object.userData.event);
        }
    }
}

/**
 * Posiciona o objeto de exploração na cena
 * @param {THREE.Matrix4} hitMatrix - Matriz de posição do hit test
 */
function placeExplorationObject(hitMatrix) {
    if (!explorationObject || !scene || isObjectPlaced) return;

    // Remove objeto anterior se existir
    const existingObject = scene.getObjectByName('explorationObject');
    if (existingObject) {
        scene.remove(existingObject);
    }

    // Adiciona o objeto na posição do hit test
    explorationObject.position.setFromMatrixPosition(hitMatrix);
    explorationObject.updateMatrix();
    scene.add(explorationObject);

    // Esconde o reticle
    reticle.visible = false;
    isObjectPlaced = true;

    // Callback
    if (onObjectFound) {
        onObjectFound(explorationObject);
    }
}

/**
 * Frame de renderização AR para exploração
 * @param {number} time 
 * @param {XRFrame} frame 
 */
function renderExplorationFrame(time, frame) {
    if (!frame || !xrSession) return;

    // Atualiza animações
    const delta = clock.getDelta();
    if (explorationMixer) {
        explorationMixer.update(delta);
    }

    // Hit test para posicionar o reticle
    if (xrHitTestSource && !isObjectPlaced) {
        const hitTestResults = frame.getHitTestResults(xrHitTestSource);

        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const hitPose = hit.getPose(xrReferenceSpace);

            if (hitPose) {
                reticle.visible = true;
                reticle.matrix.fromArray(hitPose.transform.matrix);
                reticle.matrix.decompose(reticle.position, reticle.quaternion, reticle.scale);

                // Posiciona o objeto após 2 segundos de detecção de superfície
                // (simula procurar pelo ambiente)
                if (!isObjectPlaced) {
                    const hitMatrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
                    placeExplorationObject(hitMatrix);
                }
            }
        } else {
            reticle.visible = false;
        }
    }

    // Animação do objeto de exploração
    const object = scene.getObjectByName('explorationObject');
    if (object) {
        // Flutuação suave
        const float = Math.sin(time * 0.003) * 0.02;
        object.position.y += float - object.userData.lastFloat || 0;
        object.userData.lastFloat = float;

        // Brilho pulsante
        const pulse = (Math.sin(time * 0.005) + 1) * 0.5;
        object.traverse((child) => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissiveIntensity = 0.3 + pulse * 0.4;
            }
        });

        // Rotação lenta
        object.rotation.y += 0.005;

        // Faz o objeto "olhar" para a câmera (billboard parcial)
        // const cameraPosition = new THREE.Vector3();
        // camera.getWorldPosition(cameraPosition);
        // object.lookAt(cameraPosition.x, object.position.y, cameraPosition.z);
    }

    // Renderiza
    renderer.render(scene, camera);
}

/**
 * Mostra efeito visual de sucesso no objeto
 */
export function showSuccessEffect() {
    const object = scene?.getObjectByName('explorationObject');
    if (!object) return;

    // Flash verde/dourado
    object.traverse((child) => {
        if (child.isMesh && child.material) {
            const originalColor = child.material.color.clone();
            child.material.color.set(0x00ff00);
            child.material.emissive.set(0x00ff00);
            child.material.emissiveIntensity = 1;

            setTimeout(() => {
                child.material.color.copy(originalColor);
                child.material.emissive.set(0x000000);
            }, 500);
        }
    });

    // Partículas de luz (simplificado com esferas)
    for (let i = 0; i < 5; i++) {
        const particleGeom = new THREE.SphereGeometry(0.02, 8, 8);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Mesh(particleGeom, particleMat);
        particle.position.copy(object.position);
        particle.position.x += (Math.random() - 0.5) * 0.3;
        particle.position.z += (Math.random() - 0.5) * 0.3;
        particle.position.y += Math.random() * 0.2;
        particle.name = 'particle';
        scene.add(particle);

        // Animação de subida e fade
        const startY = particle.position.y;
        const startTime = performance.now();
        const duration = 1000;

        function animateParticle() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            particle.position.y = startY + progress * 0.5;
            particle.material.opacity = 1 - progress;

            if (progress < 1) {
                requestAnimationFrame(animateParticle);
            } else {
                scene.remove(particle);
            }
        }
        animateParticle();
    }
}

/**
 * Mostra efeito visual de falha no objeto
 */
export function showFailureEffect() {
    const object = scene?.getObjectByName('explorationObject');
    if (!object) return;

    // Flash vermelho
    object.traverse((child) => {
        if (child.isMesh && child.material) {
            const originalColor = child.material.color.clone();
            child.material.color.set(0xff0000);

            setTimeout(() => {
                child.material.color.copy(originalColor);
            }, 300);
        }
    });

    // Shake do objeto
    const originalPos = object.position.clone();
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
        object.position.x = originalPos.x + (Math.random() - 0.5) * 0.05;
        object.position.z = originalPos.z + (Math.random() - 0.5) * 0.05;
        shakeCount++;

        if (shakeCount > 6) {
            clearInterval(shakeInterval);
            object.position.copy(originalPos);
        }
    }, 50);
}

/**
 * Encerra a sessão AR de exploração
 */
export async function endExplorationAR() {
    if (xrSession) {
        try {
            await xrSession.end();
        } catch (e) {
            console.warn('Erro ao encerrar sessão AR:', e);
        }
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

    explorationARActive = false;
    isObjectPlaced = false;
    explorationObject = null;
    explorationMixer = null;
}

/**
 * Verifica se a exploração AR está ativa
 * @returns {boolean}
 */
export function isExplorationARActive() {
    return explorationARActive;
}
