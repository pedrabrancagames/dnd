# PRD – Jogo de Realidade Aumentada Multiplayer inspirado em Dungeons & Dragons (Web)

## 1. Visão Geral

**Objetivo do Produto**  
Criar um jogo de RPG multiplayer em realidade aumentada, jogável diretamente no navegador de celulares Android, inspirado no universo de Dungeons & Dragons, no qual jogadores exploram o mundo real, enfrentam criaturas, cooperam entre si e evoluem personagens persistentes.

**Público-alvo**  
Grupo privado de até 10 jogadores (amigos).

**Plataformas**  
- Navegador mobile (Chrome Android prioritário)
- Progressive Web App (PWA)

**Tecnologias-base**  
- Frontend: JavaScript + WebXR + Three.js + Leaflet (Mapas)
- Backend serverless: Vercel (plano gratuito)
- Backend realtime e banco de dados: Supabase (plano gratuito)

---

## 2. Requisitos de Hardware

### 2.1 Requisitos Mínimos

O jogo exige dispositivos com suporte completo às tecnologias utilizadas. Não haverá modo de compatibilidade ou fallback.

**Requisitos obrigatórios:**
- Android 8.0 ou superior
- Google Chrome 79+ ou navegador com suporte a WebXR
- Suporte a ARCore (Google Play Services for AR instalado)
- GPS de alta precisão
- Câmera traseira
- Giroscópio e acelerômetro
- Mínimo 3GB de RAM

### 2.2 Verificação de Compatibilidade

Ao iniciar o jogo, será executada uma verificação completa:

```javascript
// Checklist de compatibilidade
  { nome: 'HTTPS', teste: () => location.protocol === 'https:' }, // WebXR exige HTTPS
  { nome: 'WebXR', teste: () => navigator.xr !== undefined },
  { nome: 'AR Mode', teste: async () => navigator.xr ? await navigator.xr.isSessionSupported('immersive-ar') : false },
  { nome: 'Geolocalização', teste: () => 'geolocation' in navigator },
  { nome: 'Câmera', teste: () => navigator.mediaDevices !== undefined },
  // Validar também WebGL2 para Three.js performance
  { nome: 'WebGL2', teste: () => !!document.createElement('canvas').getContext('webgl2') }
];
```

### 2.3 Tela de Incompatibilidade

Se qualquer requisito falhar, o jogador verá uma tela informativa:

