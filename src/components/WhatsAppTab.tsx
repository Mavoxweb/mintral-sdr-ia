"use client";
import React, { useState, useEffect, useRef } from "react";
import { useStore, WhatsAppInstance } from "@/store/useStore";
import {
  QrCode, Plus, Power, Sparkles, ShieldAlert, Send,
  RefreshCw, CheckCircle2, Loader2, X, MessageSquare, Phone
} from "lucide-react";

// ─── QR Code Modal ────────────────────────────────────────────────────────────
function QRModal({
  instance,
  onClose,
  onConnected,
}: {
  instance: WhatsAppInstance;
  onClose: () => void;
  onConnected: (id: string) => void;
}) {
  const [qrCode, setQrCode] = useState<string | null>(instance.qrCode || null);
  const [status, setStatus] = useState<string>("connecting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQR = async () => {
    try {
      const res = await fetch(`/api/instances/qrcode?id=${instance.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao buscar QR Code");

      setStatus(data.status);
      if (data.qrCode) setQrCode(data.qrCode);
      setError(null);

      if (data.status === "connected") {
        onConnected(instance.id);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQR();
    intervalRef.current = setInterval(fetchQR, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass max-w-sm w-full rounded-2xl border border-white/15 p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Conectar WhatsApp</h3>
            <p className="text-white/40 text-[11px] font-mono mt-0.5">{instance.name}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Status indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
          status === "connected"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : status === "connecting"
            ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
        }`}>
          {status === "connected" ? (
            <><CheckCircle2 size={14} /> Conectado com sucesso!</>
          ) : loading ? (
            <><Loader2 size={14} className="animate-spin" /> Carregando QR Code...</>
          ) : (
            <><RefreshCw size={14} className="animate-spin" /> Aguardando escaneamento...</>
          )}
        </div>

        {/* QR Code Display */}
        {status === "connected" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <CheckCircle2 size={56} className="text-emerald-400" />
            <p className="text-white font-semibold text-sm">WhatsApp Conectado!</p>
            <p className="text-white/50 text-xs text-center">A instância está pronta para enviar mensagens.</p>
          </div>
        ) : loading && !qrCode ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 size={40} className="text-indigo-400 animate-spin" />
            <p className="text-white/50 text-xs">Buscando QR Code da Evolution API...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-2">
            <p className="text-rose-400 text-xs font-bold">Erro ao buscar QR Code</p>
            <p className="text-rose-300/70 text-[11px] font-mono break-all">{error}</p>
            <button
              onClick={fetchQR}
              className="flex items-center gap-1.5 text-xs text-white bg-rose-600/60 hover:bg-rose-600 px-3 py-1.5 rounded-lg transition-all"
            >
              <RefreshCw size={12} /> Tentar novamente
            </button>
          </div>
        ) : qrCode ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-white p-3 rounded-xl shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                className="w-[200px] h-[200px] object-contain"
              />
            </div>
            <p className="text-white/40 text-[10px] text-center">
              Abra o WhatsApp → Menu → Aparelhos Conectados → Conectar Aparelho
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <QrCode size={40} className="text-white/20" />
            <p className="text-white/40 text-xs">QR Code não disponível ainda</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-white/10 hover:bg-white/5 py-2.5 rounded-xl text-xs text-white/70 hover:text-white transition-all"
          >
            {status === "connected" ? "Fechar" : "Cancelar"}
          </button>
          {status !== "connected" && (
            <button
              onClick={fetchQR}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/10 transition-all"
            >
              <RefreshCw size={12} /> Atualizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Test Send Modal ──────────────────────────────────────────────────────────
function TestSendModal({
  instance,
  onClose,
}: {
  instance: WhatsAppInstance;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/instances/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: instance.id,
          instanceName: instance.name,
          toPhone: phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no envio");
      setResult({ success: true, message: `✅ Mensagem enviada para ${data.phone}!` });
    } catch (e: any) {
      setResult({ success: false, message: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass max-w-sm w-full rounded-2xl border border-white/15 p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Testar Envio</h3>
            <p className="text-white/40 text-[11px] font-mono mt-0.5">{instance.name}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <p className="text-white/50 text-xs leading-relaxed">
          Envie uma mensagem de teste para validar a integração com a Evolution API. A instância deve estar conectada.
        </p>

        <form onSubmit={handleSend} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Phone size={11} /> Número de Destino
            </label>
            <input
              type="text"
              placeholder="Ex: 11999998888 ou 5511999998888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
              required
            />
            <span className="text-[10px] text-white/30">
              DDI opcional — números brasileiros são tratados automaticamente (ex: 11987654321)
            </span>
          </div>

          {/* Result feedback */}
          {result && (
            <div className={`px-3.5 py-3 rounded-xl text-xs font-medium border ${
              result.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-300"
            }`}>
              {result.message}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-white/10 hover:bg-white/5 py-2.5 rounded-xl text-xs text-white/70 hover:text-white transition-all"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed py-2.5 rounded-xl text-xs text-white font-semibold transition-all"
            >
              {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Enviar Teste</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WhatsAppTab() {
  const { instances, addInstance, updateInstanceStatus, deleteInstance } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLimit, setNewLimit] = useState(250);
  const [adding, setAdding] = useState(false);

  const [qrModalInstance, setQrModalInstance] = useState<WhatsAppInstance | null>(null);
  const [testModalInstance, setTestModalInstance] = useState<WhatsAppInstance | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    setAdding(true);
    await addInstance(newName, newPhone, newLimit);
    setNewName("");
    setNewPhone("");
    setNewLimit(250);
    setAdding(false);
    setShowAddModal(false);
  };

  const getStatusBadge = (status: WhatsAppInstance["status"]) => {
    switch (status) {
      case "connected":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Conectado
          </span>
        );
      case "connecting":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
            Autenticando...
          </span>
        );
      case "qrcode":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Aguardando QR
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Desconectado
          </span>
        );
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 70) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  };

  return (
    <div className="space-y-6">
      {/* Risk Alert */}
      <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4">
        <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={22} />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">Risco de Bloqueio & Entregabilidade</h3>
          <p className="text-white/55 text-xs leading-relaxed max-w-3xl">
            O principal gargalo do WhatsApp é o banimento de números. A Antigravity SDR AI inclui algoritmos de
            aquecimento (warmup), limites rígidos por dia/chip e delay randômico configurável (45s–180s).
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Módulo Multi WhatsApp</h2>
          <p className="text-white/50 text-xs">Conecte e monitore múltiplos chips via Evolution API</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-600/10"
        >
          <Plus size={15} /> Nova Instância
        </button>
      </div>

      {/* Instances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {instances.map((inst) => (
          <div
            key={inst.id}
            className="glass rounded-2xl p-5 border border-white/10 flex flex-col gap-4 hover:border-white/20 transition-all"
          >
            {/* Meta */}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white">{inst.name}</h3>
                <p className="text-white/40 text-[11px] font-mono">{inst.phone || "Sem número"}</p>
              </div>
              {getStatusBadge(inst.status)}
            </div>

            {/* Quality */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-white/40 text-[10px] uppercase font-bold tracking-wider">Score Qualidade</span>
                <p className="text-[11px] text-white/60">Baseado em rejeições do chip</p>
              </div>
              <span className={`px-2.5 py-1 text-xs font-mono font-bold border rounded-lg ${getQualityColor(inst.qualityScore)}`}>
                {inst.qualityScore}%
              </span>
            </div>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/50">Disparos hoje</span>
                <span className="text-white/80 font-mono font-bold">
                  {inst.sentToday} <span className="text-white/30 font-normal">/ {inst.dailyLimit}</span>
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${Math.min(100, (inst.sentToday / inst.dailyLimit) * 100)}%` }}
                />
              </div>
            </div>

            {/* Footer info */}
            <div className="flex justify-between items-center text-[10px] text-white/40 font-mono border-t border-white/5 pt-2">
              <span>Último: {inst.lastSent || "Nunca disparou"}</span>
              {inst.isWarmup && (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                  <Sparkles size={9} /> Warmup
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {/* QR / Connect row */}
              <div className="flex gap-2">
                {(inst.status === "disconnected" || inst.status === "qrcode") && (
                  <button
                    onClick={() => setQrModalInstance(inst)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600/80 hover:bg-amber-600 text-white py-2 rounded-xl text-xs font-medium transition-all"
                  >
                    <QrCode size={13} /> Ver QR Code
                  </button>
                )}

                {inst.status === "connected" && (
                  <button
                    onClick={() => updateInstanceStatus(inst.id, "disconnected")}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white py-2 rounded-xl text-xs font-medium transition-all"
                  >
                    <Power size={13} /> Desconectar
                  </button>
                )}

                {inst.status === "connecting" && (
                  <button disabled className="flex-1 flex items-center justify-center gap-1.5 border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 py-2 rounded-xl text-xs font-medium cursor-not-allowed opacity-70">
                    <Loader2 size={13} className="animate-spin" /> Conectando...
                  </button>
                )}
              </div>

              {/* Test Send + Delete row */}
              <div className="flex gap-2">
                <button
                  onClick={() => setTestModalInstance(inst)}
                  disabled={inst.status !== "connected"}
                  title={inst.status !== "connected" ? "Conecte a instância primeiro" : "Testar envio de mensagem"}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-300 hover:text-white py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MessageSquare size={13} /> Testar Envio
                </button>
                <button
                  onClick={() => { if (confirm(`Deletar a instância "${inst.name}"?`)) deleteInstance(inst.id); }}
                  className="px-3 border border-white/10 hover:border-rose-500/30 text-white/40 hover:text-rose-400 rounded-xl transition-all text-xs"
                  title="Deletar instância"
                >
                  Deletar
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {instances.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-16 space-y-3 glass rounded-2xl border border-white/10 border-dashed">
            <QrCode size={40} className="text-white/20" />
            <p className="text-white/50 text-sm font-semibold">Nenhuma instância configurada</p>
            <p className="text-white/30 text-xs">Clique em "Nova Instância" para conectar um número WhatsApp</p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrModalInstance && (
        <QRModal
          instance={qrModalInstance}
          onClose={() => setQrModalInstance(null)}
          onConnected={(id) => {
            updateInstanceStatus(id, "connected");
            setTimeout(() => setQrModalInstance(null), 1500);
          }}
        />
      )}

      {/* Test Send Modal */}
      {testModalInstance && (
        <TestSendModal
          instance={testModalInstance}
          onClose={() => setTestModalInstance(null)}
        />
      )}

      {/* Add Instance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="glass max-w-sm w-full rounded-2xl border border-white/15 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Nova Conexão WhatsApp</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Nome da Instância</label>
                <input
                  type="text"
                  placeholder="Ex: Comercial Principal"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Número de Telefone</label>
                <input
                  type="text"
                  placeholder="Ex: 11999998888"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  required
                />
                <span className="text-[10px] text-white/30">Apenas dígitos. O DDI 55 é adicionado automaticamente.</span>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-white/50 uppercase font-bold tracking-wider">Limite Diário de Envios</label>
                <input
                  type="number"
                  value={newLimit}
                  onChange={(e) => setNewLimit(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  min={1}
                  max={1000}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-white/10 hover:bg-white/5 py-2.5 rounded-xl text-xs text-white/70 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={adding}
                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 py-2.5 rounded-xl text-xs text-white font-semibold transition-all"
              >
                {adding ? <><Loader2 size={13} className="animate-spin" /> Criando...</> : <><Plus size={13} /> Salvar Instância</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
