import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/evolution";

export interface WhatsAppInstance {
  id: string;
  name: string;
  phone: string;
  status: "connected" | "disconnected" | "connecting" | "qrcode";
  qrCode?: string;
  dailyLimit: number;
  sentToday: number;
  lastSent?: string;
  qualityScore: number; // 0 - 100
  isWarmup: boolean;
  warningsCount: number;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  city: string;
  state: string;
  category: string;
  section: string;
  rating?: number;
  numRatings?: number;
  socialLink?: string;
  status: "Novo Lead" | "Abordado" | "Respondeu" | "Qualificado" | "Proposta" | "Negociação" | "Fechado" | "Perdido";
  enrichStatus: "idle" | "loading" | "success" | "failed";
  enrichment?: {
    summary: string;
    pains: string[];
    opportunities: string[];
    recommendedServices: string[];
  };
  campaignId?: string;
  flowId?: string;
  currentStepIndex?: number;
  lastInteraction?: string;
  assignedInstanceId?: string;
  takeoverMode: "bot" | "human";
  notes?: string;
}

export interface Campaign {
  id: string;
  name: string;
  niche: string;
  targetService: string;
  toneOfVoice: string;
  status: "active" | "paused";
  flowId: string;
  knowledgeBaseId: string;
  leadsCount: number;
  cityFilter: string;
  active: boolean;
  stats: {
    leadsCount: number;
    contactedCount: number;
    responsesCount: number;
  };
}

export interface FlowStep {
  id: string;
  name: string; // D0, D2, etc.
  delayDays: number;
  messageTemplate: string;
}

export interface SDRFlow {
  id: string;
  name: string;
  steps: FlowStep[];
}

export interface KnowledgeFile {
  id: string;
  name: string;
  size: string;
  type: string;
  content?: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  files: KnowledgeFile[];
}

export interface Message {
  id: string;
  conversationId: string;
  sender: "bot" | "user" | "human";
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

export interface Conversation {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  instanceId: string;
  takeoverMode: "bot" | "human";
  lastMessageAt: string;
  unreadCount: number;
  messages: Message[];
}

export interface AIInsight {
  id: string;
  leadId: string;
  leadName: string;
  insightType: "inactive" | "cross_sell" | "reconnect" | "opportunity";
  message: string;
  suggestion: string;
  chance: "high" | "medium" | "low";
  createdAt: string;
}

export interface SystemSettings {
  openRouterKey: string;
  evolutionApiUrl: string;
  evolutionApiKey: string;
  minDelaySeconds: number;
  maxDelaySeconds: number;
  workingHoursStart: string;
  workingHoursEnd: string;
}

interface AppState {
  instances: WhatsAppInstance[];
  leads: Lead[];
  campaigns: Campaign[];
  flows: SDRFlow[];
  knowledgeBases: KnowledgeBase[];
  conversations: Conversation[];
  insights: AIInsight[];
  settings: SystemSettings;
  simulationActive: boolean;
  simulationSpeed: number; // multiplier

  // Actions
  // Instances
  addInstance: (name: string, phone: string, limit: number) => Promise<void>;
  updateInstanceStatus: (id: string, status: WhatsAppInstance["status"], qrCode?: string) => void;
  simulateInstanceSend: (id: string) => void;
  deleteInstance: (id: string) => Promise<void>;

  // Leads
  importLeads: (newLeads: Partial<Lead>[]) => void;
  updateLeadStatus: (id: string, status: Lead["status"]) => void;
  setLeadTakeover: (id: string, mode: Lead["takeoverMode"]) => void;
  enrichLead: (id: string, customEnrichment?: Lead["enrichment"]) => Promise<void>;
  updateLeadNotes: (id: string, notes: string) => void;
  deleteLead: (id: string) => void;

  // Campaigns & Flows
  addCampaign: (campaign: Omit<Campaign, "id" | "leadsCount" | "stats" | "name" | "targetService" | "status" | "knowledgeBaseId" | "active">) => Promise<void>;
  updateCampaignStatus: (id: string, status: Campaign["status"]) => Promise<void>;
  toggleCampaign: (id: string) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  addFlow: (flow: Omit<SDRFlow, "id">) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;

  // Knowledge Base
  addKnowledgeBase: (name: string, description: string) => void;
  addFileToKB: (kbId: string, file: KnowledgeFile) => void;
  deleteKB: (id: string) => void;

  // Conversations
  addMessage: (leadId: string, sender: Message["sender"], text: string) => void;
  markAsRead: (leadId: string) => void;
  toggleTakeover: (leadId: string) => void;

  // Settings
  updateSettings: (settings: Partial<SystemSettings>) => void;

  // AI Operations
  generateAIInsights: () => void;
  dismissInsight: (id: string) => void;