**Mensagem:**
> ⚠️ **Aparelho Incompatível**
>
> Seu dispositivo não suporta os recursos necessários para jogar.
>
> **Requisitos não atendidos:**
> - [lista dos requisitos faltantes]
>
> **Dispositivos compatíveis:**
> - Samsung Galaxy S8 ou superior
> - Google Pixel 2 ou superior
> - Xiaomi Mi 9 ou superior
> - OnePlus 6 ou superior
>
> [Link: Lista completa de dispositivos compatíveis com ARCore](https://developers.google.com/ar/devices)

**Fluxo de Bloqueio (Fail-fast):**
Se a verificação falhar, o carregamento do jogo (Three.js, texturas, sons) será **abortado imediatamente** para economizar dados e bateria do usuário. Nada além da tela de erro será processado. Não haverá modo alternativo ou "mapa 2D" para quem não tem AR. O jogo é AR-First.

---

## 3. Proposta de Valor

- RPG completo no navegador (sem instalar app)
- Experiência cooperativa baseada em localização real
- Sistema de progressão fiel à fantasia de D&D
- AR imersivo com monstros no mundo real
- Jogo privado para grupo de amigos

---

## 4. Escopo do Produto

### Incluído
- Exploração geolocalizada
- Combate cooperativo em AR
- Progressão de personagem persistente
- Multiplayer em tempo real por proximidade
- Sistema de loot e inventário
- Classes e habilidades inspiradas em D&D

### Não incluído
- PvP direto
- Suporte iOS
- Comércio entre jogadores (inicialmente)
- Guildas/clãs

---

## 5. Universo de Dungeons & Dragons

### 5.1 Uso do Conteúdo Oficial

> **⚠️ IMPORTANTE:** Este jogo é de uso privado, sem fins lucrativos, destinado exclusivamente para diversão entre amigos. Por este motivo, utilizaremos livremente todo o conteúdo do universo de Dungeons & Dragons, incluindo:

- **Monstros:** Todas as criaturas do Monster Manual, Volo's Guide, Mordenkainen's Tome of Foes, etc.
- **Itens Mágicos:** Itens do Dungeon Master's Guide e suplementos oficiais
- **Magias:** Todas as magias dos livros de regras oficiais
- **Raças e Classes:** Conteúdo oficial do Player's Handbook e expansões
- **Lore:** História, deuses, planos de existência e cosmologia de D&D

### 5.2 Assets Customizados

Todos os assets visuais e sonoros serão confeccionados manualmente para garantir imersão:

| Tipo de Asset | Formato | Especificações |
|---------------|---------|----------------|
| Modelos 3D | GLB/GLTF | < 5k polígonos, Draco compression |
| Texturas | WebP | 512x512 máximo |
| Sons/Efeitos | MP3/OGG | < 500KB cada |
| Música | MP3 | < 2MB cada |
| Ícones | SVG/PNG | 128x128 para itens |
| Sprites | WebP | Para efeitos 2D |

### 5.3 Bestiário Completo (Monster Manual)

#### Criaturas por Challenge Rating (CR)

**CR 0-1 (Níveis 1-3 dos jogadores)**
| Criatura | HP | AC | Dano | Tipo | Ambiente |
|----------|----|----|------|------|----------|
| Goblin | 7 | 15 | 1d6+2 | Humanoide | Urbano, Floresta |
| Kobold | 5 | 12 | 1d4+2 | Humanoide | Caverna, Ruínas |
| Skeleton | 13 | 13 | 1d6+2 | Morto-vivo | Cemitério, Ruínas |
| Zombie | 22 | 8 | 1d6+1 | Morto-vivo | Cemitério, Noturno |
| Giant Rat | 7 | 12 | 1d4+2 | Besta | Urbano, Esgoto |
| Stirge | 2 | 14 | 1d4+3 | Besta | Pântano |
| Wolf | 11 | 13 | 2d4+2 | Besta | Floresta |

**CR 2-4 (Níveis 4-7 dos jogadores)**
| Criatura | HP | AC | Dano | Tipo | Ambiente |
|----------|----|----|------|------|----------|
| Orc | 15 | 13 | 1d12+3 | Humanoide | Montanha, Floresta |
| Ogre | 59 | 11 | 2d8+4 | Gigante | Montanha |
| Ghoul | 22 | 12 | 2d6+2 | Morto-vivo | Cemitério |
| Werewolf | 58 | 12 | 2d4+3 | Metamorfo | Floresta, Noturno |
| Harpy | 38 | 11 | 2d4+1 | Monstruosidade | Montanha |
| Mimic | 58 | 12 | 1d8+3 | Monstruosidade | Masmorra |
| Owlbear | 59 | 13 | 2d8+4 | Monstruosidade | Floresta |

**CR 5-8 (Níveis 8-12 dos jogadores)**
| Criatura | HP | AC | Dano | Tipo | Ambiente |
|----------|----|----|------|------|----------|
| Troll | 84 | 15 | 2d6+4 | Gigante | Pântano, Caverna |
| Vampire Spawn | 82 | 15 | 2d6+3 | Morto-vivo | Noturno, Ruínas |
| Hill Giant | 105 | 13 | 3d8+5 | Gigante | Montanha |
| Wraith | 67 | 13 | 3d8+3 | Morto-vivo | Cemitério |
| Manticore | 68 | 14 | 3d8+3 | Monstruosidade | Montanha |
| Basilisk | 52 | 15 | 2d6+3 | Monstruosidade | Caverna |

**CR 9-12 (Níveis 13-16 dos jogadores) - Bosses**
| Criatura | HP | AC | Dano | Tipo | Ambiente |
|----------|----|----|------|------|----------|
| Young Red Dragon | 178 | 18 | 4d10+6 | Dragão | Vulcão, Montanha |
| Stone Giant | 126 | 17 | 3d8+6 | Gigante | Montanha |
| Aboleth | 135 | 17 | 3d6+5 | Aberração | Água |
| Beholder | 180 | 18 | 4d10 | Aberração | Masmorra |
| Mind Flayer | 71 | 15 | 2d10+4 | Aberração | Subterrâneo |

**CR 13+ (Níveis 17-20 dos jogadores) - Raid Bosses**
| Criatura | HP | AC | Dano | Tipo | Ambiente |
|----------|----|----|------|------|----------|
| Adult Red Dragon | 256 | 19 | 6d10+7 | Dragão | Vulcão |
| Lich | 135 | 17 | 6d8+5 | Morto-vivo | Ruínas Antigas |
| Death Knight | 180 | 20 | 4d8+6 | Morto-vivo | Cemitério |
| Pit Fiend | 300 | 19 | 6d6+8 | Demônio | Evento Especial |
| Tarrasque | 676 | 25 | 10d12+10 | Monstruosidade | Evento Mundial |

### 5.4 Tipos de Dano e Vulnerabilidades

| Tipo de Dano | Criaturas Vulneráveis | Criaturas Resistentes/Imunes |
|--------------|----------------------|------------------------------|
| Fogo | Trolls, Múmias, Treants | Dragões Vermelhos, Demônios |
| Gelo | Salamandras | Dragões Brancos, Gigantes de Gelo |
| Raio | Criaturas aquáticas | Dragões Azuis |
| Radiante | Mortos-vivos, Demônios | Celestiais, Anjos |
| Necrótico | Celestiais | Mortos-vivos |
| Prata | Lobisomens, Vampiros | - |
| Mágico | Criaturas imunes a não-mágico | - |

### 5.5 Itens Mágicos do DMG

#### Armas Mágicas

| Item | Raridade | Bônus | Efeito Especial |
|------|----------|-------|-----------------|
| Espada Longa +1 | Incomum | +1 ataque/dano | - |
| Espada Vorpal | Lendário | +3 ataque/dano | 20 natural: decapita |
| Arco de Aviso | Raro | +2 ataque | Vantagem em iniciativa |
| Sunblade | Raro | +2 ataque | +2d6 radiante vs mortos-vivos |
| Flame Tongue | Raro | +0 | +2d6 dano de fogo |
| Frost Brand | Muito Raro | +3 ataque | +1d6 gelo, resistência fogo |
| Dagger of Venom | Raro | +1 ataque | 1x/dia: 2d10 veneno |
| Staff of Power | Muito Raro | +2 ataque | 20 cargas de magias |

#### Armaduras Mágicas

| Item | Raridade | AC | Efeito Especial |
|------|----------|----|-----------------
| Armadura +1 | Incomum | +1 AC | - |
| Armadura de Mithral | Incomum | Normal | Sem desvantagem stealth |
| Armadura de Adamantine | Incomum | Normal | Críticos viram hits normais |
| Dragon Scale Mail | Muito Raro | AC 14+DEX | Resistência ao elemento |
| Armor of Invulnerability | Lendário | AC 18 | Resistência a dano não-mágico |
| Shield +1/+2/+3 | Incomum-Raro | +1/+2/+3 | - |
| Shield of Missile Attraction | Raro | +2 | Desvantagem em ataques à distância contra você |

#### Acessórios e Anéis

| Item | Raridade | Efeito |
|------|----------|--------|
| Ring of Protection | Raro | +1 AC e Saving Throws |
| Cloak of Protection | Incomum | +1 AC e Saving Throws |
| Amulet of Health | Raro | CON vira 19 |
| Boots of Speed | Raro | Dobra velocidade |
| Gauntlets of Ogre Power | Incomum | STR vira 19 |
| Headband of Intellect | Incomum | INT vira 19 |
| Ring of Regeneration | Muito Raro | Regenera 1d6 HP/10min |
| Cloak of Invisibility | Lendário | Invisibilidade |
| Bag of Holding | Incomum | Inventário expandido |
| Ioun Stone (várias) | Raro-Lendário | Bônus diversos |

#### Poções e Consumíveis

| Item | Raridade | Efeito | Duração |
|------|----------|--------|---------|
| Poção de Cura | Comum | Cura 2d4+2 HP | Instantâneo |
| Poção de Cura Maior | Incomum | Cura 4d4+4 HP | Instantâneo |
| Poção de Cura Superior | Raro | Cura 8d4+8 HP | Instantâneo |
| Poção de Heroísmo | Raro | 10 HP temp + bravura | 1 hora |
| Poção de Invisibilidade | Muito Raro | Invisível | 1 hora |
| Poção de Velocidade | Muito Raro | Haste | 1 minuto |
| Poção de Força de Gigante | Raro | STR 21-29 | 1 hora |
| Óleo de Afiação | Incomum | +3 dano arma | 1 hora |
| Pergaminho de Magia | Varia | Conjura magia | 1 uso |

### 5.6 Sistema de Magias (SRD)

#### Magias de Nível 0 (Truques)
| Magia | Classe | Dano/Efeito | Alcance |
|-------|--------|-------------|---------|
| Fire Bolt | Mago | 1d10 fogo | 120ft |
| Sacred Flame | Clérigo | 1d8 radiante | 60ft |
| Eldritch Blast | Warlock | 1d10 força | 120ft |
| Vicious Mockery | Bardo | 1d4 psíquico | 60ft |
| Chill Touch | Mago | 1d8 necrótico | 120ft |

#### Magias de Nível 1-3
| Magia | Nível | Classe | Efeito | Custo Mana |
|-------|-------|--------|--------|------------|
| Magic Missile | 1 | Mago | 3d4+3, auto-hit | 5 |
| Cure Wounds | 1 | Clérigo | Cura 1d8+WIS | 5 |
| Shield | 1 | Mago | +5 AC reação | 5 |
| Smite | 1 | Paladino | +2d8 radiante | 5 |
| Fireball | 3 | Mago | 8d6 fogo AoE | 15 |
| Lightning Bolt | 3 | Mago | 8d6 raio linha | 15 |
| Revivify | 3 | Clérigo | Revive 1 HP | 20 |

#### Magias de Nível 4-6
| Magia | Nível | Classe | Efeito | Custo Mana |
|-------|-------|--------|--------|------------|
| Greater Invisibility | 4 | Mago | Invisível em combate | 25 |
| Banishment | 4 | Clérigo | Remove criatura | 25 |
| Cone of Cold | 5 | Mago | 8d8 gelo cone | 30 |
| Flame Strike | 5 | Clérigo | 8d6 fogo/radiante | 30 |
| Chain Lightning | 6 | Mago | 10d8 raio múltiplos | 35 |
| Heal | 6 | Clérigo | Cura 70 HP | 35 |

### 5.7 Raças Jogáveis (Futuro)

| Raça | Bônus de Atributo | Habilidade Racial |
|------|-------------------|-------------------|
| Humano | +1 todos | Versatilidade |
| Elfo | +2 DEX | Visão no escuro, Transe |
| Anão | +2 CON | Resistência a veneno |
| Halfling | +2 DEX | Sorte (rerola 1s) |
| Meio-Orc | +2 STR, +1 CON | Fúria quando HP baixo |
| Tiefling | +2 CHA, +1 INT | Resistência fogo |
| Draconato | +2 STR, +1 CHA | Sopro elemental |

### 5.8 Estrutura de Assets a Criar

```
/assets
├── /models (GLB)
│   ├── /monsters
│   │   ├── goblin.glb
│   │   ├── skeleton.glb
│   │   ├── dragon_red.glb
│   │   └── ...
│   ├── /items
│   │   ├── sword_flame_tongue.glb
│   │   ├── shield_basic.glb
│   │   └── ...
│   └── /effects
│       ├── fireball_explosion.glb
│       └── ...
├── /textures (WebP)
│   ├── /monsters
│   ├── /items
│   └── /environment
├── /audio
│   ├── /sfx
│   │   ├── sword_hit.mp3
│   │   ├── spell_fire.mp3
│   │   └── ...
│   ├── /ambient
│   │   ├── forest.mp3
│   │   └── ...
│   └── /music
│       ├── combat.mp3
│       └── exploration.mp3
├── /icons (SVG/PNG)
│   ├── /items
│   ├── /spells
│   └── /status
└── /sprites (WebP)
    └── /effects
```

---

## 6. Core Gameplay Loop

1. Jogador abre o jogo (PWA)
2. Verificação de compatibilidade do dispositivo
3. Autenticação (Supabase Auth)
4. Mapa (Leaflet + OpenStreetMap) mostra células mágicas próximas
5. Jogador se desloca fisicamente
6. Criatura ou evento é encontrado
7. Combate cooperativo em AR
8. Recompensas (XP, itens)
9. Evolução do personagem
10. Retorno ao mapa

---

## 7. Mundo e Exploração

### 7.1 Sistema de Células GPS

- Mundo dividido em células de ~50m x 50m
- Cada célula possui:
  - ID único (baseado em coordenadas)
  - Nível de perigo (1-5)
  - Bioma (urbano, parque, água, etc.)
  - Lista de criaturas possíveis
  - Tempo de respawn de monstros

### 7.2 Pontos de Interesse

- **Santuários:** Cura HP / aplicam buffs temporários
- **Masmorras temporárias:** Eventos especiais com boss
- **Zonas de loot:** Maior chance de itens raros

### 7.3 Respawn de Monstros

- Monstros comuns: respawn a cada 5 minutos
- Monstros raros: respawn a cada 30 minutos
- Bosses: respawn a cada 2 horas

---

## 8. Realidade Aumentada

### 8.1 Abordagem Técnica

- WebXR AR mode (immersive-ar)
- Hit-test para posicionar monstros no chão
- Âncoras para manter posição dos monstros
- Three.js para renderização 3D
- Modelos GLB/GLTF otimizados para mobile

### 8.2 Interação em AR

- **Toque na tela:** Ataque básico na direção apontada
- **Swipe/Gestos:** Ativar magias e habilidades
- **Movimento físico:** Aproximar/afastar do monstro
- **Rotação do celular:** Mirar em diferentes inimigos

### 8.3 Feedback Visual

- Indicadores de dano flutuantes
- Efeitos de partículas para magias
- Barra de vida do monstro
- Indicador de direção de inimigos fora da tela

---

## 9. Multiplayer

### 9.1 Modelo

- Multiplayer cooperativo local
- Até 10 jogadores totais no jogo
- Jogadores na mesma célula GPS compartilham o mesmo estado de combate
- Formação automática de grupo por proximidade

### 9.2 Comunicação

- Supabase Realtime Channels
- Canal por célula GPS ativa
- Presence para mostrar jogadores online
- Broadcast para eventos de combate

### 9.3 Sincronização

- Servidor autoritativo para regras críticas
- Cliente envia apenas intenções de ação
- Interpolação suave para movimentos de outros jogadores
- Reconciliação de estado em caso de conflito

### 9.4 Limites do Plano Gratuito (Supabase)

Com apenas 10 jogadores, os limites são mais que suficientes:

| Recurso | Limite Gratuito | Uso Estimado (10 jogadores) |
|---------|-----------------|----------------------------|
| Conexões Realtime | 200 | 10 (sobra muito) |
| Mensagens Realtime | 2M/mês | ~50k/mês (estimado) |
| Storage BD | 500 MB | ~50 MB (estimado) |
| MAUs | 50.000 | 10 |

**Estratégia de Controle de Cota:**
- Update Rate de Posição: Limitado a 5Hz (5 atualizações/segundo) para outros jogadores.
- Interpolação no cliente para suavizar o movimento, evitando enviar 60 pacotes/segundo via Supabase.
- Apenas eventos críticos (Dano, Morte, Loot) são enviados com prioridade imediata.


---

## 10. Sistema de Combate (Inspirado em D&D)

### 10.1 Princípios de Design

- Combate cooperativo, rápido e legível em AR
- Inspirado em D&D 5e, porém simplificado para mobile
- Todas as regras críticas executadas no servidor
- Cliente envia apenas **intenções de ação**
- Duração ideal: 30-60 segundos por combate

---

### 10.2 Atributos Base

Cada personagem possui os seis atributos clássicos:

| Atributo | Sigla | Uso Principal |
|----------|-------|---------------|
| Força | STR | Dano corpo a corpo, carregar itens |
| Destreza | DEX | Acerto à distância, esquiva, iniciativa |
| Constituição | CON | HP máximo, resistência a veneno |
| Inteligência | INT | Dano mágico, identificar itens |
| Sabedoria | WIS | Percepção, resistência a encantamentos |
| Carisma | CHA | Habilidades sociais, intimidação |

**Modificador de atributo:**
```
mod = floor((atributo - 10) / 2)
```

---

### 10.3 Valores Derivados

**HP Máximo:**
- Guerreiro: 12 + mod(CON) por nível
- Mago: 6 + mod(CON) por nível
- Arqueiro: 8 + mod(CON) por nível
- Clérigo: 8 + mod(CON) por nível

**Classe de Armadura (AC):**
```
AC = 10 + mod(DEX) + bônus de armadura + bônus de escudo
```

**Iniciativa:**
```
initiative = d20 + mod(DEX)
```

---

### 10.4 Ações de Combate

Cada jogador pode executar **1 ação** por cooldown (2-3 segundos).

**Tipos de ações:**
- Ataque básico (arma equipada)
- Magia (se tiver mana)
- Habilidade de classe (cooldown específico)
- Usar item (poção, pergaminho)

---

### 10.5 Ataque Básico

**Fluxo:**
1. Cliente envia intenção: `attack(target_id)`
2. Servidor valida: distância, cooldown, estado do jogador
3. Servidor rola: `d20 + modificador de ataque`
4. Se >= AC do alvo → acerto
5. Calcula dano e aplica

**Dano base por arma:**
- Espada: `1d8 + mod(STR)`
- Adaga: `1d4 + mod(DEX)`
- Arco: `1d6 + mod(DEX)`
- Cajado: `1d6 + mod(INT)`

---

### 10.6 Sistema de Magia

**Recursos:**
- Mana: INT × 2 + nível × 3
- Regenera 1 mana a cada 10 segundos fora de combate

**Exemplo de magias:**

| Magia | Custo | Dano | Efeito |
|-------|-------|------|--------|
| Fire Bolt | 5 mana | 1d10 + mod(INT) | Dano de fogo |
| Ice Shard | 5 mana | 1d8 + mod(INT) | Slow 3s |
| Heal | 8 mana | - | Cura 2d6 + mod(WIS) |
| Lightning | 10 mana | 2d8 + mod(INT) | Dano em área |

---

### 10.7 Testes de Resistência (Saving Throws)

Para magias em área ou efeitos especiais:

```
d20 + mod(atributo) >= DC
```

**DC padrão:**
```
DC = 8 + mod(atributo do atacante) + bônus de proficiência
```

- Falha: efeito total
- Sucesso: metade do dano ou nega efeito

---

### 10.8 Críticos e Falhas

**20 natural (Crítico):**
- Dano dobrado (rola dados duas vezes)
- Efeito visual especial (explosão, glow)
- Som de impacto épico

**1 natural (Falha Crítica):**
- Ataque erra automaticamente
- Cooldown aumentado em 50%
- Efeito visual de tropeço

---

### 10.9 Combate Cooperativo

- Múltiplos jogadores atacam o mesmo monstro
- Barra de vida compartilhada visível para todos
- **Aggro:** Monstro foca quem causa mais dano ou usa taunt
- **Combo:** Ataques em sequência rápida dão bônus de dano

---

### 10.10 Morte e Reviver

1. HP <= 0 → Estado **incapacitado**
2. Jogador incapacitado pode ser revivido por aliados (ação + item ou magia)
3. Se todos caírem → **derrota**, respawn no santuário mais próximo
4. Penalidade de derrota: perda de 10% do XP do nível atual (nunca desce de nível)

---

## 11. Classes

### 11.1 Guerreiro
- **HP:** Alto (12 + CON/nível)
- **Armas:** Espadas, machados, martelos
- **Habilidade especial:** Provocação (força monstro a atacá-lo)
- **Passiva:** +2 AC quando HP < 50%

### 11.2 Mago
- **HP:** Baixo (6 + CON/nível)
- **Armas:** Cajados, orbes
- **Habilidade especial:** Meteor (dano massivo em área, cooldown longo)
- **Passiva:** +20% dano mágico contra inimigos com debuff

### 11.3 Arqueiro
- **HP:** Médio (8 + CON/nível)
- **Armas:** Arcos, bestas
- **Habilidade especial:** Chuva de Flechas (múltiplos alvos)
- **Passiva:** +50% dano crítico

### 11.4 Clérigo
- **HP:** Médio (8 + CON/nível)
- **Armas:** Maças, escudos
- **Habilidade especial:** Cura em área
- **Passiva:** Regenera HP de aliados próximos lentamente

---

## 12. Progressão

### 12.1 Sistema de Níveis

- Níveis 1 a 20
- XP necessário por nível: `nível × 100 × 1.5`

### 12.2 Ganho de XP

| Fonte | XP Base |
|-------|---------|
| Monstro comum | 10-30 |
| Monstro raro | 50-100 |
| Boss | 200-500 |
| Missão | 50-200 |
| Primeiro monstro do dia | +50% bônus |

### 12.3 Benefícios por Nível

- +1 ponto de atributo a cada 2 níveis
- Nova habilidade a cada 5 níveis
- Aumento de HP máximo
- Acesso a equipamentos de tier superior

---

## 13. Itens e Loot

### 13.1 Tipos de Equipamento

- **Arma:** Define dano base e tipo de ataque
- **Armadura:** Define bônus de AC
- **Acessório:** Bônus de atributos ou efeitos especiais
- **Consumíveis:** Poções, pergaminhos, comida

### 13.2 Raridades

| Raridade | Cor | Drop Rate | Bônus |
|----------|-----|-----------|-------|
| Comum | Branco | 60% | +0 a +2 |
| Incomum | Verde | 25% | +3 a +5 |
| Raro | Azul | 10% | +6 a +8, 1 efeito especial |
| Épico | Roxo | 4% | +9 a +12, 2 efeitos especiais |
| Lendário | Laranja | 1% | +13 a +15, 3 efeitos especiais |

### 13.3 Efeitos Especiais de Itens

- Vampirismo (cura % do dano)
- Elemental (dano adicional de fogo/gelo/raio)
- Velocidade (reduz cooldown)
- Proteção (chance de bloquear dano)

---

## 14. Missões

### 14.1 Tipos de Missão

**Diárias:**
- Matar X monstros
- Visitar X células
- Completar 1 combate cooperativo

**Semanais:**
- Derrotar 1 boss
- Acumular X XP
- Usar X habilidades cooperativas

**Eventos especiais:**
- Invasões de monstros (todos jogadores vs horda)
- Boss mundial (aparece em local específico)
- Caça ao tesouro (seguir pistas pelo mapa)

---

## 15. Persistência de Dados (Supabase)

### 15.1 Esquema do Banco de Dados

```sql
-- Autenticação gerenciada pelo Supabase Auth

-- Dados do jogador
CREATE TABLE players (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  hp_current INTEGER,
  hp_max INTEGER,
  mana_current INTEGER,
  mana_max INTEGER,
  str INTEGER DEFAULT 10,
  dex INTEGER DEFAULT 10,
  con INTEGER DEFAULT 10,
  int INTEGER DEFAULT 10,
  wis INTEGER DEFAULT 10,
  cha INTEGER DEFAULT 10,
  gold INTEGER DEFAULT 0,
  current_cell TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventário
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  equipped BOOLEAN DEFAULT FALSE,
  slot TEXT, -- 'weapon', 'armor', 'accessory'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Definição de itens (template)
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  rarity TEXT NOT NULL,
  base_damage TEXT,
  base_armor INTEGER,
  effects JSONB,
  required_level INTEGER DEFAULT 1
);

-- Definição de monstros (template)
CREATE TABLE monsters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hp INTEGER NOT NULL,
  ac INTEGER NOT NULL,
  damage TEXT NOT NULL,
  xp_reward INTEGER NOT NULL,
  loot_table JSONB,
  spawn_weight INTEGER DEFAULT 1
);

-- Estado atual de monstros spawnados
CREATE TABLE active_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monster_id TEXT REFERENCES monsters(id),
  cell_id TEXT NOT NULL,
  hp_current INTEGER NOT NULL,
  spawned_at TIMESTAMPTZ DEFAULT NOW(),
  defeated_at TIMESTAMPTZ
);

-- Log de combates (para histórico e debugging)
CREATE TABLE combat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id TEXT NOT NULL,
  players UUID[] NOT NULL,
  monster_id TEXT NOT NULL,
  result TEXT NOT NULL, -- 'victory', 'defeat'
  duration_ms INTEGER,
  xp_distributed INTEGER,
  loot_distributed JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missões ativas
CREATE TABLE player_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  quest_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 15.2 Políticas de Segurança (RLS)

```sql
-- Jogador só pode ver/editar seus próprios dados
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can view own data" ON players
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Players can update own data" ON players
  FOR UPDATE USING (auth.uid() = id);

-- Inventário privado
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can manage own inventory" ON inventory
  FOR ALL USING (auth.uid() = player_id);

-- Monstros ativos são públicos
ALTER TABLE active_monsters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active monsters" ON active_monsters
  FOR SELECT USING (true);
```

---

## 16. Segurança e Anti-Cheat

### 16.1 Validações no Servidor

- **Cooldown de ações:** Mínimo 2 segundos entre ações
- **Validação de posição GPS:** Tolerância de 100m para evitar falsos positivos
- **Rate limiting:** Máximo 30 requisições por minuto por jogador
- **Validação de dano:** Servidor calcula dano, cliente só exibe

### 16.2 Detecção de Anomalias

- Velocidade de movimento impossível (> 50 km/h a pé)
- Muitas ações em sequência rápida
- Posição inconsistente com histórico

### 16.3 Punições

Como é um jogo entre amigos, não há sistema de banimento automático. Anomalias são logadas para revisão manual.

---

## 17. Performance

### 17.1 Otimizações de Rede

- Atualizações por evento, não por frame
- Batching de múltiplas ações na mesma requisição
- Compressão de payloads JSON
- Cache de dados estáticos (itens, monstros) no cliente

### 17.2 Otimizações de Renderização

- Modelos 3D com < 5k polígonos
- **Compressão Obrigatória:** Uso de **Draco Compression** para todos os arquivos GLB/GLTF.
- Texturas comprimidas (WebP) e redimensionadas (máximo 512x512).
- Object pooling para efeitos de partículas
- Frustum culling para objetos fora da tela

### 17.3 Otimizações de Bateria

- GPS em modo de baixa precisão quando parado
- Redução de frame rate quando não em combate
- Pausar renderização 3D em background
- Wake Lock para manter tela ativa durante combate

---

## 18. MVP (Minimum Viable Product)

### Fase 1 - Core Loop (2-3 semanas)
- [ ] Verificação de compatibilidade do dispositivo
- [ ] Tela de login/cadastro (Supabase Auth)
- [ ] Mapa com localização do jogador
- [ ] Spawn de monstros em células
- [ ] Modo AR básico com 1 tipo de monstro
- [ ] Combate single-player funcional
- [ ] Sistema de HP e dano

### Fase 2 - Multiplayer (2 semanas)
- [ ] Supabase Realtime para sincronização
- [ ] Ver outros jogadores no mapa
- [ ] Combate cooperativo (dano compartilhado ao monstro)
- [ ] Chat simples

### Fase 3 - Progressão (2 semanas)
- [ ] Sistema de XP e níveis
- [ ] 4 classes jogáveis
- [ ] Sistema de loot
- [ ] Inventário e equipamentos

### Fase 4 - Conteúdo (ongoing)
- [ ] Mais tipos de monstros
- [ ] Bosses especiais
- [ ] Missões diárias/semanais
- [ ] Eventos especiais

---

## 19. Métricas de Sucesso

Para um jogo privado entre amigos, as métricas são mais qualitativas:

- **Diversão:** O grupo está se divertindo jogando junto?
- **Engajamento:** O grupo joga regularmente?
- **Estabilidade:** O jogo funciona sem crashes/bugs graves?
- **Progressão:** Os jogadores sentem que estão evoluindo?

---

## 20. Roadmap

### Fase 1 - MVP Técnico
- Validar que AR funciona bem nos dispositivos do grupo
- Combate básico funcional
- Multiplayer funcionando

### Fase 2 - Expansão de Conteúdo
- Mais classes, monstros e itens
- Sistema de raridade completo
- Balanceamento baseado em feedback

### Fase 3 - Features Sociais
- Ranking entre amigos
- Conquistas/achievements
- Eventos especiais criados pelo grupo

### Fase 4 - Polimento
- Melhorias visuais
- Mais efeitos e animações
- QoL features baseadas em feedback

---

## 21. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Dispositivo de algum amigo incompatível | Média | Alto | Verificar dispositivos antes de desenvolver |
| Latência do Supabase Realtime | Baixa | Médio | Usar interpolação e prediction no cliente |
| Consumo excessivo de bateria | Alta | Médio | Modo economia, sessões de 30-60 min, Desligar processamento AR fora de combate |
| Custo de API de Mapas | Baixa (Se usar Google) | Alto | **Mitigação:** Usar OpenStreetMap (gratuito) em vez de Google Maps |
| Spawn de monstros em local perigoso | Baixa | Alto | Não spawnar em ruas, só em áreas abertas |
| GPS impreciso em áreas urbanas densas | Média | Médio | Tolerância maior para detecção de célula |

---

## 22. Critérios de Aceite

- [ ] Jogável no Chrome Android em todos os dispositivos do grupo
- [ ] Verificação de compatibilidade funcional com mensagem clara
- [ ] Multiplayer funcional entre todos os jogadores
- [ ] Combate cooperativo estável (sem dessincronização)
- [ ] Persistência de progressão funcionando
- [ ] Tempo de carregamento < 5 segundos
- [ ] Sem crashes durante sessões de 1 hora

---

## 23. Stack Técnica Detalhada

### Frontend
- **Linguagem:** JavaScript (ES2020+)
- **3D Engine:** Three.js
- **AR:** WebXR Device API
- **PWA:** Workbox para service worker
- **Build:** Vite

### Backend
- **Hosting:** Vercel (plano gratuito)
- **Functions:** Vercel Serverless Functions (Node.js)
- **Banco de dados:** Supabase PostgreSQL
- **Realtime:** Supabase Realtime
- **Auth:** Supabase Auth

### Assets
- **Modelos 3D:** GLTF/GLB (< 1MB cada)
- **Texturas:** WebP (< 100KB cada)
- **Áudio:** MP3/OGG (< 500KB cada)
- **Ícones:** SVG

---

## 24. Dispositivos do Grupo

> **TODO:** Listar os dispositivos de cada jogador para validar compatibilidade antes do desenvolvimento.

| Jogador | Dispositivo | Android | ARCore | Status |
|---------|-------------|---------|--------|--------|
| | | | | |
| | | | | |
| | | | | |

---

## 25. Glossário

| Termo | Definição |
|-------|-----------|
| **Célula** | Área de 50x50m no mapa do jogo |
| **AC** | Armor Class - dificuldade para acertar um alvo |
| **HP** | Hit Points - pontos de vida |
| **XP** | Experience Points - pontos de experiência |
| **Aggro** | Atenção do monstro em um jogador específico |
| **Taunt** | Habilidade que força o monstro a atacar você |
| **DPS** | Damage Per Second - dano por segundo |
| **Buff** | Efeito positivo temporário |
| **Debuff** | Efeito negativo temporário |
| **Spawn** | Aparecimento de um monstro no mundo |
| **Respawn** | Reaparecimento após morte ou tempo |
