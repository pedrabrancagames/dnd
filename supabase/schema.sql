-- ====================================
-- D&D AR Adventure - Database Schema
-- Execute este SQL no Supabase SQL Editor
-- ====================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================
-- Tabela: players
-- Armazena dados do jogador
-- ====================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class TEXT NOT NULL CHECK (class IN ('warrior', 'mage', 'archer', 'cleric')),
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
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- Tabela: inventory
-- Inventário do jogador
-- ====================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  equipped BOOLEAN DEFAULT FALSE,
  slot TEXT CHECK (slot IN ('weapon', 'armor', 'offhand', 'accessory', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- Tabela: active_monsters
-- Monstros ativos no mapa
-- ====================================
CREATE TABLE IF NOT EXISTS active_monsters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monster_id TEXT NOT NULL,
  cell_id TEXT NOT NULL,
  hp_current INTEGER NOT NULL,
  spawned_at TIMESTAMPTZ DEFAULT NOW(),
  defeated_at TIMESTAMPTZ,
  defeated_by UUID REFERENCES players(id)
);

-- ====================================
-- Tabela: combat_logs
-- Histórico de combates
-- ====================================
CREATE TABLE IF NOT EXISTS combat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cell_id TEXT NOT NULL,
  players UUID[] NOT NULL,
  monster_id TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('victory', 'defeat', 'fled')),
  duration_ms INTEGER,
  xp_distributed INTEGER,
  loot_distributed JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- Tabela: player_quests
-- Missões do jogador
-- ====================================
CREATE TABLE IF NOT EXISTS player_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- Row Level Security (RLS)
-- ====================================

-- Players: usuário só vê/edita seus próprios dados
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own player data" ON players
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own player data" ON players
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own player data" ON players
  FOR UPDATE USING (auth.uid() = id);

-- Inventory: usuário só gerencia seu próprio inventário
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own inventory" ON inventory
  FOR ALL USING (auth.uid() = player_id);

-- Active monsters: qualquer um pode ver (para multiplayer)
ALTER TABLE active_monsters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active monsters" ON active_monsters
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert monsters" ON active_monsters
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update monsters" ON active_monsters
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Combat logs: qualquer autenticado pode inserir
ALTER TABLE combat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert combat logs" ON combat_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view combat logs" ON combat_logs
  FOR SELECT USING (true);

-- Player quests: usuário só gerencia suas próprias missões
ALTER TABLE player_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quests" ON player_quests
  FOR ALL USING (auth.uid() = player_id);

-- ====================================
-- Índices para performance
-- ====================================
CREATE INDEX IF NOT EXISTS idx_players_current_cell ON players(current_cell);
CREATE INDEX IF NOT EXISTS idx_inventory_player ON inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_active_monsters_cell ON active_monsters(cell_id);
CREATE INDEX IF NOT EXISTS idx_active_monsters_defeated ON active_monsters(defeated_at);
CREATE INDEX IF NOT EXISTS idx_combat_logs_created ON combat_logs(created_at);
