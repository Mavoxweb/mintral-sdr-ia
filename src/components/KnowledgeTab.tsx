import React, { useState } from "react";
import { useStore, KnowledgeBase, KnowledgeFile } from "@/store/useStore";
import { Plus, FolderOpen, FileText, Trash2, Eye, ShieldCheck, Sparkles, Brain } from "lucide-react";

export default function KnowledgeTab() {
  const { knowledgeBases, addKnowledgeBase, addFileToKB, deleteKB } = useStore();
  
  const [showKBModal, setShowKBModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  
  const [kbName, setKbName] = useState("");
  const [kbDesc, setKbDesc] = useState("");

  const [selectedKBId, setSelectedKBId] = useState<string | null>(knowledgeBases[0]?.id || null);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");

  const selectedKB = knowledgeBases.find((kb) => kb.id === selectedKBId);

  const handleCreateKB = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbName) return;
    addKnowledgeBase(kbName, kbDesc);
    setKbName("");
    setKbDesc("");
    setShowKBModal(false);
  };

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !selectedKBId) return;

    const newFile: KnowledgeFile = {
      id: `f-${Date.now()}`,
      name: fileName.endsWith(".txt") ? fileName : `${fileName}.txt`,
      size: `${Math.round(fileContent.length / 1024 * 10) / 10 || 0.1} KB`,
      type: "txt",
      content: fileContent
    };

    addFileToKB(selectedKBId, newFile);
    setFileName("");
    setFileContent("");
    setShowFileModal(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {/* KB Folders Sidebar */}
      <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-sm font-bold text-white">Bases de Conhecimento</h3>
          <button
            onClick={() => setShowKBModal(true)}
            className="text-[10px] bg-indigo-650 hover:bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-bold transition-all border border-indigo-500/30"
          >
            + Criar Base
          </button>
        </div>

        <div className="space-y-2">
          {knowledgeBases.map((kb) => (
            <div
              key={kb.id}
              onClick={() => setSelectedKBId(kb.id)}
              className={`p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-all flex items-start justify-between ${
                selectedKBId === kb.id ? "bg-white/5 border-white/10" : ""
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FolderOpen size={14} className="text-indigo-400" /> {kb.name}
                </span>
                <p className="text-white/40 text-[10px] line-clamp-1">{kb.description}</p>
              </div>
              <span className="text-[10px] text-white/50 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/5 shrink-0">
                {kb.files.length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Files List and AI Training details */}
      <div className="md:col-span-2 glass rounded-2xl p-6 border border-white/10 space-y-6">
        {selectedKB ? (
          <>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{selectedKB.name}</h2>
                <p className="text-white/50 text-xs">{selectedKB.description}</p>
              </div>
              <button
                onClick={() => setShowFileModal(true)}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md"
              >
                <Plus size={14} /> Novo Arquivo
              </button>
            </div>

            {/* AI Training Summary */}
            <div className="bg-gradient-to-r from-purple-950/20 to-indigo-950/20 border border-purple-500/15 rounded-xl p-4 flex gap-3.5 items-start">
              <Brain className="text-purple-400 shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">O que a IA comercial aprende com esta base?</h4>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Ao gerar abordagens frias ou responder objeções nas conversas ativas de WhatsApp, a IA consome automaticamente os arquivos abaixo para extrair benefícios dos produtos, tabela de preços, cases de sucesso e tom de voz institucional.
                </p>
              </div>
            </div>

            {/* Files List Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Arquivos na Base</h4>
              {selectedKB.files.length === 0 ? (
                <div className="border border-dashed border-white/5 py-12 rounded-xl text-center text-white/30 text-xs">
                  Nenhum arquivo cadastrado nesta base. Clique em "Novo Arquivo" para adicionar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedKB.files.map((file) => (
                    <div
                      key={file.id}
                      className="bg-[#12131a] border border-white/5 p-4 rounded-xl flex flex-col justify-between space-y-3 relative hover:border-white/10 transition-all"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <FileText size={14} className="text-indigo-400" /> {file.name}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">Tamanho: {file.size}</span>
                      </div>
                      
                      {file.content && (
                        <div className="bg-black/30 p-2.5 rounded-lg text-[10px] text-white/60 line-clamp-3 font-mono border border-white/5">
                          {file.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-white/20 text-xs">Selecione uma base de conhecimento à esquerda.</div>
        )}
      </div>

      {/* Add KB Modal */}
      {showKBModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateKB} className="glass max-w-sm w-full rounded-2xl border border-white/15 p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-base font-bold text-white">Criar Base de Conhecimento</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Nome da Base</label>
                <input
                  type="text"
                  placeholder="Ex: Treinamento - Sites Corporativos"
                  value={kbName}
                  onChange={(e) => setKbName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Descrição</label>
                <textarea
                  placeholder="Explique o propósito deste conhecimento..."
                  value={kbDesc}
                  onChange={(e) => setKbDesc(e.target.value)}
                  className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowKBModal(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 py-2 rounded-xl text-xs text-white/70 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-xl text-xs text-white font-medium transition-all"
              >
                Salvar Base
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add File Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateFile} className="glass max-w-lg w-full rounded-2xl border border-white/15 p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-base font-bold text-white">Upload / Texto de Conhecimento</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Nome do Documento</label>
                <input
                  type="text"
                  placeholder="Ex: preços_planos_chatbot.txt"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Conteúdo Textual (IA lerá este conteúdo)</label>
                <textarea
                  placeholder="Insira os diferenciais, preços e informações que a IA usará..."
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-all resize-none font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFileModal(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 py-2 rounded-xl text-xs text-white/70 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-2 rounded-xl text-xs text-white font-medium transition-all"
              >
                Cadastrar Conteúdo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
