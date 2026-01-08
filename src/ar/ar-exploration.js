/**
 * AR Exploration Manager - Gerencia sessão AR para exploração interativa
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
        modelPath: '/assets/models/chest.glb',
        color: 0x8B4513,
        geometry: 'box', // Fallback se GLB não carregar
        scale: 0.6,
        useGLB: true
    },
    'ornate_chest': {
        modelPath: '/assets/models/chest_ornate.glb',
        color: 0x8B4513,
        geometry: 'ornate_box',
        scale: 0.6,
        decorationColor: 0xFFD700,
        useGLB: true
    },
    'suspicious_chest': {
        modelPath: '/assets/models/chest.glb', // Usa chest normal mas com efeitos
        color: 0x4a3728,
        geometry: 'suspicious_box',
        scale: 0.6,
        glowColor: 0xFF4444,
        eyeColor: 0xFFFF00,
        useGLB: true,
        addWarningEffect: true
    },
    'magic_glyph': {
        modelPath: null, // Usa geometria procedural
        color: 0x00FFFF,
        geometry: 'circle',
        scale: 1.6,
        emissive: 0x006666,
        useGLB: false
    },
    'monster_tracks': {
        modelPath: null,
        color: 0x654321,
        geometry: 'tracks',
        scale: 1.2,
        useGLB: false
    },
    'abandoned_shrine': {
        modelPath: null,
        color: 0x808080,
        geometry: 'shrine',
        scale: 1.6,
        useGLB: false
    },
    'mysterious_potion': {
        modelPath: '/assets/models/potion_bottle.glb',
        color: 0x8800FF,
        geometry: 'potion',
        scale: 0.5,
        emissive: 0x440088,
        bubbles: true,
        useGLB: true
    },
    'fallen_adventurer': {
        modelPath: '/assets/models/skeleton_corpse.glb',
        color: 0x555555,
        geometry: 'corpse',
        scale: 1.0,
        useGLB: true
    },
    // Modelos especiais para estados de perigo
    'mimic_revealed': {
        modelPath: '/assets/models/mimic.glb',
        color: 0x6B3A2E,
        geometry: 'mimic',
        scale: 0.8,
        animated: true,
        useGLB: true
    },
    'trap_trigger': {
        modelPath: '/assets/models/trap_trigger.glb',
        color: 0x8B4513,
        geometry: 'box',
        scale: 0.4,
        useGLB: true
    }
};

// Loader de modelos GLB com suporte a Draco
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS decoder for better compatibility

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const modelCache = new Map();

/**
 * Carrega um modelo GLB com cache
 * @param {string} path - Caminho do modelo
 * @returns {Promise<THREE.Group>}
 */
async function loadGLBModel(path) {
    if (modelCache.has(path)) {
        return modelCache.get(path).clone();
    }

    return new Promise((resolve, reject) => {
        gltfLoader.load(
            path,
            (gltf) => {
                const model = gltf.scene;
                modelCache.set(path, model);
                resolve(model.clone());
            },
            undefined,
            (error) => {
                console.warn(`Falha ao carregar modelo ${path}:`, error);
                reject(error);
            }
        );
    });
}

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
        alpha: true,
        premultipliedAlpha: false
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // CRUCIAL: Fundo transparente para ver a câmera AR
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);

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

    // Fix estilos AR
    if (!document.getElementById('ar-fixes')) {
        const style = document.createElement('style');
        style.id = 'ar-fixes';
        style.textContent = `
            #exploration-ar-screen { background: transparent !important; }
            #exploration-ar-screen canvas { 
                position: absolute !important; 
                top: 0 !important; 
                left: 0 !important; 
                z-index: 0 !important; 
                background: transparent !important;
            }
            #exploration-hud { 
                position: absolute !important; 
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                z-index: 10 !important; 
                pointer-events: none !important;
                background: transparent !important;
            }
            #exploration-hud * { pointer-events: auto !important; }
            .exploration-instructions {
                background: rgba(0,0,0,0.7) !important;
                padding: 12px 20px !important;
                border-radius: 8px !important;
                margin: 20px !important;
            }
            body.ar-active, html.ar-active { background: transparent !important; }
            body.ar-active #app { background: transparent !important; }
        `;
        document.head.appendChild(style);
    }

    // Força inline styles para garantir transparência
    if (arScreen) {
        arScreen.style.background = 'transparent';
        arScreen.style.backgroundColor = 'transparent';
    }

    // Configura canvas inline styles
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '0';
    renderer.domElement.style.background = 'transparent';

    // Scene
    scene = new THREE.Scene();

    // Camera (será controlada pelo WebXR)
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Luzes - Configuração forte para evitar modelos pretos
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Aumentado para melhor visibilidade
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(2, 5, 2);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Luz extra vindo da direção da câmera
    const cameraLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    cameraLight.position.set(0, 2, 5);
    scene.add(cameraLight);

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
 * @returns {Promise<THREE.Group>}
 */
