import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useToast } from '@/hooks/use-toast';
import {
  Bell, BellRing, CheckCircle, DollarSign, ShoppingCart,
  Package, Settings, Mail, MessageCircle, BellOff, X,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NotifConfig {
  alerta_vencendo_hoje:  boolean;
  alerta_vencidas_dias:  boolean;
  vencidas_dias_limite:  number;
  alerta_saldo_negativo: boolean;
  alerta_meta_diaria:    boolean;
  meta_diaria_valor:     number;
  alerta_primeira_venda: boolean;
  alerta_estoque_minimo: boolean;
  estoque_minimo_qtd:    number;
}

const DEFAULT: NotifConfig = {
  alerta_vencendo_hoje:  true,
  alerta_vencidas_dias:  false,
  vencidas_dias_limite:  7,
  alerta_saldo_negativo: true,
  alerta_meta_diaria:    false,
  meta_diaria_valor:     1000,
  alerta_primeira_venda: true,
  alerta_estoque_minimo: true,
  estoque_minimo_qtd:    5,
};

const KEY_PREFIX = 'lafiore-notif-config-';

// ─── Mock history ─────────────────────────────────────────────────────────────

const MOCK_HISTORY = [
  { id: 1, data: '28/04 09:14', canal: 'Sistema', tipo: 'Estoque mínimo',       dest: 'Dashboard',         status: 'Enviado',  msg: 'Produto "Camiseta M" abaixo do mínimo' },
  { id: 2, data: '28/04 08:30', canal: 'E-mail',  tipo: 'Meta diária',          dest: 'loja@email.com',    status: 'Enviado',  msg: 'Meta diária de R$ 1.000 atingida!' },
  { id: 3, data: '27/04 18:05', canal: 'Sistema', tipo: 'Conta vencendo hoje',  dest: 'Dashboard',         status: 'Enviado',  msg: 'Conta "Fornecedor X" vence hoje' },
  { id: 4, data: '27/04 14:20', canal: 'WhatsApp',tipo: 'Venda realizada',      dest: '+55 11 99999-0000', status: 'Falhou',   msg: 'Nova venda: R$ 320,00' },
  { id: 5, data: '27/04 10:00', canal: 'Sistema', tipo: 'Saldo negativo',       dest: 'Dashboard',         status: 'Enviado',  msg: 'Fluxo de caixa negativo detectado' },
  { id: 6, data: '26/04 16:45', canal: 'E-mail',  tipo: 'Estoque zerado',       dest: 'loja@email.com',    status: 'Pendente', msg: 'Produto "Calça 38" sem estoque' },
];

// ─── Oasis Toggle ─────────────────────────────────────────────────────────────

function OasisToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 99,
        background: checked ? '#8E5FCF' : '#D1D5DB',
        cursor: 'pointer', transition: 'background 0.2s ease',
        position: 'relative', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s ease',
      }} />
    </div>
  );
}

// ─── Alerta Row ───────────────────────────────────────────────────────────────

