"use client";
import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { supabase } from "@/lib/supabase";
import {
  Send, Bot, ShieldAlert, MessageSquareCode, Phone,
  Loader2, RefreshCw, Wifi, WifiOff, ChevronDown
} from "lucide-react";

interface RawMessage {
  id: string;
  conversation_id: string;
  sender: "user" | "bot" | "agent";
  text: string;
  timestamp: string;
  status: string;
  created_at: string;
}

interface RawConversation {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  instance_id: string | null;
  takeover_mode: "bot" | "human";
  last_message_at: string;
  unread_count: number;
}

export default function ConversationsTab() {
  const { instances, toggleTakeover } = useStore();

  // ── Local State ──────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<RawConversation[]>([]);
  const [messages, setMessages] = useState<Record<string, RawMessage[]>>({});
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const connectedInstances = instances.filter((i) => i.status === "connected");

  // Auto-select first connected instance
  useEffect(() => {
    if (!selectedInstanceId && connectedInstances.length > 0) {
      setSelectedInstanceId(connectedInstances[0].id);
    }
  }, [connectedInstances, selectedInstanceId]);

  // ── Load conversations from Supabase ─────────────────────────────────────────
  const loadConversations = async () => {
    try {
      const { data: convs, error } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      setConversations((convs as RawConversation[]) || []);

      if (!activeConvId && convs && convs.length > 0) {
        setActiveConvId(convs[0].id);
        loadMessages(convs[0].id);
      }
    } catch (err) {
      console.error("[ConversationsTab] loadConversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (msgs) {
      setMessages((prev) => ({ ...prev, [convId]: msgs as RawMessage[] }));
      // Mark as read
      await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", convId);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    }
  };

  // ── Supabase Realtime Subscription ──────────────────────────────────────────
  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel("live-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as RawMessage;
          setMessages((prev) => ({
            ...prev,
            [newMsg.conversation_id]: [
              ...(prev[newMsg.conversation_id] || []),
              newMsg,
            ],
          }));
          // Update conversation last_message_at in local state
          setConversations((prev) =>
            prev.map((c) =>
              c.id === newMsg.conversation_id
                ? {
                    ...c,
                    last_message_at: newMsg.timestamp,
                    unread_count:
                      newMsg.conversation_id === activeConvId
                        ? 0
                        : c.unread_count + 1,
                  }
                : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        () => { loadConversations(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const updated = payload.new as RawConversation;
          setConversations((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          );
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Auto-load messages when switching conv ───────────────────────────────────
  useEffect(() => {
    if (activeConvId && !messages[activeConvId]) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages[activeConvId ?? ""]]);

  // ── Send Message ─────────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv || sending) return;
    setSending(true);

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConv.id,
          leadPhone: activeConv.lead_phone,
          instanceId: selectedInstanceId || null,
          text: inputText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Optimistic update (Realtime will also fire)
      setInputText("");
      // If takeover mode was bot, switch to human
      if (activeConv.takeover_mode === "bot") {
        await supabase
          .from("conversations")
          .update({ takeover_mode: "human" })
          .eq("id", activeConv.id);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id ? { ...c, takeover_mode: "human" } : c
          )
        );
      }
    } catch (err: any) {
      console.error("[ConversationsTab] send:", err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleTakeover = async (conv: RawConversation) => {
    const newMode = conv.takeover_mode === "bot" ? "human" : "bot";
    await supabase
      .from("conversations")
      .update({ takeover_mode: newMode })
      .eq("id", conv.id);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, takeover_mode: newMode } : c))
    );
    // Also sync store
    if (conv.lead_id) toggleTakeover(conv.lead_id);
  };

  const activeMessages = activeConvId ? (messages[activeConvId] || []) : [];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: realtime + instance selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border ${
            realtimeConnected
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-white/5 border-white/10 text-white/40"
          }`}>
            {realtimeConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {realtimeConnected ? "Realtime Ativo" : "Conectando Realtime..."}
          </div>
          <button
            onClick={() => loadConversations()}
            className="p-1.5 border border-white/10 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all"
            title="Atualizar conversas"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Instance selector for replies */}
        {connectedInstances.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/40 text-[11px]">Responder via:</span>
            <div className="relative">
              <select
                value={selectedInstanceId}
                onChange={(e) => setSelectedInstanceId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 transition-all appearance-none pr-7"
              >
                <option value="" className="bg-[#12131a]">Selecionar instância...</option>
                {connectedInstances.map((inst) => (
                  <option key={inst.id} value={inst.id} className="bg-[#12131a]">
                    📱 {inst.name} ({inst.phone || inst.id.slice(0, 8)})
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-white/30 pointer-events-none" />
            </div>
          </div>
        )}
        {connectedInstances.length === 0 && (
          <span className="text-[11px] text-amber-400 border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 rounded-xl">
            ⚠️ Nenhuma instância conectada. Conecte uma na aba WhatsApp.
          </span>
        )}
      </div>

      {/* Main chat grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[580px] items-stretch">
        {/* Sidebar */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col h-full bg-black/20">
          <div className="p-4 border-b border-white/10 shrink-0">
            <h3 className="text-sm font-bold text-white">Conversas WhatsApp</h3>
            <p className="text-white/40 text-[11px]">{conversations.length} conversa(s) ativa(s)</p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-white/30">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
                <span className="text-xs">Carregando conversas...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-xs space-y-2">
                <MessageSquareCode size={32} className="mx-auto text-white/10" />
                <p>Nenhuma conversa ainda.</p>
                <p className="text-[10px]">As mensagens recebidas via WhatsApp aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const convMsgs = messages[conv.id] || [];
                const lastMsg = convMsgs[convMsgs.length - 1];
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      if (!messages[conv.id]) loadMessages(conv.id);
                    }}
                    className={`p-3.5 hover:bg-white/5 cursor-pointer transition-colors space-y-1.5 relative ${
                      activeConvId === conv.id ? "bg-white/5 border-l-2 border-indigo-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white truncate max-w-[130px]">
                        {conv.lead_name || "Lead Desconhecido"}
                      </span>
                      <span className="text-[10px] text-white/30 font-mono">
                        {conv.last_message_at}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-white/50 truncate max-w-[150px]">
                        {lastMsg ? lastMsg.text : "Nenhuma mensagem"}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="bg-indigo-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-white/40 font-mono flex items-center gap-1">
                        <Phone size={9} /> {conv.lead_phone}
                      </span>
                      {conv.takeover_mode === "human" ? (
                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold px-1.5 py-0.5 rounded-full">
                          Humano
                        </span>
                      ) : (
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Bot size={8} /> Bot SDR
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="md:col-span-2 glass rounded-2xl border border-white/10 flex flex-col h-full overflow-hidden bg-black/10">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/5">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-white">
                    {activeConv.lead_name || "Lead"}
                  </h3>
                  <p className="text-white/40 text-[10px] font-mono flex items-center gap-1">
                    <Phone size={10} /> {activeConv.lead_phone}
                  </p>
                </div>

                {/* Takeover control */}
                {activeConv.takeover_mode === "human" ? (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                    <ShieldAlert size={13} className="text-rose-400" />
                    <span className="text-[11px] font-bold text-rose-400">OPERADOR HUMANO</span>
                    <button
                      onClick={() => handleToggleTakeover(activeConv)}
                      className="text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-semibold px-2 py-0.5 rounded-lg transition-colors ml-1"
                    >
                      Liberar Bot
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
                    <Bot size={13} className="text-indigo-400" />
                    <span className="text-[11px] font-bold text-indigo-400">IA SDR ATIVA</span>
                    <button
                      onClick={() => handleToggleTakeover(activeConv)}
                      className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-2 py-0.5 rounded-lg transition-colors ml-1"
                    >
                      Assumir
                    </button>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-black/20 flex flex-col">
                {activeMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-2">
                    <MessageSquareCode size={32} className="stroke-[1.5]" />
                    <p className="text-xs">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isUser = msg.sender === "user";
                    const isBot = msg.sender === "bot";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[75%] ${isUser ? "self-start mr-auto" : "self-end ml-auto"}`}
                      >
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isUser
                              ? "bg-white/5 border border-white/5 text-white/95 rounded-tl-none"
                              : isBot
                              ? "bg-indigo-600/90 text-white rounded-tr-none shadow-md shadow-indigo-650/10 border border-indigo-500/30"
                              : "bg-rose-600/90 text-white rounded-tr-none shadow-md border border-rose-500/30"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-white/30 font-mono px-1">
                          <span>
                            {msg.sender === "bot" ? "SDR IA" : msg.sender === "agent" ? "Você (Humano)" : "Lead"}
                          </span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-3 bg-white/5 border-t border-white/10 flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder={
                    !selectedInstanceId
                      ? "Selecione uma instância WhatsApp no topo para responder..."
                      : activeConv.takeover_mode === "human"
                      ? "Digite sua mensagem... (operador humano ativo)"
                      : "Digite para assumir o chat e responder via WhatsApp..."
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={!selectedInstanceId}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim() || !selectedInstanceId}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed p-2.5 rounded-xl text-white transition-all shadow-md shadow-indigo-600/10 shrink-0"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-white/20 space-y-3">
              <MessageSquareCode size={40} className="stroke-[1.5] text-white/10" />
              <p className="text-xs">Selecione uma conversa ao lado para ver o histórico.</p>
              <p className="text-[11px] text-white/30">
                Mensagens recebidas via WhatsApp aparecem aqui em tempo real via Supabase Realtime.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
