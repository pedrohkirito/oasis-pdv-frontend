import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Loader2, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PedidoEntrega {
  id: string;
  numero_pedido: number;
  venda_id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_email: string | null;
  cliente_cpf: string | null;
  endereco_entrega: string | null;
  data_emissao: string;
  previsao_entrega: string | null;
  status: string;
  forma_pagamento: string | null;
  observacoes: string | null;
  vendedor: string | null;
}

interface ItemVenda {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  desconto?: number;
  desconto_tipo?: 'percentual' | 'valor';
  observacao?: string;
  produto?: {
    nome: string;
    codigo: string | null;
    categoria: string | null;
  };
}

interface EmpresaFiscal {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_cidade: string;
  endereco_uf: string;
  endereco_cep: string;
}

interface VendaInfo {
  valor: number;
  valor_bruto: number | null;
  desconto: number | null;
  valor_final: number | null;
  metodo_pagamento: string;
  parcelas: number | null;
  vendedor: string | null;
  observacoes: string | null;
  data_venda: string | null;
}

interface ClienteInfo {
  cpf: string | null;
  telefone: string | null;
  telefone_adicional: string | null;
  email: string | null;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
}

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_separacao: 'Em Separação',
  em_transporte: 'Em Transporte',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-500/20 text-yellow-700 border-yellow-500',
  em_separacao: 'bg-blue-500/20 text-blue-700 border-blue-500',
  em_transporte: 'bg-purple-500/20 text-purple-700 border-purple-500',
  entregue: 'bg-emerald-500/20 text-emerald-700 border-emerald-500',
  cancelado: 'bg-red-500/20 text-red-700 border-red-500',
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatCNPJ = (cnpj: string) => {
  const c = cnpj.replace(/\D/g, '');
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string | null;
}

