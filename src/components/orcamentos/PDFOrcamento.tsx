import React from 'react'
import { useEmpresa } from '@/hooks/useEmpresa'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrcamentoItem {
  id: string
  product_name: string
  variacao?: string
  quantidade: number
  unit_price: number
  item_discount?: number
  total: number
}

interface Orcamento {
  id: string
  numero: string
  status: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  validade?: string
  subtotal: number
  desconto?: number
  total: number
  observacoes?: string
  payment_terms?: string
  created_at: string
  orcamento_itens?: OrcamentoItem[]
}

interface PDFOrcamentoProps {
  orcamento: Orcamento
  onClose?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtData = (iso: string) => {
  try {
    return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return iso
  }
}

// ─── Estilos inline (compatíveis com @media print) ────────────────────────────

const s = {
  page: {
    fontFamily: 'Arial, sans-serif',
    background: '#fff',
    color: '#111',
    maxWidth: 800,
    margin: '0 auto',
    padding: '40px 48px',
    fontSize: 13,
  } as React.CSSProperties,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottom: '2px solid #6D28D9',
  } as React.CSSProperties,

  logo: {
    width: 72,
    height: 72,
    objectFit: 'contain' as const,
    marginBottom: 6,
  } as React.CSSProperties,

  nomeEmpresa: {
    fontSize: 18,
    fontWeight: 700 as const,
    color: '#6D28D9',
    marginBottom: 2,
  } as React.CSSProperties,

