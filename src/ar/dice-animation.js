/**
 * Animação de dado D20 - Versão CSS/Canvas (mais compatível)
 */

// Container do dado
let diceContainer = null;
let diceCanvas = null;
let diceCtx = null;

/**
 * Inicializa o container do dado
 */
function initDiceContainer() {
    if (diceContainer) return;

    // Container principal
    diceContainer = document.createElement('div');
    diceContainer.id = 'dice-container';
    diceContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        background: rgba(0, 0, 0, 0.6);
        pointer-events: none;
    `;

    // Canvas do dado
    diceCanvas = document.createElement('canvas');
    diceCanvas.width = 200;
    diceCanvas.height = 200;
    diceCanvas.style.cssText = `
        width: 200px;
        height: 200px;
    `;
    diceContainer.appendChild(diceCanvas);
    diceCtx = diceCanvas.getContext('2d');

    document.body.appendChild(diceContainer);

    console.log('🎲 Dice container initialized');
}

/**
 * Desenha um dado D20 simplificado
 */
function drawD20(rotation, scale, result) {
    const ctx = diceCtx;
    const cx = 100;
    const cy = 100;
    const size = 70 * scale;

    ctx.clearRect(0, 0, 200, 200);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Cor baseada no resultado
    let fillColor = '#cc9900';
    let glowColor = 'rgba(204, 153, 0, 0.5)';

    if (result === 20) {
        fillColor = '#00ff00';
        glowColor = 'rgba(0, 255, 0, 0.5)';
    } else if (result === 1) {
        fillColor = '#ff0000';
        glowColor = 'rgba(255, 0, 0, 0.5)';
    } else if (result >= 15) {
        fillColor = '#00ccff';
        glowColor = 'rgba(0, 204, 255, 0.5)';
    }

    // Sombra/glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;

    // Desenha icosaedro simplificado (hexágono com triângulos)
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - Math.PI / 2;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Desenha linhas internas
    ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - Math.PI / 2;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();

    ctx.restore();
}

/**
 * Anima a rolagem do dado
 * @param {number} result - Resultado final (1-20)
 * @param {Function} onComplete - Callback ao terminar
 */
export function rollD20Animation(result, onComplete) {
    console.log('🎲 rollD20Animation called with result:', result);

    try {
        initDiceContainer();

        diceContainer.style.display = 'flex';

        const startTime = Date.now();
        const duration = 1500;
        let rotation = 0;
        const rotationSpeed = 0.4 + Math.random() * 0.3;

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing
            const easeOut = 1 - Math.pow(1 - progress, 3);

            // Rotação desacelerando
            rotation += rotationSpeed * (1 - easeOut);

            // Escala com bounce
            const bounceProgress = Math.min(progress * 2, 1);
            const scale = 1 + Math.sin(bounceProgress * Math.PI) * 0.3;

            drawD20(rotation, scale, result);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Mostra resultado
                showDiceResult(result, onComplete);
            }
        }

        animate();
    } catch (e) {
        console.error('🎲 Dice animation error:', e);
        // Em caso de erro, chama callback direto
        if (onComplete) onComplete();
    }
}

/**
 * Mostra o resultado do dado
 */
function showDiceResult(result, onComplete) {
    console.log('🎲 Showing result:', result);

    // Cria overlay de resultado
    const resultOverlay = document.createElement('div');
    resultOverlay.id = 'dice-result';
    resultOverlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 72px;
        font-weight: bold;
        color: ${result === 20 ? '#00ff00' : result === 1 ? '#ff0000' : '#ffd700'};
        text-shadow: 
            0 0 20px ${result === 20 ? '#00ff00' : result === 1 ? '#ff0000' : '#ffd700'},
            0 0 40px ${result === 20 ? '#00ff00' : result === 1 ? '#ff0000' : '#ffd700'},
            2px 2px 4px rgba(0,0,0,0.8);
        z-index: 100000;
        pointer-events: none;
        text-align: center;
        animation: diceResultPop 0.5s ease-out;
        font-family: 'Outfit', sans-serif;
    `;

    // Texto do resultado
    if (result === 20) {
        resultOverlay.innerHTML = `<span style="font-size: 80px;">20</span><br><span style="font-size: 24px; color: #00ff00;">CRÍTICO!</span>`;
    } else if (result === 1) {
        resultOverlay.innerHTML = `<span style="font-size: 80px;">1</span><br><span style="font-size: 24px; color: #ff0000;">FALHA!</span>`;
    } else {
        resultOverlay.innerHTML = `<span style="font-size: 80px;">${result}</span>`;
    }

    document.body.appendChild(resultOverlay);

    // Remove após 1 segundo
    setTimeout(() => {
        if (diceContainer) diceContainer.style.display = 'none';
        if (resultOverlay.parentNode) resultOverlay.remove();

        console.log('🎲 Animation complete, calling callback');
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
                transform: translate(-50%, -50%) scale(0.3);
                opacity: 0;
            }
            60% {
                transform: translate(-50%, -50%) scale(1.3);
                opacity: 1;
            }
            100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('🎲 Dice styles injected');
}

// Injeta estilos ao carregar
injectDiceStyles();
