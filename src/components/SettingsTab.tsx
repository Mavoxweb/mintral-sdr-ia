import React, { useState } from "react";
import { useStore } from "@/store/useStore";
import { Save, Key, Sliders, Clock, Database, Check } from "lucide-react";

export default function SettingsTab() {
  const { settings, updateSettings, resetAllData } = useStore();
  const [openRouterKey, setOpenRouterKey] = useState(settings.openRouterKey);
  const [evolutionApiUrl, setEvolutionApiUrl] = useState(settings.evolutionApiUrl);
  const [evolutionApiKey, setEvolutionApiKey] = useState(settings.evolutionApiKey);
  
  const [minDelay, setMinDelay] = useState(settings.minDelaySeconds);
  const [maxDelay, setMaxDelay] = useState(settings.maxDelaySeconds);
  const [startHour, setStartHour] = useState(settings.workingHoursStart);
  const [endHour, setEndHour] = useState(settings.workingHoursEnd);

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      openRouterKey,
      evolutionApiUrl,
      evolutionApiKey,
      minDelaySeconds: minDelay,
      maxDelaySeconds: maxDelay,
      workingHoursStart: startHour,
      workingHoursEnd: endHour,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">Configurações do Antigravity SDR AI</h2>
        <p className="text-white/50 text-xs">Configure integrações de APIs, delays protetivos e regras de envio do bot</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Keys & Integrations */}
        <div className="glass rounded-2xl p-6 border border-white/10 space-y-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2.5">
            <Key size={14} className="text-indigo-400" /> Chaves de Integrações
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">OpenRouter API Key (Modelos Gemini & MiniMax)</label>
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
              <span className="text-[9px] text-white/30 block mt-0.5">
                Utilizado para o Agente Orquestrador, Enriquecedor de Leads e Gerador de Mensagens do SDR.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Evolution API Server URL</label>
              <input
                type="text"
                placeholder="https://api.seuserver.com"
                value={evolutionApiUrl}
                onChange={(e) => setEvolutionApiUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Evolution API Global API Key</label>
              <input
                type="password"
                placeholder="Evolution Global Token"
                value={evolutionApiKey}
                onChange={(e) => setEvolutionApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Delays & Business hours */}
        <div className="glass rounded-2xl p-6 border border-white/10 space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Sliders size={14} className="text-indigo-400" /> Regras de Evitação de Bloqueios
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold">Delay Mínimo (segundos)</label>
                <input
                  type="number"
                  value={minDelay}
                  onChange={(e) => setMinDelay(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold">Delay Máximo (segundos)</label>
                <input
                  type="number"
                  value={maxDelay}
                  onChange={(e) => setMaxDelay(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold">Início Horário de Envio</label>
                <input
                  type="text"
                  placeholder="08:00"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold">Fim Horário de Envio</label>
                <input
                  type="text"
                  placeholder="18:00"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Reset / Destructive button inside container bottom */}
          <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Área Perigosa</span>
              <p className="text-[10px] text-white/40">Zera todas as conversas, leads e instâncias do navegador.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Deseja realmente limpar todos os dados simulados do banco?")) {
                  resetAllData();
                  alert("Dados resetados!");
                }
              }}
              className="px-3.5 py-2 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl text-xs font-semibold transition-all shrink-0"
            >
              Resetar Banco
            </button>
          </div>
        </div>

        {/* Form Footer actions */}
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            {saved ? (
              <>
                <Check size={16} /> Salvo com Sucesso!
              </>
            ) : (
              <>
                <Save size={16} /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
