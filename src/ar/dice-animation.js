/**
 * Animação de dado D20 em 3D
 */

import * as THREE from 'three';

// Container do dado
let diceScene = null;
let diceCamera = null;
let diceRenderer = null;
let diceMesh = null;
let diceContainer = null;
let diceAnimationId = null;

/**
 * Cria a cena do dado
 */
function initDiceScene() {
    // Container para o dado
    diceContainer = document.createElement('div');
    diceContainer.id = 'dice-container';
    diceContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 200px;
        height: 200px;
        z-index: 9999;
        pointer-events: none;
        display: none;
    `;
    document.body.appendChild(diceContainer);

    // Cena
    diceScene = new THREE.Scene();

    // Câmera
    diceCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    diceCamera.position.z = 3;

    // Renderer
    diceRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    diceRenderer.setSize(200, 200);
    diceRenderer.setClearColor(0x000000, 0);
    diceContainer.appendChild(diceRenderer.domElement);

    // Luzes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    diceScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 2, 2);
    diceScene.add(directionalLight);
}

/**
 * Cria o dado D20 (icosaedro)
 */
function createD20(resultNumber) {
    // Remove dado anterior se existir
    if (diceMesh) {
        diceScene.remove(diceMesh);
        diceMesh.geometry.dispose();
        diceMesh.material.dispose();
    }

    // Geometria do icosaedro
    const geometry = new THREE.IcosahedronGeometry(0.8, 0);

    // Material com cor baseada no resultado
    let color = 0xcc9900; // Dourado padrão

    if (resultNumber === 20) {
        color = 0x00ff00; // Verde brilhante para crítico
    } else if (resultNumber === 1) {
        color = 0xff0000; // Vermelho para falha
    } else if (resultNumber >= 15) {
        color = 0x00ccff; // Azul para bom
    }

    const material = new THREE.MeshPhongMaterial({
        color: color,
        specular: 0xffffff,
        shininess: 100,
        flatShading: true
    });

    diceMesh = new THREE.Mesh(geometry, material);

    // Adiciona bordas
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    diceMesh.add(wireframe);

    diceScene.add(diceMesh);
}

/**
 * Anima a rolagem do dado
 * @param {number} result - Resultado final (1-20)
 * @param {Function} onComplete - Callback ao terminar
 */
export function rollD20Animation(result, onComplete) {
    // Inicializa se necessário
    if (!diceScene) {
        initDiceScene();
    }

    createD20(result);
    diceContainer.style.display = 'block';

    // Velocidades de rotação inicial (aleatórias)
    let rotationSpeedX = (Math.random() * 0.3 + 0.2);
    let rotationSpeedY = (Math.random() * 0.4 + 0.3);
    let rotationSpeedZ = (Math.random() * 0.2 + 0.1);

    const startTime = Date.now();
    const duration = 1500; // 1.5 segundos de animação

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Desaceleração suave (easing)
        const easeOut = 1 - Math.pow(1 - progress, 3);

        // Aplica rotação com desaceleração
        diceMesh.rotation.x += rotationSpeedX * (1 - easeOut);
        diceMesh.rotation.y += rotationSpeedY * (1 - easeOut);
        diceMesh.rotation.z += rotationSpeedZ * (1 - easeOut);

        // Escala (bounce no início)
        const bounceProgress = Math.min(progress * 2, 1);
        const scale = 1 + Math.sin(bounceProgress * Math.PI) * 0.2;
        diceMesh.scale.set(scale, scale, scale);

        diceRenderer.render(diceScene, diceCamera);

        if (progress < 1) {
            diceAnimationId = requestAnimationFrame(animate);
        } else {
            // Animação terminou - mostra resultado
            showDiceResult(result, onComplete);
        }
    }

    // Cancela animação anterior se existir
    if (diceAnimationId) {
        cancelAnimationFrame(diceAnimationId);
    }

    animate();
}

/**
 * Mostra o resultado do dado
 */
function showDiceResult(result, onComplete) {
    // Cria overlay de resultado
    const resultOverlay = document.createElement('div');
    resultOverlay.id = 'dice-result';
    resultOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 64px;
        font-weight: bold;
        color: ${result === 20 ? '#00ff00' : result === 1 ? '#ff0000' : '#ffd700'};
        text-shadow: 0 0 20px ${result === 20 ? '#00ff00' : result === 1 ? '#ff0000' : '#ffd700'},
                     0 0 40px rgba(0,0,0,0.8);
        z-index: 10000;
        animation: diceResultPop 0.5s ease-out;
        pointer-events: none;
    `;

    // Texto do resultado
    if (result === 20) {
        resultOverlay.innerHTML = `${result}<br><span style="font-size: 24px;">CRÍTICO!</span>`;
    } else if (result === 1) {
        resultOverlay.innerHTML = `${result}<br><span style="font-size: 24px;">FALHA!</span>`;
    } else {
        resultOverlay.textContent = result;
    }

    document.body.appendChild(resultOverlay);

    // Remove o dado e resultado após um tempo
    setTimeout(() => {
        diceContainer.style.display = 'none';
        resultOverlay.remove();

        if (onComplete) {
            onComplete();
        }
    }, 1000);
}

/**
 * Injeta CSS de animação
 */
function injectDiceStyles() {
    if (document.getElementById('dice-styles')) return;

    const style = document.createElement('style');
    style.id = 'dice-styles';
    style.textContent = `
        @keyframes diceResultPop {
            0% {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 0;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// Injeta estilos ao carregar
injectDiceStyles();
