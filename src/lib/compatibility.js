/**
 * Verificação de Compatibilidade do Dispositivo
 * Conforme PRD linhas 42-74
 */

/**
 * Lista de requisitos do dispositivo
 */
export const requirements = [
    {
        nome: 'HTTPS',
        descricao: 'Conexão segura (HTTPS)',
        teste: () => location.protocol === 'https:' || location.hostname === 'localhost'
    },
    {
        nome: 'WebXR',
        descricao: 'API WebXR disponível',
        teste: () => navigator.xr !== undefined
    },
    {
        nome: 'AR Mode',
        descricao: 'Suporte a Realidade Aumentada',
        teste: async () => {
            if (!navigator.xr) return false;
            try {
                return await navigator.xr.isSessionSupported('immersive-ar');
            } catch {
                return false;
            }
        }
    },
    {
        nome: 'Geolocalização',
        descricao: 'Acesso ao GPS',
        teste: () => 'geolocation' in navigator
    },
    {
        nome: 'Câmera',
        descricao: 'Acesso à câmera',
        teste: () => navigator.mediaDevices !== undefined && 'getUserMedia' in navigator.mediaDevices
    },
    {
        nome: 'WebGL2',
        descricao: 'Gráficos 3D acelerados',
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
            passed
        });
    }

    const allPassed = results.every(r => r.passed);

    return {
        passed: allPassed,
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