async function createExplorationObject(event) {
    const group = new THREE.Group();
    const config = EVENT_MODELS[event.id] || EVENT_MODELS['ancient_chest'];

    // Tenta carregar modelo GLB se disponível
    if (config.useGLB && config.modelPath) {
        try {
            const glbModel = await loadGLBModel(config.modelPath);
            glbModel.scale.setScalar(config.scale);

            // Ajusta materiais para melhor visualização em AR
            glbModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Clona o material para evitar problemas de referência compartilhada
                    if (child.material) {
                        child.material = child.material.clone();

                        // Ajuste de material para garantir visibilidade
                        if (child.material.metalness > 0.5) child.material.metalness = 0.2;
                        if (child.material.roughness < 0.5) child.material.roughness = 0.6;
                        child.material.envMapIntensity = 1.5;
                        child.material.needsUpdate = true;
                    }
                }
            });

            // Adiciona efeitos especiais se necessário
            if (config.addWarningEffect) {
                const warningLight = new THREE.PointLight(config.glowColor || 0xFF4444, 0.5, 0.5);
                warningLight.position.y = 0.1;
                warningLight.name = 'warningLight';
                glbModel.add(warningLight);
            }

            group.add(glbModel);
            group.name = 'explorationObject';
            group.userData = { event: event, clickable: true, isGLB: true };

            console.log(`✅ Modelo GLB carregado: ${config.modelPath}`);
            return group;

        } catch (error) {
            console.warn(`⚠️ Fallback para geometria procedural: ${event.id}`);
            // Continua para criar geometria procedural como fallback
        }
    }

    // Fallback: Geometria procedural
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

        case 'ornate_box': // Baú ornamentado
            const ornateBoxGeom = new THREE.BoxGeometry(0.35, 0.22, 0.22);
            const ornateBoxMat = new THREE.MeshStandardMaterial({
                color: config.color,
                roughness: 0.5,
                metalness: 0.4
            });
            mesh = new THREE.Mesh(ornateBoxGeom, ornateBoxMat);

            // Tampa ornamentada
            const ornateLidGeom = new THREE.BoxGeometry(0.37, 0.06, 0.24);
            const ornateLidMat = new THREE.MeshStandardMaterial({
                color: 0x6B4423,
                roughness: 0.4,
                metalness: 0.3
            });
            const ornateLid = new THREE.Mesh(ornateLidGeom, ornateLidMat);
            ornateLid.position.y = 0.14;
            group.add(ornateLid);

            // Decorações douradas
            const decoMat = new THREE.MeshStandardMaterial({
                color: config.decorationColor || 0xFFD700,
                metalness: 0.9,
                roughness: 0.1,
                emissive: 0x886600,
                emissiveIntensity: 0.3
            });

            // Cantos dourados
            for (let i = 0; i < 4; i++) {
                const cornerGeom = new THREE.BoxGeometry(0.04, 0.24, 0.04);
                const corner = new THREE.Mesh(cornerGeom, decoMat);
                corner.position.x = (i % 2) * 0.34 - 0.17;
                corner.position.z = Math.floor(i / 2) * 0.2 - 0.1;
                group.add(corner);
            }

            // Joia central
            const gemGeom = new THREE.OctahedronGeometry(0.03);
            const gemMat = new THREE.MeshStandardMaterial({
                color: 0xFF0000,
                emissive: 0x880000,
                emissiveIntensity: 0.5,
                metalness: 0.3,
                roughness: 0.1
            });
            const gem = new THREE.Mesh(gemGeom, gemMat);
            gem.position.y = 0.17;
            gem.position.z = 0.13;
            group.add(gem);
            break;

        case 'suspicious_box': // Baú suspeito (pode ser mímico)
            const suspBoxGeom = new THREE.BoxGeometry(0.3, 0.2, 0.2);
            const suspBoxMat = new THREE.MeshStandardMaterial({
                color: config.color,
                roughness: 0.8,
                metalness: 0.2
            });
            mesh = new THREE.Mesh(suspBoxGeom, suspBoxMat);

            // Tampa levemente aberta
            const suspLidGeom = new THREE.BoxGeometry(0.32, 0.05, 0.22);
            const suspLidMat = new THREE.MeshStandardMaterial({
                color: 0x3a2820,
                roughness: 0.7
            });
            const suspLid = new THREE.Mesh(suspLidGeom, suspLidMat);
            suspLid.position.y = 0.12;
            suspLid.rotation.x = -0.15; // Ligeiramente aberta
            suspLid.position.z = -0.02;
            group.add(suspLid);

            // Brilho vermelho sutil (indicador de perigo)
            const warningLight = new THREE.PointLight(config.glowColor || 0xFF4444, 0.5, 0.5);
            warningLight.position.y = 0.1;
            warningLight.name = 'warningLight';
            group.add(warningLight);

            // Leve "respiração" - será animado no render loop
            group.userData.isSuspicious = true;
            break;

        case 'mimic': // Mímico revelado
            // Corpo do baú (boca aberta)
            const mimicBodyGeom = new THREE.BoxGeometry(0.35, 0.2, 0.25);
            const mimicBodyMat = new THREE.MeshStandardMaterial({
                color: config.color,
                roughness: 0.7,
                metalness: 0.2
            });
            const mimicBody = new THREE.Mesh(mimicBodyGeom, mimicBodyMat);
            group.add(mimicBody);

            // Tampa como mandíbula superior (aberta)
            const mimicJawGeom = new THREE.BoxGeometry(0.37, 0.05, 0.27);
            const mimicJawMat = new THREE.MeshStandardMaterial({
                color: 0x5a3a2e,
                roughness: 0.6
            });
            const mimicJaw = new THREE.Mesh(mimicJawGeom, mimicJawMat);
            mimicJaw.position.y = 0.15;
            mimicJaw.position.z = -0.1;
            mimicJaw.rotation.x = -0.6; // Boca aberta
            mimicJaw.name = 'jaw';
            group.add(mimicJaw);

            // Dentes superiores
            const toothMat = new THREE.MeshStandardMaterial({
                color: 0xFFFFE0,
                roughness: 0.3
            });
            for (let i = 0; i < 6; i++) {
                const toothGeom = new THREE.ConeGeometry(0.015, 0.05, 4);
                const tooth = new THREE.Mesh(toothGeom, toothMat);
                tooth.position.x = i * 0.05 - 0.125;
                tooth.position.y = 0.12;
                tooth.position.z = 0.08;
                tooth.rotation.x = Math.PI;
                group.add(tooth);
            }

            // Dentes inferiores
            for (let i = 0; i < 5; i++) {
                const toothGeom = new THREE.ConeGeometry(0.012, 0.04, 4);
                const tooth = new THREE.Mesh(toothGeom, toothMat);
                tooth.position.x = i * 0.05 - 0.1;
                tooth.position.y = 0.1;
                tooth.position.z = 0.1;
                group.add(tooth);
            }

            // Língua
            const tongueGeom = new THREE.BoxGeometry(0.08, 0.02, 0.15);
            const tongueMat = new THREE.MeshStandardMaterial({
                color: 0xFF4466,
                roughness: 0.8
            });
            const tongue = new THREE.Mesh(tongueGeom, tongueMat);
            tongue.position.y = 0.05;
            tongue.position.z = 0.05;
            tongue.name = 'tongue';
            group.add(tongue);

            // Olhos
            const eyeMat = new THREE.MeshStandardMaterial({
                color: 0xFFFF00,
                emissive: 0xFFFF00,
                emissiveIntensity: 0.8
            });
            for (let i = 0; i < 2; i++) {
                const eyeGeom = new THREE.SphereGeometry(0.025, 8, 8);
                const eye = new THREE.Mesh(eyeGeom, eyeMat);
                eye.position.x = i * 0.15 - 0.075;
                eye.position.y = 0.12;
                eye.position.z = 0.1;
                eye.name = 'eye';
                group.add(eye);

                // Pupila
                const pupilGeom = new THREE.SphereGeometry(0.01, 6, 6);
                const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
                const pupil = new THREE.Mesh(pupilGeom, pupilMat);
                pupil.position.z = 0.02;
                eye.add(pupil);
            }

            group.userData.isMimic = true;
            mesh = mimicBody;
            break;

        case 'potion': // Poção misteriosa
            // Frasco
            const bottleGeom = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8);
            const bottleMat = new THREE.MeshStandardMaterial({
                color: 0x88AAFF,
                transparent: true,
                opacity: 0.6,
                roughness: 0.1,
                metalness: 0.3
            });
            const bottle = new THREE.Mesh(bottleGeom, bottleMat);
            group.add(bottle);

            // Líquido
            const liquidGeom = new THREE.CylinderGeometry(0.035, 0.045, 0.08, 8);
            const liquidMat = new THREE.MeshStandardMaterial({
                color: config.color,
                emissive: config.emissive || 0x440088,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.8
            });
            const liquid = new THREE.Mesh(liquidGeom, liquidMat);
            liquid.position.y = -0.01;
            liquid.name = 'liquid';
            group.add(liquid);

            // Gargalo
            const neckGeom = new THREE.CylinderGeometry(0.02, 0.03, 0.04, 8);
            const neck = new THREE.Mesh(neckGeom, bottleMat);
            neck.position.y = 0.08;
            group.add(neck);

            // Rolha
            const corkGeom = new THREE.CylinderGeometry(0.022, 0.02, 0.025, 6);
            const corkMat = new THREE.MeshStandardMaterial({
                color: 0x8B4513,
                roughness: 0.9
            });
            const cork = new THREE.Mesh(corkGeom, corkMat);
            cork.position.y = 0.11;
            group.add(cork);

            group.userData.hasBubbles = config.bubbles;
            mesh = bottle;
            break;

        case 'corpse': // Aventureiro caído
            // Corpo (simplificado)
            const bodyGeom = new THREE.CapsuleGeometry(0.08, 0.25, 4, 8);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: config.color,
                roughness: 0.9
            });
            const body = new THREE.Mesh(bodyGeom, bodyMat);
            body.rotation.z = Math.PI / 2;
            body.rotation.y = 0.3;
            body.position.y = 0.08;
            group.add(body);

            // Mochila/sacola
            const bagGeom = new THREE.BoxGeometry(0.1, 0.08, 0.06);
            const bagMat = new THREE.MeshStandardMaterial({
                color: 0x654321,
                roughness: 0.8
            });
            const bag = new THREE.Mesh(bagGeom, bagMat);
            bag.position.x = 0.15;
            bag.position.y = 0.05;
            bag.rotation.z = 0.2;
            group.add(bag);

            // Espada caída
            const swordBladeGeom = new THREE.BoxGeometry(0.02, 0.01, 0.2);
            const swordMat = new THREE.MeshStandardMaterial({
                color: 0xC0C0C0,
                metalness: 0.8,
                roughness: 0.2
            });
            const swordBlade = new THREE.Mesh(swordBladeGeom, swordMat);
            swordBlade.position.x = -0.2;
            swordBlade.position.y = 0.01;
            swordBlade.rotation.y = 0.5;
            group.add(swordBlade);

            // Punho da espada
            const hiltGeom = new THREE.BoxGeometry(0.03, 0.02, 0.05);
            const hiltMat = new THREE.MeshStandardMaterial({
                color: 0x8B4513
            });
            const hilt = new THREE.Mesh(hiltGeom, hiltMat);
            hilt.position.x = -0.2;
            hilt.position.z = -0.12;
            hilt.position.y = 0.01;
            hilt.rotation.y = 0.5;
            group.add(hilt);

            mesh = body;
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

        // Ativa modo transparente - Classes CSS
        document.body.classList.add('ar-active');
        document.documentElement.classList.add('ar-active');

        // FORÇA inline styles para garantir transparência total
        document.body.style.background = 'transparent';
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.background = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.style.background = 'transparent';
            appEl.style.backgroundColor = 'transparent';
        }

        // Handle session end
        xrSession.addEventListener('end', () => {
            explorationARActive = false;
            xrSession = null;
            xrHitTestSource = null;

            document.body.classList.remove('ar-active');
            document.documentElement.classList.remove('ar-active');

            // Restaura estilos originais
            document.body.style.background = '';
            document.body.style.backgroundColor = '';
            document.documentElement.style.background = '';
            document.documentElement.style.backgroundColor = '';
            const appEl = document.getElementById('app');
            if (appEl) {
                appEl.style.background = '';
                appEl.style.backgroundColor = '';
            }

            if (onExplorationEnd) onExplorationEnd();
        });

        // Configura detecção de clique/toque
        xrSession.addEventListener('select', handleSelect);

        // Cria o objeto de exploração (async para carregar GLB)
        explorationObject = await createExplorationObject(event);

        // Inicia o loop de renderização
        // Inicia o loop de renderização
        explorationARActive = true;
        renderer.setAnimationLoop(renderExplorationFrame);

        // Feedback inicial
        const arMsg = document.getElementById('ar-messages');
        if (arMsg) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'ar-message';
            msgDiv.textContent = '👀 Olhe para o chão e mova o celular lentamente...';
            arMsg.appendChild(msgDiv);
            setTimeout(() => msgDiv.remove(), 4000);
        }

        console.log('✅ Sessão AR de exploração iniciada');
        return true;

    } catch (error) {
        console.error('Erro ao iniciar sessão AR de exploração:', error);
        alert('Erro ao iniciar AR: ' + error.message);
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

                // Mostra reticle girando para indicar busca
                reticle.rotation.z += 0.05;

                // Posiciona o objeto automaticamente se encontrar superfície
                if (!isObjectPlaced) {
                    // Delay artificial para dar tempo do usuário ver o reticle
                    if (!this.surfaceDetectTime) this.surfaceDetectTime = Date.now();

                    if (Date.now() - this.surfaceDetectTime > 1500) {
                        const hitMatrix = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
                        placeExplorationObject(hitMatrix);
                    } else {
                        // Feedback visual (pode usar um elemento DOM se o showARMessage não estiver acessível)
                        const arMsg = document.getElementById('ar-messages');
                        if (arMsg && !arMsg.textContent.includes('Detectando')) {
                            // Cria msg temporária
                            const msgDiv = document.createElement('div');
                            msgDiv.className = 'ar-message';
                            msgDiv.textContent = '🔍 Analisando terreno...';
                            arMsg.appendChild(msgDiv);
                            setTimeout(() => msgDiv.remove(), 1000);
                        }
                    }
                }
            }
        } else {
            reticle.visible = false;
            this.surfaceDetectTime = null;
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

    // Limpa a cena profundamente (dispose de geometrias e materiais)
    if (scene) {
        scene.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => {
                            if (mat.map) mat.map.dispose();
                            mat.dispose();
                        });
                    } else {
                        if (object.material.map) object.material.map.dispose();
                        object.material.dispose();
                    }
                }
            }
        });

        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
        scene = null;
    }

    // Remove o canvas e limpa o renderer completamente
    if (renderer) {
        const arScreen = document.getElementById('exploration-ar-screen');
        if (arScreen && renderer.domElement && renderer.domElement.parentNode === arScreen) {
            arScreen.removeChild(renderer.domElement);
        }

        try {
            renderer.dispose();
            renderer.forceContextLoss();
        } catch (e) {
            console.warn('Erro ao limpar renderer:', e);
        }
        renderer = null;
    }

    // Limpa referências
    camera = null;
    reticle = null;
    xrReferenceSpace = null;
    xrHitTestSource = null;

    explorationARActive = false;
    isObjectPlaced = false;
    explorationObject = null;
    explorationMixer = null;

    // Limpa cache de modelos para forçar recarregamento limpo
    modelCache.clear();

    console.log('🧹 Sessão AR de exploração encerrada e limpa');
}

/**
 * Verifica se a exploração AR está ativa
 * @returns {boolean}
 */
export function isExplorationARActive() {
    return explorationARActive;
}