export const PedidoEntregaDialog: React.FC<Props> = ({ open, onOpenChange, vendaId }) => {
  const { empresaId, empresaAtiva } = useEmpresa();
  const [pedido, setPedido] = useState<PedidoEntrega | null>(null);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [empresaFiscal, setEmpresaFiscal] = useState<EmpresaFiscal | null>(null);
  const [vendaInfo, setVendaInfo] = useState<VendaInfo | null>(null);
  const [clienteInfo, setClienteInfo] = useState<ClienteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [itensComDescontoDetalhado, setItensComDescontoDetalhado] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && vendaId && empresaId) {
      fetchData();
    }
  }, [open, vendaId, empresaId]);

  const fetchData = async () => {
    if (!vendaId || !empresaId) return;
    setLoading(true);

    const [pedidoRes, itensRes, fiscalRes, vendaRes] = await Promise.all([
      api.from('pedidos_entrega').select('*').eq('venda_id', vendaId).eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(1).single(),
      api.from('itens_venda').select('produto_id, quantidade, preco_unitario, subtotal, desconto, desconto_tipo, observacao, produtos(nome, codigo, categoria)').eq('venda_id', vendaId),
      api.from('empresa_fiscal').select('razao_social, nome_fantasia, cnpj, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep').eq('empresa_id', empresaId).limit(1).single(),
      api.from('vendas').select('valor, valor_bruto, desconto, valor_final, metodo_pagamento, parcelas, vendedor, observacoes, data_venda, cliente_nome, cliente_id').eq('id', vendaId).single(),
    ]);

    if (pedidoRes.data) setPedido(pedidoRes.data as any);

    // Fall back to basic columns if new columns don't exist yet
    let itensData: any[] = itensRes.data || [];
    let usouFallback = false;
    if (itensRes.error && (itensRes.error.code === '42703' || itensRes.error.message?.includes('column'))) {
      const fallback = await api
        .from('itens_venda')
        .select('produto_id, quantidade, preco_unitario, subtotal, produtos(nome, codigo, categoria)')
        .eq('venda_id', vendaId);
      itensData = (fallback.data as any[]) || [];
      usouFallback = true;
    }
    setItensComDescontoDetalhado(!usouFallback);
    if (itensData) {
      setItens(itensData.map((item: any) => ({
        ...item,
        desconto: item.desconto != null ? Number(item.desconto) : 0,
        desconto_tipo: item.desconto_tipo || 'percentual',
        observacao: item.observacao || '',
        produto: item.produtos,
      })));
    }
    if (fiscalRes.data) setEmpresaFiscal(fiscalRes.data as any);
    if (vendaRes.data) setVendaInfo(vendaRes.data as any);

    // Fetch full client record: prefer cliente_id (from pedido or venda), fallback to name match
    const clienteId = (pedidoRes.data as any)?.cliente_id || (vendaRes.data as any)?.cliente_id;
    const clienteNome = (pedidoRes.data as any)?.cliente_nome || (vendaRes.data as any)?.cliente_nome;
    const clienteFields = 'cpf, telefone, telefone_adicional, email, endereco, complemento, bairro, cidade, estado, cep, data_nascimento, observacoes';

    let cli: any = null;
    if (clienteId) {
      const { data } = await api
        .from('clientes')
        .select(clienteFields)
        .eq('id', clienteId)
        .maybeSingle();
      cli = data;
    }
    if (!cli && clienteNome) {
      const { data } = await api
        .from('clientes')
        .select(clienteFields)
        .eq('empresa_id', empresaId)
        .eq('nome', clienteNome)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();
      cli = data;
    }
    if (cli) setClienteInfo(cli as any);

    setLoading(false);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Pedido de Entrega #${pedido?.numero_pedido}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #1a1a1a; background: white; }
            .print-doc { max-width: 800px; margin: 0 auto; padding: 48px; }
            table { border-collapse: separate; border-spacing: 0; }
            @media print { body { margin: 0; } @page { margin: 1cm; } .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="print-doc">${content.innerHTML}</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!pedido && !loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pedido de Entrega</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido de entrega encontrado para esta venda.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const valorBruto = vendaInfo?.valor_bruto ?? vendaInfo?.valor ?? 0;
  const desconto = vendaInfo?.desconto ?? 0;
  const valorFinal = vendaInfo?.valor_final ?? vendaInfo?.valor ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Pedido de Entrega {pedido && `#${pedido.numero_pedido}`}
            </DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint} disabled={loading}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimir / PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pedido && (
          <>
            {/* Status Badge */}
            <div className="flex justify-end">
              <Badge variant="outline" className={statusColors[pedido.status] || ''}>
                {statusLabels[pedido.status] || pedido.status}
              </Badge>
            </div>

            {/* Print Content */}
            <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', color: '#1a1a1a', lineHeight: 1.6 }}>

              {/* ── HEADER ─────────────────────────────────── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 32, borderBottom: '3px solid #8E5FCF', marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px', marginBottom: 8 }}>
                    {empresaFiscal?.nome_fantasia || empresaFiscal?.razao_social || empresaAtiva?.nome || 'Empresa'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.8, margin: 0 }}>
                    {empresaFiscal && (
                      <>
                        <div>CNPJ: {formatCNPJ(empresaFiscal.cnpj)}</div>
                        <div>{empresaFiscal.endereco_logradouro}, {empresaFiscal.endereco_numero} — {empresaFiscal.endereco_bairro}</div>
                        <div>{empresaFiscal.endereco_cidade}/{empresaFiscal.endereco_uf} · CEP {empresaFiscal.endereco_cep}</div>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 4 }}>
                    Pedido de Entrega
                  </span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', display: 'block', letterSpacing: '-1px' }}>
                    #{String(pedido.numero_pedido).padStart(5, '0')}
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7280', display: 'block', marginTop: 6 }}>
                    Emissão: {format(new Date(pedido.data_emissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* ── STATUS BADGE ────────────────────────────── */}
              {(() => {
                const badgeStyles: Record<string, React.CSSProperties> = {
                  pendente:     { background: '#FEF3C7', color: '#D97706', border: '1px solid #F59E0B' },
                  em_separacao: { background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #3B82F6' },
                  em_transporte:{ background: '#EDE9FE', color: '#7C3AED', border: '1px solid #8B5CF6' },
                  entregue:     { background: '#D1FAE5', color: '#059669', border: '1px solid #10B981' },
                  cancelado:    { background: '#FEE2E2', color: '#DC2626', border: '1px solid #EF4444' },
                };
                return (
                  <div style={{ textAlign: 'right', marginBottom: 24 }}>
                    <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', ...(badgeStyles[pedido.status] || { background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }) }}>
                      {statusLabels[pedido.status] || pedido.status}
                    </span>
                  </div>
                );
              })()}

              {/* ── DADOS DO CLIENTE ────────────────────────── */}
              {(() => {
                const cpf = clienteInfo?.cpf || pedido.cliente_cpf || null;
                const telefone = clienteInfo?.telefone || pedido.cliente_telefone || null;
                const telefoneAdic = clienteInfo?.telefone_adicional || null;
                const email = clienteInfo?.email || pedido.cliente_email || null;
                const dataNasc = clienteInfo?.data_nascimento || null;
                const enderecoLinha = clienteInfo
                  ? [clienteInfo.endereco, clienteInfo.complemento ? `(${clienteInfo.complemento})` : null, clienteInfo.bairro].filter(Boolean).join(', ')
                  : '';
                const cidadeLinha = clienteInfo
                  ? [[clienteInfo.cidade, clienteInfo.estado].filter(Boolean).join('/'), clienteInfo.cep ? `CEP: ${clienteInfo.cep}` : null].filter(Boolean).join(' — ')
                  : '';
                const enderecoFinal = enderecoLinha || pedido.endereco_entrega || '';
                const campos = [
                  { label: 'Nome', value: pedido.cliente_nome },
                  cpf ? { label: 'CPF / CNPJ', value: cpf } : null,
                  telefone ? { label: 'Telefone', value: telefone } : null,
                  telefoneAdic ? { label: 'Tel. adicional', value: telefoneAdic } : null,
                  email ? { label: 'E-mail', value: email } : null,
                  dataNasc ? { label: 'Nascimento', value: format(new Date(dataNasc + 'T12:00:00'), 'dd/MM/yyyy') } : null,
                ].filter(Boolean) as { label: string; value: string }[];
                return (
                  <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px', marginBottom: 28 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #E5E7EB' }}>
                      Dados do Cliente
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                      {campos.map((c, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 3 }}>{c.label}</span>
                          <span style={{ fontSize: 13, color: '#1F2937', fontWeight: 500 }}>{c.value}</span>
                        </div>
                      ))}
                      {enderecoFinal && (
                        <div style={{ gridColumn: '1 / -1', marginBottom: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 3 }}>Endereço</span>
                          <span style={{ fontSize: 13, color: '#1F2937', fontWeight: 500 }}>{enderecoFinal}{cidadeLinha ? ` — ${cidadeLinha}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── PRODUTOS ────────────────────────────────── */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
                  Produtos
                </div>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#8E5FCF' }}>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', width: 90 }}>Código</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>Descrição</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: 60 }}>Qtd</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: 60 }}>Un.</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 100 }}>Desconto</th>
                        <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 100 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, idx) => {
                        const subtotalBruto = Number(item.subtotal);
                        const descValor = item.desconto_tipo === 'percentual'
                          ? subtotalBruto * ((item.desconto || 0) / 100)
                          : Math.min(item.desconto || 0, subtotalBruto);
                        const temDesconto = descValor > 0;
                        const totalComDesconto = Math.max(0, subtotalBruto - descValor);
                        const pctContexto = subtotalBruto > 0 ? (descValor / subtotalBruto) * 100 : 0;
                        const temObs = !!item.observacao;
                        const rowBg = idx % 2 === 0 ? 'white' : '#FAFAFA';
                        return (
                          <React.Fragment key={idx}>
                            <tr style={{ background: rowBg, borderBottom: '1px solid #F3F4F6' }}>
                              <td style={{ padding: '14px 16px', fontSize: 11, color: '#9CA3AF', fontWeight: 500, verticalAlign: 'top' }}>{item.produto?.codigo || '—'}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', fontWeight: 500, verticalAlign: 'top' }}>{item.produto?.nome || 'Produto'}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', textAlign: 'center', verticalAlign: 'top' }}>{item.quantidade}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', textAlign: 'center', verticalAlign: 'top' }}>{formatCurrency(Number(item.preco_unitario))}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: temDesconto ? '#EF4444' : '#D1D5DB', verticalAlign: 'top' }}>
                                {temDesconto ? (
                                  <>
                                    <div>{item.desconto_tipo === 'percentual' ? `-${item.desconto}%` : `-${formatCurrency(item.desconto || 0)}`}</div>
                                    {item.desconto_tipo === 'valor' && (
                                      <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 400 }}>
                                        ({pctContexto % 1 === 0 ? pctContexto.toFixed(0) : pctContexto.toFixed(1)}%)
                                      </div>
                                    )}
                                  </>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#1F2937', textAlign: 'right', verticalAlign: 'top' }}>
                                {formatCurrency(temDesconto ? totalComDesconto : subtotalBruto)}
                              </td>
                            </tr>
                            {temObs && (
                              <tr style={{ background: rowBg }}>
                                <td style={{ padding: '0 16px 12px 16px', fontSize: 11, color: '#6B7280', fontStyle: 'italic' }} />
                                <td colSpan={5} style={{ padding: '0 16px 12px 16px', fontSize: 11, color: '#6B7280', fontStyle: 'italic' }}>
                                  📝 {item.observacao}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── TOTAIS ──────────────────────────────────── */}
              {(() => {
                const totalDesconto = Number(desconto) || 0;
                const descontoItens = itensComDescontoDetalhado
                  ? itens.reduce((sum, item) => {
                      const sub = Number(item.subtotal);
                      const d = item.desconto_tipo === 'percentual'
                        ? sub * ((item.desconto || 0) / 100)
                        : Math.min(item.desconto || 0, sub);
                      return sum + d;
                    }, 0)
                  : 0;
                const descontoGeral = itensComDescontoDetalhado ? Math.max(0, totalDesconto - descontoItens) : 0;
                const descontoCombinado = !itensComDescontoDetalhado ? totalDesconto : 0;
                const linhas = [
                  { label: 'Total Produtos', value: formatCurrency(Number(valorBruto)), red: false, bold: false },
                  ...(descontoItens > 0 ? [{ label: '(-) Desc. por item', value: `- ${formatCurrency(descontoItens)}`, red: true, bold: false }] : []),
                  ...(descontoGeral > 0 ? [{ label: '(-) Desc. geral', value: `- ${formatCurrency(descontoGeral)}`, red: true, bold: false }] : []),
                  ...(descontoCombinado > 0 ? [{ label: '(-) Desconto', value: `- ${formatCurrency(descontoCombinado)}`, red: true, bold: false }] : []),
                ];
                return (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
                    <div style={{ width: 280, border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                      {linhas.map((l, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #F3F4F6', fontSize: 13, background: 'white' }}>
                          <span style={{ color: l.red ? '#EF4444' : '#6B7280' }}>{l.label}</span>
                          <span style={{ fontWeight: 600, color: l.red ? '#EF4444' : '#374151' }}>{l.value}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#8E5FCF' }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Total Final</span>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{formatCurrency(Number(valorFinal))}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── INFORMAÇÕES ADICIONAIS ──────────────────── */}
              {(() => {
                const infos = [
                  { label: 'Forma de Pagamento', value: `${pedido.forma_pagamento || vendaInfo?.metodo_pagamento || '—'}${vendaInfo?.parcelas && vendaInfo.parcelas > 1 ? ` (${vendaInfo.parcelas}x)` : ''}` },
                  { label: 'Previsão de Entrega', value: pedido.previsao_entrega ? format(new Date(pedido.previsao_entrega + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'A combinar' },
                  ...(pedido.vendedor || vendaInfo?.vendedor ? [{ label: 'Vendedor(a)', value: pedido.vendedor || vendaInfo?.vendedor || '' }] : []),
                ];
                return (
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginBottom: 28, display: 'grid', gridTemplateColumns: `repeat(${infos.length}, 1fr)` }}>
                    {infos.map((info, i) => (
                      <div key={i} style={{ padding: '16px 20px', borderRight: i < infos.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>{info.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>{info.value}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── OBSERVAÇÕES ─────────────────────────────── */}
              {(() => {
                const blocos: { titulo: string; texto: string }[] = [];
                if (pedido.observacoes) blocos.push({ titulo: 'Observações do Pedido', texto: pedido.observacoes });
                if (vendaInfo?.observacoes && vendaInfo.observacoes !== pedido.observacoes) blocos.push({ titulo: 'Observações da Venda', texto: vendaInfo.observacoes });
                if (clienteInfo?.observacoes) blocos.push({ titulo: 'Observações do Cliente', texto: clienteInfo.observacoes });
                if (blocos.length === 0) return null;
                return (
                  <div style={{ marginBottom: 28 }}>
                    {blocos.map((b, i) => (
                      <div key={i} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid #F59E0B', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 8 }}>{b.titulo}</span>
                        <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{b.texto}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── ASSINATURAS ─────────────────────────────── */}
              <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
                {['Assinatura do Cliente', 'Assinatura da Empresa'].map((label) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px solid #374151', marginBottom: 10, height: 40 }} />
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* ── RODAPÉ ──────────────────────────────────── */}
              <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #E5E7EB', textAlign: 'center', fontSize: 10, color: '#9CA3AF' }}>
                Documento gerado automaticamente pelo sistema • {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
              </div>

            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
