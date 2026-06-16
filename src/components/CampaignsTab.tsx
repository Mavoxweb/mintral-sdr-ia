import React, { useState, useEffect } from "react";
import { useStore, Campaign, Lead } from "@/store/useStore";
import { 
  Plus, 
  Trash2, 
  Power, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Bot, 
  Compass,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Play,
  Pause,
  Loader2,
  Activity,
  Terminal,
  RefreshCw
} from "lucide-react";
import { suggestCampaignSegment } from "@/agents/agents";

export default function CampaignsTab() {
  const { campaigns, addCampaign, toggleCampaign, deleteCampaign, flows, leads, settings, fetchData, triggerSimulationTick, instances } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [niche, setNiche] = useState("");
  const [tone, setTone] = useState("Altamente Persuasivo");
  const [flowId, setFlowId] = useState("");
  const [cityFilter, setCityFilter] = useState("Vitória");
  
  // IA Suggestion States
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiReason, setAiReason] = useState("");
  
  // Card Expansion State for viewing leads
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  // SDR Dispatcher States
  const [dispatcherActive, setDispatcherActive] = useState(false);
  const [dispatcherInterval, setDispatcherInterval] = useState(10); // seconds
  const [dispatcherMode, setDispatcherMode] = useState<"real" | "mock">("real");
  const [dispatcherStats, setDispatcherStats] = useState({ total: 0, success: 0, error: 0 });
  const [dispatcherLogs, setDispatcherLogs] = useState<{ id: string; time: string; type: "success" | "error" | "info"; message: string }[]>([]);
  const [isProcessingTick, setIsProcessingTick] = useState(false);

  const addLog = (type: "success" | "error" | "info", message: string) => {
    const time = new Date().toLocaleTimeString("pt-BR");
    setDispatcherLogs(prev => [
      { id: `${Date.now()}-${Math.random()}`, time, type, message },
      ...prev
    ].slice(0, 100));
  };

  useEffect(() => {
    if (!dispatcherActive) return;

    const runTick = async () => {
      if (isProcessingTick) return;
      setIsProcessingTick(true);

      try {
        if (dispatcherMode === "real") {
          addLog("info", "Iniciando processamento de lead via endpoint comercial /api/cron/process-sdr...");
          
          const res = await fetch("/api/cron/process-sdr", {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          
          const textRes = await res.text();
          let data: any = {};
          try {
            data = JSON.parse(textRes);
          } catch(e) {}

          if (res.ok && data.success) {
            setDispatcherStats(prev => ({ ...prev, total: prev.total + 1, success: prev.success + 1 }));
            addLog("success", `Lead: ${data.leadName || "Desconhecido"} (${data.company || "Sem Empresa"}) abordado via WhatsApp com sucesso.`);
            await fetchData();
          } else {
            const errorMsg = data.error || textRes || "Nenhum lead pendente elegível ou erro de processamento.";
            if (errorMsg.includes("No pending leads to process")) {
              addLog("info", "Nenhum lead com status 'Novo Lead' vinculado a campanhas ativas.");
            } else {
              setDispatcherStats(prev => ({ ...prev, total: prev.total + 1, error: prev.error + 1 }));
              addLog("error", `Falha no disparo: ${errorMsg}`);
            }
          }
        } else {
          // Simulation mode
          addLog("info", "Simulando disparo de prospecção SDR localmente...");
          
          const connected = instances.filter(i => i.status === "connected");
          if (connected.length === 0) {
            setDispatcherStats(prev => ({ ...prev, total: prev.total + 1, error: prev.error + 1 }));
            addLog("error", "Simulação falhou: Nenhuma instância WhatsApp está conectada. Vá para a aba WhatsApp e conecte.");
            setIsProcessingTick(false);
            return;
          }

          const activeCampaigns = campaigns.filter(c => c.active);
          if (activeCampaigns.length === 0) {
            addLog("info", "Simulação pausada: nenhuma campanha ativa encontrada.");
            setIsProcessingTick(false);
            return;
          }

          const idleLeads = leads.filter(l => 
            l.campaignId && 
            activeCampaigns.some(c => c.id === l.campaignId) &&
            (l.status === "Novo Lead" || l.status === "Abordado")
          );

          if (idleLeads.length === 0) {
            addLog("info", "Simulação: Sem leads com status 'Novo Lead' vinculados a campanhas ativas localmente.");
          } else {
            triggerSimulationTick();
            setDispatcherStats(prev => ({ ...prev, total: prev.total + 1, success: prev.success + 1 }));
            addLog("success", "Mensagem de abordagem SDR simulada com sucesso.");
          }
        }
      } catch (err: any) {
        setDispatcherStats(prev => ({ ...prev, total: prev.total + 1, error: prev.error + 1 }));
        addLog("error", `Falha crítica na requisição: ${err.message || err}`);
      } finally {
        setIsProcessingTick(false);
      }
    };

    // Run first tick immediately
    runTick();

    const intervalId = setInterval(runTick, dispatcherInterval * 1000);
    return () => clearInterval(intervalId);
  }, [dispatcherActive, dispatcherInterval, dispatcherMode, campaigns, leads, instances]);

  // Live calculation of matching leads based on filters entered in form
  const previewMatchingCount = leads.filter(l => 
    (l.status === "Novo Lead" || l.status === "Abordado") &&
    l.city.toLowerCase().trim() === cityFilter.toLowerCase().trim() &&
    (l.category.toLowerCase().includes(niche.toLowerCase()) || 
     l.section.toLowerCase().includes(niche.toLowerCase()))
  ).length;

  const handleAiSuggestion = async () => {
    setIsSuggesting(true);
    setAiReason("");
    try {
      const suggestion = await suggestCampaignSegment(leads, "google/gemini-2.5-flash", settings.openRouterKey);
      setNiche(suggestion.niche);
      setCityFilter(suggestion.cityFilter);
      setTone(suggestion.toneOfVoice);
      setAiReason(suggestion.reason);
      
      // Auto select the first flow if none selected
      if (!flowId && flows.length > 0) {
        setFlowId(flows[0].id);
      }
    } catch (err) {
      console.error("Erro ao gerar sugestão de campanha:", err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !flowId) return;

    await addCampaign({
      niche,
      toneOfVoice: tone,
      flowId,
      cityFilter,
    });

    setNiche("");
    setTone("Altamente Persuasivo");
    setFlowId("");
    setCityFilter("Vitória");
    setAiReason("");
    setShowAddModal(false);
  };

  // Status Badge Helper
  const getStatusColor = (status: Lead["status"]) => {
    switch (status) {
      case "Novo Lead": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "Abordado": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "Respondeu": return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "Qualificado": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "Proposta": return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
      default: return "bg-white/5 text-white/50 border border-white/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase font-mono">SELEÇÃO & DISPARO</span>
          <h2 className="text-xl font-extrabold text-white">Módulo de Campanhas Comerciais</h2>
          <p className="text-white/50 text-xs">Conecte sua base de leads qualificados a cadências automatizadas com tons de voz personalizados por I.A.</p>
        </div>
        <button
          onClick={() => {
            // Preset first flow if available when opening modal
            if (flows.length > 0 && !flowId) {
              setFlowId(flows[0].id);
            }
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 self-start sm:self-auto"
        >
          <Plus size={16} /> Nova Campanha
        </button>
      </div>

      {/* Painel SDR Dispatcher */}
      <div className="glass border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-indigo-950/20 via-black/40 to-[#12131a]/40 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <Bot className="text-indigo-400" size={20} />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                SDR Dispatcher Pro
                <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.5 rounded-md">AUTOMÁTICO</span>
              </h3>
              <p className="text-[10px] text-white/40">Controle o envio das mensagens da cadência em segundo plano</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dispatcherActive ? "bg-emerald-400" : "bg-rose-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dispatcherActive ? "bg-emerald-500" : "bg-rose-500"}`}></span>
            </span>
            <span className="text-[10px] font-bold font-mono tracking-wide">
              {dispatcherActive ? `EXECUTANDO A CADA ${dispatcherInterval}s` : "DISPACHADOR DESATIVADO"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna 1: Controles */}
          <div className="space-y-3 bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/50">Intervalo de Envio:</span>
                <div className="relative">
                  <select
                    value={dispatcherInterval}
                    onChange={(e) => setDispatcherInterval(Number(e.target.value))}
                    disabled={dispatcherActive}
                    className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white/80 focus:outline-none focus:border-indigo-500 transition-all appearance-none pr-6 font-bold"
                  >
                    <option value="5" className="bg-[#12131a]">5 segundos</option>
                    <option value="10" className="bg-[#12131a]">10 segundos</option>
                    <option value="15" className="bg-[#12131a]">15 segundos</option>
                    <option value="30" className="bg-[#12131a]">30 segundos</option>
                    <option value="60" className="bg-[#12131a]">1 minuto</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2.5 top-2 text-white/30 pointer-events-none" />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-white/50">Modo de Operação:</span>
                <div className="relative">
                  <select
                    value={dispatcherMode}
                    onChange={(e) => setDispatcherMode(e.target.value as any)}
                    disabled={dispatcherActive}
                    className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white/80 focus:outline-none focus:border-indigo-500 transition-all appearance-none pr-6 font-bold"
                  >
                    <option value="real" className="bg-[#12131a]">WhatsApp Real (API)</option>
                    <option value="mock" className="bg-[#12131a]">Simulação I.A</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2.5 top-2 text-white/30 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setDispatcherActive(!dispatcherActive)}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98] mt-2 ${
                dispatcherActive
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10"
              }`}
            >
              {dispatcherActive ? (
                <>
                  <Pause size={14} fill="currentColor" />
                  Pausar Disparos SDR
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  Iniciar Prospecções SDR
                </>
              )}
            </button>
          </div>

          {/* Coluna 2: Estatísticas */}
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl grid grid-cols-2 gap-3 items-center">
            <div className="space-y-1 text-center border-r border-white/5">
              <span className="text-[10px] text-white/40 uppercase font-mono">Total Processado</span>
              <p className="text-xl font-bold font-mono text-white">{dispatcherStats.total}</p>
            </div>
            <div className="space-y-1 text-center">
              <span className="text-[10px] text-white/40 uppercase font-mono">Taxa de Sucesso</span>
              <p className="text-xl font-bold font-mono text-emerald-400">
                {dispatcherStats.total > 0
                  ? `${Math.round((dispatcherStats.success / dispatcherStats.total) * 100)}%`
                  : "0%"
                }
              </p>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[11px]">
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={12} />
                <span>Enviado: <strong>{dispatcherStats.success}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <AlertCircle size={12} />
                <span>Falha: <strong>{dispatcherStats.error}</strong></span>
              </div>
            </div>
          </div>

          {/* Coluna 3: Console de Logs */}
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col justify-between h-40">
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5 shrink-0">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                <Terminal size={12} /> Live Logger Terminal
              </span>
              <button
                onClick={() => setDispatcherLogs([])}
                className="text-[9px] text-white/30 hover:text-white hover:underline font-mono"
              >
                Limpar Logs
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto font-mono text-[9px] space-y-1 pt-1.5 pr-1 scrollbar-thin max-h-[100px]">
              {dispatcherLogs.length === 0 ? (
                <p className="text-white/20 italic">Aguardando início do disparador para exibir logs comerciais...</p>
              ) : (
                dispatcherLogs.map((log) => (
                  <div key={log.id} className="leading-relaxed">
                    <span className="text-white/30 font-bold">[{log.time}]</span>{" "}
                    <span className={
                      log.type === "success" ? "text-emerald-400" :
                      log.type === "error" ? "text-rose-400 font-bold" :
                      "text-indigo-300"
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="glass border border-white/10 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
            <Compass size={24} className="text-white/40" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Nenhuma campanha ativa</h3>
            <p className="text-xs text-white/40">Crie uma campanha para recrutar leads de um nicho específico da sua base de dados e iniciar o envio de mensagens.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
          >
            Começar agora <Plus size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => {
            const matchedFlow = flows.find(f => f.id === camp.flowId);
            const campLeads = leads.filter(l => l.campaignId === camp.id);
            const isExpanded = expandedCampaignId === camp.id;

            // Recalculate stats dynamically for fidelity
            const contacted = campLeads.filter(l => l.status !== "Novo Lead").length;
            const responded = campLeads.filter(l => l.status === "Respondeu" || l.status === "Qualificado" || l.status === "Proposta" || l.status === "Negociação" || l.status === "Fechado").length;

            return (
              <div
                key={camp.id}
                className="glass rounded-2xl p-5 border border-white/10 flex flex-col justify-between space-y-4 hover:border-white/15 transition-all relative group shadow-lg"
              >
                {/* Meta info header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold">
                      {camp.cityFilter}
                    </span>
                    <button
                      onClick={() => toggleCampaign(camp.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                        camp.active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-white/5 text-white/50 border-white/10"
                      }`}
                    >
                      <Power size={10} /> {camp.active ? "Ativa" : "Pausada"}
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white leading-snug">{camp.niche}</h3>
                    <p className="text-white/40 text-[11px] font-mono flex items-center gap-1">
                      <Calendar size={12} className="text-white/30" /> Cadência: {matchedFlow ? matchedFlow.name : "Nenhum fluxo associado"}
                    </p>
                  </div>
                </div>

                {/* Tone of voice display */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <span className="text-white/40 text-[9px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Sparkles size={10} className="text-purple-400" /> Tom de Voz Comercial
                  </span>
                  <p className="text-xs text-white/80 font-medium">{camp.toneOfVoice}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-white/5 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-white/40 text-[9px] uppercase">Alvo (Base)</span>
                    <p className="font-bold text-white font-mono">{campLeads.length}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-white/40 text-[9px] uppercase">Contatados</span>
                    <p className="font-bold text-cyan-400 font-mono">{contacted}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-white/40 text-[9px] uppercase">Respostas</span>
                    <p className="font-bold text-emerald-400 font-mono">{responded}</p>
                  </div>
                </div>

                {/* Integrated Leads List Section */}
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <button
                    onClick={() => setExpandedCampaignId(isExpanded ? null : camp.id)}
                    className="w-full flex items-center justify-between text-xs text-white/60 hover:text-white transition-colors py-1 px-1.5 rounded-lg hover:bg-white/5"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-indigo-400" /> 
                      Ver leads vinculados ({campLeads.length})
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pt-1 pr-1 scrollbar-thin">
                      {campLeads.length === 0 ? (
                        <p className="text-[10px] text-white/30 text-center py-2 font-mono">Nenhum lead vinculado. Atualize a base com leads deste nicho/cidade.</p>
                      ) : (
                        campLeads.map(lead => (
                          <div 
                            key={lead.id}
                            className="bg-black/20 p-2 rounded-lg border border-white/5 flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <p className="font-bold text-white truncate">{lead.company}</p>
                              <p className="text-white/40 text-[10px] truncate">{lead.name} • {lead.phone}</p>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      if(confirm(`Deseja mesmo remover a campanha de ${camp.niche}? Isso desvinculará todos os leads associados.`)) {
                        deleteCampaign(camp.id);
                      }
                    }}
                    className="w-full text-center py-2 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/20 text-white/40 hover:text-rose-400 text-xs rounded-xl transition-all"
                  >
                    Remover Campanha
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="glass max-w-md w-full rounded-2xl border border-white/15 p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">Criar Campanha SDR</h3>
              </div>
              <button 
                type="button" 
                onClick={() => handleAiSuggestion()}
                disabled={isSuggesting}
                className="flex items-center gap-1 text-[10px] font-bold text-purple-400 hover:text-purple-300 border border-purple-500/30 hover:border-purple-500/60 bg-purple-500/10 px-2 py-1 rounded-lg transition-all"
              >
                <Sparkles size={12} className={isSuggesting ? "animate-spin" : ""} />
                {isSuggesting ? "Analisando..." : "Sugerir com I.A"}
              </button>
            </div>

            {/* AI Suggestion Box */}
            {aiReason && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-[11px] text-purple-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Sparkles size={11} /> Estratégia Recomendada pela I.A:
                </p>
                <p className="text-white/80 leading-relaxed font-mono">{aiReason}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Nicho da Campanha</label>
                <input
                  type="text"
                  placeholder="Ex: Clínicas Odontológicas, Advogados"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Cidade Alvo</label>
                <input
                  type="text"
                  placeholder="Ex: Vitória, São Paulo"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                  required
                />
              </div>

              {/* Dynamic Matches Counter */}
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <span className="text-[11px] text-white/50 flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-400" /> Leads compatíveis na base:
                </span>
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                  previewMatchingCount > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-white/30"
                }`}>
                  {previewMatchingCount} leads
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Tom de Voz da I.A</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="Altamente Persuasivo" className="bg-[#12131a]">Altamente Persuasivo (Foco em fechamento)</option>
                  <option value="Direto & Objetivo" className="bg-[#12131a]">Direto & Objetivo (Rápido e sucinto)</option>
                  <option value="Consultivo & Amigável" className="bg-[#12131a]">Consultivo & Amigável (Empático e acolhedor)</option>
                  <option value="Formal & Técnico" className="bg-[#12131a]">Formal & Técnico (Polido e profissional)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Cadência Associada</label>
                <select
                  value={flowId}
                  onChange={(e) => setFlowId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  required
                >
                  <option value="" className="bg-[#12131a]">Selecione uma cadência...</option>
                  {flows.map((flow) => (
                    <option key={flow.id} value={flow.id} className="bg-[#12131a]">{flow.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 py-2.5 rounded-xl text-xs text-white/70 hover:text-white transition-all font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl text-xs text-white font-semibold transition-all shadow-lg shadow-indigo-600/10 active:scale-95"
              >
                Criar Campanha
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