  // Simulator
  setSimulationActive: (active: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  triggerSimulationTick: () => void;
  resetAllData: () => void;
  fetchData: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  instances: [
    {
      id: "inst-1",
      name: "Comercial 01 (Matriz)",
      phone: "+55 11 98765-4321",
      status: "connected",
      dailyLimit: 300,
      sentToday: 142,
      lastSent: "Há 4 mins",
      qualityScore: 98,
      isWarmup: false,
      warningsCount: 0,
    },
    {
      id: "inst-2",
      name: "Comercial 02 (Prospecção)",
      phone: "+55 11 98888-7777",
      status: "connected",
      dailyLimit: 150,
      sentToday: 118,
      lastSent: "Há 12 mins",
      qualityScore: 92,
      isWarmup: true,
      warningsCount: 1,
    },
    {
      id: "inst-3",
      name: "Backup SDR",
      phone: "+55 11 96666-5555",
      status: "qrcode",
      qrCode: "data:image/svg+xml;utf8,<svg ... SDR QR CODE>",
      dailyLimit: 100,
      sentToday: 0,
      qualityScore: 100,
      isWarmup: true,
      warningsCount: 0,
    },
  ],
  leads: [
    {
      id: "lead-1",
      name: "Dr. Roger Costa",
      company: "Roger Costa Advogados",
      phone: "+55 27 99838-0816",
      city: "Vitória",
      state: "Espírito Santo",
      category: "Advogado criminal",
      section: "Jurídico e Advocacia",
      rating: 5,
      numRatings: 25,
      socialLink: "",
      status: "Novo Lead",
      enrichStatus: "success",
      enrichment: {
        summary: "Escritório de advocacia criminal focado em casos de alta complexidade em Vitória. Boa reputação local, mas sem presença digital estruturada.",
        pains: [
          "Ausência de website para captação institucional",
          "Dependência excessiva de indicações presenciais",
          "Dificuldade de agendamento ágil para consultas iniciais"
        ],
        opportunities: [
          "Criar Landing Page de conversão focada em direito de defesa corporativo",
          "Implementar chatbot de agendamento automático de consultas integradas à agenda",
          "Ativar campanhas de tráfego pago geolocalizado"
        ],
        recommendedServices: ["Criação de Sites", "Automação IA"]
      },
      campaignId: "camp-1",
      flowId: "flow-1",
      currentStepIndex: 0,
      lastInteraction: "Há 2 horas",
      takeoverMode: "bot",
      notes: "Mostrou interesse no Google Maps, importado da lista inicial."
    },
    {
      id: "lead-2",
      name: "Jessica Julião",
      company: "Jéssica Julião Advocacia",
      phone: "+55 14 99733-0957",
      city: "Bauru",
      state: "São Paulo",
      category: "Advogado",
      section: "Jurídico e Advocacia",
      rating: 5,
      numRatings: 304,
      socialLink: "",
      status: "Abordado",
      enrichStatus: "success",
      enrichment: {
        summary: "Advogada independente em Bauru com excelente avaliação no Google Maps (304 avaliações). Altíssima relevância local.",
        pains: [
          "Falta de canal próprio para hospedar artigos e materiais explicativos",
          "Fluxo intenso de contatos no WhatsApp sem triagem inteligente"
        ],
        opportunities: [
          "Desenvolvimento de portal de autoridade (blog institucional) integrado com conversão de leads",
          "Instalar triagem inteligente para separar clientes de direito de família e civil"
        ],
        recommendedServices: ["Criação de Sites", "Chatbot WhatsApp"]
      },
      campaignId: "camp-1",
      flowId: "flow-1",
      currentStepIndex: 1,
      lastInteraction: "Há 1 dia",
      takeoverMode: "bot",
    },
    {
      id: "lead-3",
      name: "Matheus Trindade",
      company: "Matheus Trindade Advogado",
      phone: "+55 35 99950-5518",
      city: "Santo Antônio do Amparo",
      state: "Minas Gerais",
      category: "Advogado",
      section: "Jurídico e Advocacia",
      rating: 5,
      numRatings: 167,
      socialLink: "https://www.instagram.com/matheus_advsaa/",
      status: "Respondeu",
      enrichStatus: "success",
      enrichment: {
        summary: "Advogado ativo no Instagram. Possui boa base de seguidores, porém o link da bio direciona diretamente para o WhatsApp sem qualificação prévia.",
        pains: [
          "WhatsApp lotado de curiosos e leads desqualificados",
          "Necessidade de reforçar imagem institucional corporativa"
        ],
        opportunities: [
          "Criar funil de qualificação antes do WhatsApp",
          "Desenvolver portfólio digital premium integrado com o tom do Instagram"
        ],
        recommendedServices: ["Automação IA", "Criação de Sites"]
      },
      campaignId: "camp-1",
      flowId: "flow-1",
      currentStepIndex: 1,
      lastInteraction: "Há 30 minutos",
      takeoverMode: "human",
    },
    {
      id: "lead-4",
      name: "Alisson Oliveira",
      company: "Alisson Oliveira Advocacia",
      phone: "+55 11 97223-7271",
      city: "Santo André",
      state: "São Paulo",
      category: "Advogado previdenciário",
      section: "Jurídico e Advocacia",
      rating: 5,
      numRatings: 86,
      socialLink: "https://api.whatsapp.com/send?phone=5511972237271",
      status: "Qualificado",
      enrichStatus: "success",
      enrichment: {
        summary: "Especialista em direito previdenciário na região metropolitana de SP. Excelente mercado de aposentadorias que exige fluxo constante de entrada de novos beneficiários.",
        pains: [
          "Atendimento telefônico manual ineficiente",
          "Ausência de campanhas patrocinadas no Google Ads focadas no público de Santo André"
        ],
        opportunities: [
          "Implementar assistente virtual ativo 24h para triar elegibilidade de aposentadoria",
          "Criar landing page focada em conversão para auxílio-doença e aposentadorias"
        ],
        recommendedServices: ["Automação IA", "Criação de Sites", "Tráfego Pago"]
      },
      campaignId: "camp-2",
      flowId: "flow-2",
      currentStepIndex: 2,
      lastInteraction: "Há 1 hora",
      takeoverMode: "human",
    }
  ],
  campaigns: [
    {
      id: "camp-1",
      name: "Campanha Advogados - LP Sites",
      niche: "Advocacia",
      targetService: "Criação de Sites Premium",
      toneOfVoice: "Formal, altamente profissional e focado em credibilidade e autoridade.",
      status: "active",
      flowId: "flow-1",
      knowledgeBaseId: "kb-1",
      leadsCount: 3,
      cityFilter: "Vitória",
      active: true,
      stats: {
        leadsCount: 3,
        contactedCount: 2,
        responsesCount: 1
      }
    },
    {
      id: "camp-2",
      name: "Campanha Advogados - Automação WhatsApp",
      niche: "Advocacia",
      targetService: "Agendamento Inteligente & Triagem IA",
      toneOfVoice: "Prático, focado em economia de tempo, organização e escala comercial.",
      status: "active",
      flowId: "flow-2",
      knowledgeBaseId: "kb-2",
      leadsCount: 1,
      cityFilter: "Bauru",
      active: true,
      stats: {
        leadsCount: 1,
        contactedCount: 1,
        responsesCount: 1
      }
    },
    {
      id: "camp-3",
      name: "Campanha Construtoras - Tráfego Pago",
      niche: "Construção Civil",
      targetService: "Captação de leads qualificados (Google & Meta Ads)",
      toneOfVoice: "Direto ao ponto, focado em ROI, faturamento e vendas de imóveis/reformas.",
      status: "paused",
      flowId: "flow-3",
      knowledgeBaseId: "kb-3",
      leadsCount: 0,
      cityFilter: "São Paulo",
      active: false,
      stats: {
        leadsCount: 0,
        contactedCount: 0,
        responsesCount: 0
      }
    }
  ],
  flows: [
    {
      id: "flow-1",
      name: "Fluxo Prospecção Sites (D0 a D10)",
      steps: [
        {
          id: "step-1",
          name: "D0 - Primeiro Contato",
          delayDays: 0,
          messageTemplate: "Olá {nome}, tudo bem? Vi seu escritório {empresa} no Google em {cidade}. Vi que vocês têm excelentes avaliações ({num_avaliacoes} avaliações!), mas notei que ainda não possuem um site institucional próprio para consolidar sua autoridade online. Vocês já pensaram em estruturar um portal exclusivo com agendamento online?"
        },
        {
          id: "step-2",
          name: "D2 - Follow-up 1",
          delayDays: 2,
          messageTemplate: "Olá {nome}, passando para te enviar o portfólio de alguns escritórios parecidos com o {empresa} que criamos recentemente. O que achou dessa estrutura?"
        },
        {
          id: "step-3",
          name: "D5 - Follow-up 2",
          delayDays: 3,
          messageTemplate: "Oi {nome}. Sei que a rotina jurídica é corrida. Apenas para frisar: hoje em dia, um advogado sem site perde cerca de 40% das buscas locais que ocorrem no Google na sua região de {cidade}. Gostaria de agendar uma ligação rápida de 10 min esta semana para traçarmos uma proposta rápida?"
        },
        {
          id: "step-4",
          name: "D10 - Última Tentativa",
          delayDays: 5,
          messageTemplate: "Olá {nome}, como não obtive resposta imagino que não seja o momento de expandir a presença digital de vocês agora. Se mudar de ideia ou precisar de automação ou site futuramente, pode contar comigo! Grande abraço."
        }
      ]
    },
    {
      id: "flow-2",
      name: "Fluxo Prospecção Automação IA (D0 a D15)",
      steps: [
        {
          id: "step-2-1",
          name: "D0 - Triagem Automática",
          delayDays: 0,
          messageTemplate: "Olá {nome}, tudo bem? Sou especialista em automação comercial para o nicho de {categoria}. Analisei a presença digital de vocês e montei um exemplo de assistente de triagem para a {empresa}. Ele ajudaria a classificar seus clientes sozinhos no WhatsApp. Podemos apresentar um teste?"
        },
        {
          id: "step-2-2",
          name: "D3 - Proposta de Valor",
          delayDays: 3,
          messageTemplate: "Oi {nome}, tudo bem? Criei um fluxo interativo personalizado para a {empresa} mostrando como a triagem de clientes previdenciários no WhatsApp economiza cerca de 15 horas semanais da sua secretária. Quer ver o protótipo?"
        },
        {
          id: "step-2-3",
          name: "D7 - Prova Social",
          delayDays: 4,
          messageTemplate: "Oi {nome}! O escritório Andrade Vieira no mês passado automatizou seu onboarding com a nossa IA e fechou 35% mais contratos no mesmo período. Podemos replicar isso na {empresa}?"
        }
      ]
    }
  ],
  knowledgeBases: [
    {
      id: "kb-1",
      name: "Base de Conhecimento - Criação de Sites",
      description: "Informações sobre desenvolvimento de sites, portfólios, agendamento de consultas integradas, tabelas de preço e cases de sucesso para propostas de sites.",
      files: [
        { id: "f-1", name: "tabela_precos_sites.pdf", size: "245 KB", type: "pdf" },
        { id: "f-2", name: "diferenciais_sites_institucionais.txt", size: "12 KB", type: "txt", content: "Nossos sites contam com: design premium responsivo, otimização SEO avançada focada em buscas locais, integração com APIs de agendamento (Calendly/Google Calendar), painel administrativo fácil e suporte de 12 meses gratuito. Preço base: R$ 2.500,00." }
      ]
    },
    {
      id: "kb-2",
      name: "Base de Conhecimento - Automação WhatsApp & IA",
      description: "Modelagem de triagem inteligente, FAQ por inteligência artificial, regras de atendimento humano, integração com CRMs e planos de licenciamento do chatbot.",
      files: [
        { id: "f-3", name: "detalhes_tecnicos_chatbot.docx", size: "1.2 MB", type: "docx" },
        { id: "f-4", name: "cases_sucesso_automacao.md", size: "8 KB", type: "markdown", content: "# Cases de Sucesso em IA\n- Advocacia Martins: reduziu tempo de triagem de 24h para 45 segundos. Aumento de 22% em conversão.\n- Clínica Sorriso: Automatizou a marcação de consultas integrando com prontuário. Zero atendimentos perdidos no final de semana." }
      ]
    }
  ],
  conversations: [
    {
      id: "conv-1",
      leadId: "lead-3",
      leadName: "Matheus Trindade",
      leadPhone: "+55 35 99950-5518",
      instanceId: "inst-1",
      takeoverMode: "human",
      lastMessageAt: "18:12",
      unreadCount: 2,
      messages: [
        {
          id: "m-1",
          conversationId: "conv-1",
          sender: "bot",
          text: "Olá Matheus, tudo bem? Vi seu escritório Matheus Trindade Advogado no Google e notei que vocês têm ótimas avaliações (167 avaliações!). Gostaria de saber se vocês já usam algum chatbot para qualificar os clientes que chegam pelo seu Instagram?",
          timestamp: "17:30",
          status: "read"
        },
        {
          id: "m-2",
          conversationId: "conv-1",
          sender: "user",
          text: "Olá! Tudo bem e com você? Cara, eu não uso chatbot, hoje eu mesmo atendo ou meu estagiário quando dá tempo. Mas confesso que fica muito bagunçado. Como funciona isso?",
          timestamp: "17:35",
          status: "read"
        },
        {
          id: "m-3",
          conversationId: "conv-1",
          sender: "bot",
          text: "Entendo perfeitamente, Matheus! A rotina de escritório é corrida. Nosso sistema cria uma IA SDR que faz essa triagem inicial no WhatsApp automaticamente, descobre o caso do cliente e só passa para você os que realmente têm potencial. Quer ver um teste rápido rodando?",
          timestamp: "17:37",
          status: "read"
        },
        {
          id: "m-4",
          conversationId: "conv-1",
          sender: "user",
          text: "Tenho interesse sim. Quanto custa para implementar isso? E consome muito meu tempo configurar?",
          timestamp: "18:10",
          status: "delivered"
        },
        {
          id: "m-5",
          conversationId: "conv-1",
          sender: "user",
          text: "Me passa os valores por favor.",
          timestamp: "18:12",
          status: "delivered"
        }
      ]
    },
    {
      id: "conv-2",
      leadId: "lead-2",
      leadName: "Jessica Julião",
      leadPhone: "+55 14 99733-0957",
      instanceId: "inst-1",
      takeoverMode: "bot",
      lastMessageAt: "Ontem",
      unreadCount: 0,
      messages: [
        {
          id: "m-6",
          conversationId: "conv-2",
          sender: "bot",
          text: "Olá Jessica, tudo bem? Vi seu escritório Jéssica Julião no Google em Bauru. Vi que vocês têm excelentes avaliações (304 avaliações!), mas notei que ainda não possuem um site institucional próprio para consolidar sua autoridade online. Vocês já pensaram em estruturar um portal exclusivo com agendamento online?",
          timestamp: "Ontem 10:15",
          status: "read"
        }
      ]
    }
  ],
  insights: [
    {
      id: "ins-1",
      leadId: "lead-3",
      leadName: "Matheus Trindade",
      insightType: "opportunity",
      message: "Lead Matheus Trindade demonstrou grande interesse em precificação e triagem automática.",
      suggestion: "Mover o lead no CRM para a etapa 'Qualificado' e enviar a tabela de preços do serviço 'Automação IA'.",
      chance: "high",
      createdAt: "Há 15 mins"
    },
    {
      id: "ins-2",
      leadId: "lead-2",
      leadName: "Jessica Julião",
      insightType: "reconnect",
      message: "Abordagem inicial enviada há mais de 24 horas e sem resposta do lead.",
      suggestion: "Disparar o passo D2 do Fluxo de Sites (Follow-up de Portfólio) para reaquecer o contato.",
      chance: "medium",
      createdAt: "Há 2 horas"
    }
  ],
  settings: {
    openRouterKey: "",
    evolutionApiUrl: "",
    evolutionApiKey: "",
    minDelaySeconds: 45,
    maxDelaySeconds: 180,
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
  },
  simulationActive: false,
  simulationSpeed: 1,

  // Actions implementation
  addInstance: async (name, phone, limit) => {
    try {
      const response = await fetch("/api/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
      const data = await response.json();
      if (data.success && data.instance) {
        const newInst = {
          id: data.instance.id,
          name: data.instance.nome,
          phone: data.instance.numero || "",
          status: data.instance.status as any,
          qrCode: data.instance.qr_code || undefined,
          dailyLimit: limit,
          sentToday: 0,
          qualityScore: 100,
          isWarmup: true,
          warningsCount: 0
        };
        set((state) => ({
          instances: [...state.instances, newInst]
        }));
      }
    } catch (err) {
      console.error("Failed to add instance:", err);
    }
  },

  updateInstanceStatus: (id, status, qrCode) => set((state) => ({
    instances: state.instances.map((inst) =>
      inst.id === id ? { ...inst, status, qrCode: qrCode || inst.qrCode } : inst
    ),
  })),

  simulateInstanceSend: (id) => set((state) => ({
    instances: state.instances.map((inst) =>
      inst.id === id
        ? {
            ...inst,
            sentToday: inst.sentToday + 1,
            lastSent: "Agora mesmo",
            qualityScore: Math.max(50, inst.qualityScore - (Math.random() > 0.95 ? 2 : 0)) // slight chance to drop score
          }
        : inst
    )
  })),

  deleteInstance: async (id) => {
    const inst = get().instances.find(i => i.id === id);
    if (!inst) return;
    try {
      const response = await fetch(`/api/instances?id=${id}&name=${inst.name}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }
      set((state) => ({
        instances: state.instances.filter((i) => i.id !== id)
      }));
    } catch (err) {
      console.error("Failed to delete instance:", err);
    }
  },

  importLeads: (newLeads) => set((state) => {
    const parsed = newLeads.map((nl, index) => ({
      id: nl.id || `lead-${Date.now()}-${index}`,
      name: nl.name || "Sem Nome",
      company: nl.company || "Sem Empresa",
      phone: nl.phone || "",
      city: nl.city || "Não informada",
      state: nl.state || "",
      category: nl.category || "Geral",
      section: nl.section || "Geral",
      rating: nl.rating || undefined,
      numRatings: nl.numRatings || undefined,
      socialLink: nl.socialLink || "",
      status: nl.status || "Novo Lead",
      enrichStatus: nl.enrichStatus || "idle",
      enrichment: nl.enrichment,
      campaignId: nl.campaignId || state.campaigns[0]?.id,
      flowId: nl.flowId || state.flows[0]?.id,
      currentStepIndex: nl.currentStepIndex || 0,
      takeoverMode: nl.takeoverMode || "bot",
      notes: nl.notes || "",
    }));

    return {
      leads: [...state.leads, ...parsed]
    };
  }),

  updateLeadStatus: (id, status) => set((state) => {
    supabase.from("leads").update({ status }).eq("id", id).then();
    return {
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, status, lastInteraction: "Agora mesmo" } : l
      )
    };
  }),

  setLeadTakeover: (id, mode) => set((state) => {
    supabase.from("leads").update({ takeover_mode: mode }).eq("id", id).then();
    supabase.from("conversations").update({ takeover_mode: mode }).eq("lead_id", id).then();
    const updatedConversations = state.conversations.map((c) =>
      c.leadId === id ? { ...c, takeoverMode: mode } : c
    );
    return {
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, takeoverMode: mode } : l
      ),
      conversations: updatedConversations
    };
  }),

  enrichLead: async (id, customEnrichment) => {
    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, enrichStatus: "loading" } : l
      )
    }));

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const state = get();
    const lead = state.leads.find((l) => l.id === id);
    if (!lead) return;

    // AI Analyzer simulation if no custom enrichment is provided
    const enrichment = customEnrichment || {
      summary: `Empresa no segmento de ${lead.category} localizada em ${lead.city}-${lead.state}. Forte atuação nas avaliações locais do Google Maps, mas sem canais de conversão online eficientes.`,
      pains: [
        "Falta de automatização no primeiro atendimento comercial",
        "Canal de vendas principal desestruturado",
        "Necessidade de SEO local para atrair leads de busca direta"
      ],
      opportunities: [
        "Criar funil de qualificação automática por WhatsApp",
        "Lançar site institucional premium com agendador",
        "Implementar tráfego regional com anúncios patrocinados"
      ],
      recommendedServices: lead.category.toLowerCase().includes("advog")
        ? ["Criação de Sites", "Automação IA"]
        : ["Tráfego Pago", "Criação de Sites"]
    };

    try {
      const { error } = await supabase
        .from("leads")
        .update({ enrichment })
        .eq("id", id);
      
      if (error) throw error;
    } catch (err) {
      console.error("Failed to persist lead enrichment in Supabase:", err);
    }

    set((state) => ({
      leads: state.leads.map((l) =>
        l.id === id ? { ...l, enrichStatus: "success", enrichment } : l
      )
    }));
  },

  updateLeadNotes: (id, notes) => set((state) => {
    supabase.from("leads").update({ notes }).eq("id", id).then();
    return {
      leads: state.leads.map((l) => (l.id === id ? { ...l, notes } : l))
    };
  }),

  deleteLead: (id) => set((state) => {
    supabase.from("leads").delete().eq("id", id).then();
    return {
      leads: state.leads.filter((l) => l.id !== id),
      conversations: state.conversations.filter((c) => c.leadId !== id)
    };
  }),

  addCampaign: async (campaign) => {
    try {
      const state = get();
      
      // Encontrar leads que combinam com os filtros (nicho e cidade)
      const matchingLeads = state.leads.filter(l => 
        (l.status === "Novo Lead" || l.status === "Abordado") &&
        l.city.toLowerCase().trim() === campaign.cityFilter.toLowerCase().trim() &&
        (l.category.toLowerCase().includes(campaign.niche.toLowerCase()) || 
         l.section.toLowerCase().includes(campaign.niche.toLowerCase()))
      );

      const leadsCount = matchingLeads.length;

      // Inserir campanha no Supabase
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: `Campanha ${campaign.niche} - ${campaign.cityFilter}`,
          niche: campaign.niche,
          target_service: "Criação de Sites",
          tone_of_voice: campaign.toneOfVoice,
          status: "active",
          flow_id: campaign.flowId,
          knowledge_base_id: "kb-1",
          leads_count: leadsCount,
          active: true,
          stats: {
            leadsCount: leadsCount,
            contactedCount: 0,
            responsesCount: 0
          },
          city_filter: campaign.cityFilter
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Se encontramos leads correspondentes, atualizar cada um no Supabase
        if (leadsCount > 0) {
          const leadIds = matchingLeads.map(l => l.id);
          await supabase
            .from("leads")
            .update({ 
              campaign_id: data.id, 
              flow_id: campaign.flowId,
              current_step_index: 0 
            })
            .in("id", leadIds);
        }

        // Atualizar estado local
        set((state) => ({
          campaigns: [
            ...state.campaigns,
            {
              id: data.id,
              name: data.name,
              niche: data.niche,
              targetService: data.target_service,
              toneOfVoice: data.tone_of_voice,
              status: data.status as any,
              flowId: data.flow_id,
              knowledgeBaseId: data.knowledge_base_id || "",
              leadsCount: data.leads_count,
              cityFilter: data.city_filter || "",
              active: data.active,
              stats: data.stats || { leadsCount, contactedCount: 0, responsesCount: 0 }
            }
          ],
          // Também atualizar o estado local dos leads vinculados
          leads: state.leads.map(l => {
            const isMatch = matchingLeads.some(ml => ml.id === l.id);
            if (isMatch) {
              return {
                ...l,
                campaignId: data.id,
                flowId: campaign.flowId,
                currentStepIndex: 0
              };
            }
            return l;
          })
        }));
      }
    } catch (err) {
      console.error("Failed to add campaign to Supabase:", err);
    }
  },

  updateCampaignStatus: async (id, status) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status, active: status === "active" })
        .eq("id", id);
      if (error) throw error;

      set((state) => ({
        campaigns: state.campaigns.map((c) =>
          c.id === id ? { ...c, status, active: status === "active" } : c
        )
      }));
    } catch (err) {
      console.error("Failed to update campaign status:", err);
    }
  },

  toggleCampaign: async (id) => {
    try {
      const camp = get().campaigns.find(c => c.id === id);
      if (!camp) return;

      const newActive = !camp.active;
      const newStatus = newActive ? "active" : "paused";

      const { error } = await supabase
        .from("campaigns")
        .update({ active: newActive, status: newStatus })
        .eq("id", id);
      if (error) throw error;

      set((state) => ({
        campaigns: state.campaigns.map((c) =>
          c.id === id ? { ...c, active: newActive, status: newStatus as any } : c
        )
      }));
    } catch (err) {
      console.error("Failed to toggle campaign status:", err);
    }
  },

  deleteCampaign: async (id) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Desvincular leads dessa campanha no Supabase
      await supabase
        .from("leads")
        .update({ campaign_id: null, flow_id: null })
        .eq("campaign_id", id);

      set((state) => ({
        campaigns: state.campaigns.filter((c) => c.id !== id),
        leads: state.leads.map((l) =>
          l.campaignId === id ? { ...l, campaignId: undefined, flowId: undefined } : l
        )
      }));
    } catch (err) {
      console.error("Failed to delete campaign from Supabase:", err);
    }
  },

  addFlow: async (flow) => {
    try {
      const { data, error } = await supabase
        .from("sdr_flows")
        .insert({
          name: flow.name,
          steps: flow.steps
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        set((state) => ({
          flows: [
            ...state.flows,
            {
              id: data.id,
              name: data.name,
              steps: data.steps || []
            }
          ]
        }));
      }
    } catch (err) {
      console.error("Failed to add flow to Supabase:", err);
      set((state) => ({
        flows: [
          ...state.flows,
          {
            ...flow,
            id: `flow-${Date.now()}`
          }
        ]
      }));
    }
  },

  deleteFlow: async (id) => {
    try {
      if (id.startsWith("flow-")) {
        set((state) => ({
          flows: state.flows.filter((f) => f.id !== id)
        }));
        return;
      }
      const { error } = await supabase
        .from("sdr_flows")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      set((state) => ({
        flows: state.flows.filter((f) => f.id !== id)
      }));
    } catch (err) {
      console.error("Failed to delete flow from Supabase:", err);
      set((state) => ({
        flows: state.flows.filter((f) => f.id !== id)
      }));
    }
  },

  addKnowledgeBase: (name, description) => set((state) => ({
    knowledgeBases: [
      ...state.knowledgeBases,
      {
        id: `kb-${Date.now()}`,
        name,
        description,
        files: []
      }
    ]
  })),

  addFileToKB: (kbId, file) => set((state) => ({
    knowledgeBases: state.knowledgeBases.map((kb) =>
      kb.id === kbId ? { ...kb, files: [...kb.files, file] } : kb
    )
  })),

  deleteKB: (id) => set((state) => ({
    knowledgeBases: state.knowledgeBases.filter((kb) => kb.id !== id)
  })),

  addMessage: (leadId, sender, text) => set((state) => {
    // Find conversation
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return {};

    const existingConv = state.conversations.find((c) => c.leadId === leadId);
    const timeNow = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Background sync with Supabase and real Evolution API
    const syncDb = async () => {
      let conversationId = existingConv?.id;
      if (!conversationId) {
        // Create conversation
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            lead_id: leadId,
            lead_name: lead.name,
            lead_phone: lead.phone,
            takeover_mode: lead.takeoverMode,
            last_message_at: timeNow,
            unread_count: sender === "user" ? 1 : 0
          })
          .select()
          .single();
        conversationId = newConv?.id;
      } else {
        await supabase
          .from("conversations")
          .update({
            last_message_at: timeNow,
            unread_count: sender === "user" ? ((existingConv?.unreadCount || 0) + 1) : (existingConv?.unreadCount || 0)
          })
          .eq("id", conversationId);
      }

      if (conversationId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender: sender === "user" ? "user" : (sender === "human" ? "agent" : "bot"),
          text,
          timestamp: timeNow,
          status: sender === "user" ? "read" : "sent"
        });
      }

      // If human takeover is active and human replies, dispatch to WhatsApp
      if (sender === "human") {
        try {
          // ✅ Must fetch the instance token from DB — global key will cause 401 on /message/*
          let instanceName = "antigravity-main";
          let instanceToken: string | undefined;

          // Find the conversation's assigned instance
          const conversationInstance = state.instances.find(i => i.id === existingConv?.instanceId);
          const firstConnected = state.instances.find(i => i.status === "connected");
          const targetInstance = conversationInstance || firstConnected;

          if (targetInstance) {
            instanceName = targetInstance.name;
            // Fetch token from Supabase (not stored in Zustand for security)
            const { data: tokenRow } = await supabase
              .from("whatsapp_instances")
              .select("token")
              .eq("nome", instanceName)
              .limit(1)
              .single();
            instanceToken = tokenRow?.token;
          }

          await sendWhatsAppMessage(instanceName, lead.phone, text, instanceToken);
        } catch (waErr: any) {
          console.error("[addMessage] Failed to send via WhatsApp:", waErr.message);
        }
      }
    };
    
    // Execute async sync in the background
    syncDb().then();

    // Optimistic UI updates
    let updatedConversations = [...state.conversations];
    if (existingConv) {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        conversationId: existingConv.id,
        sender,
        text,
        timestamp: timeNow,
        status: sender === "user" ? "delivered" : "sent"
      };

      updatedConversations = state.conversations.map((c) =>
        c.leadId === leadId
          ? {
              ...c,
              lastMessageAt: timeNow,
              unreadCount: sender === "user" ? c.unreadCount + 1 : c.unreadCount,
              messages: [...c.messages, newMessage]
            }
          : c
      );
    } else {
      const newConvId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        id: newConvId,
        leadId,
        leadName: lead.name,
        leadPhone: lead.phone,
        instanceId: lead.assignedInstanceId || state.instances[0]?.id || "inst-1",
        takeoverMode: lead.takeoverMode,
        lastMessageAt: timeNow,
        unreadCount: sender === "user" ? 1 : 0,
        messages: [
          {
            id: `msg-${Date.now()}`,
            conversationId: newConvId,
            sender,
            text,
            timestamp: timeNow,
            status: sender === "user" ? "delivered" : "sent"
          }
        ]
      };
      updatedConversations.push(newConv);
    }

    return {
      conversations: updatedConversations,
      leads: state.leads.map((l) =>
        l.id === leadId ? { ...l, lastInteraction: "Agora mesmo" } : l
      )
    };
  }),

  markAsRead: (leadId) => set((state) => {
    supabase.from("conversations").update({ unread_count: 0 }).eq("lead_id", leadId).then();
    return {
      conversations: state.conversations.map((c) =>
        c.leadId === leadId ? { ...c, unreadCount: 0 } : c
      )
    };
  }),

  toggleTakeover: (leadId) => set((state) => {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) return {};
    const newMode = lead.takeoverMode === "bot" ? "human" : "bot";

    supabase.from("leads").update({ takeover_mode: newMode }).eq("id", leadId).then();
    supabase.from("conversations").update({ takeover_mode: newMode }).eq("lead_id", leadId).then();

    return {
      leads: state.leads.map((l) =>
        l.id === leadId ? { ...l, takeoverMode: newMode } : l
      ),
      conversations: state.conversations.map((c) =>
        c.leadId === leadId ? { ...c, takeoverMode: newMode } : c
      )
    };
  }),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  generateAIInsights: () => set((state) => {
    // Generate fresh insights based on current leads
    const activeLeads = state.leads.filter(l => l.status !== "Fechado" && l.status !== "Perdido");
    if (activeLeads.length === 0) return {};

    const randomLead = activeLeads[Math.floor(Math.random() * activeLeads.length)];
    const insightTypes: AIInsight["insightType"][] = ["inactive", "cross_sell", "reconnect", "opportunity"];
    const type = insightTypes[Math.floor(Math.random() * insightTypes.length)];

    let message = "";
    let suggestion = "";
    let chance: AIInsight["chance"] = "medium";

    if (type === "inactive") {
      message = `O lead ${randomLead.name} está sem interações há 4 dias na fase ${randomLead.status}.`;
      suggestion = `Disparar mensagem amigável no WhatsApp de acompanhamento.`;
      chance = "medium";
    } else if (type === "cross_sell") {
      message = `Lead ${randomLead.name} expressou receio sobre custo de Sites, mas tem alta demanda de atendimento.`;
      suggestion = `Oferecer o plano simplificado de Triagem Comercial com IA.`;
      chance = "high";
    } else if (type === "reconnect") {
      message = `Lead ${randomLead.name} abriu a última mensagem de follow-up mas não respondeu.`;
      suggestion = `Mandar uma pergunta aberta sobre qual o maior gargalo comercial da ${randomLead.company} hoje.`;
      chance = "high";
    } else {
      message = `Lead ${randomLead.name} se encaixa perfeitamente no perfil de alta conversão para Tráfego Pago local.`;
      suggestion = `Apresentar estudo de caso de construtora local que gerou R$ 120k em vendas.`;
      chance = "high";
    }

    const newInsight: AIInsight = {
      id: `ins-${Date.now()}`,
      leadId: randomLead.id,
      leadName: randomLead.name,
      insightType: type,
      message,
      suggestion,
      chance,
      createdAt: "Agora mesmo"
    };

    return {
      insights: [newInsight, ...state.insights]
    };
  }),

  dismissInsight: (id) => set((state) => ({
    insights: state.insights.filter((ins) => ins.id !== id)
  })),

  setSimulationActive: (active) => set({ simulationActive: active }),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  triggerSimulationTick: () => set((state) => {
    // 1. Find leads in "Novo Lead" or "Abordado" to advance or trigger message
    // Let's make a simulation step:
    // Randomly choose a lead and simulate a message exchange
    const activeInstances = state.instances.filter(i => i.status === "connected");
    if (activeInstances.length === 0) return {};

    const mockLeadReplies = [
      "Gostei da ideia do site institucional. Qual o valor aproximado?",
      "Como essa IA de WhatsApp funciona exatamente? Ela atende 24h?",
      "No momento estamos com site, mas nosso tráfego está baixo. Vocês fazem anúncios?",
      "Pode me ligar ou mandar um áudio explicando?",
      "Olá, vi sua mensagem. Qual o preço dos serviços?",
      "Qual o prazo de entrega de um portal corporativo?",
      "Interessante. Vocês trabalham com direito trabalhista também?"
    ];

    const idleLeads = state.leads.filter(l => l.status === "Novo Lead" || l.status === "Abordado");
    if (idleLeads.length === 0) {
      // If all leads are active, maybe choose one in "Respondeu" to simulate user message
      const respondingLeads = state.leads.filter(l => l.status === "Respondeu" && l.takeoverMode === "bot");
      if (respondingLeads.length > 0 && Math.random() > 0.6) {
        const lead = respondingLeads[Math.floor(Math.random() * respondingLeads.length)];
        const lastConv = state.conversations.find(c => c.leadId === lead.id);
        if (lastConv && lastConv.messages.length > 0) {
          const lastMsg = lastConv.messages[lastConv.messages.length - 1];
          if (lastMsg.sender === "bot") {
            // User replies!
            const text = mockLeadReplies[Math.floor(Math.random() * mockLeadReplies.length)];
            setTimeout(() => {
              get().addMessage(lead.id, "user", text);
              // Qualify lead if it asks about price / demo
              if (text.includes("valor") || text.includes("preço") || text.includes("quanto") || text.includes("funcion")) {
                get().updateLeadStatus(lead.id, "Qualificado");
              }
            }, 100);
          }
        }
      }
      return {};
    }

    // Random lead simulation
    const lead = idleLeads[Math.floor(Math.random() * idleLeads.length)];
    const instance = activeInstances[Math.floor(Math.random() * activeInstances.length)];

    // Simulate sending flow step D0
    const flow = state.flows.find(f => f.id === lead.flowId) || state.flows[0];
    const step = flow?.steps[lead.currentStepIndex || 0] || flow?.steps[0];

    if (!step) return {};

    const text = step.messageTemplate
      .replace("{nome}", lead.name)
      .replace("{empresa}", lead.company)
      .replace("{cidade}", lead.city)
      .replace("{num_avaliacoes}", String(lead.numRatings || 10))
      .replace("{categoria}", lead.category);

    // Update instance stats
    const updatedInstances = state.instances.map(i =>
      i.id === instance.id
        ? { ...i, sentToday: i.sentToday + 1, lastSent: "Agora mesmo" }
        : i
    );

    // Update lead status
    const updatedLeads = state.leads.map(l =>
      l.id === lead.id
        ? {
            ...l,
            status: "Abordado" as const,
            assignedInstanceId: instance.id,
            lastInteraction: "Agora mesmo"
          }
        : l
    );

    // Trigger message logs
    setTimeout(() => {
      get().addMessage(lead.id, "bot", text);

      // 40% chance the lead replies in 3 seconds in the simulator!
      if (Math.random() > 0.6) {
        setTimeout(() => {
          const userReply = mockLeadReplies[Math.floor(Math.random() * mockLeadReplies.length)];
          get().addMessage(lead.id, "user", userReply);
          get().updateLeadStatus(lead.id, "Respondeu");

          // Generate alert insight
          get().generateAIInsights();
        }, 3000);
      }
    }, 100);

    return {
      instances: updatedInstances,
      leads: updatedLeads
    };
  }),

  resetAllData: () => set({
    instances: [],
    leads: [],
    campaigns: [],
    flows: [],
    knowledgeBases: [],
    conversations: [],
    insights: [],
    simulationActive: false,
  }),

  fetchData: async () => {
    try {
      // Fetch whatsapp_instances from API proxy
      let rawInstances = [];
      try {
        const res = await fetch("/api/instances");
        if (res.ok) {
          rawInstances = await res.json();
        } else {
          const { data } = await supabase.from("whatsapp_instances").select("*");
          rawInstances = (data || []).map(i => ({
            id: i.id,
            nome: i.nome,
            numero: i.numero,
            status: i.status,
            qr_code: i.qr_code
          }));
        }
      } catch (fetchErr) {
        console.error("Failed to fetch instances from API, falling back to direct supabase", fetchErr);
        const { data } = await supabase.from("whatsapp_instances").select("*");
        rawInstances = (data || []).map(i => ({
          id: i.id,
          nome: i.nome,
          numero: i.numero,
          status: i.status,
          qr_code: i.qr_code
        }));
      }

      const instances = rawInstances.map((i: any) => ({
        id: i.id,
        name: i.nome,
        phone: i.numero || "",
        status: i.status as any,
        qrCode: i.qr_code || undefined,
        dailyLimit: 300,
        sentToday: 0,
        qualityScore: 98,
        isWarmup: false,
        warningsCount: 0
      }));

      // Fetch sdr_flows
      const { data: rawFlows } = await supabase.from("sdr_flows").select("*");
      const flows = (rawFlows || []).map(f => ({
        id: f.id,
        name: f.name,
        steps: f.steps || []
      }));

      // Fetch campaigns
      const { data: rawCampaigns } = await supabase.from("campaigns").select("*");
      const campaigns = (rawCampaigns || []).map(c => ({
        id: c.id,
        name: c.name,
        niche: c.niche,
        targetService: c.target_service,
        toneOfVoice: c.tone_of_voice,
        status: c.status as any,
        flowId: c.flow_id,
        knowledgeBaseId: c.knowledge_base_id || "",
        leadsCount: c.leads_count,
        cityFilter: c.city_filter || "",
        active: c.active,
        stats: c.stats || { leadsCount: 0, contactedCount: 0, responsesCount: 0 }
      }));

      // Fetch leads
      const { data: rawLeads } = await supabase.from("leads").select("*");
      const leads = (rawLeads || []).map(l => ({
        id: l.id,
        name: l.name,
        company: l.company,
        phone: l.phone,
        city: l.city,
        state: l.state,
        category: l.category,
        section: l.section,
        rating: Number(l.rating) || 0,
        numRatings: l.num_ratings || 0,
        socialLink: l.social_link || undefined,
        status: l.status as any,
        enrichStatus: l.enrichment ? ("success" as const) : ("idle" as const),
        enrichment: l.enrichment || undefined,
        takeoverMode: (l.takeover_mode as any) || "bot",
        notes: l.notes || undefined,
        campaignId: l.campaign_id || undefined,
        flowId: l.flow_id || undefined,
        currentStepIndex: l.current_step_index || 0
      }));

      // Fetch conversations & messages
      const { data: rawConversations } = await supabase.from("conversations").select("*");
      const { data: rawMessages } = await supabase.from("messages").select("*").order("created_at", { ascending: true });

      const conversations = (rawConversations || []).map(c => {
        const matchingMsgs = (rawMessages || [])
          .filter(m => m.conversation_id === c.id)
          .map(m => ({
            id: m.id,
            conversationId: m.conversation_id,
            sender: m.sender as any,
            text: m.text,
            timestamp: m.timestamp,
            status: m.status as any
          }));

        return {
          id: c.id,
          leadId: c.lead_id,
          leadName: c.lead_name,
          leadPhone: c.lead_phone,
          instanceId: c.instance_id || "",
          takeoverMode: (c.takeover_mode as any) || "bot",
          lastMessageAt: c.last_message_at || "",
          unreadCount: c.unread_count || 0,
          messages: matchingMsgs
        };
      });

      set({
        instances,
        flows,
        campaigns,
        leads,
        conversations
      });
    } catch (err) {
      console.error("Failed to fetch data from Supabase", err);
    }
  }
}));
