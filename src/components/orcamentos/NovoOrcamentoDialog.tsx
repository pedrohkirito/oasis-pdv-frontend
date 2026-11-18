import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, User, Package } from 'lucide-react'
import { api } from '@/lib/api'
import { useEmpresa } from '@/hooks/useEmpresa'
import { addDays, format, differenceInDays, parseISO } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cliente { id: string; nome: string; telefone: string | null; email: string | null }
interface Produto  { id: string; nome: string; preco: number; estoque: number | null; codigo: string | null }

interface ItemOrcamento {
  _key: string
  produto_id: string | null
  produto_nome: string
  variacao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  total: number
}

interface NovoOrcamentoDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSalvo: () => void
  criarOrcamento: (orcamento: any, itens: any[]) => Promise<{ data: any; error: any }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const novaLinha = (): ItemOrcamento => ({
  _key: crypto.randomUUID(),
  produto_id: null,
  produto_nome: '',
  variacao: '',
  quantidade: 1,
  preco_unitario: 0,
  desconto_item: 0,
  total: 0,
})

// ─── Component ────────────────────────────────────────────────────────────────

export function NovoOrcamentoDialog({ open, onOpenChange, onSalvo, criarOrcamento }: NovoOrcamentoDialogProps) {
  const { empresaId } = useEmpresa()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos]   = useState<Produto[]>([])
  const [clientePopover, setClientePopover] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Form fields
  const [clienteNome,      setClienteNome]      = useState('')
  const [clienteEmail,     setClienteEmail]     = useState('')
  const [clienteTelefone,  setClienteTelefone]  = useState('')
  const [clienteId,        setClienteId]        = useState<string | null>(null)
  const [validade,         setValidade]         = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
  const [condicao,         setCondicao]         = useState('')
  const [observacoes,      setObservacoes]      = useState('')
  const [desconto,         setDesconto]         = useState(0)
  const [itens,            setItens]            = useState<ItemOrcamento[]>([novaLinha()])

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !empresaId) return
    api.from('clientes').select('id, nome, telefone, email').eq('empresa_id', empresaId).eq('ativo', true).order('nome')
      .then(({ data }) => setClientes(data || []))
    // Paginated product fetch to handle >1000 products
    const fetchAllProducts = async () => {
      let all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data } = await api.from('produtos').select('id, nome, preco, estoque, codigo').eq('empresa_id', empresaId).eq('ativo', true).order('nome').range(from, from + pageSize - 1);
        all = all.concat(data || []);
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }
      setProdutos(all);
    }
    fetchAllProducts()
  }, [open, empresaId])

  // ── Cálculos ───────────────────────────────────────────────────────────────

  const calcularTotal = (i: ItemOrcamento) =>
    Math.max(0, i.quantidade * i.preco_unitario - i.desconto_item)

  const subtotal = itens.reduce((acc, i) => acc + i.total, 0)
  const total    = Math.max(0, subtotal - desconto)

  // ── Itens helpers ──────────────────────────────────────────────────────────

  const atualizarItem = (key: string, campo: Partial<ItemOrcamento>) => {
    setItens(prev => prev.map(i => {
      if (i._key !== key) return i
      const updated = { ...i, ...campo }
      updated.total = calcularTotal(updated)
      return updated
    }))
  }

  const selecionarProduto = (key: string, produtoId: string) => {
    const p = produtos.find(x => x.id === produtoId)
    if (!p) return
    atualizarItem(key, {
      produto_id: p.id,
      produto_nome: p.nome,
      preco_unitario: p.preco,
    })
  }

  const removerLinha = (key: string) =>
    setItens(prev => prev.filter(i => i._key !== key))

  const adicionarLinha = () => setItens(prev => [...prev, novaLinha()])

  // ── Resetar ────────────────────────────────────────────────────────────────

  const resetar = () => {
    setClienteNome(''); setClienteEmail(''); setClienteTelefone('')
    setClienteId(null); setValidade(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
    setCondicao(''); setObservacoes(''); setDesconto(0)
    setItens([novaLinha()])
  }

  // ── Salvar ─────────────────────────────────────────────────────────────────

  const salvar = async (gerarPDF = false) => {
    if (!clienteNome.trim()) return
    const itensValidos = itens.filter(i => i.produto_nome.trim() || i.produto_id)
    if (itensValidos.length === 0) return

    setSalvando(true)
    const orcamento = {
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      cliente_email: clienteEmail || null,
      cliente_telefone: clienteTelefone || null,
      validade: validade || null,
      condicao_pagamento: condicao || null,
      observacoes: observacoes || null,
      desconto,
      status: 'rascunho',
    }
    const itensPayload = itensValidos.map(i => ({
      produto_id: i.produto_id,
      produto_nome: i.produto_nome,
      variacao: i.variacao || null,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      desconto_item: i.desconto_item,
      total: i.total,
    }))

    const { error } = await criarOrcamento(orcamento, itensPayload)
    setSalvando(false)
    if (!error) {
      resetar()
      onSalvo()
      onOpenChange(false)
    }
  }

  // Validade em dias (para badge)
  const diasValidade = (() => {
    try { return differenceInDays(parseISO(validade), new Date()) } catch { return 30 }
  })()

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetar(); onOpenChange(v) }}>
      <DialogContent
        className="max-w-3xl p-0 overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(142,95,207,0.15)',
          borderRadius: 24,
          boxShadow: '0 25px 80px rgba(71,17,143,0.2)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(142,95,207,0.1)', padding: '20px 24px', flexShrink: 0 }}>
          <h2 style={{
            fontFamily: 'Gilroy', fontWeight: 700, fontSize: '1.25rem',
            background: 'linear-gradient(135deg, #47118F, #8E5FCF)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Novo Orçamento
          </h2>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── Seção 1 — Cliente ──────────────────────────────────── */}
            <div>
              <p style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                color: '#9CA3AF', fontFamily: 'Gilroy', textTransform: 'uppercase',
                margin: '0 0 16px',
              }}>
                Cliente
              </p>
              <div style={{
                background: 'rgba(142,95,207,0.03)',
                border: '1px solid rgba(142,95,207,0.1)',
                borderRadius: 16, padding: 20,
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                {/* Busca de cliente */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Label style={{ fontFamily: 'Gilroy', fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>
                    Cliente *
                  </Label>
                  <Popover open={clientePopover} onOpenChange={setClientePopover} modal>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-between font-normal w-full" style={{ fontFamily: 'Gilroy', borderColor: 'rgba(142,95,207,0.2)' }}>
                        {clienteNome || 'Selecione ou digite o nome…'}
                        <User className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Buscar cliente…"
                          value={clienteNome}
                          onValueChange={v => { setClienteNome(v); setClienteId(null) }}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado. Digite para usar o nome informado.</CommandEmpty>
                          <CommandGroup>
                            {clientes.filter(c => c.nome.toLowerCase().includes(clienteNome.toLowerCase())).slice(0, 20).map(c => (
                              <CommandItem key={c.id} onSelect={() => {
                                setClienteNome(c.nome)
                                setClienteId(c.id)
                                setClienteEmail(c.email ?? '')
                                setClienteTelefone(c.telefone ?? '')
                                setClientePopover(false)
                              }}>
                                {c.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Label style={{ fontFamily: 'Gilroy', fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>Telefone</Label>
                    <Input value={clienteTelefone} onChange={e => setClienteTelefone(e.target.value)} placeholder="(11) 99999-9999" style={{ fontFamily: 'Gilroy' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Label style={{ fontFamily: 'Gilroy', fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>E-mail</Label>
                    <Input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} placeholder="cliente@email.com" type="email" style={{ fontFamily: 'Gilroy' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Label style={{ fontFamily: 'Gilroy', fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>
                      Validade do orçamento
                    </Label>
                    <div>
                      <Input type="date" value={validade} onChange={e => setValidade(e.target.value)} style={{ fontFamily: 'Gilroy' }} />
                      {validade && (
                        <div style={{ marginTop: 6 }}>
                          <span style={{
                            background: diasValidade < 7 ? 'rgba(245,158,11,0.1)' : 'rgba(142,95,207,0.08)',
                            color: diasValidade < 7 ? '#F59E0B' : '#8E5FCF',
                            border: `1px solid ${diasValidade < 7 ? 'rgba(245,158,11,0.2)' : 'rgba(142,95,207,0.15)'}`,
                            borderRadius: 20, padding: '3px 10px',
                            fontSize: '0.72rem', fontFamily: 'Gilroy', fontWeight: 600,
                          }}>
                            Válido por {diasValidade} dias
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Label style={{ fontFamily: 'Gilroy', fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>Condição de pagamento</Label>
                    <Select value={condicao} onValueChange={setCondicao}>
                      <SelectTrigger style={{ fontFamily: 'Gilroy' }}><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="À vista">À vista</SelectItem>
                        <SelectItem value="30 dias">30 dias</SelectItem>
                        <SelectItem value="30/60 dias">30/60 dias</SelectItem>
                        <SelectItem value="30/60/90 dias">30/60/90 dias</SelectItem>
                        <SelectItem value="A combinar">A combinar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Label style={{ fontFamily: 'Gilroy', fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>Observações</Label>
                  <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações ou condições especiais…" rows={2} style={{ fontFamily: 'Gilroy' }} />
                </div>
              </div>
            </div>

            {/* ── Seção 2 — Itens ──────────────────────────────────────── */}
            <div>
              <p style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                color: '#9CA3AF', fontFamily: 'Gilroy', textTransform: 'uppercase',
                margin: '0 0 16px',
              }}>
                Produtos / Serviços
              </p>
              <div style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(142,95,207,0.1)',
                borderRadius: 16, overflow: 'hidden',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, rgba(142,95,207,0.08), rgba(71,17,143,0.05))' }}>
                        {[
                          { label: 'Produto',   w: '30%', align: 'left'  },
                          { label: 'Variação',  w: '15%', align: 'left'  },
                          { label: 'Qtd',       w: '8%',  align: 'right' },
                          { label: 'Unitário',  w: '14%', align: 'right' },
                          { label: 'Desconto',  w: '12%', align: 'right' },
                          { label: 'Total',     w: '14%', align: 'right' },
                          { label: '',          w: '7%',  align: 'right' },
                        ].map(col => (
                          <th key={col.label} style={{
                            textAlign: col.align as 'left' | 'right',
                            padding: '10px 12px', width: col.w,
                            fontFamily: 'Gilroy', fontWeight: 600,
                            color: '#8E5FCF', fontSize: '0.72rem',
                          }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: '1px solid rgba(142,95,207,0.08)' }}>
                      {itens.map(item => (
                        <ItemRow
                          key={item._key}
                          item={item}
                          produtos={produtos}
                          onUpdate={campo => atualizarItem(item._key, campo)}
                          onSelectProduto={pid => selecionarProduto(item._key, pid)}
                          onRemove={() => removerLinha(item._key)}
                          canRemove={itens.length > 1}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Botão adicionar linha */}
                <div style={{ borderTop: '1px solid rgba(142,95,207,0.08)', padding: '12px 14px' }}>
                  <button
                    onClick={adicionarLinha}
                    style={{
                      width: '100%', background: 'transparent',
                      border: '1px dashed rgba(142,95,207,0.3)', borderRadius: 10,
                      padding: '8px', color: '#8E5FCF',
                      fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.82rem',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,95,207,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <Plus size={14} /> Adicionar linha
                  </button>
                </div>
              </div>

              {/* Totais */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 32, fontSize: '0.875rem' }}>
                  <span style={{ color: '#9CA3AF', fontFamily: 'Gilroy' }}>Subtotal</span>
                  <span style={{ fontFamily: 'Gilroy', color: '#374151', minWidth: 120, textAlign: 'right', fontWeight: 500 }}>
                    {fmtBRL(subtotal)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 32, alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: '#9CA3AF', fontFamily: 'Gilroy' }}>Desconto geral</span>
                  <div style={{ minWidth: 120 }}>
                    <Input
                      type="number" min="0" step="0.01"
                      value={desconto || ''}
                      onChange={e => setDesconto(Number(e.target.value) || 0)}
                      className="h-7 text-right text-sm"
                      style={{ fontFamily: 'Gilroy' }}
                    />
                  </div>
                </div>
                <div style={{
                  display: 'flex', gap: 32, fontSize: '1rem', fontWeight: 700,
                  borderTop: '1px solid rgba(142,95,207,0.1)', paddingTop: 10, marginTop: 4,
                }}>
                  <span style={{ fontFamily: 'Gilroy', color: '#1F2937' }}>TOTAL</span>
                  <span style={{ fontFamily: 'Gilroy', color: '#8E5FCF', minWidth: 120, textAlign: 'right' }}>
                    {fmtBRL(total)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(142,95,207,0.1)',
          padding: '16px 24px', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
        }}>
          <button
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            style={{
              background: 'transparent', color: '#9CA3AF',
              border: '1px solid rgba(142,95,207,0.15)',
              borderRadius: 10, padding: '10px 18px',
              fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => salvar(false)}
              disabled={salvando}
              style={{
                background: 'rgba(142,95,207,0.07)', color: '#8E5FCF',
                border: '1px solid rgba(142,95,207,0.2)',
                borderRadius: 10, padding: '10px 18px',
                fontFamily: 'Gilroy', fontWeight: 600, fontSize: '0.875rem',
                cursor: salvando ? 'not-allowed' : 'pointer',
                opacity: salvando ? 0.7 : 1,
              }}
            >
              {salvando ? 'Salvando…' : 'Salvar Rascunho'}
            </button>
            <button
              onClick={() => salvar(true)}
              disabled={salvando}
              style={{
                background: 'linear-gradient(135deg, #8E5FCF, #47118F)',
                color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 20px',
                fontFamily: 'Gilroy', fontWeight: 700, fontSize: '0.875rem',
                cursor: salvando ? 'not-allowed' : 'pointer',
                opacity: salvando ? 0.7 : 1,
                boxShadow: '0 4px 15px rgba(142,95,207,0.35)',
              }}
            >
              {salvando ? 'Salvando…' : 'Salvar e Gerar PDF'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Row de item ──────────────────────────────────────────────────────────────

function ItemRow({
  item, produtos, onUpdate, onSelectProduto, onRemove, canRemove,
}: {
  item: ItemOrcamento
  produtos: Produto[]
  onUpdate: (c: Partial<ItemOrcamento>) => void
  onSelectProduto: (id: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const [pop, setPop] = useState(false)

  return (
    <tr className="group" style={{ borderBottom: '1px solid rgba(142,95,207,0.06)' }}>
      <td className="py-1.5 pr-2" style={{ padding: '8px 6px 8px 12px' }}>
        <Popover open={pop} onOpenChange={setPop} modal>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start font-normal text-xs h-8 truncate" style={{ fontFamily: 'Gilroy', borderColor: 'rgba(142,95,207,0.2)' }}>
              {item.produto_nome || <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />Selecionar…</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command filter={(value, search) => {
              const s = search.toLowerCase().trim();
              if (!s) return 1;
              const v = value.toLowerCase();
              const codePart = v.split(' ')[0];
              if (codePart && codePart === s) return 1;
              if (v.includes(s)) return 1;
              return 0;
            }}>
              <CommandInput
                placeholder="Buscar produto…"
                onValueChange={v => onUpdate({ produto_nome: v })}
              />
              <CommandList>
                <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                <CommandGroup>
                  {produtos.slice(0, 30).map(p => (
                    <CommandItem key={p.id} value={`${p.codigo || ''} ${p.nome}`} onSelect={() => { onSelectProduto(p.id); setPop(false) }}>
                      <div className="flex items-center gap-2 flex-1">
                        {p.codigo && <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.codigo}</span>}
                        <span>{p.nome}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">{p.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </td>
      <td style={{ padding: '8px 6px' }}>
        <Input value={item.variacao} onChange={e => onUpdate({ variacao: e.target.value })} placeholder="Ex: M / Preto" className="h-8 text-xs" style={{ fontFamily: 'Gilroy' }} />
      </td>
      <td style={{ padding: '8px 6px' }}>
        <Input type="number" min="1" value={item.quantidade} onChange={e => onUpdate({ quantidade: Number(e.target.value) || 1 })} className="h-8 text-xs text-right w-16" style={{ fontFamily: 'Gilroy' }} />
      </td>
      <td style={{ padding: '8px 6px' }}>
        <Input type="number" min="0" step="0.01" value={item.preco_unitario || ''} onChange={e => onUpdate({ preco_unitario: Number(e.target.value) || 0 })} className="h-8 text-xs text-right" style={{ fontFamily: 'Gilroy' }} />
      </td>
      <td style={{ padding: '8px 6px' }}>
        <Input type="number" min="0" step="0.01" value={item.desconto_item || ''} onChange={e => onUpdate({ desconto_item: Number(e.target.value) || 0 })} className="h-8 text-xs text-right" style={{ fontFamily: 'Gilroy' }} />
      </td>
      <td style={{ padding: '8px 12px 8px 6px', textAlign: 'right', fontFamily: 'Gilroy', fontSize: '0.8rem', fontWeight: 600, color: '#1F2937' }}>
        {item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
      <td style={{ padding: '8px 10px 8px 0', textAlign: 'right' }}>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onRemove} disabled={!canRemove}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </td>
    </tr>
  )
}
