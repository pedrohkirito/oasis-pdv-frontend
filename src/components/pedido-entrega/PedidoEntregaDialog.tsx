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
  order_number: number;
  sale_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_tax_id: string | null;
  delivery_address: string | null;
  issued_at: string;
  delivery_eta_on: string | null;
  status: string;
  payment_form: string | null;
  observacoes: string | null;
  vendedor: string | null;
}

interface ItemVenda {
  product_id: string;
  quantidade: number;
  unit_price: number;
  subtotal: number;
  desconto?: number;
  discount_kind?: 'percentual' | 'amount';
  observacao?: string;
  produto?: {
    name: string;
    code: string | null;
    categoria: string | null;
  };
}

interface EmpresaFiscal {
  legal_name: string;
  trade_name: string | null;
  cnpj: string;
  address_street: string;
  address_number: string;
  address_district: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
}

interface VendaInfo {
  valor: number;
  gross_amount: number | null;
  desconto: number | null;
  final_amount: number | null;
  payment_method: string;
  parcelas: number | null;
  vendedor: string | null;
  observacoes: string | null;
  sold_on: string | null;
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
  birth_date: string | null;
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
  saleId: string | null;
}

export const PedidoEntregaDialog: React.FC<Props> = ({ open, onOpenChange, saleId }) => {
  const { companyId, empresaAtiva } = useEmpresa();
  const [pedido, setPedido] = useState<PedidoEntrega | null>(null);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  // Valor dos serviços da venda: não aparecem na lista de entrega, mas compõem o total.
  const [valorServicos, setValorServicos] = useState(0);
  const [empresaFiscal, setEmpresaFiscal] = useState<EmpresaFiscal | null>(null);
  const [vendaInfo, setVendaInfo] = useState<VendaInfo | null>(null);
  const [clienteInfo, setClienteInfo] = useState<ClienteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [itensComDescontoDetalhado, setItensComDescontoDetalhado] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && saleId && companyId) {
      fetchData();
    }
  }, [open, saleId, companyId]);

  const fetchData = async () => {
    if (!saleId || !companyId) return;
    setLoading(true);

    const [pedidoRes, itensRes, fiscalRes, vendaRes] = await Promise.all([
      api.from('delivery_order').select('*').eq('sale_id', saleId).eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).single(),
      api.from('sale_item').select('product_id, quantity, unit_price, subtotal, discount, discount_kind, note, product(name, code, category, kind)').eq('sale_id', saleId),
      api.from('company_fiscal_profile').select('legal_name, trade_name, tax_id, street, street_number, district, city, state, postal_code').eq('company_id', companyId).limit(1).single(),
      api.from('sale').select('amount, gross_amount, discount, final_amount, payment_method, installments, seller, notes, sold_on, customer_name, customer_id').eq('id', saleId).single(),
    ]);

    if (pedidoRes.data) setPedido(pedidoRes.data as any);

    // Fall back to basic columns if new columns don't exist yet
    let itensData: any[] = itensRes.data || [];
    let usouFallback = false;
    if (itensRes.error && (itensRes.error.code === '42703' || itensRes.error.message?.includes('column'))) {
      const fallback = await api
        .from('sale_item')
        .select('product_id, quantity, unit_price, subtotal, product(name, code, category, kind)')
        .eq('sale_id', saleId);
      itensData = (fallback.data as any[]) || [];
      usouFallback = true;
    }
    setItensComDescontoDetalhado(!usouFallback);
    if (itensData) {
      // Serviços não são entregues: ficam fora do pedido de entrega.
      setValorServicos(
        itensData
          .filter((item: any) => item.produtos?.tipo === 'servico')
          .reduce((acc: number, item: any) => acc + Number(item.quantidade) * Number(item.unit_price), 0),
      );
      itensData = itensData.filter((item: any) => item.produtos?.tipo !== 'servico');
      setItens(itensData.map((item: any) => ({
        ...item,
        desconto: item.desconto != null ? Number(item.desconto) : 0,
        discount_kind: item.discount_kind || 'percentual',
        observacao: item.observacao || '',
        produto: item.produtos,
      })));
    }
    if (fiscalRes.data) setEmpresaFiscal(fiscalRes.data as any);
    if (vendaRes.data) setVendaInfo(vendaRes.data as any);

    // Fetch full client record: prefer customer_id (from pedido or venda), fallback to name match
    const customerId = (pedidoRes.data as any)?.customer_id || (vendaRes.data as any)?.customer_id;
    const clienteNome = (pedidoRes.data as any)?.customer_name || (vendaRes.data as any)?.customer_name;
    const clienteFields = 'cpf, telefone, telefone_adicional, email, endereco, complemento, bairro, cidade, estado, cep, birth_date, observacoes';

    let cli: any = null;
    if (customerId) {
      const { data } = await api
        .from('customer')
        .select(clienteFields)
        .eq('id', customerId)
        .maybeSingle();
      cli = data;
    }
    if (!cli && clienteNome) {
      const { data } = await api
        .from('customer')
        .select(clienteFields)
        .eq('company_id', companyId)
        .eq('name', clienteNome)
        .eq('active', true)
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
          <title>Pedido de Entrega #${pedido?.order_number}</title>
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

  const valorBruto = vendaInfo?.gross_amount ?? vendaInfo?.valor ?? 0;
  const desconto = vendaInfo?.desconto ?? 0;
  const finalAmount = vendaInfo?.final_amount ?? vendaInfo?.valor ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Pedido de Entrega {pedido && `#${pedido.order_number}`}
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
                    {empresaFiscal?.trade_name || empresaFiscal?.legal_name || empresaAtiva?.name || 'Empresa'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.8, margin: 0 }}>
                    {empresaFiscal && (
                      <>
                        <div>CNPJ: {formatCNPJ(empresaFiscal.cnpj)}</div>
                        <div>{empresaFiscal.address_street}, {empresaFiscal.address_number} — {empresaFiscal.address_district}</div>
                        <div>{empresaFiscal.address_city}/{empresaFiscal.address_state} · CEP {empresaFiscal.address_postal_code}</div>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8E5FCF', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 4 }}>
                    Pedido de Entrega
                  </span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', display: 'block', letterSpacing: '-1px' }}>
                    #{String(pedido.order_number).padStart(5, '0')}
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7280', display: 'block', marginTop: 6 }}>
                    Emissão: {format(new Date(pedido.issued_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
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
                const cpf = clienteInfo?.cpf || pedido.customer_tax_id || null;
                const telefone = clienteInfo?.telefone || pedido.customer_phone || null;
                const telefoneAdic = clienteInfo?.telefone_adicional || null;
                const email = clienteInfo?.email || pedido.customer_email || null;
                const dataNasc = clienteInfo?.birth_date || null;
                const enderecoLinha = clienteInfo
                  ? [clienteInfo.endereco, clienteInfo.complemento ? `(${clienteInfo.complemento})` : null, clienteInfo.bairro].filter(Boolean).join(', ')
                  : '';
                const cidadeLinha = clienteInfo
                  ? [[clienteInfo.cidade, clienteInfo.estado].filter(Boolean).join('/'), clienteInfo.cep ? `CEP: ${clienteInfo.cep}` : null].filter(Boolean).join(' — ')
                  : '';
                const enderecoFinal = enderecoLinha || pedido.delivery_address || '';
                const campos = [
                  { label: 'Nome', value: pedido.customer_name },
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
                        const descValor = item.discount_kind === 'percentual'
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
                              <td style={{ padding: '14px 16px', fontSize: 11, color: '#9CA3AF', fontWeight: 500, verticalAlign: 'top' }}>{item.produto?.code || '—'}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', fontWeight: 500, verticalAlign: 'top' }}>{item.produto?.name || 'Produto'}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', textAlign: 'center', verticalAlign: 'top' }}>{item.quantidade}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151', textAlign: 'center', verticalAlign: 'top' }}>{formatCurrency(Number(item.unit_price))}</td>
                              <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: temDesconto ? '#EF4444' : '#D1D5DB', verticalAlign: 'top' }}>
                                {temDesconto ? (
                                  <>
                                    <div>{item.discount_kind === 'percentual' ? `-${item.desconto}%` : `-${formatCurrency(item.desconto || 0)}`}</div>
                                    {item.discount_kind === 'amount' && (
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
                      const d = item.discount_kind === 'percentual'
                        ? sub * ((item.desconto || 0) / 100)
                        : Math.min(item.desconto || 0, sub);
                      return sum + d;
                    }, 0)
                  : 0;
                const descontoGeral = itensComDescontoDetalhado ? Math.max(0, totalDesconto - descontoItens) : 0;
                const descontoCombinado = !itensComDescontoDetalhado ? totalDesconto : 0;
                const linhas = [
                  { label: 'Total Produtos', value: formatCurrency(Number(valorBruto) - valorServicos), red: false, bold: false },
                  ...(valorServicos > 0 ? [{ label: 'Serviços (não entregues)', value: formatCurrency(valorServicos), red: false, bold: false }] : []),
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
                        <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{formatCurrency(Number(finalAmount))}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── INFORMAÇÕES ADICIONAIS ──────────────────── */}
              {(() => {
                const infos = [
                  { label: 'Forma de Pagamento', value: `${pedido.payment_form || vendaInfo?.payment_method || '—'}${vendaInfo?.parcelas && vendaInfo.parcelas > 1 ? ` (${vendaInfo.parcelas}x)` : ''}` },
                  { label: 'Previsão de Entrega', value: pedido.delivery_eta_on ? format(new Date(pedido.delivery_eta_on + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'A combinar' },
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
