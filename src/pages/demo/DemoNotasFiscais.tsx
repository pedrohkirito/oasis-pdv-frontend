/**
 * DemoNotasFiscais — versão estática para demonstração pública.
 * Dados 100% fictícios. NÃO conecta ao Supabase nem a nenhum hook de auth.
 * Rota: /demo/notas-fiscais
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, FileText, XCircle,
  CheckCircle, Clock, BarChart3, Ban,
} from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Status = 'autorizada' | 'cancelada' | 'pendente';

interface NotaDemo {
  id: number;
  numero: number;
  status: Status;
  ambiente: 'producao' | 'homologacao';
  valor_total: number;
  cliente_nome: string;
  data_emissao: string;
}

// ─── Dados fictícios ──────────────────────────────────────────────────────────

const NOTAS: NotaDemo[] = [
  { id: 1, numero: 1052, status: 'autorizada', ambiente: 'producao', valor_total: 847.00,  cliente_nome: 'Maria S.',  data_emissao: '23/03/2026' },
  { id: 2, numero: 1051, status: 'autorizada', ambiente: 'producao', valor_total: 1230.00, cliente_nome: 'João P.',   data_emissao: '23/03/2026' },
  { id: 3, numero: 1050, status: 'cancelada',  ambiente: 'producao', valor_total: 520.00,  cliente_nome: 'Ana L.',    data_emissao: '22/03/2026' },
  { id: 4, numero: 1049, status: 'autorizada', ambiente: 'producao', valor_total: 390.00,  cliente_nome: 'Carlos M.', data_emissao: '22/03/2026' },
  { id: 5, numero: 1048, status: 'pendente',   ambiente: 'producao', valor_total: 960.00,  cliente_nome: 'Fernanda R.', data_emissao: '21/03/2026' },
  { id: 6, numero: 1047, status: 'autorizada', ambiente: 'producao', valor_total: 1840.00, cliente_nome: 'Roberto A.', data_emissao: '21/03/2026' },
  { id: 7, numero: 1046, status: 'autorizada', ambiente: 'producao', valor_total: 730.00,  cliente_nome: 'Lucia F.',  data_emissao: '20/03/2026' },
  { id: 8, numero: 1045, status: 'pendente',   ambiente: 'producao', valor_total: 280.00,  cliente_nome: 'Pedro C.',  data_emissao: '20/03/2026' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  autorizada: {
    label: 'Autorizada',
    color: 'bg-success/10 text-success border-success',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  pendente: {
    label: 'Pendente',
    color: 'bg-warning/10 text-warning border-warning',
    icon: <Clock className="h-3 w-3" />,
  },
  cancelada: {
    label: 'Cancelada',
    color: 'bg-muted text-muted-foreground border-border',
    icon: <XCircle className="h-3 w-3" />,
  },
};

// ─── Linha de nota ────────────────────────────────────────────────────────────

function NotaRow({ nota }: { nota: NotaDemo }) {
  const status = STATUS_CONFIG[nota.status];
  return (
    <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
      {/* Esquerda */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">NFC-e {nota.numero}</p>
            <Badge variant="outline" className={status.color}>
              {status.icon}
              <span className="ml-1">{status.label}</span>
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Produção
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {nota.cliente_nome} · {nota.data_emissao}
          </p>
        </div>
      </div>

      {/* Direita */}
      <span className="font-semibold text-[#1F2937] whitespace-nowrap ml-8">
        {fmtBRL(nota.valor_total)}
      </span>
    </div>
  );
}

// ─── Página demo ──────────────────────────────────────────────────────────────

export default function DemoNotasFiscais() {
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | Status>('todos');

  const filtered = NOTAS.filter((n) => {
    const matchSearch =
      String(n.numero).includes(search) ||
      n.cliente_nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || n.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalAutorizadas = NOTAS.filter(n => n.status === 'autorizada').length;
  const totalCanceladas  = NOTAS.filter(n => n.status === 'cancelada').length;
  const valorTotal       = NOTAS
    .filter(n => n.status === 'autorizada')
    .reduce((s, n) => s + n.valor_total, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Faixa demo */}
      <div className="bg-primary text-white text-center py-2 text-sm font-medium tracking-wide">
        🔎 Modo Demonstração — dados fictícios para fins ilustrativos
      </div>

      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">

        {/* ── Cabeçalho ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Notas Fiscais</h1>
            <p className="text-sm text-muted-foreground mt-1">Emissão e gerenciamento de NFC-e</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" disabled>
              <Ban className="h-4 w-4" />
              Inutilizar Numeração
            </Button>
            <Button className="gap-2" disabled>
              <BarChart3 className="h-4 w-4" />
              Relatório
            </Button>
          </div>
        </div>

        {/* ── Cards de resumo ───────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Notas Autorizadas</p>
              <p className="text-2xl font-bold text-success mt-1">{totalAutorizadas}</p>
              <p className="text-xs text-muted-foreground mt-1">emitidas com sucesso</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Notas Canceladas</p>
              <p className="text-2xl font-bold mt-1">{totalCanceladas}</p>
              <p className="text-xs text-muted-foreground mt-1">canceladas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Valor Total (Autorizadas)</p>
              <p className="text-2xl font-bold text-primary mt-1">{fmtBRL(valorTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">faturamento fiscal</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Filtros ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por número ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            {(['todos', 'autorizada', 'pendente', 'cancelada'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={[
                  'h-8 px-3 text-xs font-medium rounded-lg border transition-colors duration-200',
                  filterStatus === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                ].join(' ')}
              >
                {s === 'todos'      ? 'Todos'      :
                 s === 'autorizada' ? 'Autorizadas' :
                 s === 'pendente'   ? 'Pendentes'  : 'Canceladas'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Lista de notas ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Notas Fiscais</span>
              <Badge variant="outline">{filtered.length} notas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma nota encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((nota) => (
                  <NotaRow key={nota.id} nota={nota} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Rodapé demo ───────────────────────────────────────────── */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Esta é uma demonstração com dados fictícios.{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Acesse o sistema real →
          </Link>
        </p>

      </div>
    </div>
  );
}
