import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { escapeHtml } from '@/utils/htmlSanitize';


// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MovimentacaoRelatorio {
  id: string;
  kind: 'sangria' | 'suprimento';
  valor: number;
  motivo: string | null;
  created_at: string;
}

export interface DadosRelatorio {
  id: string;
  operador_nome: string | null;
  fechado_por_nome?: string | null;
  valor_abertura: number;
  valor_fechamento_fisico: number | null;
  total_dinheiro: number;
  total_debito: number;
  total_credito: number;
  total_pix: number;
  total_vendas: number;
  total_sangrias: number;
  total_suprimentos: number;
  quebra_caixa: number | null;
  observacao_fechamento: string | null;
  aberto_em: string;
  fechado_em: string | null;
  movimentacoes?: MovimentacaoRelatorio[];
}

interface RelatorioCaixaProps {
  dados: DadosRelatorio;
  empresaNome: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });

const fmtHora = (iso: string) =>
  format(new Date(iso), "HH:mm", { locale: ptBR });

// ─── Componente ───────────────────────────────────────────────────────────────

export function RelatorioCaixa({ dados, empresaNome }: RelatorioCaixaProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const esperado =
    Number(dados.valor_abertura) +
    Number(dados.total_dinheiro) +
    Number(dados.total_suprimentos) -
    Number(dados.total_sangrias);

  const quebra = Number(dados.quebra_caixa ?? 0);
  const quebraPositiva = quebra >= 0;

  const handlePrint = () => {
    const conteudo = printRef.current?.innerHTML;
    if (!conteudo) return;

    const janela = window.open('', '_blank', 'width=600,height=900');
    if (!janela) return;

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Caixa — ${escapeHtml(empresaNome)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
            padding: 24px;
            max-width: 480px;
            margin: 0 auto;
          }
          .titulo { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 2px; }
          .empresa { text-align: center; font-size: 13px; margin-bottom: 12px; }
          .divisor { border: none; border-top: 1px dashed #000; margin: 10px 0; }
          .secao-titulo { font-weight: bold; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; }
          .linha { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .linha .label { flex: 1; }
          .linha .valor { font-weight: 500; white-space: nowrap; margin-left: 8px; }
          .total-linha { display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; }
          .quebra-pos { color: #166534; font-weight: bold; }
          .quebra-neg { color: #991b1b; font-weight: bold; }
          .assinatura { margin-top: 24px; }
          .linha-assinatura { border-top: 1px solid #000; width: 60%; margin: 8px 0 2px; }
          @media print {
            body { padding: 0; }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>${conteudo}</body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    setTimeout(() => { janela.print(); janela.close(); }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Botão de impressão (não aparece no print) */}
      <div className="flex justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir Relatório
        </Button>
      </div>

      {/* Conteúdo do relatório */}
      <div
        ref={printRef}
        className="font-mono text-sm text-foreground bg-card rounded-xl border border-border p-8 space-y-0"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Cabeçalho */}
        <p className="titulo text-center font-bold text-base">RELATÓRIO DE CAIXA</p>
        <p className="empresa text-center text-base mb-4">{empresaNome}</p>
        <hr className="divisor border-dashed border-border my-5" />

        <div className="space-y-2 mb-3 mt-3">
          <div className="linha flex justify-between">
            <span className="label">Data:</span>
            <span className="amount">{fmtData(dados.aberto_em)}</span>
          </div>
          <div className="linha flex justify-between">
            <span className="label">Abertura:</span>
            <span className="amount">{fmtHora(dados.aberto_em)}</span>
          </div>
          {dados.fechado_em && (
            <div className="linha flex justify-between">
              <span className="label">Fechamento:</span>
              <span className="amount">{fmtHora(dados.fechado_em)}</span>
            </div>
          )}
          <div className="linha flex justify-between">
            <span className="label">Aberto por:</span>
            <span className="amount">{dados.operador_nome ?? '—'}</span>
          </div>
          {dados.fechado_por_nome && (
            <div className="linha flex justify-between">
              <span className="label">Fechado por:</span>
              <span className="amount">{dados.fechado_por_nome}</span>
            </div>
          )}
          {!dados.fechado_por_nome && dados.fechado_em && (
            <div className="linha flex justify-between">
              <span className="label">Fechado por:</span>
              <span className="amount">{dados.operador_nome ?? '—'}</span>
            </div>
          )}
        </div>

        {/* Resumo de vendas */}
        <hr className="divisor border-dashed border-border my-5" />
        <p className="secao-titulo font-bold uppercase text-xs tracking-wide text-muted-foreground mt-2 mb-3">
          Resumo de Vendas
        </p>
        <div className="space-y-2">
          {[
            { label: 'Dinheiro:',       valor: dados.total_dinheiro  },
            { label: 'Cartão Débito:',  valor: dados.total_debito    },
            { label: 'Cartão Crédito:', valor: dados.total_credito   },
            { label: 'Pix:',            valor: dados.total_pix       },
          ].map(({ label, valor }) => (
            <div key={label} className="linha flex justify-between">
              <span className="label text-foreground/70">{label}</span>
              <span className="valor font-medium">{fmtBRL(valor)}</span>
            </div>
          ))}
          <div className="total-linha flex justify-between font-bold border-t border-border pt-2 mt-2">
            <span>TOTAL VENDAS:</span>
            <span>{fmtBRL(dados.total_vendas)}</span>
          </div>
        </div>

        {/* Controle de caixa */}
        <hr className="divisor border-dashed border-border my-5" />
        <p className="secao-titulo font-bold uppercase text-xs tracking-wide text-muted-foreground mt-2 mb-3">
          Controle de Caixa (Dinheiro)
        </p>
        <div className="space-y-2">
          {[
            { label: 'Troco inicial:',       valor: dados.valor_abertura,   sinal: '' },
            { label: '(+) Suprimentos:',     valor: dados.total_suprimentos, sinal: '+' },
            { label: '(-) Sangrias:',        valor: dados.total_sangrias,   sinal: '-' },
            { label: '(+) Vendas dinheiro:', valor: dados.total_dinheiro,   sinal: '+' },
          ].map(({ label, valor }) => (
            <div key={label} className="linha flex justify-between">
              <span className="label text-foreground/70">{label}</span>
              <span className="valor font-medium">{fmtBRL(valor)}</span>
            </div>
          ))}

          <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
            <span>ESPERADO NA GAVETA:</span>
            <span>{fmtBRL(esperado)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>CONTADO NA GAVETA:</span>
            <span>{fmtBRL(dados.valor_fechamento_fisico)}</span>
          </div>

          <div className="flex justify-between font-bold border-t border-border pt-2 mt-2">
            <span>QUEBRA DE CAIXA:</span>
            <span className={quebraPositiva ? 'text-green-700' : 'text-red-700'}>
              {quebraPositiva ? '+' : ''}{fmtBRL(quebra)}
            </span>
          </div>
        </div>

        {/* Movimentações */}
        {dados.movimentacoes && dados.movimentacoes.length > 0 && (
          <>
            <hr className="divisor border-dashed border-border my-5" />
            <p className="secao-titulo font-bold uppercase text-xs tracking-wide text-muted-foreground mt-2 mb-3">
              Movimentações
            </p>
            <div className="space-y-2">
              {dados.movimentacoes.map(m => (
                <div key={m.id} className="flex justify-between gap-2">
                  <span className={`text-xs ${m.kind === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                    {m.kind === 'sangria' ? '▼' : '▲'} {m.motivo || m.kind}
                    <span className="text-muted-foreground ml-1">({fmtHora(m.created_at)})</span>
                  </span>
                  <span className={`font-medium text-xs ${m.kind === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                    {m.kind === 'sangria' ? '-' : '+'}{fmtBRL(m.valor)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Observações */}
        {dados.observacao_fechamento && (
          <>
            <hr className="divisor border-dashed border-border my-5" />
            <p className="secao-titulo font-bold uppercase text-xs tracking-wide text-muted-foreground mt-2 mb-2">
              Observações
            </p>
            <p className="text-foreground/70 text-sm">{dados.observacao_fechamento}</p>
          </>
        )}

        {/* Assinatura */}
        <hr className="divisor border-dashed border-border my-6" />
        <div className="assinatura mt-6">
          <div className="linha-assinatura w-56 border-t border-muted-foreground/40 mb-1" />
          <p className="text-xs text-muted-foreground">Assinatura do operador(a)</p>
        </div>
      </div>
    </div>
  );
}