function AlertRow({
  id, icon, iconBg, label, desc, checked, onCheckedChange, extra,
}: {
  id: string; icon: React.ReactNode; iconBg: string;
  label: string; desc?: string;
  checked: boolean; onCheckedChange: (v: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid rgba(142,95,207,0.06)',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <label htmlFor={id} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', cursor: 'pointer', display: 'block', fontFamily: 'Gilroy, sans-serif' }}>
              {label}
            </label>
            {desc && <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>{desc}</span>}
          </div>
        </div>
        <OasisToggle checked={checked} onChange={onCheckedChange} />
      </div>
      {extra}
    </>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ConfigNotificacoes() {
  const { empresaId } = useEmpresa();
  const { toast } = useToast();
  const storageKey = KEY_PREFIX + (empresaId ?? 'default');

  const [cfg, setCfg] = useState<NotifConfig>(() => {
    try {
      const s = localStorage.getItem(storageKey);
      return s ? { ...DEFAULT, ...JSON.parse(s) } : DEFAULT;
    } catch { return DEFAULT; }
  });

  useEffect(() => {
    try {
      const s = localStorage.getItem(storageKey);
      setCfg(s ? { ...DEFAULT, ...JSON.parse(s) } : DEFAULT);
    } catch { setCfg(DEFAULT); }
  }, [storageKey]);

  const set = <K extends keyof NotifConfig>(k: K, v: NotifConfig[K]) =>
    setCfg((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cfg));
      toast({ title: 'Preferências salvas', description: 'Configurações de notificação atualizadas.' });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  // ── UI-only states ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'alertas' | 'email' | 'whatsapp' | 'historico'>('alertas');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [emailAtivo, setEmailAtivo] = useState(false);
  const [emailProvider, setEmailProvider] = useState<'gmail' | 'outlook' | 'yahoo' | 'smtp'>('gmail');
  const [emailDestinatarios, setEmailDestinatarios] = useState<string[]>(['gestor@loja.com']);
  const [emailInput, setEmailInput] = useState('');
  const [whatsappAtivo, setWhatsappAtivo] = useState(false);
  const [whatsappMetodo, setWhatsappMetodo] = useState<'business' | 'zapi'>('zapi');
  const [whatsappDests, setWhatsappDests] = useState<string[]>([]);
  const [whatsappInput, setWhatsappInput] = useState('');
  const [histFiltro, setHistFiltro] = useState<'todos' | 'email' | 'whatsapp' | 'sistema'>('todos');

  const ativosCount = Object.values(cfg).filter(v => v === true).length;

  // ── Estilos base ───────────────────────────────────────────────────────────

  const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(142,95,207,0.12)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  };

  const inputStyle: React.CSSProperties = {
    padding: '7px 12px', fontSize: 13,
    border: '1px solid rgba(142,95,207,0.2)',
    borderRadius: 10, background: 'rgba(255,255,255,0.8)',
    outline: 'none', fontFamily: 'Gilroy, sans-serif',
    color: '#1F2937', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: 4, display: 'block', fontFamily: 'Gilroy, sans-serif',
  };

  const sectionTitle = (icon: React.ReactNode, text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      {icon}
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Gilroy, sans-serif' }}>
        {text}
      </span>
    </div>
  );

  const tabs = [
    { id: 'alertas',    label: '🔔 Alertas do Sistema' },
    { id: 'email',      label: '📧 E-mail' },
    { id: 'whatsapp',   label: '📱 WhatsApp' },
    { id: 'historico',  label: '🕐 Histórico' },
  ] as const;

  const kpiCards = [
    {
      label: 'Notificações Ativas',
      value: ativosCount,
      sub: 'alertas configurados',
      icon: <Bell style={{ width: 18, height: 18, color: '#8E5FCF' }} />,
      iconBg: 'rgba(142,95,207,0.12)',
      borderColor: '#8E5FCF',
      valueColor: '#8E5FCF',
    },
    {
      label: 'Não Lidas',
      value: 3,
      sub: 'aguardando visualização',
      icon: <BellRing style={{ width: 18, height: 18, color: '#F59E0B' }} />,
      iconBg: 'rgba(245,158,11,0.12)',
      borderColor: '#F59E0B',
      valueColor: '#F59E0B',
    },
    {
      label: 'Enviadas hoje',
      value: 12,
      sub: 'notificações enviadas',
      icon: <CheckCircle style={{ width: 18, height: 18, color: '#10B981' }} />,
      iconBg: 'rgba(16,185,129,0.12)',
      borderColor: '#10B981',
      valueColor: '#10B981',
    },
  ];

  const filteredHistory = MOCK_HISTORY.filter(h => {
    if (histFiltro === 'todos') return true;
    if (histFiltro === 'email') return h.canal === 'E-mail';
    if (histFiltro === 'whatsapp') return h.canal === 'WhatsApp';
    return h.canal === 'Sistema';
  });

  const statusStyle = (s: string): React.CSSProperties => {
    if (s === 'Enviado')  return { background: 'rgba(16,185,129,0.1)', color: '#10B981' };
    if (s === 'Falhou')   return { background: 'rgba(239,68,68,0.1)', color: '#EF4444' };
    return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B' };
  };

  const canalStyle = (c: string): React.CSSProperties => {
    if (c === 'E-mail')   return { background: 'rgba(59,130,246,0.1)', color: '#3B82F6' };
    if (c === 'WhatsApp') return { background: 'rgba(16,185,129,0.1)', color: '#10B981' };
    return { background: 'rgba(142,95,207,0.1)', color: '#8E5FCF' };
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: '#8E5FCF', opacity: 0.06, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -150, right: -150, width: 400, height: 400, borderRadius: '50%', background: '#FAF66B', opacity: 0.04, filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: '0 0 6px' }}>
              Oasis › Configurações › Notificações
            </p>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Gilroy, sans-serif', margin: 0, background: 'linear-gradient(135deg, #47118F, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Notificações
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gilroy, sans-serif', margin: '6px 0 0' }}>
              Configure alertas e notificações do sistema
            </p>
          </div>
          <button onClick={handleSave} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #47118F, #8E5FCF)', color: '#fff', cursor: 'pointer', fontFamily: 'Gilroy, sans-serif' }}>
            Salvar Configurações
          </button>
        </motion.div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {kpiCards.map((card, i) => (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}
              onMouseEnter={() => setHoveredCard(i)} onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(142,95,207,0.12)', borderRadius: 20, padding: 24,
                borderTop: `4px solid ${card.borderColor}`,
                transform: hoveredCard === i ? 'translateY(-4px)' : 'translateY(0)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'default',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: card.valueColor, fontFamily: 'Gilroy, sans-serif', lineHeight: 1 }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 6, fontFamily: 'Gilroy, sans-serif' }}>
                {card.sub}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1F2937', marginTop: 2, fontFamily: 'Gilroy, sans-serif' }}>
                {card.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', gap: 4, padding: 6,
            background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(142,95,207,0.12)', borderRadius: 16,
          }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontFamily: 'Gilroy, sans-serif', fontSize: 13, fontWeight: 600,
                  background: activeTab === tab.id ? 'linear-gradient(135deg, #8E5FCF, #47118F)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#6B7280',
                  boxShadow: activeTab === tab.id ? '0 4px 15px rgba(142,95,207,0.4)' : 'none',
                  transform: activeTab === tab.id ? 'translateY(-1px)' : 'none',
                  transition: 'all 0.25s ease',
                  whiteSpace: 'nowrap',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab: Alertas ──────────────────────────────────────────────────── */}
        {activeTab === 'alertas' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

            {/* Financeiro */}
            <div style={glassCard}>
              {sectionTitle(<DollarSign style={{ width: 14, height: 14, color: '#8E5FCF' }} />, 'Financeiro')}

              <AlertRow
                id="vencendo_hoje" label="Contas vencendo hoje"
                desc="Notifica quando há contas a pagar com vencimento no dia"
                icon={<Bell style={{ width: 16, height: 16, color: '#EF4444' }} />}
                iconBg="rgba(239,68,68,0.1)"
                checked={cfg.alerta_vencendo_hoje} onCheckedChange={(v) => set('alerta_vencendo_hoje', v)}
              />

              <AlertRow
                id="vencidas_dias" label="Contas vencidas"
                desc="Alertar quando há contas vencidas há mais de X dias"
                icon={<Bell style={{ width: 16, height: 16, color: '#F59E0B' }} />}
                iconBg="rgba(245,158,11,0.1)"
                checked={cfg.alerta_vencidas_dias} onCheckedChange={(v) => set('alerta_vencidas_dias', v)}
                extra={cfg.alerta_vencidas_dias && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 10px 48px', borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
                    <span style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Gilroy, sans-serif', whiteSpace: 'nowrap' }}>Alertar após</span>
                    <input type="number" min={1} max={30}
                      value={cfg.vencidas_dias_limite}
                      onChange={(e) => set('vencidas_dias_limite', Math.max(1, Math.min(30, Number(e.target.value))))}
                      style={{ ...inputStyle, width: 72, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Gilroy, sans-serif' }}>dias em atraso</span>
                  </div>
                )}
              />

              <AlertRow
                id="saldo_negativo" label="Saldo negativo detectado"
                desc="Alerta quando o saldo do fluxo de caixa fica negativo"
                icon={<DollarSign style={{ width: 16, height: 16, color: '#8E5FCF' }} />}
                iconBg="rgba(142,95,207,0.1)"
                checked={cfg.alerta_saldo_negativo} onCheckedChange={(v) => set('alerta_saldo_negativo', v)}
              />
            </div>

            {/* Vendas */}
            <div style={glassCard}>
              {sectionTitle(<ShoppingCart style={{ width: 14, height: 14, color: '#8E5FCF' }} />, 'Vendas')}

              <AlertRow
                id="meta_diaria" label="Meta diária de vendas atingida"
                desc="Notifica quando o total de vendas do dia atinge a meta"
                icon={<CheckCircle style={{ width: 16, height: 16, color: '#10B981' }} />}
                iconBg="rgba(16,185,129,0.1)"
                checked={cfg.alerta_meta_diaria} onCheckedChange={(v) => set('alerta_meta_diaria', v)}
                extra={cfg.alerta_meta_diaria && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 10px 48px', borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
                    <span style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Gilroy, sans-serif', whiteSpace: 'nowrap' }}>Meta diária</span>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>R$</span>
                      <input type="text" inputMode="numeric"
                        value={cfg.meta_diaria_valor ? cfg.meta_diaria_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const num = parseInt(digits || '0', 10) / 100;
                          set('meta_diaria_valor', num);
                        }}
                        style={{ ...inputStyle, width: 120, paddingLeft: 32 }}
                      />
                    </div>
                  </div>
                )}
              />

              <AlertRow
                id="primeira_venda" label="Primeira venda do dia"
                desc="Exibe destaque no dashboard ao registrar a primeira venda"
                icon={<ShoppingCart style={{ width: 16, height: 16, color: '#3B82F6' }} />}
                iconBg="rgba(59,130,246,0.1)"
                checked={cfg.alerta_primeira_venda} onCheckedChange={(v) => set('alerta_primeira_venda', v)}
              />
            </div>

            {/* Estoque */}
            <div style={glassCard}>
              {sectionTitle(<Package style={{ width: 14, height: 14, color: '#8E5FCF' }} />, 'Estoque')}

              <AlertRow
                id="estoque_minimo" label="Produto com estoque abaixo do mínimo"
                desc="Notifica quando o estoque cai abaixo do limite definido"
                icon={<Package style={{ width: 16, height: 16, color: '#F59E0B' }} />}
                iconBg="rgba(245,158,11,0.1)"
                checked={cfg.alerta_estoque_minimo} onCheckedChange={(v) => set('alerta_estoque_minimo', v)}
                extra={cfg.alerta_estoque_minimo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 10px 48px' }}>
                    <span style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Gilroy, sans-serif', whiteSpace: 'nowrap' }}>Alertar abaixo de</span>
                    <input type="number" min={1} max={99}
                      value={cfg.estoque_minimo_qtd}
                      onChange={(e) => set('estoque_minimo_qtd', Math.max(1, Math.min(99, Number(e.target.value))))}
                      style={{ ...inputStyle, width: 72, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 13, color: '#6B7280', fontFamily: 'Gilroy, sans-serif' }}>unidades</span>
                  </div>
                )}
              />
            </div>

            {/* Sistema */}
            <div style={glassCard}>
              {sectionTitle(<Settings style={{ width: 14, height: 14, color: '#8E5FCF' }} />, 'Sistema')}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings style={{ width: 16, height: 16, color: '#EF4444' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', display: 'block', fontFamily: 'Gilroy, sans-serif' }}>Erro de emissão de NF</span>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>Notificar falhas na emissão de notas fiscais</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', background: 'rgba(156,163,175,0.15)', padding: '3px 10px', borderRadius: 99, fontFamily: 'Gilroy, sans-serif' }}>
                  Sempre ativo
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab: E-mail ───────────────────────────────────────────────────── */}
        {activeTab === 'email' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={glassCard}>
              {sectionTitle(<Mail style={{ width: 14, height: 14, color: '#8E5FCF' }} />, 'Configurações de E-mail')}

              {/* Toggle principal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginBottom: 20, borderBottom: '2px solid rgba(142,95,207,0.08)' }}>
                <div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', display: 'block' }}>Ativar notificações por e-mail</span>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>Receba alertas diretamente no seu e-mail</span>
                </div>
                <OasisToggle checked={emailAtivo} onChange={setEmailAtivo} />
              </div>

              <div style={{ opacity: emailAtivo ? 1 : 0.4, pointerEvents: emailAtivo ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                {/* Provedor */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Provedor</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['gmail', 'outlook', 'yahoo', 'smtp'] as const).map(p => (
                      <button key={p} onClick={() => setEmailProvider(p)}
                        style={{
                          padding: '7px 16px', borderRadius: 10, border: emailProvider === p ? 'none' : '1px solid rgba(142,95,207,0.2)',
                          background: emailProvider === p ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'rgba(255,255,255,0.8)',
                          color: emailProvider === p ? '#fff' : '#6B7280',
                          cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif', transition: 'all 0.2s',
                        }}>
                        {p === 'smtp' ? 'SMTP personalizado' : p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {emailProvider !== 'smtp' ? (
                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>E-mail da conta</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input placeholder="seu@email.com" style={{ ...inputStyle, flex: 1 }} />
                      <button style={{ padding: '7px 16px', borderRadius: 10, border: '1px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', color: '#8E5FCF', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif', whiteSpace: 'nowrap' }}>
                        Conectar via OAuth
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {[['Servidor SMTP', 'smtp.exemplo.com'], ['Porta', '587'], ['Usuário', 'usuario@email.com'], ['Senha', '••••••••']].map(([lbl, ph]) => (
                      <div key={lbl}>
                        <label style={labelStyle}>{lbl}</label>
                        <input placeholder={ph} type={lbl === 'Senha' ? 'password' : 'text'} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Destinatários */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>E-mails destinatários</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.8)', minHeight: 42 }}>
                    {emailDestinatarios.map(e => (
                      <span key={e} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(142,95,207,0.1)', color: '#8E5FCF', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                        {e}
                        <X style={{ width: 10, height: 10, cursor: 'pointer' }} onClick={() => setEmailDestinatarios(prev => prev.filter(x => x !== e))} />
                      </span>
                    ))}
                    <input
                      value={emailInput} onChange={e => setEmailInput(e.target.value)}
                      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && emailInput.trim()) { setEmailDestinatarios(prev => [...prev, emailInput.trim()]); setEmailInput(''); e.preventDefault(); }}}
                      placeholder="Adicionar e-mail..." style={{ border: 'none', outline: 'none', fontSize: 12, fontFamily: 'Gilroy, sans-serif', color: '#1F2937', background: 'transparent', minWidth: 140 }}
                    />
                  </div>
                </div>

                {/* Botão teste */}
                <button style={{ padding: '9px 20px', borderRadius: 12, border: '1px solid rgba(142,95,207,0.3)', background: 'rgba(255,255,255,0.7)', color: '#8E5FCF', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                  Enviar e-mail de teste
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab: WhatsApp ─────────────────────────────────────────────────── */}
        {activeTab === 'whatsapp' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={glassCard}>
              {sectionTitle(<MessageCircle style={{ width: 14, height: 14, color: '#10B981' }} />, 'Configurações de WhatsApp')}

              {/* Toggle principal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginBottom: 20, borderBottom: '2px solid rgba(142,95,207,0.08)' }}>
                <div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', display: 'block' }}>Ativar notificações por WhatsApp</span>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif' }}>Receba alertas via WhatsApp</span>
                </div>
                <OasisToggle checked={whatsappAtivo} onChange={setWhatsappAtivo} />
              </div>

              <div style={{ opacity: whatsappAtivo ? 1 : 0.4, pointerEvents: whatsappAtivo ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                {/* Método */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {([
                    { id: 'business', title: 'WhatsApp Business API', desc: 'Para empresas com API oficial', badge: 'Recomendado', badgeColor: '#10B981' },
                    { id: 'zapi',     title: 'Z-API / Evolution API',  desc: 'Integração via API terceiros',  badge: null, badgeColor: '' },
                  ] as const).map(opt => (
                    <button key={opt.id} onClick={() => setWhatsappMetodo(opt.id)}
                      style={{
                        textAlign: 'left', padding: 16, borderRadius: 14, cursor: 'pointer',
                        border: whatsappMetodo === opt.id ? '2px solid #8E5FCF' : '1px solid rgba(142,95,207,0.15)',
                        background: whatsappMetodo === opt.id ? 'rgba(142,95,207,0.06)' : 'rgba(255,255,255,0.8)',
                        transition: 'all 0.2s', fontFamily: 'Gilroy, sans-serif',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <MessageCircle style={{ width: 18, height: 18, color: whatsappMetodo === opt.id ? '#8E5FCF' : '#10B981' }} />
                        {opt.badge && <span style={{ fontSize: 10, fontWeight: 700, color: opt.badgeColor, background: `rgba(16,185,129,0.1)`, padding: '2px 8px', borderRadius: 99 }}>{opt.badge}</span>}
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: whatsappMetodo === opt.id ? '#8E5FCF' : '#1F2937', marginBottom: 2 }}>{opt.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Campos de conexão */}
                {whatsappMetodo === 'business' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {['Token de acesso', 'Phone Number ID', 'WhatsApp Business Account ID'].map(f => (
                      <div key={f}>
                        <label style={labelStyle}>{f}</label>
                        <input placeholder={f} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {['URL da instância', 'Token'].map(f => (
                      <div key={f}>
                        <label style={labelStyle}>{f}</label>
                        <input placeholder={f} style={{ ...inputStyle, width: '100%' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Destinatários */}
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Números destinatários</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid rgba(142,95,207,0.2)', borderRadius: 10, background: 'rgba(255,255,255,0.8)', minHeight: 42 }}>
                    {whatsappDests.map(n => (
                      <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif' }}>
                        {n}
                        <X style={{ width: 10, height: 10, cursor: 'pointer' }} onClick={() => setWhatsappDests(prev => prev.filter(x => x !== n))} />
                      </span>
                    ))}
                    <input
                      value={whatsappInput} onChange={e => setWhatsappInput(e.target.value)}
                      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ',') && whatsappInput.trim()) { setWhatsappDests(prev => [...prev, whatsappInput.trim()]); setWhatsappInput(''); e.preventDefault(); }}}
                      placeholder="+55 (11) 99999-0000" style={{ border: 'none', outline: 'none', fontSize: 12, fontFamily: 'Gilroy, sans-serif', color: '#1F2937', background: 'transparent', minWidth: 160 }}
                    />
                  </div>
                </div>

                {/* Botão teste */}
                <button style={{ padding: '9px 20px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10B981', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Gilroy, sans-serif', transition: 'all 0.2s' }}>
                  Enviar mensagem de teste
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab: Histórico ────────────────────────────────────────────────── */}
        {activeTab === 'historico' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

            {/* Filtros */}
            <div style={{ ...glassCard, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              {(['todos', 'email', 'whatsapp', 'sistema'] as const).map(f => (
                <button key={f} onClick={() => setHistFiltro(f)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: histFiltro === f ? 'none' : '1px solid rgba(142,95,207,0.2)',
                    background: histFiltro === f ? 'linear-gradient(135deg, #47118F, #8E5FCF)' : 'transparent',
                    color: histFiltro === f ? '#fff' : '#6B7280',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Gilroy, sans-serif', transition: 'all 0.2s',
                  }}>
                  {f === 'todos' ? 'Todos' : f === 'email' ? 'E-mail' : f === 'whatsapp' ? 'WhatsApp' : 'Sistema'}
                </button>
              ))}
            </div>

            {/* Tabela */}
            <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(142,95,207,0.12)', borderRadius: 20, overflow: 'hidden' }}>
              {/* Cabeçalho */}
              <div style={{ display: 'grid', gridTemplateColumns: '110px 100px 150px 1fr 90px', gap: 0, padding: '12px 20px', background: 'rgba(142,95,207,0.06)', borderBottom: '1px solid rgba(142,95,207,0.1)' }}>
                {['Data/Hora', 'Canal', 'Tipo', 'Mensagem', 'Status'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Gilroy, sans-serif' }}>{h}</span>
                ))}
              </div>

              {filteredHistory.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, rgba(142,95,207,0.15), rgba(71,17,143,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <BellOff style={{ width: 32, height: 32, color: '#8E5FCF' }} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', fontFamily: 'Gilroy, sans-serif', margin: '0 0 6px' }}>Nenhuma notificação enviada</p>
                  <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', margin: 0 }}>Configure os alertas para começar a receber notificações</p>
                </div>
              ) : filteredHistory.map((row, i) => (
                <motion.div key={row.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.04 }}
                  style={{ display: 'grid', gridTemplateColumns: '110px 100px 150px 1fr 90px', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(142,95,207,0.06)', alignItems: 'center', cursor: 'default', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(142,95,207,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gilroy, sans-serif' }}>{row.data}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content', fontFamily: 'Gilroy, sans-serif', ...canalStyle(row.canal) }}>
                    {row.canal === 'E-mail' ? <Mail style={{ width: 10, height: 10 }} /> : row.canal === 'WhatsApp' ? <MessageCircle style={{ width: 10, height: 10 }} /> : <Bell style={{ width: 10, height: 10 }} />}
                    {row.canal}
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', fontFamily: 'Gilroy, sans-serif' }}>{row.tipo}</span>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'Gilroy, sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: 12 }}>
                    {row.msg.length > 40 ? row.msg.slice(0, 40) + '…' : row.msg}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, display: 'inline-block', fontFamily: 'Gilroy, sans-serif', ...statusStyle(row.status) }}>
                    {row.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
