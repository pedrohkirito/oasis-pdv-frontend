import React, { useState } from 'react';
import {
  Printer, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  RefreshCw, ChevronDown, ChevronUp, Zap, Settings,
} from 'lucide-react';
import { useImpressora } from '@/hooks/useImpressora';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Estilos Oasis reutilizáveis ─────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: '20px',
  padding: '28px',
  boxShadow: '0 8px 32px rgba(142,95,207,0.08), 0 1px 0 rgba(255,255,255,0.8) inset',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #8E5FCF, #B987FF)',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  padding: '10px 20px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'opacity 0.15s',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: 'rgba(142,95,207,0.08)',
  color: '#8E5FCF',
  border: '1px solid rgba(142,95,207,0.2)',
  borderRadius: '12px',
  padding: '10px 20px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'background 0.15s',
};

// ─── Badge de status ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map = {
    conectado:    { color: '#16A34A', bg: 'rgba(22,163,74,0.1)',   label: 'Conectado',    icon: <CheckCircle2 size={13} /> },
    conectando:   { color: '#D97706', bg: 'rgba(217,119,6,0.1)',   label: 'Conectando…',  icon: <RefreshCw size={13} className="animate-spin" /> },
    erro:         { color: '#DC2626', bg: 'rgba(220,38,38,0.1)',   label: 'Erro',         icon: <AlertTriangle size={13} /> },
    desconectado: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: 'Desconectado', icon: <WifiOff size={13} /> },
  };
  const s = map[status as keyof typeof map] ?? map.desconectado;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: s.bg, color: s.color,
      padding: '4px 10px', borderRadius: '20px',
      fontWeight: 600, fontSize: '0.75rem',
    }}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfigImpressora() {
  const { toast } = useToast();
  const {
    status, impressoras, impressoraAtiva, erro, qzDisponivel, config,
    conectar, desconectar, selecionarImpressora, testarImpressora, setConfig,
  } = useImpressora();

  const [compatibilidadeAberta, setCompatibilidadeAberta] = useState(false);
  const [loadingConectar, setLoadingConectar]             = useState(false);
  const [loadingTeste, setLoadingTeste]                   = useState(false);

  const handleConectar = async () => {
    setLoadingConectar(true);
    const ok = await conectar();
    setLoadingConectar(false);
    if (ok) {
      toast({ title: 'QZ Tray conectado!', description: `${impressoras.length} impressora(s) encontrada(s).` });
    } else {
      toast({ title: 'Falha na conexão', description: erro ?? 'Verifique se o QZ Tray está instalado e em execução.', variant: 'destructive' });
    }
  };

  const handleDesconectar = async () => {
    await desconectar();
    toast({ title: 'Desconectado', description: 'QZ Tray desconectado.' });
  };

  const handleTestar = async () => {
    if (!impressoraAtiva) {
      toast({ title: 'Selecione uma impressora', description: 'Escolha uma impressora antes de testar.', variant: 'destructive' });
      return;
    }
    setLoadingTeste(true);
    try {
      await testarImpressora();
      toast({ title: 'Teste enviado!', description: 'Verifique se o cupom de teste foi impresso.' });
    } catch (e: any) {
      toast({ title: 'Erro no teste', description: e?.message ?? 'Não foi possível imprimir.', variant: 'destructive' });
    } finally {
      setLoadingTeste(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)', position: 'relative' }}>
      {/* Orbs decorativos */}
      <div style={{ position: 'fixed', top: '-10%', right: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(142,95,207,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(185,135,255,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '32px' }} className="space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #8E5FCF, #B987FF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Printer size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #5B2D9E, #8E5FCF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                Impressora Térmica
              </h1>
              <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0 }}>
                Configure a integração com QZ Tray para impressão automática de cupons e DANFE NFC-e
              </p>
            </div>
          </div>
        </div>

        {/* ── Alerta QZ Tray ────────────────────────────────────────────────── */}
        {!qzDisponivel && (
          <div style={{ ...cardStyle, borderLeft: '4px solid #D97706', background: 'rgba(255,251,235,0.8)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: 700, color: '#92400E', margin: '0 0 4px' }}>QZ Tray não detectado</p>
                <p style={{ color: '#78350F', fontSize: '0.875rem', margin: '0 0 8px' }}>
                  O QZ Tray é necessário para comunicação com impressoras térmicas. Instale-o gratuitamente em{' '}
                  <strong>qz.io</strong> e mantenha-o em execução antes de conectar.
                </p>
                <p style={{ color: '#92400E', fontSize: '0.8rem', margin: 0 }}>
                  Após instalar, recarregue esta página.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Conexão ───────────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wifi size={18} color="#8E5FCF" />
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1F2937' }}>Conexão QZ Tray</span>
            </div>
            <StatusBadge status={status} />
          </div>

          {erro && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: '#B91C1C', fontSize: '0.85rem' }}>
              {erro}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {status !== 'conectado' ? (
              <button
                style={{ ...btnPrimaryStyle, opacity: loadingConectar ? 0.7 : 1 }}
                onClick={handleConectar}
                disabled={loadingConectar || !qzDisponivel}
              >
                {loadingConectar
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <Wifi size={15} />
                }
                {loadingConectar ? 'Conectando…' : 'Conectar ao QZ Tray'}
              </button>
            ) : (
              <button style={btnSecondaryStyle} onClick={handleDesconectar}>
                <WifiOff size={15} />
                Desconectar
              </button>
            )}
          </div>
        </div>

        {/* ── Seleção de impressora ─────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Printer size={18} color="#8E5FCF" />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1F2937' }}>Impressora e Papel</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <Label style={{ fontWeight: 600, color: '#374151', marginBottom: '8px', display: 'block' }}>
                Impressora
              </Label>
              <Select
                value={impressoraAtiva}
                onValueChange={selecionarImpressora}
                disabled={status !== 'conectado' || impressoras.length === 0}
              >
                <SelectTrigger style={{ borderRadius: '10px' }}>
                  <SelectValue placeholder={status === 'conectado' ? 'Selecione uma impressora' : 'Conecte ao QZ Tray primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  {impressoras.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label style={{ fontWeight: 600, color: '#374151', marginBottom: '8px', display: 'block' }}>
                Largura do papel
              </Label>
              <Select
                value={String(config.larguraPapel)}
                onValueChange={v => setConfig({ larguraPapel: Number(v) as 80 | 58 })}
              >
                <SelectTrigger style={{ borderRadius: '10px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">80mm (padrão)</SelectItem>
                  <SelectItem value="58">58mm (compact)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            style={{ ...btnSecondaryStyle, opacity: loadingTeste ? 0.7 : 1 }}
            onClick={handleTestar}
            disabled={loadingTeste || status !== 'conectado' || !impressoraAtiva}
          >
            {loadingTeste
              ? <RefreshCw size={15} className="animate-spin" />
              : <Zap size={15} />
            }
            {loadingTeste ? 'Imprimindo…' : 'Imprimir Teste'}
          </button>
        </div>

        {/* ── Automação ─────────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Settings size={18} color="#8E5FCF" />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1F2937' }}>Impressão Automática</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(142,95,207,0.04)', borderRadius: '12px' }}>
              <div>
                <p style={{ fontWeight: 600, color: '#1F2937', margin: '0 0 2px' }}>Imprimir após finalizar venda</p>
                <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: 0 }}>Cupom simples sem NFC-e</p>
              </div>
              <Switch
                checked={config.imprimirAposVenda}
                onCheckedChange={v => setConfig({ imprimirAposVenda: v })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(142,95,207,0.04)', borderRadius: '12px' }}>
              <div>
                <p style={{ fontWeight: 600, color: '#1F2937', margin: '0 0 2px' }}>Imprimir DANFE após emitir NFC-e</p>
                <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: 0 }}>Inclui QR Code e chave de acesso</p>
              </div>
              <Switch
                checked={config.imprimirAposNFCe}
                onCheckedChange={v => setConfig({ imprimirAposNFCe: v })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(142,95,207,0.04)', borderRadius: '12px' }}>
              <div>
                <p style={{ fontWeight: 600, color: '#1F2937', margin: '0 0 2px' }}>Abrir gaveta ao finalizar venda</p>
                <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: 0 }}>Envia pulso para gaveta de dinheiro</p>
              </div>
              <Switch
                checked={config.abrirGavetaAposVenda}
                onCheckedChange={v => setConfig({ abrirGavetaAposVenda: v })}
              />
            </div>
          </div>
        </div>

        {/* ── Compatibilidade ───────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <button
            onClick={() => setCompatibilidadeAberta(!compatibilidadeAberta)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1F2937' }}>Modelos compatíveis</span>
            {compatibilidadeAberta ? <ChevronUp size={18} color="#8E5FCF" /> : <ChevronDown size={18} color="#8E5FCF" />}
          </button>

          {compatibilidadeAberta && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {[
                  { marca: 'Elgin', modelos: 'i8, i9, i7' },
                  { marca: 'Epson', modelos: 'TM-T20, TM-T88' },
                  { marca: 'Bematech', modelos: 'MP-4200, MP-2800' },
                  { marca: 'Daruma', modelos: 'DR-800, DR-700' },
                  { marca: 'Diebold', modelos: 'IM453' },
                  { marca: 'Gertec', modelos: 'GI310' },
                ].map(({ marca, modelos }) => (
                  <div key={marca} style={{ padding: '10px 14px', background: 'rgba(142,95,207,0.05)', borderRadius: '10px', border: '1px solid rgba(142,95,207,0.1)' }}>
                    <p style={{ fontWeight: 700, color: '#5B2D9E', margin: '0 0 2px', fontSize: '0.875rem' }}>{marca}</p>
                    <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: 0 }}>{modelos}</p>
                  </div>
                ))}
              </div>
              <p style={{ color: '#9CA3AF', fontSize: '0.8rem', marginTop: '12px', marginBottom: 0 }}>
                Qualquer impressora com suporte a ESC/POS é compatível. A lista acima foi testada com o Oasis PDV.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
