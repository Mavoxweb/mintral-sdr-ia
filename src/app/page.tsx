"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { runOrchestrator } from "@/agents/agents";

// Tabs
import DashboardTab from "@/components/DashboardTab";
import WhatsAppTab from "@/components/WhatsAppTab";
import LeadsTab from "@/components/LeadsTab";
import KanbanTab from "@/components/KanbanTab";
import ConversationsTab from "@/components/ConversationsTab";
import FlowsTab from "@/components/FlowsTab";
import KnowledgeTab from "@/components/KnowledgeTab";
import CampaignsTab from "@/components/CampaignsTab";
import AnalyticsTab from "@/components/AnalyticsTab";
import SettingsTab from "@/components/SettingsTab";
import AgentLogsTerminal from "@/components/AgentLogsTerminal";

// Icons
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  KanbanSquare,
  MessageCircle,
  GitBranch,
  BookOpen,
  Send,
  LineChart,
  Settings,
  ChevronUp,
  ChevronDown,
  Terminal,
  Brain,
  ShieldCheck,
  Bot
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showConsole, setShowConsole] = useState(true);

  const {
    simulationActive,
    simulationSpeed,
    triggerSimulationTick,
    settings,
    leads,
    instances,
    fetchData
  } = useStore();

  // Load initial data from Supabase
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling loop to sync database and instance changes periodically
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchData();
    }, 8000);
    return () => clearInterval(pollInterval);
  }, [fetchData]);

  // Background Simulation Loop
  useEffect(() => {
    if (!simulationActive) return;

    // Tick duration: base 6 seconds, divided by simulation speed (e.g. speed=5x -> tick=1.2s)
    const tickInterval = 6000 / simulationSpeed;

    const interval = setInterval(async () => {
      // Execute local store logic
      triggerSimulationTick();

      // Run orchestrator AI agent loop
      try {
        const activeLeads = leads.filter(l => l.status === "Novo Lead" || l.status === "Abordado");
        if (activeLeads.length > 0) {
          const lead = activeLeads[Math.floor(Math.random() * activeLeads.length)];
          const mockCampaign = {
            id: "camp-1",
            name: "Campanha Advogados",
            niche: "Advocacia",
            targetService: "Criação de Sites",
            toneOfVoice: "Formal",
            status: "active" as const,
            flowId: "flow-1",
            knowledgeBaseId: "kb-1",
            leadsCount: 1,
            cityFilter: "Vitória",
            active: true,
            stats: {
              leadsCount: 1,
              contactedCount: 1,
              responsesCount: 0
            }
          };
          const mockFlow = {
            id: "flow-1",
            name: "Fluxo Prospecção",
            steps: []
          };
          await runOrchestrator(lead, mockCampaign, mockFlow, settings.openRouterKey);
        }
      } catch (e) {
        console.error("Erro no loop do agente orquestrador:", e);
      }
    }, tickInterval);

    return () => clearInterval(interval);
  }, [simulationActive, simulationSpeed, leads, instances, settings.openRouterKey]);

  const navigationItems = [
    { id: "dashboard", label: "Painel Geral", icon: LayoutDashboard },
    { id: "whatsapp", label: "WhatsApp Multi", icon: MessageSquare },
    { id: "leads", label: "Base de Leads", icon: Users },
    { id: "kanban", label: "CRM Kanban", icon: KanbanSquare },
    { id: "conversations", label: "Live Chat", icon: MessageCircle },
    { id: "flows", label: "Cadências (SDR)", icon: GitBranch },
    { id: "knowledge", label: "Base de Conhecimento", icon: BookOpen },
    { id: "campaigns", label: "Campanhas", icon: Send },
    { id: "analytics", label: "Métricas", icon: LineChart },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab setActiveTab={setActiveTab} setSelectedLeadId={setSelectedLeadId} />;
      case "whatsapp":
        return <WhatsAppTab />;
      case "leads":
        return <LeadsTab selectedLeadId={selectedLeadId} setSelectedLeadId={setSelectedLeadId} />;
      case "kanban":
        return <KanbanTab setSelectedLeadId={setSelectedLeadId} setActiveTab={setActiveTab} />;
      case "conversations":
        return <ConversationsTab />;
      case "flows":
        return <FlowsTab />;
      case "knowledge":
        return <KnowledgeTab />;
      case "campaigns":
        return <CampaignsTab />;
      case "analytics":
        return <AnalyticsTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <DashboardTab setActiveTab={setActiveTab} setSelectedLeadId={setSelectedLeadId} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full min-h-screen bg-[#090a0f] text-white">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-[260px] bg-black/40 border-r border-white/10 flex flex-col justify-between shrink-0 p-5 md:h-screen sticky top-0">
        <div className="space-y-6">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-white/5">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-md shadow-indigo-650/30">
              <Brain size={22} className="text-white fill-white/10" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wider text-white uppercase font-mono">Antigravity</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono">SDR AI • V1.0</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id !== "leads") {
                      setSelectedLeadId(null);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    activeTab === item.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Status Info footer */}
        <div className="pt-4 border-t border-white/5 space-y-3 mt-6 md:mt-0">
          <div className="flex items-center gap-2 text-[10px] text-white/50 font-mono">
            <span className={`w-2 h-2 rounded-full ${simulationActive ? "bg-emerald-500 animate-pulse" : "bg-white/20"}`} />
            <span>Simulador SDR: {simulationActive ? "OPERANDO" : "PAUSADO"}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/50 font-mono">
            <Bot size={12} className="text-indigo-400" />
            <span>Agentes Comerciais: 4 Ativos</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto h-screen p-6 md:p-8 space-y-6 pb-24">
        {/* Top welcome info */}
        <header className="flex justify-between items-center pb-4 border-b border-white/5">
          <div className="space-y-1">
            <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase font-mono">WORKSPACE ATIVO</span>
            <h1 className="text-xl font-black text-white">Console Comercial</h1>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-white/70">Evolution API Server:</span>
              <span className="text-white font-semibold font-mono">VPS Ativa</span>
            </div>
          </div>
        </header>

        {/* Tab display */}
        <div className="flex-1">
          {renderActiveTab()}
        </div>
      </main>

      {/* Collapsible logs console tray */}
      <div className={`fixed bottom-0 right-0 left-0 md:left-[260px] bg-black/90 border-t border-white/10 z-40 transition-all ${
        showConsole ? "h-[300px]" : "h-[40px]"
      }`}>
        {/* Toggle header bar */}
        <div 
          onClick={() => setShowConsole(!showConsole)}
          className="bg-white/5 px-6 py-2.5 flex items-center justify-between cursor-pointer border-b border-white/5 select-none hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-white/80">
              Painel de Logs em Tempo Real da IA SDR (Multi-Agentes)
            </span>
          </div>
          <button className="text-white/50 hover:text-white transition-colors">
            {showConsole ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {/* Console view when open */}
        {showConsole && (
          <div className="h-[260px]">
            <AgentLogsTerminal />
          </div>
        )}
      </div>
    </div>
  );
}
