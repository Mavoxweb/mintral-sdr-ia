# Manual do Usuário e Desenvolvedor — Antigravity SDR AI

Bem-vindo ao manual do **Antigravity SDR AI**, uma plataforma inteligente de prospecção comercial B2B automatizada. Este documento descreve o funcionamento de cada módulo, a arquitetura do sistema, as configurações de variáveis de ambiente (.env) e a modelagem de banco de dados para integração com o Supabase.

---

## 1. Visão Geral do Sistema e Arquitetura

O **Antigravity SDR AI** foi desenvolvido utilizando uma arquitetura moderna e reativa:
* **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS.
* **Gerenciamento de Estado**: Zustand (estado global unificado, reativo e persistente).
* **Camada de IA (Multi-Agentes)**: Orquestração baseada em OpenRouter (Google Gemini 2.5 Pro, Gemini 2.5 Flash, e MiniMax).
* **Integração de Mensagens**: Evolution API (serviço de API para WhatsApp).
* **Banco de Dados**: Supabase (PostgreSQL para armazenamento estruturado de leads, campanhas e conversas).

---

## 2. Descrição Detalhada dos Módulos

### 📊 Painel Geral (Dashboard)
O cockpit central da aplicação.
* **Métricas Principais**: Exibe indicadores cruciais como Total de Leads Prospectados, Abordagens Efetuadas, Respostas Recebidas (com taxa de conversão percentual) e Instâncias de WhatsApp Conectadas.
* **Painel de Controle SDR**: Permite ligar/desligar o simulador em tempo real e ajustar a velocidade da simulação para fins de teste.
* **Sugestões da IA (AI Insights)**: Um bloco analítico alimentado pelo *CRM Intelligence Agent*, que sugere ações prioritárias ao operador humano (ex: "Mover Matheus Trindade para Qualificado").

### 📱 WhatsApp Multi (Instâncias)
Gerenciamento de múltiplos números de envio integrados à Evolution API.
* **Status de Conexão**: Exibe o estado em tempo real (Ativo, Desconectado, Conectando).
* **Conexão via QR Code**: Renderiza dinamicamente o QR Code fornecido pela Evolution API para sincronizar novos dispositivos.
* **Limite de Envio Diário**: Proteção contra banimentos (limite parametrizado de disparos por número).

### 👥 Base de Leads (Google Maps / Listas)
A base de prospecção fria enriquecida.
* **Listas de Leads**: Tabela interativa para visualização de empresas, segmento, telefone, cidade, status e indicador de enriquecimento por IA.
* **Filtros**: Pesquisa inteligente e filtros avançados por Cidade, Segmento e Status Comercial.
* **Importação**: Botão para upload direto de listas e leads capturados.
* **Ficha de Enriquecimento de IA**: Ao clicar em um lead, abre-se uma lateral detalhando:
  - Resumo de maturidade digital gerado pelo *Lead Analyzer Agent*.
  - Dores prováveis identificadas no negócio.
  - Oportunidades comerciais viáveis para venda.
  - Serviços sugeridos recomendados.

### 📋 CRM Kanban Comercial
Funil de vendas visual e interativo.
* **Colunas Dinâmicas**: Organizado nas etapas do funil de vendas: *Novo Lead*, *Abordado*, *Respondeu*, *Qualificado*, *Proposta*, *Negociação*, *Fechado* (Ganho) e *Perdido*.
* **Movimentação do Funil**: Cartões dinâmicos que podem ser movidos lateralmente usando setas de controle, mantendo a consistência de estado.
* **Ações Diretas**: Atalhos para abrir o Live Chat de leads na etapa "Respondeu" e botões rápidos de fechar/perder na etapa "Negociação".

### 💬 Live Chat (Takeover Humano)
Conversa em tempo real e controle da IA.
* **Modo de Operação**: Permite alternar entre o modo **IA (Bot)** e **Takeover Humano** a qualquer momento. No modo Takeover, a automação é pausada naquele contato para que o operador humano conduza a venda.
* **Mensagens com Status**: Histórico completo contendo marcações de quem enviou (Bot, Lead ou Agente) e o status de recebimento.

### ⛓️ Cadências (SDR Flows)
Criação e edição das abordagens iniciais e sequências de acompanhamento.
* **Estrutura de Passo a Passo**: Configuração do primeiro contato e follow-ups em intervalos parametrizados (D1, D2, etc.).

### 📁 Base de Conhecimento
Envio de documentos de nicho (arquivos TXT, PDFs ou informações do serviço).
* Permite fundamentar as respostas do bot e orientar os agentes de IA sobre as especificidades do serviço vendido.

