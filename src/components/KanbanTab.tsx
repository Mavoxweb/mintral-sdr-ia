import React from "react";
import { useStore, Lead } from "@/store/useStore";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Star, MessageSquare } from "lucide-react";

interface KanbanTabProps {
  setSelectedLeadId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
}

export default function KanbanTab({ setSelectedLeadId, setActiveTab }: KanbanTabProps) {
  const { leads, updateLeadStatus } = useStore();

  const stages: Lead["status"][] = [
    "Novo Lead",
    "Abordado",
    "Respondeu",
    "Qualificado",
    "Proposta",
    "Negociação",
    "Fechado",
    "Perdido",
  ];

  const getStageColor = (stage: Lead["status"]) => {
    switch (stage) {
      case "Novo Lead": return { border: "border-t-white/20", text: "text-white/70" };
      case "Abordado": return { border: "border-t-cyan-500", text: "text-cyan-400" };
      case "Respondeu": return { border: "border-t-indigo-500", text: "text-indigo-400" };
      case "Qualificado": return { border: "border-t-purple-500", text: "text-purple-400" };
      case "Proposta": return { border: "border-t-pink-500", text: "text-pink-400" };
      case "Negociação": return { border: "border-t-amber-500", text: "text-amber-400" };
      case "Fechado": return { border: "border-t-emerald-500", text: "text-emerald-400" };
      case "Perdido": return { border: "border-t-rose-500", text: "text-rose-400" };
      default: return { border: "border-t-white/20", text: "text-white/70" };
    }
  };

  const moveLead = (leadId: string, currentStatus: Lead["status"], direction: "left" | "right") => {
    const currentIndex = stages.indexOf(currentStatus);
    let nextIndex = currentIndex;

    if (direction === "left" && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (direction === "right" && currentIndex < stages.length - 1) {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex !== currentIndex) {
      updateLeadStatus(leadId, stages[nextIndex]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">CRM Kanban Comercial</h2>
        <p className="text-white/50 text-xs">Arraste ou gerencie leads ao longo do funil de vendas ativo</p>
      </div>

      {/* Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin">
        {stages.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage);

          return (
            <div
              key={stage}
              className={`glass shrink-0 w-[270px] rounded-2xl p-4 border border-white/5 bg-black/30 flex flex-col max-h-[600px] border-t-2 overflow-y-auto ${getStageColor(stage).border}`}
            >
              {/* Column Title */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 shrink-0">
                <span className={`text-xs font-bold uppercase tracking-wider ${getStageColor(stage).text}`}>
                  {stage}
                </span>
                <span className="bg-white/5 border border-white/10 text-white/60 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards wrapper */}
              <div className="flex-1 space-y-3 overflow-y-auto min-h-[150px] pr-1">
                {stageLeads.length === 0 ? (
                  <div className="h-full border border-dashed border-white/5 rounded-xl flex items-center justify-center py-8 text-center text-white/20 text-[10px]">
                    Sem leads nesta fase
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadId(lead.id);
                        setActiveTab("leads");
                      }}
                      className="bg-[#12131a]/80 hover:bg-[#12131a] border border-white/5 hover:border-white/10 p-3.5 rounded-xl space-y-2 cursor-pointer transition-all shadow-md group relative"
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight">
                          {lead.company}
                        </h4>
                        <p className="text-white/40 text-[10px] truncate">{lead.name}</p>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-white/40 font-mono">
                        <span>{lead.city}</span>
                        {lead.rating && (
                          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                            <Star size={10} fill="currentColor" /> {lead.rating}
                          </span>
                        )}
                      </div>

                      {/* Card controllers */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-2.5 mt-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => moveLead(lead.id, stage, "left")}
                            className="p-1 border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/50 hover:text-white rounded-lg transition-all"
                            title="Mover para esquerda"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <button
                            onClick={() => moveLead(lead.id, stage, "right")}
                            className="p-1 border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/50 hover:text-white rounded-lg transition-all"
                            title="Mover para direita"
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                        
                        {stage === "Respondeu" && (
                          <button
                            onClick={() => {
                              setSelectedLeadId(lead.id);
                              setActiveTab("conversations");
                            }}
                            className="flex items-center gap-0.5 text-[9px] bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md hover:bg-indigo-600 hover:text-white transition-all font-bold"
                          >
                            <MessageSquare size={8} /> Chat
                          </button>
                        )}

                        {stage === "Negociação" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateLeadStatus(lead.id, "Fechado")}
                              className="p-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                              title="Marcar Ganho"
                            >
                              <CheckCircle size={10} />
                            </button>
                            <button
                              onClick={() => updateLeadStatus(lead.id, "Perdido")}
                              className="p-1 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                              title="Marcar Perdido"
                            >
                              <XCircle size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
