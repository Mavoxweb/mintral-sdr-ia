import React, { useState, useEffect } from "react";
import { useStore, Lead } from "@/store/useStore";
import { runLeadAnalyzer } from "@/agents/agents";
import { Search, Filter, Sparkles, Trash2, Eye, FileUp, Loader2, ArrowRight, ShieldAlert, Check } from "lucide-react";

interface LeadsTabProps {
  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;
}

export default function LeadsTab({ selectedLeadId, setSelectedLeadId }: LeadsTabProps) {
  const { leads, importLeads, enrichLead, deleteLead, updateLeadNotes, updateLeadStatus, settings, fetchData } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [enrichingMap, setEnrichingMap] = useState<Record<string, boolean>>({});

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  // ✅ Fixed: now persists to Supabase via API (was only loading to Zustand in-memory)
  const handleLoadLeadsFile = async () => {
    setLoadingInitial(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 150 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao importar leads.");
      
      setImportResult(`✅ ${data.imported} leads importados de ${data.total} disponíveis.`);
      
      // Refresh store from Supabase so new leads appear immediately
      await fetchData();
    } catch (e: any) {
      setImportResult(`❌ Erro: ${e.message}`);
      console.error(e);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleEnrich = async (lead: Lead) => {
    setEnrichingMap(prev => ({ ...prev, [lead.id]: true }));
    try {
      // Trigger actual AI agent logic
      const enrichmentData = await runLeadAnalyzer(lead, settings.openRouterKey);
      await enrichLead(lead.id, enrichmentData);
    } catch (e) {
      console.error(e);
      // fallback fallback inside Zustand
      await enrichLead(lead.id);
    } finally {
      setEnrichingMap(prev => ({ ...prev, [lead.id]: false }));
    }
  };

  // Get unique lists for filters
  const cities = Array.from(new Set(leads.map((l) => l.city))).filter(Boolean);
  const categories = Array.from(new Set(leads.map((l) => l.category))).filter(Boolean);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm);
    const matchesCity = cityFilter === "all" || l.city === cityFilter;
    const matchesCategory = categoryFilter === "all" || l.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;

    return matchesSearch && matchesCity && matchesCategory && matchesStatus;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Leads Main Panel */}
      <div className={`glass rounded-2xl p-6 border border-white/10 ${selectedLeadId ? "lg:col-span-2" : "lg:col-span-3"} space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Base de Leads Prospectados</h2>
            <p className="text-white/50 text-xs">Total de {leads.length} leads importados do Maps</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLoadLeadsFile}
              disabled={loadingInitial}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              {loadingInitial ? (
                <><Loader2 size={14} className="animate-spin text-indigo-400" /> Importando...</>
              ) : (
                <><FileUp size={14} /> Importar Leads (JSON → Supabase)</>
              )}
            </button>
          </div>
        </div>

        {/* Import Result Toast */}
        {importResult && (
          <div className={`px-4 py-2.5 rounded-xl text-xs font-medium border ${
            importResult.startsWith("✅")
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
          } flex items-center justify-between`}>
            <span>{importResult}</span>
            <button onClick={() => setImportResult(null)} className="text-white/40 hover:text-white ml-4">✕</button>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 text-white/40" size={14} />
            <input
              type="text"
              placeholder="Buscar por nome, empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="relative">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all appearance-none"
            >
              <option value="all" className="bg-[#12131a]">Todas as Cidades</option>
              {cities.map((city) => (
                <option key={city} value={city} className="bg-[#12131a]">{city}</option>
              ))}
            </select>
            <Filter className="absolute right-3.5 top-3.5 text-white/30 pointer-events-none" size={12} />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all appearance-none"
            >
              <option value="all" className="bg-[#12131a]">Todos os Segmentos</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#12131a]">{cat}</option>
              ))}
            </select>
            <Filter className="absolute right-3.5 top-3.5 text-white/30 pointer-events-none" size={12} />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all appearance-none"
            >
              <option value="all" className="bg-[#12131a]">Todos os Status</option>
              <option value="Novo Lead" className="bg-[#12131a]">Novo Lead</option>
              <option value="Abordado" className="bg-[#12131a]">Abordado</option>
              <option value="Respondeu" className="bg-[#12131a]">Respondeu</option>
              <option value="Qualificado" className="bg-[#12131a]">Qualificado</option>
              <option value="Proposta" className="bg-[#12131a]">Proposta</option>
              <option value="Fechado" className="bg-[#12131a]">Fechado</option>
              <option value="Perdido" className="bg-[#12131a]">Perdido</option>
            </select>
            <Filter className="absolute right-3.5 top-3.5 text-white/30 pointer-events-none" size={12} />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-white/5 text-white/50 border-b border-white/5 font-semibold">
                <th className="p-4">Empresa</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Cidade / UF</th>
                <th className="p-4">Status</th>
                <th className="p-4">Enriquecimento IA</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/30">Nenhum lead encontrado com os filtros atuais.</td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`hover:bg-white/5 transition-colors cursor-pointer ${selectedLeadId === lead.id ? "bg-white/5" : ""}`}
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <td className="p-4">
                      <div className="font-semibold text-white">{lead.company}</div>
                      <div className="text-white/40 text-[10px] mt-0.5">{lead.name} • {lead.category}</div>
                    </td>
                    <td className="p-4 font-mono text-white/80">{lead.phone}</td>
                    <td className="p-4 text-white/70">
                      {lead.city} {lead.state && `- ${lead.state}`}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        lead.status === "Novo Lead" ? "bg-white/5 text-white/75 border-white/10" :
                        lead.status === "Abordado" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                        lead.status === "Respondeu" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                        lead.status === "Qualificado" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        lead.status === "Fechado" ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/30" :
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {lead.enrichStatus === "success" ? (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Check size={14} /> Enriquecido
                        </span>
                      ) : lead.enrichStatus === "loading" ? (
                        <span className="flex items-center gap-1.5 text-cyan-400 animate-pulse">
                          <Loader2 size={12} className="animate-spin" /> Analisando...
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnrich(lead);
                          }}
                          className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500 hover:text-white border border-purple-500/20 text-purple-400 px-2.5 py-1 rounded-lg transition-all text-[10px] font-bold"
                        >
                          <Sparkles size={10} /> Enriquecer
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="p-1.5 border border-white/10 hover:border-white/20 text-white/50 hover:text-white rounded-lg transition-all"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Deletar lead?")) deleteLead(lead.id);
                          }}
                          className="p-1.5 border border-white/10 hover:border-rose-500/20 text-white/40 hover:text-rose-400 rounded-lg transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide / Drawer Detail View */}
      {selectedLeadId && selectedLead && (
        <div className="glass rounded-2xl p-6 border border-white/15 space-y-6 relative self-start">
          <button
            onClick={() => setSelectedLeadId(null)}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-xs font-mono font-bold"
          >
            FECHAR ×
          </button>

          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
              {selectedLead.category}
            </span>
            <h3 className="text-base font-bold text-white">{selectedLead.company}</h3>
            <p className="text-white/40 text-xs font-mono">{selectedLead.phone}</p>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50">Maturidade do Lead</span>
              <span className="text-white font-bold">{selectedLead.status}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50">Localidade</span>
              <span className="text-white/80">{selectedLead.city} / {selectedLead.state}</span>
            </div>
            {selectedLead.rating && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/50">Reputação Google Maps</span>
                <span className="text-amber-400 font-bold font-mono">★ {selectedLead.rating} ({selectedLead.numRatings} avaliações)</span>
              </div>
            )}
          </div>

          {/* AI Enrichment details */}
          <div className="border-t border-white/5 pt-4 space-y-4">
            <div className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">🔬 Enriquecimento Inteligente SDR</h4>
            </div>

            {selectedLead.enrichStatus === "idle" && (
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center space-y-3">
                <p className="text-[11px] text-white/50 leading-relaxed">
                  O Lead Analyzer Agent analisará a empresa, extrairá dores de mercado e proporá a melhor abordagem comercial automaticamente.
                </p>
                <button
                  onClick={() => handleEnrich(selectedLead)}
                  disabled={enrichingMap[selectedLead.id]}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {enrichingMap[selectedLead.id] ? (
                    <>
                      <Loader2 size={12} className="animate-spin text-white" /> Enriquecendo...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} /> Rodar Enriquecimento por IA
                    </>
                  )}
                </button>
              </div>
            )}

            {selectedLead.enrichStatus === "loading" && (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 text-white/50">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
                <span className="text-xs">O Agente de IA está navegando nas informações e montando o briefing...</span>
              </div>
            )}

            {selectedLead.enrichStatus === "success" && selectedLead.enrichment && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h5 className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Resumo da Empresa</h5>
                  <p className="text-xs text-white/85 leading-relaxed bg-white/5 border border-white/5 p-3 rounded-xl">
                    {selectedLead.enrichment.summary}
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-[10px] text-rose-400/80 font-bold uppercase tracking-wider">Dores Identificadas</h5>
                  <ul className="text-xs text-white/80 space-y-1.5 pl-4 list-disc leading-relaxed">
                    {selectedLead.enrichment.pains.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <h5 className="text-[10px] text-emerald-400/85 font-bold uppercase tracking-wider">Oportunidades de Vendas</h5>
                  <ul className="text-xs text-white/80 space-y-1.5 pl-4 list-disc leading-relaxed">
                    {selectedLead.enrichment.opportunities.map((o, idx) => (
                      <li key={idx}>{o}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h5 className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Serviços Recomendados</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLead.enrichment.recommendedServices.map((s, idx) => (
                      <span key={idx} className="bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes area */}
          <div className="border-t border-white/5 pt-4 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Anotações do Negócio</h4>
            <textarea
              value={selectedLead.notes || ""}
              onChange={(e) => updateLeadNotes(selectedLead.id, e.target.value)}
              placeholder="Digite observações sobre o atendimento ou follow-up..."
              className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
