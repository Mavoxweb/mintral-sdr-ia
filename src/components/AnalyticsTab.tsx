import React from "react";
import { useStore } from "@/store/useStore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, Users, MessageSquare, Award, Clock, ArrowDownRight } from "lucide-react";

export default function AnalyticsTab() {
  const { leads, instances } = useStore();

  const total = leads.length;
  const contacted = leads.filter(l => l.status !== "Novo Lead").length;
  const responded = leads.filter(l => ["Respondeu", "Qualificado", "Proposta", "Negociação", "Fechado"].includes(l.status)).length;
  const qualified = leads.filter(l => ["Qualificado", "Proposta", "Negociação", "Fechado"].includes(l.status)).length;
  const closed = leads.filter(l => l.status === "Fechado").length;

  const funnelData = [
    { name: "Total Leads", valor: total, fill: "rgba(99, 102, 241, 0.2)" },
    { name: "Abordados", valor: contacted, fill: "rgba(6, 182, 212, 0.2)" },
    { name: "Respostas", valor: responded, fill: "rgba(168, 85, 247, 0.2)" },
    { name: "Qualificados", valor: qualified, fill: "rgba(236, 72, 153, 0.2)" },
    { name: "Fechados", valor: closed, fill: "rgba(16, 185, 129, 0.2)" },
  ];

  const cityPerformance = [
    { name: "Vitória", contatos: 48, respostas: 14, conversao: 29 },
    { name: "Bauru", contatos: 32, respostas: 8, conversao: 25 },
    { name: "Cariacica", contatos: 24, respostas: 5, conversao: 20 },
    { name: "Boa Vista", contatos: 18, respostas: 6, conversao: 33 },
  ];

  const monthlyOutbounds = [
    { name: "Jan", disparos: 1200, respostas: 250 },
    { name: "Fev", disparos: 2100, respostas: 480 },
    { name: "Mar", disparos: 3400, respostas: 890 },
    { name: "Abr", disparos: 4800, respostas: 1340 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">Análise e Métricas Comerciais</h2>
        <p className="text-white/50 text-xs">Monitore a performance de conversão do bot e o engajamento dos leads</p>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-white/40 text-[10px] uppercase font-bold tracking-wider">
            <span>Conversão Geral</span>
            <TrendingUp size={14} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {contacted > 0 ? Math.round((closed / contacted) * 100) : 0}%
          </div>
          <p className="text-[10px] text-white/40">Leads fechados vs abordados</p>
        </div>

        <div className="glass rounded-xl p-5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-white/40 text-[10px] uppercase font-bold tracking-wider">
            <span>Taxa de Resposta IA</span>
            <MessageSquare size={14} className="text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {contacted > 0 ? Math.round((responded / contacted) * 100) : 0}%
          </div>
          <p className="text-[10px] text-white/40">{responded} interações positivas</p>
        </div>

        <div className="glass rounded-xl p-5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-white/40 text-[10px] uppercase font-bold tracking-wider">
            <span>Tempo Médio Resposta</span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">1.8 min</div>
          <p className="text-[10px] text-white/40">Tempo de reação do bot sdr</p>
        </div>

        <div className="glass rounded-xl p-5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-white/40 text-[10px] uppercase font-bold tracking-wider">
            <span>Gasto com Tokens IA</span>
            <Award size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">$0.42</div>
          <p className="text-[10px] text-white/40">Custo estimado via OpenRouter</p>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbound Volume */}
        <div className="glass rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white">Crescimento de Disparos vs Respostas</h3>
            <p className="text-white/50 text-xs">Métricas consolidadas do funil de WhatsApp outbound</p>
          </div>
          <div className="h-[240px] text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyOutbounds} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDisparos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRespostas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2b36" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: "#12131a", borderColor: "rgba(255,255,255,0.08)", borderRadius: 12, color: "white" }} />
                <Area type="monotone" dataKey="disparos" stroke="#6366f1" fillOpacity={1} fill="url(#colorDisparos)" strokeWidth={2} name="Disparos" />
                <Area type="monotone" dataKey="respostas" stroke="#10b981" fillOpacity={1} fill="url(#colorRespostas)" strokeWidth={2} name="Respostas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Breakdown */}
        <div className="glass rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white">Desempenho por Cidade Alvo</h3>
            <p className="text-white/50 text-xs">Volume de prospecção e taxa de conversão correspondente</p>
          </div>
          <div className="h-[240px] text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2b36" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: "#12131a", borderColor: "rgba(255,255,255,0.08)", borderRadius: 12, color: "white" }} />
                <Legend />
                <Bar dataKey="contatos" name="Contatos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="respostas" name="Respostas" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="conversao" name="Conversão (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
