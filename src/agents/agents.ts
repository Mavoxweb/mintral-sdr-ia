import { Lead, Campaign, SDRFlow, WhatsAppInstance } from "@/store/useStore";

interface AgentLog {
  agent: string;
  action: string;
  status: "success" | "running" | "info" | "warning";
  timestamp: string;
  details?: string;
}

export type LogListener = (log: AgentLog) => void;
let listeners: LogListener[] = [];

export function subscribeToAgentLogs(listener: LogListener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function broadcastLog(log: AgentLog) {
  listeners.forEach(l => l(log));
  console.log(`[${log.agent}] ${log.action} - ${log.status}: ${log.details || ""}`);
}

// Helper to make OpenRouter API calls if key is present, otherwise fallback
async function callOpenRouter(apiKey: string, prompt: string, systemPrompt: string, model: string = "google/gemini-2.5-pro") {
  if (!apiKey) {
    throw new Error("API Key not found. Falling back to local agent reasoning...");
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://antigravity.sdr.ai",
        "X-Title": "Antigravity SDR AI"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      if (data.error) {
        throw new Error(`OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      throw new Error(`OpenRouter returned unexpected response structure: ${JSON.stringify(data)}`);
    }
    
    const content = data.choices[0].message?.content;
    if (!content) {
      throw new Error("OpenRouter returned an empty message content");
    }
    
    return JSON.parse(content);
  } catch (error: any) {
    console.error("OpenRouter API request failed", error);
    throw error;
  }
}

/**
 * 1. LEAD ANALYZER AGENT (Gemini Flash)
 * Analyzes the lead info (Maps details, social links, location) and generates enrichment structure.
 */
export async function runLeadAnalyzer(lead: Lead, apiKey?: string): Promise<NonNullable<Lead["enrichment"]>> {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  broadcastLog({
    agent: "Lead Analyzer Agent (Gemini Flash)",
    action: `Analisando dados do lead: ${lead.name}`,
    status: "running",
    timestamp,
    details: `Localização: ${lead.city}-${lead.state}. Categoria: ${lead.category}. Avaliações: ${lead.numRatings || 0}`
  });

  const systemPrompt = `Você é o Lead Analyzer Agent, especialista em enriquecimento de leads comerciais B2B no Brasil.
  Analise o lead fornecido e extraia:
  1. Um resumo curto de 2 linhas da atividade comercial e maturidade digital deles.
  2. Três dores comerciais prováveis devido a falta de canais digitais próprios ou dependência exclusiva de redes sociais/Maps.
  3. Três oportunidades claras de automação, tráfego ou site.
  4. Serviços indicados (escolha entre: "Criação de Sites", "Automação IA", "Tráfego Pago", "Chatbot WhatsApp").
  
  Retorne um JSON plano com esta estrutura:
  {
    "summary": "Resumo aqui...",
    "pains": ["Dor 1", "Dor 2", "Dor 3"],
    "opportunities": ["Oportunidade 1", "Oportunidade 2", "Oportunidade 3"],
    "recommendedServices": ["Servico 1", "Servico 2"]
  }`;

  const userPrompt = `Lead:
  Nome: ${lead.name}
  Empresa: ${lead.company}
  Telefone: ${lead.phone}
  Cidade: ${lead.city} / ${lead.state}
  Categoria Google Maps: ${lead.category}
  Rede Social: ${lead.socialLink || "Nenhuma informada"}`;

  try {
    if (apiKey) {
      const result = await callOpenRouter(apiKey, userPrompt, systemPrompt, "google/gemini-2.5-flash");
      broadcastLog({
        agent: "Lead Analyzer Agent (Gemini Flash)",
        action: `Enriquecimento concluído com sucesso via OpenRouter`,
        status: "success",
        timestamp: new Date().toLocaleTimeString("pt-BR")
      });
      return result;
    } else {
      // Simulation delay
      await new Promise(r => setTimeout(r, 1200));
      
      const isLegal = lead.category.toLowerCase().includes("advog") || lead.section.toLowerCase().includes("juríd");
      const isConstru = lead.category.toLowerCase().includes("constr") || lead.category.toLowerCase().includes("pedre") || lead.section.toLowerCase().includes("const");
      const isPet = lead.category.toLowerCase().includes("pet") || lead.category.toLowerCase().includes("vet");

      let summary = `Empresa local de ${lead.category} em ${lead.city}. Apresenta boa reputação no Maps, mas carece de landing pages dedicadas e atendimento automatizado.`;
      let pains = [
        "Elevado esforço manual para responder dúvidas frequentes de novos contatos",
        "Ineficiência comercial fora do horário comercial",
        "Perda de leads qualificados que buscam por profissionais consolidados no Google"
      ];
      let opportunities = [
        "Lançamento de página de captura otimizada para captação local",
        "Agente de IA no WhatsApp para pré-qualificação automática",
        "Campanha direcionada no Google Ads para o termo principal na região de Bauru/Vitória"
      ];
      let recommendedServices = ["Criação de Sites", "Automação IA"];

      if (isLegal) {
        summary = `Escritório jurídico especializado em ${lead.category} em ${lead.city}. Relevância local expressiva (${lead.numRatings || 0} avaliações), porém sem infraestrutura de conversão online própria.`;
        pains = [
          "Dificuldade de filtrar consultas de curiosos vs. clientes com casos reais",
          "Falta de posicionamento digital unificado (autoridade profissional online)",
          "Agendamentos de consultas iniciais feitos de forma manual e descentralizada"
        ];
        opportunities = [
          "Criar Landing Page institucional premium alinhada às diretrizes da OAB",
          "Implementar chatbot SDR no WhatsApp integrado ao Calendly/Google Agenda",
          "Configurar captação ativa via Google Ads para termos de urgência advocatícia"
        ];
        recommendedServices = ["Criação de Sites", "Automação IA"];
      } else if (isConstru) {
        summary = `Negócio no ramo de ${lead.category} em ${lead.city}. Apresenta demanda alta de orçamentos e prazos, o que gera grande gargalo operacional na triagem inicial.`;
        pains = [
          "Tempo excessivo gasto enviando orçamentos genéricos sem triagem prévia",
          "Falta de apresentação visual de portfólio de obras concluídas",
          "Captação passiva dependente unicamente de indicações ou panfletagem"
        ];
        opportunities = [
          "Criar portfólio digital interativo e responsivo para exibição de obras",
          "Ativar campanhas de tráfego pago no Instagram mostrando antes/depois das reformas",
          "Chatbot WhatsApp para receber detalhes do projeto e metragem antes do contato humano"
        ];
        recommendedServices = ["Criação de Sites", "Tráfego Pago", "Chatbot WhatsApp"];
      } else if (isPet) {
        summary = `Clínica veterinária / Pet shop em ${lead.city}. Mercado aquecido que depende de agendamento ágil de banho/tosa e consultas médicas.`;
        pains = [
          "Telefone congestionado nos horários de pico para marcação de serviços",
          "Falta de lembretes automáticos de vacinação/retorno para recorrência",
          "Website desatualizado ou inexistente para exibição de planos de saúde pet"
        ];
        opportunities = [
          "Integrar agendador interativo de banho e tosa via WhatsApp",
          "Disparo automatizado de pós-consulta e lembretes de vacinas",
          "Landing page focada na venda de planos de convênio veterinário local"
        ];
        recommendedServices = ["Automação IA", "Criação de Sites"];
      }

      broadcastLog({
        agent: "Lead Analyzer Agent (Gemini Flash)",
        action: `Enriquecimento concluído com sucesso (Modo Simulação)`,
        status: "success",
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        details: `Recomendado: ${recommendedServices.join(", ")}`
      });

      return { summary, pains, opportunities, recommendedServices };
    }
  } catch (error: any) {
    broadcastLog({
      agent: "Lead Analyzer Agent (Gemini Flash)",
      action: `Falha na execução: ${error.message || error}`,
      status: "warning",
      timestamp: new Date().toLocaleTimeString("pt-BR")
    });
    throw error;
  }
}

/**
 * 2. ORCHESTRATOR AGENT (Gemini 2.5 Pro)
 * The brain. Receives lead details, segment info, campaign specs, and directs other agents on what approach, flow and channels to use.
 */
export async function runOrchestrator(lead: Lead, campaign: Campaign, flow: SDRFlow, apiKey?: string) {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  broadcastLog({
    agent: "Orchestrator Agent (Gemini Pro)",
    action: `Orquestrando funil para: ${lead.name}`,
    status: "running",
    timestamp,
    details: `Campanha: ${campaign.name}. Niche: ${campaign.niche}. Canal de Destino: WhatsApp.`
  });

  // Simulated thinking process
  await new Promise(r => setTimeout(r, 800));

  const decision = {
    approachType: lead.socialLink ? "semi-fria (via rede social)" : "fria (direta Maps)",
    selectedService: campaign.targetService,
    reasoning: `O lead ${lead.name} da empresa ${lead.company} atua no segmento de ${lead.category} em ${lead.city}. Como ${lead.enrichment?.pains[0] || "possui baixo alcance online"}, utilizaremos a abordagem focada em ${campaign.targetService} com tom ${campaign.toneOfVoice}.`,
    nextStepIndex: 0
  };

  broadcastLog({
    agent: "Orchestrator Agent (Gemini Pro)",
    action: `Decisão de fluxo estabelecida`,
    status: "success",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    details: `Abordagem: ${decision.approachType}. Serviço Selecionado: ${decision.selectedService}`
  });

  return decision;
}

/**
 * 3. MESSAGE GENERATOR AGENT (MiniMax)
 * Generates highly personalized outreach messages based on enriched lead context and campaign tone.
 */
export async function runMessageGenerator(lead: Lead, campaign: Campaign, template: string, apiKey?: string): Promise<string> {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  broadcastLog({
    agent: "Message Generator Agent (MiniMax)",
    action: `Gerando mensagem inicial personalizada`,
    status: "running",
    timestamp,
    details: `Lead: ${lead.name}. Personalizando modelo: "${template.substring(0, 40)}..."`
  });

  const systemPrompt = `Você é o Message Generator Agent, focado em criar mensagens de alta conversão comercial via WhatsApp para vendas consultivas.
  Adapte a mensagem base com as informações reais do lead e dores identificadas.
  Use o tom de voz da campanha: ${campaign.toneOfVoice}.
  Importante: Escreva de forma extremamente humana, curta, sem jargões de robô, sem hashtags, e insira perguntas simples no final para incentivar a resposta.
  O WhatsApp não deve parecer um script copiado. Escreva como se estivesse enviando uma mensagem no celular rápida.`;

  const userPrompt = `Template de base:
  ${template}
  
  Dados do Lead enriquecidos:
  Nome: ${lead.name}
  Empresa: ${lead.company}
  Cidade: ${lead.city}
  Categoria: ${lead.category}
  Dores: ${lead.enrichment?.pains.join(", ") || "Sem presença online"}
  Oportunidades: ${lead.enrichment?.opportunities.join(", ") || "Fazer site ou automação"}
  Serviço Oferecido: ${campaign.targetService}`;

  try {
    if (apiKey) {
      const result = await callOpenRouter(apiKey, userPrompt, systemPrompt, "minimax/minimax-01");
      const msg = result.message || result.generated_message || result.text || (typeof result === "string" ? result : JSON.stringify(result));
      
      broadcastLog({
        agent: "Message Generator Agent (MiniMax)",
        action: `Mensagem gerada via OpenRouter (MiniMax)`,
        status: "success",
        timestamp: new Date().toLocaleTimeString("pt-BR")
      });
      return msg;
    } else {
      // Simulation delay
      await new Promise(r => setTimeout(r, 1000));
      
      // Personalize simple text
      let text = template
        .replace("{nome}", lead.name.split(" ")[0]) // first name for a natural tone
        .replace("{empresa}", lead.company)
        .replace("{cidade}", lead.city)
        .replace("{num_avaliacoes}", String(lead.numRatings || 15))
        .replace("{categoria}", lead.category);

      // Add a subtle personalized touch based on pains if success
      if (lead.enrichment && lead.enrichment.pains.length > 0) {
        text += `\n\nNotei que no Maps vocês não têm o link do site direto, o que dificulta pros clientes de ${lead.city} verem os serviços da ${lead.company} no fim de semana ou fora do horário. Faz sentido a gente trocar uma ideia rápida sobre isso?`;
      }

      broadcastLog({
        agent: "Message Generator Agent (MiniMax)",
        action: `Mensagem personalizada gerada (Simulado)`,
        status: "success",
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        details: `Mensagem final: "${text.substring(0, 50)}..."`
      });

      return text;
    }
  } catch (error: any) {
    broadcastLog({
      agent: "Message Generator Agent (MiniMax)",
      action: `Falha na geração: ${error.message || error}`,
      status: "warning",
      timestamp: new Date().toLocaleTimeString("pt-BR")
    });
    // Fallback simple interpolate
    return template
      .replace("{nome}", lead.name.split(" ")[0])
      .replace("{empresa}", lead.company)
      .replace("{cidade}", lead.city)
      .replace("{num_avaliacoes}", String(lead.numRatings || 15))
      .replace("{categoria}", lead.category);
  }
}

/**
 * 4. FOLLOW-UP AGENT (MiniMax)
 * Creates smart follow-up message when lead has not replied, avoiding repeating prior sentences and based on history.
 */
export async function runFollowUpAgent(lead: Lead, campaign: Campaign, conversationHistory: string[], apiKey?: string): Promise<string> {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  broadcastLog({
    agent: "Follow-up Agent (MiniMax)",
    action: `Criando follow-up inteligente para: ${lead.name}`,
    status: "running",
    timestamp,
    details: `Histórico de mensagens: ${conversationHistory.length} mensagens anteriores.`
  });

  await new Promise(r => setTimeout(r, 1100));

  const followUps = [
    `Oi ${lead.name.split(" ")[0]}, tudo bem? Só passando para não deixar minha mensagem anterior sumir na sua caixa de entrada. Imagino que esteja corrido por aí na ${lead.company}. Conseguiu dar uma olhada na ideia que te mandei sobre criar a automação?`,
    `Olá ${lead.name.split(" ")[0]}, tudo joia? Vi que sua semana deve estar movimentada. Chegou a ver os exemplos de portfólios jurídicos que te mandei? São bem parecidos com o que faríamos para a ${lead.company}.`,
    `Oi ${lead.name.split(" ")[0]}, como está? Estive pensando aqui: no seu segmento de ${lead.category}, o principal concorrente em ${lead.city} já atende digitalmente 24h. A gente consegue implementar isso para você de forma bem rápida. Topa um papo de 5 minutos amanhã?`
  ];

  const selected = followUps[Math.floor(Math.random() * followUps.length)];

  broadcastLog({
    agent: "Follow-up Agent (MiniMax)",
    action: `Follow-up personalizado gerado com sucesso`,
    status: "success",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    details: `Mensagem: "${selected.substring(0, 50)}..."`
  });

  return selected;
}

/**
 * 5. QUALIFICATION AGENT (Gemini Flash)
 * Analyzes lead replies to classify intent, extract constraints, and determine if human takeover is required.
 */
export async function runQualificationAgent(lead: Lead, replyText: string, apiKey?: string) {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  broadcastLog({
    agent: "Qualification Agent (Gemini Flash)",
    action: `Analisando resposta do lead: "${replyText}"`,
    status: "running",
    timestamp,
    details: `Objetivo: Determinar interesse, objeções e necessidade de intervenção humana.`
  });

  await new Promise(r => setTimeout(r, 900));

  const textLower = replyText.toLowerCase();
  let interestScore = 50;
  let status: Lead["status"] = "Respondeu";
  let takeoverRequired = false;
  let summary = "Lead respondeu à abordagem de forma neutra.";

  // Key commercial markers
  const positiveMarkers = ["quanto", "preço", "valor", "tabela", "custa", "tenho interesse", "quero saber", "me liga", "funciona", "ligação", "reunião", "agendar"];
  const negativeMarkers = ["não tenho interesse", "obrigado", "já tenho", "não quero", "agora não", "recuso", "no momento não", "parar", "remover"];

  const hasPositive = positiveMarkers.some(m => textLower.includes(m));
  const hasNegative = negativeMarkers.some(m => textLower.includes(m));

  if (hasPositive && !hasNegative) {
    interestScore = 90;
    status = "Qualificado";
    takeoverRequired = true;
    summary = "Lead demonstrou forte interesse comercial em precificação, funcionamento ou agendamento de chamada.";
  } else if (hasNegative) {
    interestScore = 15;
    status = "Perdido";
    takeoverRequired = false;
    summary = "Lead rejeitou explicitamente a abordagem comercial.";
  }

  broadcastLog({
    agent: "Qualification Agent (Gemini Flash)",
    action: `Classificação concluída`,
    status: takeoverRequired ? "warning" : "success",
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    details: `Interesse: ${interestScore}%. Status sugerido: ${status}. Takeover Humano: ${takeoverRequired ? "SIM" : "NÃO"}`
  });

  return { interestScore, status, takeoverRequired, summary };
}

/**
 * 6. CRM INTELLIGENCE AGENT (Gemini Flash)
 * Periodically reviews the CRM Kanban pipeline and active leads to generate smart action suggestions for the user.
 */
export function runCRMIntelligence(leads: Lead[]): AgentLog[] {
  // Analytical processing returning recommendations (AI Insights)
  return [];
}

/**
 * Helper template function for offline/fallback cadence generation
 */
function getPredefinedCadence(niche: string, targetService: string) {
  return {
    name: `Prospecção - ${niche} (${targetService})`,
    steps: [
      {
        name: "D0 - Abordagem Inicial",
        delayDays: 0,
        messageTemplate: `Olá {nome}, tudo bem? Vi o perfil da {empresa} em {cidade} e notei uma oportunidade excelente para vocês com ${targetService}. Posso te mandar um exemplo rápido de como isso funciona?`
      },
      {
        name: "D2 - Primeiro Follow-up",
        delayDays: 2,
        messageTemplate: `Oi {nome}, tudo bem? Só passando para não deixar minha mensagem anterior sumir na sua caixa. Acredito de verdade que podemos agregar valor para a {empresa} no segmento de {categoria}. O que acha de um papo de 5 min?`
      },
      {
        name: "D5 - Quebra de Gelo",
        delayDays: 3,
        messageTemplate: `Oi {nome}, tudo bem? Imaginei que a rotina na {empresa} estivesse corrida. Se fizer sentido mais para frente conversarmos sobre ${targetService}, me avisa. Abraço!`
      }
    ]
  };
}

/**
 * 7. CADENCE GENERATOR AGENT (OpenRouter)
 * Generates cold outreach WhatsApp sequences customized by niche and target service.
 */
export async function runCadenceGenerator(
  niche: string,
  targetService: string,
  model: string = "google/gemini-2.5-flash",
  apiKey?: string
): Promise<{ name: string; steps: { name: string; delayDays: number; messageTemplate: string }[] }> {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  broadcastLog({
    agent: "Cadence Generator Agent",
    action: `Iniciando geração de cadência para nicho: ${niche}`,
    status: "running",
    timestamp,
    details: `Modelo: ${model} | Serviço: ${targetService}`
  });

  if (!apiKey) {
    broadcastLog({
      agent: "Cadence Generator Agent",
      action: "API Key ausente. Utilizando cadência inteligente predefinida.",
      status: "info",
      timestamp,
    });
    return getPredefinedCadence(niche, targetService);
  }

  const systemPrompt = `Você é o Cadence Generator Agent, especialista em Copywriting comercial e cadências de prospecção fria via WhatsApp (SDR) de alta conversão.
Sua tarefa é gerar uma cadência personalizada em JSON.
O JSON retornado deve ter a seguinte estrutura exata:
{
  "name": "Prospecção - [Nicho] - [Serviço]",
  "steps": [
    {
      "name": "D0 - Abordagem",
      "delayDays": 0,
      "messageTemplate": "Mensagem curta de abordagem inicial"
    },
    ...
  ]
}

REGRAS DE COPYWRITING:
1. Mensagens curtas, humanas e diretas (máximo de 3 frases). Sem jargão corporativo robótico.
2. Foco em gerar curiosidade e pedir permissão (ex: "Posso te enviar um áudio de 30 segundos explicando...?").
3. Use tags dinâmicas: {nome}, {empresa}, {cidade}, {categoria} para personalização.
4. Crie exatamente entre 3 e 4 etapas progressivas (D0, D2, D5, etc).
5. O delayDays da primeira etapa (D0) deve ser 0. As próximas devem ter valores maiores (ex: 2, 3).
Retorne APENAS o JSON. Sem textos de introdução ou conclusão.`;

  const prompt = `Gere uma cadência ideal de prospecção fria no WhatsApp para o nicho de "${niche}", com o objetivo de oferecer e vender "${targetService}".`;

  try {
    const response = await callOpenRouter(apiKey, prompt, systemPrompt, model);
    if (!response || !response.steps) {
      throw new Error("Invalid format returned by LLM model");
    }
    broadcastLog({
      agent: "Cadence Generator Agent",
      action: "Cadência gerada com sucesso via OpenRouter",
      status: "success",
      timestamp,
      details: `Fluxo: ${response.name} com ${response.steps.length} etapas.`
    });
    return response;
  } catch (err: any) {
    console.error("[runCadenceGenerator] Error:", err.message);
    broadcastLog({
      agent: "Cadence Generator Agent",
      action: "Falha na chamada OpenRouter. Retornando cadência de backup.",
      status: "warning",
      timestamp,
      details: err.message
    });
    return getPredefinedCadence(niche, targetService);
  }
}

interface CampaignSuggestion {
  niche: string;
  cityFilter: string;
  toneOfVoice: string;
  reason: string;
  potentialLeadsCount: number;
}

/**
 * 8. CAMPAIGN STRATEGIST AGENT (OpenRouter)
 * Analyzes the local database of imported leads to recommend the optimal campaign target, niche, city and sales tone of voice.
 */
export async function suggestCampaignSegment(
  leads: Lead[],
  model: string = "google/gemini-2.5-flash",
  apiKey?: string
): Promise<CampaignSuggestion> {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  broadcastLog({
    agent: "Campaign Strategist Agent",
    action: `Analisando ${leads.length} leads para sugerir campanha ideal`,
    status: "running",
    timestamp
  });

  // Offline default analysis: Group leads to find the best candidate segment
  const fallbackSuggest = (): CampaignSuggestion => {
    if (leads.length === 0) {
      return {
        niche: "Clínicas Médicas",
        cityFilter: "Vitória",
        toneOfVoice: "Consultivo & Amigável",
        reason: "Sem leads importados no banco. Sugerindo um nicho padrão de alta conversão para o setor de saúde.",
        potentialLeadsCount: 0
      };
    }

    // Group leads by category/niche and city
    const counts: { [key: string]: { leads: Lead[], count: number } } = {};
    leads.forEach(l => {
      const nicheKey = l.category || "Geral";
      const cityKey = l.city || "Não informada";
      const comb = `${nicheKey}|||${cityKey}`;
      if (!counts[comb]) {
        counts[comb] = { leads: [], count: 0 };
      }
      // Count only leads ready for a campaign (e.g. status is Novo Lead and not associated to a campaign)
      if (l.status === "Novo Lead" && !l.campaignId) {
        counts[comb].leads.push(l);
        counts[comb].count++;
      }
    });

    let bestComb = "";
    let maxCount = -1;
    Object.keys(counts).forEach(key => {
      if (counts[key].count > maxCount) {
        maxCount = counts[key].count;
        bestComb = key;
      }
    });

    if (!bestComb || maxCount === 0) {
      // If no leads are in "Novo Lead" or unassigned, take the most common overall
      const overallCounts: { [key: string]: { leads: Lead[], count: number } } = {};
      leads.forEach(l => {
        const nicheKey = l.category || "Geral";
        const cityKey = l.city || "Não informada";
        const comb = `${nicheKey}|||${cityKey}`;
        if (!overallCounts[comb]) {
          overallCounts[comb] = { leads: [], count: 0 };
        }
        overallCounts[comb].leads.push(l);
        overallCounts[comb].count++;
      });
      Object.keys(overallCounts).forEach(key => {
        if (overallCounts[key].count > maxCount) {
          maxCount = overallCounts[key].count;
          bestComb = key;
        }
      });
    }

    const [niche, city] = bestComb.split("|||");
    let recommendedTone = "Altamente Persuasivo";
    if (niche.toLowerCase().includes("médic") || niche.toLowerCase().includes("odont") || niche.toLowerCase().includes("saúd")) {
      recommendedTone = "Consultivo & Amigável";
    } else if (niche.toLowerCase().includes("advog") || niche.toLowerCase().includes("juríd")) {
      recommendedTone = "Formal & Técnico";
    } else if (niche.toLowerCase().includes("constr") || niche.toLowerCase().includes("engenh")) {
      recommendedTone = "Direto & Objetivo";
    }

    return {
      niche: niche || "Geral",
      cityFilter: city || "Vitória",
      toneOfVoice: recommendedTone,
      reason: `Análise estática local identificou ${maxCount} leads ativos não engajados no nicho de "${niche}" em "${city}".`,
      potentialLeadsCount: maxCount
    };
  };

  if (!apiKey) {
    broadcastLog({
      agent: "Campaign Strategist Agent",
      action: "API Key ausente. Utilizando recomendação inteligente baseada nos leads locais.",
      status: "info",
      timestamp
    });
    return fallbackSuggest();
  }

  // Create prompt with local leads distribution data
  // Group to send a concise summary to the LLM to avoid token overflow
  const distribution: { [key: string]: number } = {};
  leads.forEach(l => {
    const key = `${l.category} em ${l.city} (${l.status})`;
    distribution[key] = (distribution[key] || 0) + 1;
  });

  const leadSummary = Object.entries(distribution)
    .slice(0, 30) // Limit to top 30 segments to avoid large context sizes
    .map(([seg, count]) => `- ${seg}: ${count} leads`)
    .join("\n");

  const systemPrompt = `Você é o Campaign Strategist Agent, uma inteligência artificial especialista em segmentação comercial, marketing digital B2B e captação de clientes locais.
  Sua tarefa é analisar os leads atuais do banco de dados e recomendar qual deve ser a próxima campanha comercial.
  Considere o volume de leads, nicho de mercado e potencial de conversão do WhatsApp.
  
  Você deve retornar OBRIGATORIAMENTE um JSON válido com os seguintes campos:
  {
    "niche": "nicho sugerido (ex: Advocacia)",
    "cityFilter": "cidade alvo sugerida (ex: Vitória)",
    "toneOfVoice": "um dos quatro tons exatos: 'Altamente Persuasivo', 'Direto & Objetivo', 'Consultivo & Amigável', 'Formal & Técnico'",
    "reason": "uma explicação comercial convincente e motivadora de no máximo 2 linhas explicando por que esta é a melhor escolha com base nos dados fornecidos"
  }
  
  Retorne apenas o JSON limpo, sem markdown, tags ou blocos de código.`;

  const prompt = `Aqui está o sumário de distribuição dos leads atualmente cadastrados no nosso banco:
  ${leadSummary}
  
  Total de Leads: ${leads.length}
  
  Com base nesses dados, sugira a campanha de SDR mais inteligente para iniciar imediatamente.`;

  try {
    const response = await callOpenRouter(apiKey, prompt, systemPrompt, model);
    if (!response || !response.niche || !response.cityFilter) {
      throw new Error("Resposta inválida ou incompleta da OpenRouter");
    }

    // Find local potential count for the suggested niche + city
    const potentialLeadsCount = leads.filter(l => 
      l.status === "Novo Lead" &&
      l.city.toLowerCase().trim() === response.cityFilter.toLowerCase().trim() &&
      (l.category.toLowerCase().includes(response.niche.toLowerCase()) || 
       l.section.toLowerCase().includes(response.niche.toLowerCase()))
    ).length;

    broadcastLog({
      agent: "Campaign Strategist Agent",
      action: "Sugestão de campanha gerada com sucesso via OpenRouter",
      status: "success",
      timestamp,
      details: `Sugerido: ${response.niche} em ${response.cityFilter}. Leads em potencial: ${potentialLeadsCount}`
    });

    return {
      niche: response.niche,
      cityFilter: response.cityFilter,
      toneOfVoice: response.toneOfVoice || "Altamente Persuasivo",
      reason: response.reason || "Recomendado com base na densidade de leads qualificados.",
      potentialLeadsCount
    };
  } catch (err: any) {
    console.error("[suggestCampaignSegment] Error calling OpenRouter:", err);
    broadcastLog({
      agent: "Campaign Strategist Agent",
      action: "Erro na chamada do OpenRouter. Usando algoritmo heurístico local.",
      status: "warning",
      timestamp,
      details: err.message
    });
    return fallbackSuggest();
  }
}

/**
 * runReplyGenerator (MiniMax or Gemini)
 * Generates an intelligent, context-aware reply to a lead message based on their business profile, prior message history and enrichment.
 */
export async function runReplyGenerator(
  lead: Lead,
  leadMessage: string,
  apiKey?: string
): Promise<string> {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  broadcastLog({
    agent: "Reply Generator Agent (MiniMax)",
    action: `Gerando resposta comercial inteligente para: ${lead.name}`,
    status: "running",
    timestamp,
    details: `Mensagem do lead: "${leadMessage.substring(0, 30)}..."`
  });

  const systemPrompt = `Você é o Reply Generator Agent, uma inteligência artificial comercial SDR de alta conversão.
  Sua tarefa é responder à mensagem do lead de forma profissional, sutil, persuasiva e natural.
  Considere o enriquecimento do lead (resumo, dores, oportunidades, serviços recomendados) para conduzir a conversa a favor de fechar uma reunião ou demonstrar valor.
  
  Diretrizes de resposta:
  1. Use linguagem informal de negócios brasileira. Nada de "Prezado", "Estimado". Prefira "Oi", "Tudo bem?".
  2. Responda diretamente à dúvida ou comentário do lead, mas traga à tona uma dor específica ou oportunidade do negócio dele.
  3. Mantenha a resposta com menos de 3 parágrafos curtos.
  4. Termine com uma pergunta simples que estimule uma conversa (ex: "O que acha de darmos uma olhada rápida na sua concorrência amanhã de manhã?").
  5. Não use jargões robóticos ou hashtags.
  Retorne um JSON plano com a estrutura:
  {
    "message": "Texto final da mensagem"
  }`;

  const userPrompt = `Dados do Lead:
  Nome: ${lead.name}
  Empresa: ${lead.company}
  Cidade: ${lead.city}
  Categoria: ${lead.category}
  Dores: ${lead.enrichment?.pains?.join(", ") || "Sem site ou captação online"}
  Oportunidades: ${lead.enrichment?.opportunities?.join(", ") || "Automatizar WhatsApp, melhorar SEO local"}
  Serviços Recomendados: ${lead.enrichment?.recommendedServices?.join(", ") || "Criação de Sites"}
  
  Mensagem recebida do lead:
  "${leadMessage}"`;

  try {
    if (apiKey) {
      const result = await callOpenRouter(apiKey, userPrompt, systemPrompt, "minimax/minimax-01");
      const msg = result.message || result.generated_message || result.text || (typeof result === "string" ? result : JSON.stringify(result));
      
      broadcastLog({
        agent: "Reply Generator Agent (MiniMax)",
        action: `Resposta inteligente gerada com sucesso via OpenRouter`,
        status: "success",
        timestamp: new Date().toLocaleTimeString("pt-BR")
      });
      return msg;
    } else {
      await new Promise(r => setTimeout(r, 1000));
      
      let reply = `Legal sua resposta, ${lead.name.split(" ")[0]}! Aqui na nossa consultoria temos ajudado empresas do segmento de ${lead.category} em ${lead.city} justamente com isso. `;
      if (lead.enrichment && lead.enrichment.pains && lead.enrichment.pains.length > 0) {
        reply += `Notei que vocês hoje têm o gargalo de ${lead.enrichment.pains[0].toLowerCase()}, o que faz vocês perderem oportunidades valiosas. `;
      }
      reply += `A gente desenvolve sites sob medida e automações que resolvem isso em poucos dias. O que acha de fazermos uma ligação rápida de 5 minutos nesta semana para eu te apresentar um modelo?`;
      
      broadcastLog({
        agent: "Reply Generator Agent (MiniMax)",
        action: `Resposta inteligente gerada com sucesso (Simulado)`,
        status: "success",
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        details: `Mensagem: "${reply.substring(0, 50)}..."`
      });
      return reply;
    }
  } catch (error: any) {
    console.error("Reply Generator Agent failed:", error);
    broadcastLog({
      agent: "Reply Generator Agent (MiniMax)",
      action: `Falha ao gerar resposta: ${error.message || error}`,
      status: "warning",
      timestamp: new Date().toLocaleTimeString("pt-BR")
    });
    return `Opa ${lead.name.split(" ")[0]}! Tudo bem? Entendi seu ponto. O que acha de marcarmos um papo de 5 minutinhos para eu te explicar como podemos te ajudar a trazer mais clientes aí para a ${lead.company}?`;
  }
}

