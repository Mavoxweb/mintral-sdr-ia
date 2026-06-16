import React, { useState } from "react";
import { useStore, SDRFlow, FlowStep } from "@/store/useStore";
import { Plus, Trash2, Calendar, Edit2, Play, ChevronRight, HelpCircle, Sparkles, Brain, Cpu, Terminal, Loader2 } from "lucide-react";
import { runCadenceGenerator } from "@/agents/agents";

export default function FlowsTab() {
  const { flows, addFlow, deleteFlow, settings } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [steps, setSteps] = useState<Omit<FlowStep, "id">[]>([
    { name: "D0 - Contato Inicial", delayDays: 0, messageTemplate: "Olá {nome}, vi sua empresa {empresa} em {cidade}..." },
    { name: "D2 - Follow-up 1", delayDays: 2, messageTemplate: "Oi {nome}, passando para te enviar o portfólio..." }
  ]);

  // AI Cadence State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiNiche, setAiNiche] = useState("");
  const [aiService, setAiService] = useState("");
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
  const [customModel, setCustomModel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);

  const handleAddStep = () => {
    setSteps([...steps, { name: `D${steps.reduce((acc, c) => acc + c.delayDays, 0) + 3} - Follow-up`, delayDays: 3, messageTemplate: "" }]);
  };

  const handleRemoveStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleStepChange = (idx: number, key: keyof Omit<FlowStep, "id">, value: any) => {
    setSteps(
      steps.map((step, i) => (i === idx ? { ...step, [key]: value } : step))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowName || steps.length === 0) return;
    
    const newStepsWithIds = steps.map((s, index) => ({
      ...s,
      id: `step-${Date.now()}-${index}`
    }));

    await addFlow({
      name: flowName,
      steps: newStepsWithIds
    });

    setFlowName("");
    setSteps([
      { name: "D0 - Contato Inicial", delayDays: 0, messageTemplate: "Olá {nome}, vi sua empresa {empresa} em {cidade}..." }
    ]);
    setShowAddModal(false);
  };

  const handleGenerateAiCadence = async () => {
    if (!aiNiche || !aiService) {
      alert("Por favor, preencha o Nicho de Mercado e o Serviço Oferecido.");
      return;
    }

    setIsGenerating(true);
    const modelLabel = selectedModel === "custom" ? customModel : selectedModel;
    setGenerationLogs([
      `[SDR Agent] Inicializando conexão com o OpenRouter...`,
      `[SDR Agent] Solicitando modelo de IA: ${modelLabel}`,
      `[SDR Agent] Parâmetros: Nicho = "${aiNiche}" | Serviço = "${aiService}"`
    ]);

    // Visual loading simulation updates
    const logTimer1 = setTimeout(() => {
      setGenerationLogs(prev => [...prev, `[SDR Agent] Mapeando gatilhos mentais e dores de prospecção para "${aiNiche}"...`]);
    }, 700);

    const logTimer2 = setTimeout(() => {
      setGenerationLogs(prev => [...prev, `[SDR Agent] Estruturando cadência de prospecção com foco em "${aiService}"...`]);
    }, 1500);

    try {
      const modelToUse = selectedModel === "custom" ? customModel : selectedModel;
      const result = await runCadenceGenerator(
        aiNiche,
        aiService,
        modelToUse,
        settings.openRouterKey
      );

      setGenerationLogs(prev => [
        ...prev,
        `[SDR Agent] Sucesso! Cadência "${result.name}" gerada.`,
        `[SDR Agent] Carregando ${result.steps.length} etapas no editor principal...`
      ]);

      setTimeout(() => {
        setFlowName(result.name);
        setSteps(result.steps.map(s => ({
          name: s.name,
          delayDays: s.delayDays,
          messageTemplate: s.messageTemplate
        })));
        setShowAiModal(false);
        setShowAddModal(true); // Opens editor with the loaded content
        setIsGenerating(false);
        // Clean fields
        setAiNiche("");
        setAiService("");
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setGenerationLogs(prev => [
        ...prev,
        `[Erro] Falha ao chamar a API: ${err.message || err}`,
        `[SDR Agent] Utilizando gerador local e inteligente de backup...`
      ]);

      setTimeout(() => {
        setFlowName(`Prospecção - ${aiNiche} (${aiService})`);
        setSteps([
          {
            name: "D0 - Abordagem Inicial",
            delayDays: 0,
            messageTemplate: `Olá {nome}, tudo bem? Vi o perfil da {empresa} em {cidade} e notei uma oportunidade excelente para vocês com ${aiService}. Posso te mandar um exemplo rápido de como isso funciona?`
          },
          {
            name: "D2 - Primeiro Follow-up",
            delayDays: 2,
            messageTemplate: `Oi {nome}, tudo bem? Só passando para não deixar minha mensagem anterior sumir na sua caixa. Acredito de verdade que podemos agregar valor para a {empresa} no segmento de {categoria}. O que acha de um papo de 5 min?`
          },
          {
            name: "D5 - Quebra de Gelo",
            delayDays: 3,
            messageTemplate: `Oi {nome}, tudo bem? Imaginei que a rotina na {empresa} estivesse corrida. Se fizer sentido mais para frente conversarmos sobre ${aiService}, me avisa. Abraço!`
          }
        ]);
        setShowAiModal(false);
        setShowAddModal(true);
        setIsGenerating(false);
        // Clean fields
        setAiNiche("");
        setAiService("");
      }, 1500);
    } finally {
      clearTimeout(logTimer1);
      clearTimeout(logTimer2);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Fluxos de Prospecção SDR</h2>
          <p className="text-white/50 text-xs">Configure cadências e templates de abordagens comerciais por nicho</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg border border-violet-400/20 active:scale-[0.98]"
          >
            <Sparkles size={14} className="animate-pulse text-violet-200" /> Gerar com IA
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
          >
            <Plus size={14} /> Novo Fluxo
          </button>
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-6">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="glass rounded-2xl p-6 border border-white/10 space-y-4 hover:border-white/15 transition-all shadow-inner"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {flow.name}
                  {flow.name.includes("IA") || flow.name.includes("Prospecção") ? (
                    <span className="text-[9px] bg-violet-500/10 text-violet-300 border border-violet-500/20 px-1.5 py-0.25 rounded-md font-mono">IA Core</span>
                  ) : null}
                </h3>
                <p className="text-white/40 text-[11px] font-mono">{flow.steps.length} etapas cadastradas</p>
              </div>
              <button
                onClick={async () => {
                  if (confirm("Deletar este fluxo?")) await deleteFlow(flow.id);
                }}
                className="text-white/40 hover:text-rose-400 p-2 border border-white/10 hover:border-rose-500/20 rounded-xl transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Steps timeline horizontal */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {flow.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3 flex flex-col justify-between relative group hover:bg-white/[0.07] transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                        {step.name}
                      </span>
                      <span className="text-[10px] text-white/30 font-mono flex items-center gap-0.5">
                        <Calendar size={10} /> +{step.delayDays}d
                      </span>
                    </div>
                    <p className="text-[11px] text-white/70 line-clamp-4 italic leading-relaxed pt-1">
                      "{step.messageTemplate}"
                    </p>
                  </div>
                  
                  {/* Variables Helper */}
                  <div className="text-[9px] text-white/30 border-t border-white/5 pt-2 flex items-center justify-between font-mono">
                    <span>Tags: nome, empresa, cidade</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* AI Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass max-w-lg w-full rounded-3xl border border-white/15 p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <div className="p-2 bg-violet-600/20 text-violet-400 rounded-xl">
                <Brain size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Gerar Cadência Ideal por IA</h3>
                <p className="text-[11px] text-white/50">Crie abordagens de conversão validadas para seu nicho de atuação</p>
              </div>
            </div>

            {!isGenerating ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Nicho de Mercado</label>
                    <input
                      type="text"
                      placeholder="Ex: Clínicas Odontológicas, Petshops"
                      value={aiNiche}
                      onChange={(e) => setAiNiche(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all placeholder-white/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Serviço Oferecido</label>
                    <input
                      type="text"
                      placeholder="Ex: Criação de Sites, Tráfego Pago"
                      value={aiService}
                      onChange={(e) => setAiService(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all placeholder-white/20"
                    />
                  </div>
                </div>

                {/* LLM Engine Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/50 uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Cpu size={12} className="text-violet-400" /> Motor de IA (OpenRouter)
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all cursor-pointer"
                    >
                      <option className="bg-[#121218] text-white" value="google/gemini-2.5-flash">Google Gemini 2.5 Flash (Preset - Recomendado)</option>
                      <option className="bg-[#121218] text-white" value="google/gemini-2.5-pro">Google Gemini 2.5 Pro (Preciso)</option>
                      <option className="bg-[#121218] text-white" value="minimax/minimax-01">MiniMax 01 (Veloz)</option>
                      <option className="bg-[#121218] text-white" value="moonshotai/moonshot-v1-8k">Kimi / Moonshot v1 8k (Contexto amplo)</option>
                      <option className="bg-[#121218] text-white" value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet (Premium)</option>
                      <option className="bg-[#121218] text-white" value="custom">Outro Modelo (Digitar ID do OpenRouter)</option>
                    </select>

                    {selectedModel === "custom" && (
                      <input
                        type="text"
                        placeholder="Ex: meta-llama/llama-3-70b-instruct"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        className="w-full bg-white/5 border border-violet-500/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-all placeholder-white/20"
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="flex-1 border border-white/10 hover:bg-white/5 py-2.5 rounded-xl text-xs text-white/70 hover:text-white transition-all font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAiCadence}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-2.5 rounded-xl text-xs text-white font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                  >
                    <Sparkles size={13} /> Criar Cadência
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Loader2 size={36} className="text-violet-500 animate-spin" />
                  <p className="text-xs text-white/70 animate-pulse font-medium">O Agente SDR IA está elaborando a sua sequência...</p>
                </div>

                {/* Cyberpunk terminal style logs */}
                <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 font-mono text-[10px] space-y-1.5 text-emerald-400 overflow-y-auto max-h-[140px] shadow-inner">
                  <div className="flex items-center gap-1.5 text-white/40 pb-1.5 border-b border-white/5 mb-1.5">
                    <Terminal size={12} />
                    <span>Logs do Agente SDR</span>
                  </div>
                  {generationLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Flow Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="glass max-w-2xl w-full rounded-2xl border border-white/15 p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit2 size={16} className="text-indigo-400" />
              Editar / Criar Cadência SDR
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Nome da Cadência</label>
                <input
                  type="text"
                  placeholder="Ex: Fluxo Automação IA - Construtoras"
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              {/* Steps Creator List */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Etapas da Cadência</h4>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-[10px] bg-white/5 border border-white/10 text-indigo-400 hover:bg-white/10 px-2.5 py-1 rounded-lg font-bold transition-all"
                  >
                    + Adicionar Etapa
                  </button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {steps.map((step, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="absolute top-4 right-4 text-white/30 hover:text-rose-400 text-xs transition-colors"
                      >
                        Remover
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">Identificador Etapa</label>
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => handleStepChange(idx, "name", e.target.value)}
                            placeholder="Ex: D3 - Apresentação de Vídeo"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/40 uppercase">Delay (dias após a etapa anterior)</label>
                          <input
                            type="number"
                            value={step.delayDays}
                            onChange={(e) => handleStepChange(idx, "delayDays", Number(e.target.value))}
                            placeholder="Ex: 3"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-white/40 uppercase">Template da Mensagem WhatsApp</label>
                        <textarea
                          value={step.messageTemplate}
                          onChange={(e) => handleStepChange(idx, "messageTemplate", e.target.value)}
                          placeholder="Olá {nome}, tudo bem? Vi sua empresa {empresa} em {cidade}..."
                          className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white resize-none"
                          required
                        />
                        <span className="text-[9px] text-white/30 font-mono block mt-0.5">
                          Tags dinâmicas: {"{nome}"}, {"{empresa}"}, {"{cidade}"}, {"{categoria}"}.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 py-2 rounded-xl text-xs text-white/70 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-xl text-xs text-white font-medium transition-all"
              >
                Salvar Cadência
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
