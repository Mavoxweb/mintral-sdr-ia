import React from "react";
import { useStore, Lead, WhatsAppInstance, AIInsight } from "@/store/useStore";
import { MessageSquare, PhoneCall, TrendingUp, Sparkles, Zap, Play, Pause, ChevronRight, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardTabProps {
  setActiveTab: (tab: string) => void;
  setSelectedLeadId: (id: string | null) => void;
}

export default function DashboardTab({ setActiveTab, setSelectedLeadId }: DashboardTabProps) {
  const {
    instances,
    leads,
    insights,
    simulationActive,
    simulationSpeed,
    setSimulationActive,
    setSimulationSpeed,
    triggerSimulationTick,
    generateAIInsights,
    dismissInsight,
    updateLeadStatus
  } = useStore();

  const totalSent = instances.reduce((acc, curr) => acc + curr.sentToday, 0);
  const totalLeads = leads.length;
  const respondedLeads = leads.filter((l) => l.status === "Respondeu" || l.status === "Qualificado" || l.status === "Proposta").length;
  const responseRate = totalSent > 0 ? Math.round((respondedLeads / totalSent) * 100) : 0;
  const activeInstances = instances.filter((i) => i.status === "connected").length;

  const chartData = [
    { name: "09:00", mensagens: 24, respostas: 4 },
    { name: "11:00", mensagens: 58, respostas: 12 },
    { name: "13:00", mensagens: 94, respostas: 25 },
    { name: "15:00", mensagens: 142, respostas: 38 },
    { name: "17:00", mensagens: totalSent, respostas: respondedLeads },
  ];

  const handleActionInsight = (insight: AIInsight) => {
    if (insight.insightType === "opportunity") {
      updateLeadStatus(insight.leadId, "Qualificado");
      setSelectedLeadId(insight.leadId);
      setActiveTab("kanban");
    } else if (insight.insightType === "reconnect" || insight.insightType === "inactive") {
      setSelectedLeadId(insight.leadId);
      setActiveTab("conversations");
    }
    dismissInsight(insight.id);
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-indigo-900/40 border border-indigo-500/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-indigo-950/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="text-amber-400 fill-amber-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-wide">Centro de Simulação SDR AI</h2>
          </div>
          <p className="text-white/60 text-sm max-w-xl">
            Simule disparos e respostas inteligentes em tempo real. Os agentes realizam a varredura, enriquecem e abordam os leads automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => setSimulationSpeed(1)}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${simulationSpeed === 1 ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white"}`}
            >
              1x (Real)
            </button>
            <button
              onClick={() => setSimulationSpeed(5)}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${simulationSpeed === 5 ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white"}`}
            >
              5x (Rápido)
            </button>
          </div>
          
          <button
            onClick={() => setSimulationActive(!simulationActive)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md ${
              simulationActive
                ? "bg-amber-600/90 text-white hover:bg-amber-600 border border-amber-500"
                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20"
            }`}
          >
            {simulationActive ? (
              <>
                <Pause size={16} fill="white" /> Pausar IA
              </>
            ) : (
              <>
                <Play size={16} fill="white" /> Iniciar Automação
              </>
            )}
          </button>
          
          <button
            onClick={triggerSimulationTick}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all"
            title="Forçar Ação (Tick)"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 border border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Disparadas Hoje</span>
            <div className="text-2xl font-black text-white">{totalSent}</div>
            <span className="text-white/40 text-[10px]">Meta diária: 600 envios</span>
          </div>
          <div className="p-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <MessageSquare size={20} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Leads Qualificados</span>
            <div className="text-2xl font-black text-white">
              {leads.filter(l => l.status === "Qualificado").length}
            </div>
            <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-semibold">
              <TrendingUp size={10} /> +12% vs ontem
            </span>
          </div>
          <div className="p-3 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <PhoneCall size={20} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Taxa de Resposta</span>
            <div className="text-2xl font-black text-white">{responseRate}%</div>
            <span className="text-white/40 text-[10px]">{respondedLeads} respondeu ao bot</span>
          </div>
          <div className="p-3 bg-purple-600/10 text-purple-400 border border-purple-500/20 rounded-xl">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 border border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Instâncias Ativas</span>
            <div className="text-2xl font-black text-white">
              {activeInstances} <span className="text-xs text-white/40 font-normal">/ {instances.length}</span>
            </div>
            <span className="text-white/40 text-[10px]">Evolution API Conectada</span>
          </div>
          <div className="p-3 bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Main Grid: Graph + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="glass rounded-2xl p-6 border border-white/10 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">Funil Comercial Hoje</h3>
              <p className="text-white/50 text-xs">Acompanhamento de mensagens enviadas vs respostas em tempo real</p>
            </div>
            <span className="text-indigo-400 text-xs bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 font-medium">
              Atualização Automática
            </span>
          </div>
          <div className="h-[230px] w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2b36" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: "#12131a", borderColor: "rgba(255,255,255,0.08)", borderRadius: 12, color: "white" }} />
                <Line type="monotone" dataKey="mensagens" name="Mensagens" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="respostas" name="Respostas" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Commercial Insights */}
        <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col space-y-4 h-[310px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white">Sugestões Comerciais IA</h3>
            </div>
            <button
              onClick={generateAIInsights}
              className="text-[10px] text-purple-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Gerar Nova
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full text-white/30 space-y-2">
                <Sparkles size={24} className="text-white/20 animate-pulse" />
                <p className="text-xs">Nenhum insight gerado no momento. A IA gera sugestões conforme leads respondem.</p>
              </div>
            ) : (
              insights.map((insight) => (
                <div
                  key={insight.id}
                  className="bg-white/5 hover:bg-white/8 transition-all border border-white/5 p-3.5 rounded-xl space-y-2 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${insight.chance === "high" ? "bg-rose-500" : "bg-amber-500"}`} />
                      <span className="text-[10px] font-bold tracking-wider uppercase text-white/40">
                        {insight.insightType === "opportunity" ? "Alta Oportunidade" : insight.insightType === "reconnect" ? "Retomar Contato" : "Alerta de Inatividade"}
                      </span>
                    </div>
                    <span className="text-[9px] text-white/30">{insight.createdAt}</span>
                  </div>
                  <p className="text-xs text-white/80 font-medium leading-relaxed">{insight.message}</p>
                  <div className="bg-indigo-950/30 border border-indigo-500/10 p-2 rounded-lg text-[11px] text-indigo-300 italic">
                    💡 {insight.suggestion}
                  </div>
                  <button
                    onClick={() => handleActionInsight(insight)}
                    className="w-full flex items-center justify-center gap-1 text-[11px] bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/20 text-indigo-300 hover:text-white py-1.5 rounded-lg transition-all"
                  >
                    Executar Sugestão <ChevronRight size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