  subEmpresa: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 1.6,
  } as React.CSSProperties,

  badgeNumero: {
    background: '#6D28D9',
    color: '#fff',
    padding: '6px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700 as const,
    letterSpacing: 0.5,
    marginBottom: 6,
    display: 'inline-block',
  } as React.CSSProperties,

  labelCinza: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 2,
  } as React.CSSProperties,

  section: {
    marginBottom: 20,
  } as React.CSSProperties,

  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 20,
  } as React.CSSProperties,

  card: {
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    padding: '12px 16px',
  } as React.CSSProperties,

  cardTitulo: {
    fontSize: 10,
    fontWeight: 700 as const,
    color: '#6D28D9',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginBottom: 16,
  } as React.CSSProperties,

  th: {
    background: '#F3F4F6',
    padding: '8px 10px',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 700 as const,
    color: '#374151',
    borderBottom: '2px solid #E5E7EB',
  } as React.CSSProperties,

  thRight: {
    background: '#F3F4F6',
    padding: '8px 10px',
    textAlign: 'right' as const,
    fontSize: 11,
    fontWeight: 700 as const,
    color: '#374151',
    borderBottom: '2px solid #E5E7EB',
  } as React.CSSProperties,

  td: {
    padding: '8px 10px',
    fontSize: 12,
    borderBottom: '1px solid #F3F4F6',
    verticalAlign: 'top' as const,
  } as React.CSSProperties,

  tdRight: {
    padding: '8px 10px',
    fontSize: 12,
    borderBottom: '1px solid #F3F4F6',
    textAlign: 'right' as const,
    verticalAlign: 'top' as const,
  } as React.CSSProperties,

  totalBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 4,
    marginBottom: 20,
  } as React.CSSProperties,

  totalLinha: {
    display: 'flex',
    gap: 48,
    justifyContent: 'flex-end',
    fontSize: 12,
    color: '#374151',
  } as React.CSSProperties,

  totalFinal: {
    display: 'flex',
    gap: 48,
    justifyContent: 'flex-end',
    fontSize: 16,
    fontWeight: 700 as const,
    color: '#6D28D9',
    borderTop: '2px solid #6D28D9',
    paddingTop: 8,
    marginTop: 4,
  } as React.CSSProperties,

  footer: {
    borderTop: '1px solid #E5E7EB',
    marginTop: 24,
    paddingTop: 16,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  } as React.CSSProperties,

  validade: {
    marginTop: 16,
    padding: '10px 14px',
    background: '#FEF3C7',
    borderRadius: 6,
    fontSize: 12,
    color: '#92400E',
    borderLeft: '3px solid #F59E0B',
  } as React.CSSProperties,

  assinatura: {
    marginTop: 32,
    paddingTop: 8,
    borderTop: '1px solid #374151',
    fontSize: 11,
    color: '#6B7280',
    width: 240,
  } as React.CSSProperties,

  btnImprimir: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#6D28D9',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600 as const,
    cursor: 'pointer',
    marginBottom: 24,
  } as React.CSSProperties,

  btnFechar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#F3F4F6',
    color: '#374151',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 24,
    marginLeft: 8,
  } as React.CSSProperties,
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function PDFOrcamento({ orcamento, onClose }: PDFOrcamentoProps) {
  const { empresaAtiva } = useEmpresa()
  const itens: OrcamentoItem[] = orcamento.orcamento_itens ?? []

  return (
    <>
      {/* Botões (ocultos na impressão via @media print) */}
      <div className="print:hidden flex mb-4">
        <button style={s.btnImprimir} onClick={() => window.print()}>
          🖨️ Imprimir / Salvar PDF
        </button>
        {onClose && (
          <button style={s.btnFechar} onClick={onClose}>
            ✕ Fechar
          </button>
        )}
      </div>

      {/* Documento */}
      <div style={s.page} id="pdf-orcamento">

        {/* ── Cabeçalho ──────────────────────────────────────────────── */}
        <div style={s.header}>
          {/* Empresa */}
          <div>
            {empresaAtiva?.logo_url && (
              <img src={empresaAtiva.logo_url} alt="Logo" style={s.logo} />
            )}
            <div style={s.nomeEmpresa}>{empresaAtiva?.name ?? 'Empresa'}</div>
            <div style={s.subEmpresa}>
              {/* Campos adicionais podem ser inseridos aqui conforme disponibilidade */}
            </div>
          </div>

          {/* Identificação do orçamento */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>ORÇAMENTO</div>
            <div style={s.badgeNumero}>{orcamento.numero}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
              Emitido em: <strong>{fmtData(orcamento.created_at)}</strong>
            </div>
            {orcamento.validade && (
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                Válido até: <strong>{fmtData(orcamento.validade)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ── Cliente e Datas ─────────────────────────────────────────── */}
        <div style={s.grid2}>
          <div style={s.card}>
            <div style={s.cardTitulo}>Cliente</div>
            {orcamento.customer_name && (
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{orcamento.customer_name}</div>
            )}
            {orcamento.customer_phone && (
              <div style={{ fontSize: 12, color: '#6B7280' }}>📞 {orcamento.customer_phone}</div>
            )}
            {orcamento.customer_email && (
              <div style={{ fontSize: 12, color: '#6B7280' }}>✉ {orcamento.customer_email}</div>
            )}
            {!orcamento.customer_name && !orcamento.customer_email && !orcamento.customer_phone && (
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Não informado</div>
            )}
          </div>

          <div style={s.card}>
            <div style={s.cardTitulo}>Informações</div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>
                <span style={{ color: '#9CA3AF' }}>Emissão: </span>
                <strong>{fmtData(orcamento.created_at)}</strong>
              </div>
              {orcamento.validade && (
                <div>
                  <span style={{ color: '#9CA3AF' }}>Validade: </span>
                  <strong>{fmtData(orcamento.validade)}</strong>
                </div>
              )}
              {orcamento.payment_terms && (
                <div>
                  <span style={{ color: '#9CA3AF' }}>Pagamento: </span>
                  <strong>{orcamento.payment_terms}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabela de itens ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 4, fontSize: 10, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Produtos / Serviços
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 32 }}>#</th>
              <th style={s.th}>Descrição</th>
              <th style={{ ...s.thRight, width: 60 }}>Qtd</th>
              <th style={{ ...s.thRight, width: 100 }}>Unit.</th>
              {itens.some(i => (i.item_discount ?? 0) > 0) && (
                <th style={{ ...s.thRight, width: 90 }}>Desconto</th>
              )}
              <th style={{ ...s.thRight, width: 110 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ ...s.td, color: '#9CA3AF' }}>{idx + 1}</td>
                <td style={s.td}>
                  <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                  {item.variacao && (
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{item.variacao}</div>
                  )}
                </td>
                <td style={s.tdRight}>{item.quantidade}</td>
                <td style={s.tdRight}>{fmtBRL(item.unit_price)}</td>
                {itens.some(i => (i.item_discount ?? 0) > 0) && (
                  <td style={{ ...s.tdRight, color: '#EF4444' }}>
                    {(item.item_discount ?? 0) > 0 ? `- ${fmtBRL(item.item_discount!)}` : '—'}
                  </td>
                )}
                <td style={{ ...s.tdRight, fontWeight: 600 }}>{fmtBRL(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Totais ──────────────────────────────────────────────────── */}
        <div style={s.totalBox}>
          <div style={s.totalLinha}>
            <span style={{ color: '#6B7280' }}>Subtotal</span>
            <span style={{ minWidth: 110, textAlign: 'right' }}>{fmtBRL(orcamento.subtotal)}</span>
          </div>
          {(orcamento.desconto ?? 0) > 0 && (
            <div style={{ ...s.totalLinha, color: '#EF4444' }}>
              <span>Desconto</span>
              <span style={{ minWidth: 110, textAlign: 'right' }}>- {fmtBRL(orcamento.desconto!)}</span>
            </div>
          )}
          <div style={s.totalFinal}>
            <span>TOTAL</span>
            <span style={{ minWidth: 110, textAlign: 'right' }}>{fmtBRL(orcamento.total)}</span>
          </div>
        </div>

        {/* ── Rodapé ──────────────────────────────────────────────────── */}
        <div style={s.footer}>
          <div>
            {orcamento.payment_terms && (
              <div style={s.section}>
                <div style={s.cardTitulo}>Condição de pagamento</div>
                <div style={{ fontSize: 12 }}>{orcamento.payment_terms}</div>
              </div>
            )}
            {orcamento.observacoes && (
              <div style={s.section}>
                <div style={s.cardTitulo}>Observações</div>
                <div style={{ fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap' }}>
                  {orcamento.observacoes}
                </div>
              </div>
            )}
          </div>
          <div>
            {orcamento.validade && (
              <div style={s.validade}>
                ⏰ Este orçamento é válido até <strong>{fmtData(orcamento.validade)}</strong>.
              </div>
            )}
            <div style={{ marginTop: 32 }}>
              <div style={s.assinatura}>Assinatura / Aprovação</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Print CSS ──────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body > *:not(#pdf-orcamento-root) { display: none !important; }
          .print\\:hidden { display: none !important; }
          #pdf-orcamento {
            max-width: 100%;
            padding: 16px;
          }
        }
      `}</style>
    </>
  )
}