### 📢 Campanhas SDR
Ligação das peças do quebra-cabeça comercial e recrutamento inteligente de leads.
* **Segmentação Integrada**: Associa um nicho, um tom de voz personalizado, um fluxo de cadência e uma cidade de foco para a campanha.
* **Sugestão de Segmentação com I.A.**: O botão "Sugerir com I.A." aciona o *Campaign Strategist Agent* via OpenRouter para analisar a base de leads locais e recomendar o melhor par (Nicho, Cidade, Tom de Voz) baseado na densidade de leads elegíveis ativos e chances de fechamento.
* **Cálculo em Tempo Real**: O formulário calcula dinamicamente a quantidade de leads ("Novo Lead" e "Abordado") que correspondem ao filtro digitado antes mesmo de criar a campanha.
* **Visualização de Leads Vinculados**: Cada card de campanha ativa conta com um colapso interativo que lista em tempo real todos os leads da base pertencentes a ela, com nome, empresa, telefone e status comercial.
* **Persistência Supabase**: Criação, ativação/pausa e exclusão de campanhas gravam e limpam as informações diretamente nas tabelas `campaigns` e `leads` do Supabase de forma totalmente consistente.

### 🖥️ Console de Logs em Tempo Real
Exibe a linha de raciocínio lógico executada pela equipe de IAs:
* **Lead Analyzer (Gemini Flash)**: Enriquecendo e extraindo dores do lead.
* **Orchestrator Agent (Gemini Pro)**: Escolhendo a melhor abordagem e canal.
* **Message Generator (MiniMax)**: Redigindo a mensagem humana e hiper-personalizada.
* **Follow-up Agent (MiniMax)**: Planejando o reengajamento comercial.
* **Qualification Agent (Gemini Flash)**: Analisando as respostas dos clientes.

---

## 3. Configuração de Variáveis de Ambiente (.env)

Quando o projeto for integrado ao backend real com Supabase, crie um arquivo `.env.local` na raiz do projeto contendo:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-supabase.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Evolution API
EVOLUTION_API_URL=http://sua-evolution-api-url.com
EVOLUTION_API_TOKEN=seu-token-global-aqui

# OpenRouter (Modelos de IA SDR: Gemini & MiniMax)
OPENROUTER_API_KEY=sua-openrouter-key-aqui

# Host/IP Info (VPS)
TRAEFIK_HOST=seu-dominio-vps.com
VPS_IP=ip-da-sua-vps
```

---

## 4. Estrutura de Tabelas e Scripts de Migração do Supabase

Aqui está o script SQL de migração que você deve rodar no **SQL Editor** do Supabase para criar as tabelas necessárias:

```sql
-- Habilitar extensão UUID caso não esteja habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. INSTÂNCIAS DE WHATSAPP (Evolution API)
CREATE TABLE public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    numero TEXT,
    status TEXT NOT NULL DEFAULT 'disconnected',
    qr_code TEXT,
    token TEXT,
    api_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. FLUXOS SDR (Cadências de Abordagem)
CREATE TABLE public.sdr_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CAMPANHAS SDR
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    niche TEXT NOT NULL,
    target_service TEXT NOT NULL,
    tone_of_voice TEXT NOT NULL DEFAULT 'Formal',
    status TEXT NOT NULL DEFAULT 'active',
    flow_id UUID REFERENCES public.sdr_flows(id) ON DELETE SET NULL,
    knowledge_base_id TEXT,
    leads_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    stats JSONB NOT NULL DEFAULT '{"leadsCount":0,"contactedCount":0,"responsesCount":0}'::jsonb,
    city_filter TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. BASE DE LEADS
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    rating NUMERIC(3, 2),
    num_ratings INTEGER DEFAULT 0,
    category TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    social_link TEXT,
    section TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Novo Lead',
    rating_label TEXT,
    enrichment JSONB,
    last_message_at TIMESTAMP WITH TIME ZONE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    flow_id UUID REFERENCES public.sdr_flows(id) ON DELETE SET NULL,
    current_step_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CONVERSAS (Live Chat / Takeover)
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    lead_name TEXT NOT NULL,
    lead_phone TEXT NOT NULL,
    instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
    takeover_mode TEXT NOT NULL DEFAULT 'bot', -- 'bot' ou 'human'
    last_message_at TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. MENSAGENS DO CHAT
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL, -- 'bot', 'user', 'agent'
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'read'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices recomendados para otimização de consultas
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
```

---

## 5. Análise de Fluidez e Performance

**Sim, a aplicação funcionará de forma extremamente fluida.** As razões técnicas para essa estabilidade incluem:

1. **Arquitetura Assíncrona dos Agentes**: O fluxo do Orquestrador, Message Generator, e Lead Enrichment ocorre de forma não bloqueante. As chamadas à API do OpenRouter ou simulações rodam em segundo plano e alimentam a UI por meio de um barramento de eventos pub-sub (`subscribeToAgentLogs`), mantendo a interface reativa e livre de travamentos.
2. **Gerenciamento de Estado Centralizado (Zustand)**: A troca de abas, drag-and-drop de leads nas raias do Kanban, envio de mensagens no Live Chat e atualizações de configurações de API refletem instantaneamente no DOM, sem renderizações redundantes.
3. **Consumo Híbrido de Chave de API**: O SDR pode rodar em modo simulação pura (ideal para testes locais sem custo) ou alternar dinamicamente para consumo real inserindo a OpenRouter API Key.
4. **Layout Glassmorphic e Responsivo**: A UI foi desenhada em cima de um design premium e escuro com transições suaves que se adaptam perfeitamente a dispositivos móveis e desktops, otimizando o carregamento e gerando um forte impacto visual positivo.
