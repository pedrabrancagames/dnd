/**
 * Verificação de Compatibilidade do Dispositivo
 * Conforme PRD linhas 42-74
 */

/**
 * Lista de requisitos do dispositivo
 * `required: false` = funcionalidade opcional (não bloqueia o jogo)
 */
export const requirements = [
    {
        nome: 'HTTPS',
        descricao: 'Conexão segura (HTTPS)',
        required: true,
        teste: () => location.protocol === 'https:' || location.hostname === 'localhost'
    },
    {
        nome: 'WebXR',
        descricao: 'API WebXR disponível',
        required: false, // AR é opcional
        teste: () => navigator.xr !== undefined
    },
    {
        nome: 'AR Mode',
        descricao: 'Suporte a Realidade Aumentada',
        required: false, // AR é opcional - jogo funciona em 2D
        teste: async () => {
            if (!navigator.xr) return false;
            try {
                return await Promise.race([
                    navigator.xr.isSessionSupported('immersive-ar'),
                    new Promise(resolve => setTimeout(() => resolve(false), 3000)) // Timeout 3s
                ]);
            } catch {
                return false;
            }
        }
    },
    {
        nome: 'Geolocalização',
        descricao: 'Acesso ao GPS',
        required: true,
        teste: () => 'geolocation' in navigator
    },
    {
        nome: 'Câmera',
        descricao: 'Acesso à câmera',
        required: false, // Câmera só é necessária para AR
        teste: () => navigator.mediaDevices !== undefined && 'getUserMedia' in navigator.mediaDevices
    },
    {
        nome: 'WebGL2',
        descricao: 'Gráficos 3D acelerados',
        required: true,
        teste: () => {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2');
            return gl !== null;
        }
    }
];

/**
 * Executa todos os testes de compatibilidade
 * @returns {Promise<{passed: boolean, results: Array<{nome: string, descricao: string, passed: boolean}>}>}
 */
export async function checkCompatibility() {
    const results = [];

    for (const req of requirements) {
        let passed = false;
        try {
            const result = req.teste();
            passed = result instanceof Promise ? await result : result;
        } catch (error) {
            console.error(`Erro ao testar ${req.nome}:`, error);
            passed = false;
        }

        results.push({
            nome: req.nome,
            descricao: req.descricao,
            passed,
            required: req.required !== false // Default true se não especificado
        });

        if (!passed && req.required !== false) {
            console.warn(`❌ Requisito obrigatório falhou: ${req.nome}`);
        } else if (!passed) {
            console.log(`⚠️ Recurso opcional não disponível: ${req.nome}`);
        }
    }

    // Só falha se algum requisito OBRIGATÓRIO não passar
    const requiredPassed = results.filter(r => r.required).every(r => r.passed);

    return {
        passed: requiredPassed,
        results
    };
}

/**
 * Renderiza a tela de incompatibilidade
 * @param {Array<{nome: string, descricao: string, passed: boolean}>} results 
 */
export function renderIncompatibleScreen(results) {
    const container = document.getElementById('failed-requirements');
    if (!container) return;

    container.innerHTML = '';

    results.forEach(result => {
        const div = document.createElement('div');
        div.className = `requirement ${result.passed ? 'passed' : ''}`;
        div.innerHTML = `
      <span class="requirement-icon">${result.passed ? '✓' : '✗'}</span>
      <span class="requirement-name">${result.descricao}</span>
    `;
        container.appendChild(div);
    });
}
