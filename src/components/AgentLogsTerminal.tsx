import React, { useEffect, useState, useRef } from "react";
import { subscribeToAgentLogs } from "@/agents/agents";
import { Terminal, Brain, Shield, Trash2 } from "lucide-react";

interface AgentLog {
  agent: string;
  action: string;
  status: "success" | "running" | "info" | "warning";
  timestamp: string;
  details?: string;
}

export default function AgentLogsTerminal() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs([
      {
        agent: "Orchestrator Agent (Gemini Pro)",
        action: "Sistema iniciado e pronto para prospecção",
        status: "success",
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        details: "Monitorando fila de leads ativos."
      }
    ]);

    const unsubscribe = subscribeToAgentLogs((log) => {
      setLogs((prev) => [...prev, log].slice(-100)); // Keep last 100 logs
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getStatusColor = (status: AgentLog["status"]) => {
    switch (status) {
      case "success": return "text-emerald-400";
      case "running": return "text-cyan-400 animate-pulse";
      case "warning": return "text-amber-400 animate-bounce";
      default: return "text-indigo-400";
    }
  };

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/10 flex flex-col h-[300px]">
      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-indigo-400" />
          <span className="font-mono text-xs font-semibold tracking-wider uppercase text-white/80">
            Console de Orquestração Multi-Agentes
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-mono">
            <Brain size={12} className="text-purple-400" />
            <span>AI Orchestrator: Ativo</span>
          </div>
          <button 
            onClick={() => setLogs([])}
            className="text-white/40 hover:text-white/80 transition-colors"
            title="Limpar Console"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2.5 bg-black/40">
        {logs.length === 0 ? (
          <div className="text-white/30 text-center py-8">Nenhum log no momento. Iniciando prospecção...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="border-l border-white/10 pl-3 py-0.5 hover:bg-white/5 transition-colors rounded-r">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/30 text-[10px]">{log.timestamp}</span>
                <span className="font-semibold text-white/95">{log.agent}:</span>
                <span className={`${getStatusColor(log.status)}`}>{log.action}</span>
              </div>
              {log.details && (
                <div className="text-white/50 text-[11px] mt-1 pl-2 border-l border-white/5 italic">
                  &gt; {log.details}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
