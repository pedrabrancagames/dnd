# 🗺️ Plano: Sistema de Campanhas e Mini-Aventuras

## Visão Geral

Este plano detalha como transformar o jogo de combates isolados em uma experiência narrativa mais rica, com campanhas progressivas e mini-aventuras que criam conexão emocional e propósito para os jogadores.

---

## 📋 Índice

1. [Conceito de Campanhas](#1-conceito-de-campanhas)
2. [Sistema de Mini-Aventuras](#2-sistema-de-mini-aventuras)
3. [Narrativa Dinâmica](#3-narrativa-dinâmica)
4. [Mecânicas de Progressão de Campanha](#4-mecânicas-de-progressão-de-campanha)
5. [Recompensas Especiais](#5-recompensas-especiais)
6. [Implementação Técnica](#6-implementação-técnica)
7. [Cronograma de Desenvolvimento](#7-cronograma-de-desenvolvimento)

---

## 1. Conceito de Campanhas

### 1.1 O que são Campanhas?

Campanhas são arcos narrativos maiores que conectam múltiplas sessões de jogo através de uma história contínua. Cada campanha possui:

- **Tema Central**: Ex: "A Invasão dos Mortos-Vivos", "O Despertar do Dragão"
- **Duração**: 1-4 semanas de jogo ativo
- **Objetivo Final**: Boss épico ou descoberta especial
- **Progresso Compartilhado**: Todos os jogadores contribuem

### 1.2 Estrutura de uma Campanha

```
📜 CAMPANHA: [Nome]
│
├── 🎯 Capítulo 1: Introdução
│   ├── Mini-Aventura 1A: Descoberta
│   ├── Mini-Aventura 1B: Investigação
│   └── Boss do Capítulo
│
├── 🎯 Capítulo 2: Desenvolvimento
│   ├── Mini-Aventura 2A: Desafio
│   ├── Mini-Aventura 2B: Aliados
│   └── Boss do Capítulo
│
└── 🎯 Capítulo 3: Clímax
    ├── Mini-Aventura 3A: Preparação
    └── 👹 BOSS FINAL DA CAMPANHA
```

### 1.3 Campanhas Iniciais Propostas

#### 🧟 Campanha 1: "A Praga de Orcus"
- **Tema**: Mortos-vivos estão surgindo em números alarmantes
- **Duração**: 2 semanas
- **Monstros**: Skeletons → Zombies → Ghouls → Vampire Spawn → **Lich (Boss)**
- **História**: Um culto está tentando invocar Orcus, o Príncipe Demoníaco dos Mortos-Vivos

#### 🐺 Campanha 2: "A Maldição da Lua de Sangue"
- **Tema**: Lobisomens estão atacando a região
- **Duração**: 1 semana
- **Monstros**: Wolves → Werewolves → **Alpha Werewolf (Boss)**
- **História**: A lua de sangue está transformando pessoas inocentes

#### 🐉 Campanha 3: "O Despertar do Dragão Vermelho"
- **Tema**: Um dragão antigo está despertando
- **Duração**: 4 semanas
- **Monstros**: Kobolds → Drakes → Young Dragon → **Adult Red Dragon (Boss)**
- **História**: Cultistas do dragão estão preparando seu despertar

---

## 2. Sistema de Mini-Aventuras

### 2.1 O que são Mini-Aventuras?

Mini-aventuras são sequências curtas de eventos conectados que contam uma pequena história em uma sessão de jogo (15-30 minutos).

### 2.2 Tipos de Mini-Aventuras

#### 🔍 Aventura de Investigação
```javascript
{
    type: 'investigation',
    title: 'O Desaparecimento do Mercador',
    description: 'Um mercador local desapareceu. Siga as pistas!',
    steps: [
        { type: 'explore', target: 'clue_tracks', hint: 'Procure rastros' },
        { type: 'explore', target: 'clue_witness', hint: 'Fale com testemunhas' },
        { type: 'explore', target: 'clue_hideout', hint: 'Encontre o esconderijo' },
        { type: 'combat', monster: 'bandit_leader', isBoss: true }
    ],
    rewards: { xp: 200, gold: 50, item: 'ring_of_protection' }
}
```

#### ⚔️ Aventura de Combate
```javascript
{
    type: 'combat_chain',
    title: 'O Covil dos Goblins',
    description: 'Limpe o covil de goblins que ameaça a região!',
    steps: [
        { type: 'combat', monster: 'goblin', count: 3 },
        { type: 'choice', options: ['Ataque frontal', 'Furtividade'] },
        { type: 'combat', monster: 'goblin_shaman', isBoss: true }
    ],
    rewards: { xp: 150, loot: 'goblin_loot_table' }
}
```

#### 🧩 Aventura de Quebra-Cabeça
```javascript
{
    type: 'puzzle',
    title: 'A Tumba do Mago',
    description: 'Resolva os enigmas para acessar o tesouro!',
    steps: [
        { type: 'skill_check', skill: 'arcana', dc: 12, description: 'Decifre as runas' },
        { type: 'choice', options: ['Vermelho', 'Azul', 'Verde'], correct: 1 },
        { type: 'skill_check', skill: 'investigation', dc: 15, description: 'Encontre a alavanca' },
        { type: 'reward', chest: 'ancient_treasure' }
    ],
    rewards: { xp: 100, item: 'staff_of_power' }
}
```

#### 🤝 Aventura Social
```javascript
{
    type: 'social',
    title: 'O Acordo com o Druida',
    description: 'Convença o druida a ajudar contra os mortos-vivos.',
    steps: [
        { type: 'skill_check', skill: 'persuasion', dc: 12 },
        { type: 'choice', options: ['Oferecer ouro', 'Oferecer ajuda', 'Ameaçar'] },
        { type: 'skill_check', skill: 'insight', dc: 10 }
    ],
    outcomes: {
        success: { ally: 'forest_druids', buff: 'nature_blessing' },
        failure: { consequence: 'druids_hostile' }
    }
}
```

### 2.3 Sistema de Descoberta de Aventuras

As aventuras podem ser descobertas de várias formas:

| Método | Descrição | Frequência |
|--------|-----------|------------|
| **Evento Aleatório** | Aparece durante exploração | 15% por exploração |
| **Pista em Item** | Pergaminho encontrado dá início | Loot especial |
| **NPC Quest Giver** | Marca especial no mapa | Diário |
| **Progressão de Campanha** | Desbloqueada ao completar anterior | Automático |

---

## 3. Narrativa Dinâmica

### 3.1 Sistema de Diálogos

Introduzir NPCs e diálogos para criar conexão emocional:

```javascript
const NPC_DIALOGUES = {
    mysterious_stranger: {
        name: "Estranho Misterioso",
        portrait: "/icons/npc/stranger.png",
        dialogues: {
            intro: {
                text: "Aventureiro... eu sinto uma escuridão se aproximando. Você já notou que os mortos-vivos estão mais agitados ultimamente?",
                choices: [
                    { text: "Sim, eu notei!", next: 'agree' },
                    { text: "Mortos-vivos sempre existiram...", next: 'dismiss' },
                    { text: "O que você sabe sobre isso?", next: 'investigate' }
                ]
            },
            investigate: {
                text: "Há rumores de um culto nas ruínas antigas... Encontre provas e eu te recompensarei generosamente.",
                startsQuest: 'orcus_cult_investigation'
            }
        }
    }
};
```

### 3.2 Sistema de Consequências

As escolhas dos jogadores afetam o mundo:

```javascript
const WORLD_STATE = {
    // Flags que mudam baseado nas ações
    cultDefeated: false,
    druidAlly: false,
    townSaved: false,
    
    // Modificadores baseados no estado
    getSpawnModifiers() {
        const mods = {};
        if (this.cultDefeated) {
            mods.undead = 0.5; // Menos mortos-vivos
        }
        if (!this.townSaved) {
            mods.monsters = 1.5; // Mais monstros
        }
        return mods;
    }
};
```

### 3.3 Jornal de Aventuras

Um registro narrativo das conquistas do grupo:

```javascript
const ADVENTURE_JOURNAL = {
    entries: [
        {
            date: '2026-01-08',
            chapter: 1,
            title: 'O Início da Escuridão',
            content: 'O grupo encontrou os primeiros sinais do culto de Orcus...',
            players: ['Jogador1', 'Jogador2'],
            achievements: ['Primeira Pista Encontrada']
        }
    ]
};
```

---

## 4. Mecânicas de Progressão de Campanha

### 4.1 Sistema de Capítulos

Cada campanha tem capítulos desbloqueados progressivamente:

```javascript
const CAMPAIGN_PROGRESS = {
    currentCampaign: 'plague_of_orcus',
    chapter: 1,
    objectives: {
        // Objetivos do capítulo atual
        'defeat_skeletons': { current: 5, target: 10 },
        'find_cult_symbols': { current: 2, target: 3 },
        'rescue_villager': { current: 0, target: 1 }
    },
    
    isChapterComplete() {
        return Object.values(this.objectives).every(
            obj => obj.current >= obj.target
        );
    }
};
```

### 4.2 Eventos de Mundo

Eventos que afetam todos os jogadores:

| Evento | Trigger | Efeito |
|--------|---------|--------|
| **Invasão de Mortos** | Capítulo 2 começa | +100% spawn de undead |
| **Lua de Sangue** | Noite real + campanha werewolf | Werewolves everywhere |
| **Despertar do Dragão** | Capítulo final | Boss aparece |
| **Benção do Templo** | Após completar santuário | +20% healing |

### 4.3 Progressão Global vs Individual

```javascript
// Progressão compartilhada (todos contribuem)
const GLOBAL_PROGRESS = {
    campaign_kills: 0,      // Conta para todos
    artifacts_found: 0,     // Conta para todos
    boss_attempts: 0        // Conta para todos
};

// Progressão individual
const PLAYER_PROGRESS = {
    contribution_score: 0,  // Quanto contribuiu
    personal_objectives: [],// Objetivos opcionais
    bonus_rewards: []       // Recompensas extras por contribuição
};
```

---

## 5. Recompensas Especiais

### 5.1 Títulos e Conquistas

```javascript
const CAMPAIGN_TITLES = {
    'plague_of_orcus': {
        completion: 'Destruidor de Orcus',
        bonuses: {
            undead_damage: 1.15,  // +15% dano vs undead
            special_spell: 'turn_undead'
        }
    },
    'blood_moon': {
        completion: 'Caçador da Lua',
        bonuses: {
            night_vision: true,
            silver_damage: 1.25
        }
    }
};
```

### 5.2 Itens Exclusivos de Campanha

Itens que só podem ser obtidos completando campanhas:

| Campanha | Item Exclusivo | Efeito |
|----------|----------------|--------|
| Praga de Orcus | **Manto do Exorcista** | +2 AC vs undead, Turn Undead 1x/dia |
| Lua de Sangue | **Lâmina de Prata Amaldiçoada** | 2d8 vs shapechangers, cura HP ao matar |
| Despertar do Dragão | **Escama de Dragão Vermelho** | Resistência a fogo, +10 HP máximo |

### 5.3 Cosméticos e Customização

- **Auras visuais** ao redor do personagem
- **Emblemas** no perfil do jogador
- **Cores especiais** para o nome
- **Animações de ataque** exclusivas

---

## 6. Implementação Técnica

### 6.1 Novos Arquivos a Criar

```
src/
├── data/
│   ├── campaigns.js        # Definição de campanhas
│   ├── adventures.js       # Mini-aventuras
│   └── npcs.js             # NPCs e diálogos
│
├── game/
│   ├── campaign-manager.js # Gerenciador de campanhas
│   ├── adventure-runner.js # Executor de aventuras
│   ├── dialogue-system.js  # Sistema de diálogos
│   └── world-state.js      # Estado do mundo
│
└── styles/
    ├── campaign-ui.css     # UI de campanha
    ├── dialogue.css        # UI de diálogos
    └── adventure.css       # UI de aventuras
```

### 6.2 Estrutura de Dados (Supabase)

```sql
-- Campanhas disponíveis
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    chapters JSONB,
    rewards JSONB,
    duration_days INTEGER,
    is_active BOOLEAN DEFAULT false
);

-- Progresso global da campanha
CREATE TABLE campaign_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id TEXT REFERENCES campaigns(id),
    chapter INTEGER DEFAULT 1,
    objectives JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Contribuição individual
CREATE TABLE player_campaign_progress (
    player_id UUID REFERENCES players(id),
    campaign_id TEXT REFERENCES campaigns(id),
    contribution_score INTEGER DEFAULT 0,
    personal_objectives JSONB,
    rewards_claimed JSONB,
    PRIMARY KEY (player_id, campaign_id)
);

-- Mini-aventuras ativas
CREATE TABLE active_adventures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id),
    adventure_id TEXT NOT NULL,
    current_step INTEGER DEFAULT 0,
    state JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jornal de aventuras
CREATE TABLE adventure_journal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE DEFAULT CURRENT_DATE,
    campaign_id TEXT,
    chapter INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    players UUID[] NOT NULL,
    achievements TEXT[]
);
```

### 6.3 Fluxo de UI

```
┌─────────────────────────────────────────┐
│         🗺️ MAPA PRINCIPAL               │
│                                         │
│   [📜 Campanha Ativa]  [⚔️ Aventura]    │
│                                         │
└─────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│      📜 PAINEL DE CAMPANHA              │
├─────────────────────────────────────────┤
│ A Praga de Orcus - Capítulo 2           │
│ ━━━━━━━━━━━━━━━━━━━━━━ 65%              │
│                                         │
│ Objetivos:                              │
│ ☑️ Derrotar 10 Skeletons (10/10)        │
│ ☑️ Encontrar 3 símbolos (3/3)           │
│ ⬜ Derrotar o Ghoul Leader (0/1)        │
│                                         │
│ [Ver História] [Ver Recompensas]        │
└─────────────────────────────────────────┘
            │
            ▼ (ao iniciar aventura)
            
┌─────────────────────────────────────────┐
│      ⚔️ MINI-AVENTURA ATIVA             │
├─────────────────────────────────────────┤
│ O Covil do Ghoul                        │
│ Passo 2 de 4                            │
│                                         │
│ "Você segue os rastros até uma         │
│  caverna escura. Algo se move lá        │
│  dentro..."                             │
│                                         │
│ [🔍 Investigar] [⚔️ Atacar] [🚪 Voltar] │
└─────────────────────────────────────────┘
```

### 6.4 Integração com AR

As aventuras terão momentos AR especiais:

1. **Descoberta de Pistas**: Objetos 3D escondidos no ambiente
2. **Combates de Boss**: Apresentação épica do boss em AR
3. **Rituais**: Interações especiais com glifos mágicos
4. **NPCs em AR**: Personagens que aparecem no mundo real

---

## 7. Cronograma de Desenvolvimento

### Fase 1: Fundação (1-2 semanas)
- [ ] Criar estrutura de dados para campanhas
- [ ] Implementar `campaign-manager.js`
- [ ] Criar UI básica de campanha
- [ ] Adicionar tabelas no Supabase

### Fase 2: Mini-Aventuras (1-2 semanas)
- [ ] Implementar `adventure-runner.js`
- [ ] Criar 5-10 mini-aventuras iniciais
- [ ] Integrar com sistema de exploração
- [ ] UI de aventura ativa

### Fase 3: Narrativa (1 semana)
- [ ] Sistema de diálogos
- [ ] NPCs básicos
- [ ] Jornal de aventuras
- [ ] Consequências de escolhas

### Fase 4: Primeira Campanha (1-2 semanas)
- [ ] Escrever "A Praga de Orcus" completa
- [ ] Criar assets visuais necessários
- [ ] Balancear dificuldade e recompensas
- [ ] Testar com o grupo

### Fase 5: Polimento (ongoing)
- [ ] Adicionar mais campanhas
- [ ] Refinar baseado em feedback
- [ ] Eventos sazonais
- [ ] Melhorias visuais

---

## 📌 Próximos Passos Imediatos

1. **Validar conceito**: Discutir com o grupo se a direção é a desejada
2. **Priorizar features**: Decidir o que implementar primeiro
3. **Criar primeira aventura**: Protótipo simples para testar
4. **Definir primeira campanha**: Escrever história detalhada

---

## 💡 Ideias Futuras

- **Sistema de Facções**: Escolher lado e ganhar benefícios
- **Modo Dungeon Master**: Um jogador cria aventuras para os outros
- **Aventuras Competitivas**: Corrida para completar primeiro
- **Eventos Sazonais**: Halloween, Natal, etc. com conteúdo especial
- **Crossovers**: Campanhas que conectam histórias anteriores

---

## 8. Sistema de Geolocalização - Campanhas no Mundo Real

### 8.1 Conceito: Points of Interest (POI)

A ideia central é vincular elementos da campanha a **locais físicos reais** no bairro. Cada local se torna um "Point of Interest" (POI) na campanha:

```javascript
// Exemplo de campanha geo-localizada
const CAMPAIGN_LOCATIONS = {
    campaign_id: 'plague_of_orcus',
    pois: [
        {
            id: 'npc_stranger',
            type: 'npc',
            name: 'O Estranho Misterioso',
            lat: -23.550520,  // Praça principal
            lng: -46.633308,
            radius: 30,       // metros
            chapter: 1,
            icon: '🧙',
            unlockCondition: null, // sempre visível
            dialogue: 'mysterious_stranger_intro'
        },
        {
            id: 'cult_symbol_1',
            type: 'clue',
            name: 'Símbolo do Culto',
            lat: -23.551234,  // Escola do bairro
            lng: -46.634567,
            radius: 25,
            chapter: 1,
            icon: '🔮',
            unlockCondition: 'talked_to_stranger',
            arObject: 'cult_glyph' // Objeto 3D para encontrar em AR
        },
        {
            id: 'ghoul_lair',
            type: 'dungeon',
            name: 'Covil do Ghoul',
            lat: -23.552789,  // Parque
            lng: -46.635890,
            radius: 40,
            chapter: 2,
            icon: '💀',
            unlockCondition: 'found_3_symbols',
            adventure: 'ghoul_lair_adventure',
            isBossLocation: true
        }
    ]
};
```

### 8.2 Sistema de Geofences (Cercas Virtuais)

Geofences detectam quando o jogador entra/sai de um local:

```javascript
// geofence-manager.js
import { getDistance, onPositionChange } from './gps.js';

class GeofenceManager {
    constructor() {
        this.activePOIs = [];
        this.enteredPOIs = new Set();
        this.listeners = [];
    }

    /**
     * Carrega POIs da campanha ativa
     */
    loadCampaignPOIs(campaignLocations) {
        this.activePOIs = campaignLocations.pois.filter(poi => {
            // Filtra por capítulo e condições
            return this.isPOIUnlocked(poi);
        });
    }

    /**
     * Inicia monitoramento de geofences
     */
    startMonitoring() {
        onPositionChange((coords) => {
            this.checkGeofences(coords);
        });
    }

    /**
     * Verifica se jogador entrou/saiu de POIs
     */
    checkGeofences(playerCoords) {
        for (const poi of this.activePOIs) {
            const distance = getDistance(
                playerCoords.lat, playerCoords.lng,
                poi.lat, poi.lng
            );

            const isInside = distance <= poi.radius;
            const wasInside = this.enteredPOIs.has(poi.id);

            if (isInside && !wasInside) {
                // ENTROU no POI
                this.enteredPOIs.add(poi.id);
                this.notifyListeners('enter', poi, distance);
            } else if (!isInside && wasInside) {
                // SAIU do POI
                this.enteredPOIs.delete(poi.id);
                this.notifyListeners('exit', poi, distance);
            } else if (isInside) {
                // Ainda dentro - atualiza distância
                this.notifyListeners('update', poi, distance);
            }
        }
    }

    /**
     * Adiciona listener para eventos de geofence
     */
    onGeofenceEvent(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(event, poi, distance) {
        this.listeners.forEach(cb => cb(event, poi, distance));
    }
}

export const geofenceManager = new GeofenceManager();
```

### 8.3 Interface de Mapa com Locais da Campanha

```
┌─────────────────────────────────────────┐
│           🗺️ MAPA DA CAMPANHA           │
├─────────────────────────────────────────┤
│                                         │
│    📍 Você está aqui                    │
│                                         │
│    🧙 Estranho (150m SW)               │
│    🔮 Símbolo #1 (80m N) ✓ Coletado    │
│    🔮 Símbolo #2 (200m E)              │
│    🔮 Símbolo #3 (???m) 🔒 Bloqueado   │
│    💀 Covil (???m) 🔒 Precisa 3/3      │
│                                         │
│    ─────────── Mapa visual ───────────  │
│    [Integração com Leaflet/Mapbox]      │
│                                         │
│    [📍 Centralizar] [🧭 Navegar]        │
└─────────────────────────────────────────┘
```

### 8.4 Tipos de POI

| Tipo | Descrição | Interação |
|------|-----------|-----------|
| **NPC** | Personagem que dá quests | Diálogo ao chegar |
| **Pista** | Objeto a encontrar | AR Exploration |
| **Dungeon** | Mini-aventura local | Série de combates/puzzles |
| **Santuário** | Ponto de descanso | Recupera HP/Mana |
| **Baú** | Loot escondido | Evento de exploração |
| **Boss** | Encontro de chefe | Combate especial em AR |
| **Portal** | Conexão entre áreas | Desbloqueia novos POIs |

### 8.5 Notificações de Proximidade

```javascript
// Quando jogador se aproxima de um POI
geofenceManager.onGeofenceEvent((event, poi, distance) => {
    if (event === 'enter') {
        // Vibração do celular
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        // Notificação visual
        showProximityAlert({
            icon: poi.icon,
            title: poi.name,
            message: getProximityMessage(poi),
            actions: getPOIActions(poi)
        });
        
        // Som ambiental baseado no tipo
        playAmbientSound(poi.type);
    }
});

function getProximityMessage(poi) {
    const messages = {
        npc: `${poi.name} quer falar com você!`,
        clue: `Há algo escondido aqui... use AR para encontrar!`,
        dungeon: `Você chegou em ${poi.name}. Preparado para entrar?`,
        boss: `⚠️ PERIGO! O boss da região está aqui!`,
        sanctuary: `Um lugar seguro para descansar.`
    };
    return messages[poi.type] || 'Você chegou ao local!';
}
```

### 8.6 Sistema de Navegação

Ajuda o jogador a encontrar o próximo objetivo:

```javascript
const NAVIGATION_SYSTEM = {
    // Calcula direção para próximo POI
    getDirectionTo(targetPOI) {
        const player = getLastPosition();
        if (!player) return null;

        const dx = targetPOI.lng - player.lng;
        const dy = targetPOI.lat - player.lat;
        const angle = Math.atan2(dx, dy) * 180 / Math.PI;
        
        return {
            distance: getDistance(player.lat, player.lng, targetPOI.lat, targetPOI.lng),
            bearing: angle,
            cardinal: this.angleToCardinal(angle)
        };
    },
    
    angleToCardinal(angle) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(((angle + 360) % 360) / 45) % 8;
        return directions[index];
    },
    
    // Mostra seta de navegação no HUD
    renderNavigationArrow(direction) {
        // Flecha que aponta para o objetivo
        const arrow = document.getElementById('nav-arrow');
        arrow.style.transform = `rotate(${direction.bearing}deg)`;
        arrow.querySelector('.distance').textContent = 
            direction.distance > 1000 
                ? `${(direction.distance/1000).toFixed(1)}km` 
                : `${Math.round(direction.distance)}m`;
    }
};
```

### 8.7 Exemplo de Campanha Geo-Localizada

#### 🧟 "A Praga de Orcus" - Versão Bairro

**Setup pelo Administrador:**
1. Admin escolhe locais do bairro para cada POI
2. Configura raio de ativação
3. Define ordem de desbloqueio

**Exemplo de configuração:**

| POI | Local Real | Tipo | Capítulo |
|-----|------------|------|----------|
| Estranho Misterioso | Praça Central | NPC | 1 |
| Símbolo #1 | Escola Municipal | Pista (AR) | 1 |
| Símbolo #2 | Igreja | Pista (AR) | 1 |
| Símbolo #3 | Padaria do Sr. João | Pista (AR) | 1 |
| Aldeão Perdido | Parque | Resgate + Combat | 1 |
| Ghoul Lair | Campo de Futebol | Dungeon + Boss | 2 |
| Entrada do Templo | Mercado Municipal | Portal | 2 |
| Lich Final Boss | Cemitério Municipal | Boss Final | 3 |

**Fluxo do jogador:**
```
1. Vai até a Praça → Fala com NPC → Recebe missão "encontrar símbolos"
2. Caminha até a Escola → Ativa AR → Encontra glifo em 3D → +1 símbolo
3. Vai até a Igreja → AR → +1 símbolo
4. Padaria → AR → +1 símbolo (3/3 completo!)
5. Desbloqueado: Parque → Combate com Zombies → Salva aldeão
6. Desbloqueado: Campo → DUNGEON: série de combates → Boss Ghoul
7. Progride para Capítulo 3...
```

### 8.8 Modo de Configuração (Admin)

Interface para o "Dungeon Master" configurar locais:

```javascript
// admin-map-config.js
const ADMIN_CONFIG_MODE = {
    // Permite tocar no mapa para adicionar POIs
    enablePOIPlacement() {
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            this.openPOIEditor(lat, lng);
        });
    },
    
    openPOIEditor(lat, lng) {
        showModal({
            title: 'Criar Ponto de Interesse',
            fields: [
                { name: 'name', label: 'Nome', type: 'text' },
                { name: 'type', label: 'Tipo', type: 'select', 
                  options: ['npc', 'clue', 'dungeon', 'sanctuary', 'boss'] },
                { name: 'radius', label: 'Raio (metros)', type: 'number', default: 25 },
                { name: 'chapter', label: 'Capítulo', type: 'number' },
                { name: 'icon', label: 'Emoji', type: 'text' },
            ],
            onSave: (data) => {
                savePOI({ ...data, lat, lng });
            }
        });
    }
};
```

### 8.9 Considerações de Segurança e Jogabilidade

```javascript
const SAFETY_CONFIG = {
    // Evita que jogadores precisem ir a locais perigosos
    restrictedAreas: {
        minDistance: 100, // metros de ruas movimentadas
        avoidTimes: ['22:00', '06:00'], // não ativar POIs à noite
    },
    
    // Modo indoor para dias de chuva
    indoorMode: {
        enabled: false, // Admin pode ativar
        virtualWalk: true, // Simula movimento com passos no lugar
    },
    
    // Raio mínimo para não exigir precisão extrema
    minRadius: 15, // metros
    
    // Cooldown entre interações no mesmo POI
    poiCooldown: 300000, // 5 minutos
};
```

### 8.10 Estrutura de Banco de Dados (Supabase)

```sql
-- Locais da campanha
CREATE TABLE campaign_pois (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id TEXT REFERENCES campaigns(id),
    poi_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'npc', 'clue', 'dungeon', 'boss', 'sanctuary'
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    radius INTEGER DEFAULT 25,
    chapter INTEGER DEFAULT 1,
    icon TEXT DEFAULT '📍',
    unlock_condition TEXT,
    ar_object TEXT,
    adventure_id TEXT,
    is_boss_location BOOLEAN DEFAULT false,
    created_by UUID REFERENCES players(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progresso do jogador nos POIs
CREATE TABLE player_poi_progress (
    player_id UUID REFERENCES players(id),
    poi_id UUID REFERENCES campaign_pois(id),
    status TEXT DEFAULT 'locked', -- 'locked', 'unlocked', 'visited', 'completed'
    first_visited_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    times_visited INTEGER DEFAULT 0,
    PRIMARY KEY (player_id, poi_id)
);

-- Histórico de visitas (para analytics)
CREATE TABLE poi_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id),
    poi_id UUID REFERENCES campaign_pois(id),
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    player_lat DECIMAL(10, 8),
    player_lng DECIMAL(11, 8),
    distance_from_center INTEGER
);

-- Índices para performance
CREATE INDEX idx_pois_campaign ON campaign_pois(campaign_id);
CREATE INDEX idx_pois_location ON campaign_pois USING GIST (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);
```

### 8.11 Cronograma de Implementação

| Fase | Tarefa | Estimativa |
|------|--------|------------|
| **1** | GeofenceManager base | 2-3 dias |
| **2** | UI de mapa com POIs | 3-4 dias |
| **3** | Sistema de navegação | 2 dias |
| **4** | Integração com AR | 2-3 dias |
| **5** | Interface de Admin | 3-4 dias |
| **6** | Testes no bairro real | 1 semana |

### 8.12 Bibliotecas Recomendadas

- **[Leaflet.js](https://leafletjs.com/)** - Mapas leves e customizáveis
- **[OpenStreetMap](https://www.openstreetmap.org/)** - Tiles gratuitos
- **[Turf.js](https://turfjs.org/)** - Cálculos geográficos avançados
- **Web Vibration API** - Feedback háptico nativo

---

## 9. Análise de Compatibilidade: Vercel + Supabase Free Tier

### 9.1 Resumo dos Limites Gratuitos

#### 🔵 Vercel Hobby (Free)

| Recurso | Limite Gratuito | Uso Estimado do Plano |
|---------|-----------------|----------------------|
| **Projetos** | 200 projetos | 1 projeto ✅ |
| **Deployments/dia** | 100 por dia | ~5 por dia ✅ |
| **Bandwidth** | 100 GB/mês | ~5-10 GB/mês ✅ |
| **Edge Requests** | 1 milhão/mês | ~100k/mês ✅ |
| **Serverless Functions** | 1 milhão invocações/mês | ~50k/mês ✅ |
| **CPU Time (Functions)** | 4 horas/mês | ~1-2 horas/mês ✅ |
| **Static Files** | 100 MB max | ~30 MB (3D models) ✅ |
| **Build Time** | 100 horas/mês | ~5 horas/mês ✅ |
| **Cron Jobs** | 2 crons | 1-2 (reset diário) ✅ |

#### 🟢 Supabase Free

| Recurso | Limite Gratuito | Uso Estimado do Plano |
|---------|-----------------|----------------------|
| **Database Storage** | 500 MB | ~50-100 MB ✅ |
| **File Storage** | 1 GB | ~200 MB ✅ |
| **Monthly Active Users** | 50.000 MAU | ~50-500 usuários ✅ |
| **Edge Functions** | 500k invocações/mês | ~10k/mês ✅ |
| **Edge Functions/dia** | 1.000/dia | ~100-500/dia ✅ |
| **API Requests** | ∞ (ilimitado) | ✅ |
| **Projetos Ativos** | 2 projetos | 1 projeto ✅ |
| **Egress** | 5 GB/mês | ~1-2 GB/mês ✅ |
| **Database Egress/dia** | 50 MB/dia | ~5-10 MB/dia ✅ |

### 9.2 Análise por Funcionalidade do Plano

#### ✅ **Campanhas e Mini-Aventuras** - COMPATÍVEL

| Aspecto | Impacto | Compatibilidade |
|---------|---------|-----------------|
| Armazenar campanhas | ~5 KB por campanha | ✅ Cabe em 500 MB |
| Armazenar mini-aventuras | ~2 KB por aventura | ✅ Cabe em 500 MB |
| Progresso dos jogadores | ~500 bytes por jogador/campanha | ✅ OK |
| NPCs e diálogos | ~10 KB total JSON | ✅ Armazenar no código |

**Estimativa para 10 campanhas + 50 aventuras + 100 jogadores:**
- Dados estruturados: ~500 KB
- **Uso: ~0.1% do limite de 500 MB** ✅

---

#### ✅ **Sistema de POIs Geo-localizados** - COMPATÍVEL COM OTIMIZAÇÕES

| Aspecto | Impacto | Compatibilidade |
|---------|---------|-----------------|
| POIs por campanha | ~20-50 POIs x 200 bytes | ✅ ~10 KB por campanha |
| Progresso jogador/POI | ~100 bytes por registro | ✅ OK |
| Histórico de visitas | ⚠️ Pode crescer rápido | ⚠️ Requer limpeza |

**⚠️ ALERTA: Tabela `poi_visits` (histórico)**

Esta tabela pode crescer indefinidamente. Para 100 jogadores fazendo 20 visitas/dia:
- 100 × 20 × 30 dias = **60.000 registros/mês**
- ~60 bytes por registro = **3.6 MB/mês**

**Recomendação:** Implementar limpeza automática de registros antigos (manter apenas 30 dias).

```sql
-- Limpeza automática com Cron Job
DELETE FROM poi_visits WHERE visited_at < NOW() - INTERVAL '30 days';
```

---

#### ✅ **Mapa Interativo (Leaflet.js)** - COMPATÍVEL

| Aspecto | Impacto | Compatibilidade |
|---------|---------|-----------------|
| Leaflet.js library | ~40 KB gzip | ✅ Incluso nos 100 GB |
| OpenStreetMap tiles | Carregados do OSM | ✅ Não conta no bandwidth |
| Cálculos de distância | Client-side (JavaScript) | ✅ Zero custo server |

**Nota:** OpenStreetMap tiles são gratuitos e carregados diretamente do CDN do OSM, não contam no bandwidth da Vercel.

---

#### ⚠️ **Notificações de Proximidade (Geofencing)** - ATENÇÃO

| Aspecto | Impacto | Compatibilidade |
|---------|---------|-----------------|
| Verificação local | Client-side GPS | ✅ Zero custo server |
| Sincronização com DB | A cada POI visitado | ⚠️ Otimizar frequência |

**Problema potencial:** Se o app sincronizar a cada segundo com o servidor, isso pode explodir os limites.

**Solução implementada no plano:**
```javascript
// Sincronizar apenas quando:
// 1. Jogador ENTRA em um POI
// 2. Jogador COMPLETA um objetivo
// NÃO sincronizar a cada update de GPS!

const SYNC_STRATEGY = {
    onPOIEnter: true,      // Sync ao entrar
    onPOIComplete: true,   // Sync ao completar
    periodicSync: 300000,  // Sync a cada 5 min (backup)
};
```

---

#### ✅ **AR Exploration** - COMPATÍVEL

| Aspecto | Impacto | Compatibilidade |
|---------|---------|-----------------|
| Modelos 3D | Já no projeto (GLB) | ✅ Já otimizado |
| WebXR | 100% client-side | ✅ Zero custo server |
| Objetos AR por POI | Referência no JSON | ✅ ~50 bytes |

---

#### ✅ **Sistema de Navegação** - COMPATÍVEL

| Aspecto | Impacto | Compatibilidade |
|---------|---------|-----------------|
| Cálculo de direção | Client-side | ✅ Zero custo |
| Haversine formula | JavaScript local | ✅ Zero custo |
| UI de navegação | HTML/CSS local | ✅ Zero custo |

---

### 9.3 Pontos Críticos e Mitigações

#### 🔴 Risco 1: Crescimento da Tabela de Visitas

**Problema:** `poi_visits` pode crescer sem limite, esgotando os 500 MB.

**Mitigação:**
```sql
-- Política de retenção: apenas 30 dias
CREATE OR REPLACE FUNCTION cleanup_old_visits()
RETURNS void AS $$
BEGIN
    DELETE FROM poi_visits WHERE visited_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Ou usar particionamento por data (mais avançado)
```

---

#### 🟡 Risco 2: Muitas Requisições de Sincronização

**Problema:** App sincronizando demais pode esgotar limite de egress (50 MB/dia).

**Mitigação:**
```javascript
// Estratégia de batching
const syncQueue = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 60000; // 1 minuto

function queueSync(event) {
    syncQueue.push(event);
    if (syncQueue.length >= BATCH_SIZE) {
        flushSync();
    }
}

setInterval(flushSync, BATCH_INTERVAL);
```

---

#### 🟡 Risco 3: Pausa do Projeto Supabase

**Problema:** Projetos gratuitos pausam após 1 semana de inatividade.

**Mitigação:**
- Implementar um "heartbeat" que acessa o DB periodicamente
- Usar Vercel Cron para ping diário

```javascript
// api/heartbeat.js (Vercel Cron)
export default async function handler(req, res) {
    // Simples SELECT para manter projeto ativo
    await supabase.from('campaigns').select('id').limit(1);
    res.status(200).json({ status: 'alive' });
}

// vercel.json
{
    "crons": [{
        "path": "/api/heartbeat",
        "schedule": "0 0 * * *" // Diário à meia-noite
    }]
}
```

---

### 9.4 Estimativa de Uso para Diferentes Escalas

#### 📊 Cenário A: Grupo Pequeno (10 jogadores)

| Métrica | Uso Mensal | % do Limite |
|---------|------------|-------------|
| DB Storage | ~5 MB | 1% |
| File Storage | ~200 MB | 20% |
| API Requests | ~10.000 | 0% (∞) |
| Bandwidth | ~2 GB | 2% |
| MAU | 10 | 0.02% |

**Veredicto:** ✅ **TOTALMENTE COMPATÍVEL**

---

#### 📊 Cenário B: Comunidade Média (100 jogadores)

| Métrica | Uso Mensal | % do Limite |
|---------|------------|-------------|
| DB Storage | ~50 MB | 10% |
| File Storage | ~300 MB | 30% |
| API Requests | ~100.000 | 0% (∞) |
| Bandwidth | ~10 GB | 10% |
| MAU | 100 | 0.2% |

**Veredicto:** ✅ **COMPATÍVEL**

---

#### 📊 Cenário C: Comunidade Grande (1.000 jogadores)

| Métrica | Uso Mensal | % do Limite |
|---------|------------|-------------|
| DB Storage | ~200 MB | 40% |
| File Storage | ~500 MB | 50% |
| API Requests | ~1.000.000 | 0% (∞) |
| Bandwidth | ~50 GB | 50% |
| MAU | 1.000 | 2% |

**Veredicto:** ⚠️ **COMPATÍVEL COM OTIMIZAÇÕES**
- Implementar limpeza de dados antigos
- Usar cache agressivo
- Considerar upgrade se crescer mais

---

### 9.5 Recomendações Finais

#### ✅ Já Compatível (pode implementar agora)
1. Sistema de campanhas e mini-aventuras
2. POIs geo-localizados com mapa
3. Integração AR nos POIs
4. Sistema de navegação
5. Progressão individual e global

#### ⚠️ Requer Otimização (implementar com cuidado)
1. **Histórico de visitas** → Limpeza automática a cada 30 dias
2. **Sincronização** → Batch updates, não real-time
3. **Heartbeat** → Cron job para evitar pausa do Supabase

#### 💡 Boas Práticas para Free Tier
1. **Armazenar dados estáticos no código** (campanhas, aventuras, NPCs)
2. **Usar localStorage** para cache de dados frequentes
3. **Comprimir assets** (GLB, imagens)
4. **Lazy loading** de recursos pesados
5. **Evitar polling** - usar eventos quando possível

---

### 9.6 Conclusão

| Aspecto | Status |
|---------|--------|
| **Vercel Free** | ✅ COMPATÍVEL |
| **Supabase Free** | ✅ COMPATÍVEL |
| **Escala até ~500 usuários** | ✅ SEM PROBLEMAS |
| **Escala até ~1000 usuários** | ⚠️ REQUER OTIMIZAÇÕES |
| **Escala acima de 1000** | ❌ CONSIDERAR UPGRADE |

**O plano é 100% viável nos planos gratuitos** para o uso proposto (grupo de jogadores explorando o bairro). As otimizações sugeridas garantem que o sistema funcione bem mesmo com crescimento moderado.
