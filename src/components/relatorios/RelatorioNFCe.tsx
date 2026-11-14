import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, FileSpreadsheet, FileText, Loader2, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { escapeHtml } from '@/utils/htmlSanitize';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface NotaFiscal {
  id: string;
  numero: number;
  serie: number;
  status: string;
  ambiente: string;
  valor_total: number;
  cliente_nome: string | null;
  cliente_cpf: string | null;
  data_emissao: string;
  chave_acesso: string | null;
}

interface RelatorioNFCeProps {
  onClose: () => void;
}

export const RelatorioNFCe: React.FC<RelatorioNFCeProps> = ({ onClose }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterAmbiente, setFilterAmbiente] = useState<string>('todos');
  
  const [popoverInicioOpen, setPopoverInicioOpen] = useState(false);
  const [popoverFimOpen, setPopoverFimOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotas();
    }
  }, [user, dataInicio, dataFim]);

  const fetchNotas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notas_fiscais')
      .select('id, numero, serie, status, ambiente, valor_total, cliente_nome, cliente_cpf, data_emissao, chave_acesso')
      .gte('data_emissao', format(dataInicio, 'yyyy-MM-dd'))
      .lte('data_emissao', format(dataFim, 'yyyy-MM-dd') + 'T23:59:59')
      .order('data_emissao', { ascending: false });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar notas fiscais",
        variant: "destructive"
      });
    } else {
      setNotas(data || []);
    }
    setLoading(false);
  };

  const filteredNotas = notas.filter(nota => {
    const matchStatus = filterStatus === 'todos' || nota.status === filterStatus;
    const matchAmbiente = filterAmbiente === 'todos' || nota.ambiente === filterAmbiente;
    return matchStatus && matchAmbiente;
  });

  const totais = {
    total: filteredNotas.length,
    autorizadas: filteredNotas.filter(n => n.status === 'autorizada').length,
    canceladas: filteredNotas.filter(n => n.status === 'cancelada').length,
    rejeitadas: filteredNotas.filter(n => n.status === 'rejeitada').length,
    valorAutorizadas: filteredNotas.filter(n => n.status === 'autorizada').reduce((sum, n) => sum + Number(n.valor_total), 0),
    valorTotal: filteredNotas.reduce((sum, n) => sum + Number(n.valor_total), 0),
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const setPresetPeriod = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case 'mes_atual':
        setDataInicio(startOfMonth(now));
        setDataFim(endOfMonth(now));
        break;
      case 'mes_anterior':
        setDataInicio(startOfMonth(subMonths(now, 1)));
        setDataFim(endOfMonth(subMonths(now, 1)));
        break;
      case 'ultimos_3_meses':
        setDataInicio(startOfMonth(subMonths(now, 2)));
        setDataFim(endOfMonth(now));
        break;
      case 'ano_atual':
        setDataInicio(startOfYear(now));
        setDataFim(endOfMonth(now));
        break;
    }
  };

  const exportToExcel = async () => {
    setExporting('excel');
    try {
      // Criar CSV (Excel-compatible)
      const headers = ['Número', 'Série', 'Data Emissão', 'Cliente', 'CPF', 'Valor', 'Status', 'Ambiente', 'Chave de Acesso'];
      const rows = filteredNotas.map(nota => [
        nota.numero,
        nota.serie,
        format(new Date(nota.data_emissao), 'dd/MM/yyyy HH:mm'),
        nota.cliente_nome || 'Não identificado',
        nota.cliente_cpf || '',
        Number(nota.valor_total).toFixed(2).replace('.', ','),
        nota.status,
        nota.ambiente,
        nota.chave_acesso || ''
      ]);

      // Adicionar totais
      rows.push([]);
      rows.push(['RESUMO']);
      rows.push(['Total de Notas', totais.total]);
      rows.push(['Autorizadas', totais.autorizadas]);
      rows.push(['Canceladas', totais.canceladas]);
      rows.push(['Rejeitadas', totais.rejeitadas]);
      rows.push(['Valor Total (Autorizadas)', formatCurrency(totais.valorAutorizadas)]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // BOM para Excel reconhecer UTF-8
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_nfce_${format(dataInicio, 'yyyy-MM-dd')}_${format(dataFim, 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportado",
        description: "Relatório exportado para Excel com sucesso"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao exportar para Excel",
        variant: "destructive"
      });
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async () => {
    setExporting('pdf');
    try {
      // Criar HTML para impressão/PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Não foi possível abrir a janela de impressão');
      }

      const statusLabels: Record<string, string> = {
        autorizada: 'Autorizada',
        pendente: 'Pendente',
        rejeitada: 'Rejeitada',
        cancelada: 'Cancelada'
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório de NFC-e</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { text-align: center; margin-bottom: 5px; }
            .periodo { text-align: center; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .resumo { margin-top: 30px; }
            .resumo h3 { margin-bottom: 10px; }
            .resumo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .resumo-item { padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .resumo-item strong { display: block; font-size: 18px; margin-top: 5px; }
            .status-autorizada { color: #059669; }
            .status-cancelada { color: #6b7280; }
            .status-rejeitada { color: #dc2626; }
            .status-pendente { color: #d97706; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório de NFC-e</h1>
          <p class="periodo">
            Período: ${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}
            ${filterStatus !== 'todos' ? ` | Status: ${statusLabels[filterStatus]}` : ''}
            ${filterAmbiente !== 'todos' ? ` | Ambiente: ${filterAmbiente === 'producao' ? 'Produção' : 'Homologação'}` : ''}
          </p>
          
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Data Emissão</th>
                <th>Cliente</th>
                <th>CPF</th>
                <th class="text-right">Valor</th>
                <th>Status</th>
                <th>Ambiente</th>
              </tr>
            </thead>
            <tbody>
              ${filteredNotas.map(nota => `
                <tr>
                  <td>${nota.numero}/${nota.serie}</td>
                  <td>${format(new Date(nota.data_emissao), 'dd/MM/yyyy HH:mm')}</td>
                  <td>${escapeHtml(nota.cliente_nome || 'Não identificado')}</td>
                  <td>${escapeHtml(nota.cliente_cpf || '-')}</td>
                  <td class="text-right">${formatCurrency(Number(nota.valor_total))}</td>
                  <td class="status-${nota.status}">${statusLabels[nota.status] || nota.status}</td>
                  <td>${nota.ambiente === 'producao' ? 'Produção' : 'Homologação'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="resumo">
            <h3>Resumo</h3>
            <div class="resumo-grid">
              <div class="resumo-item">
                <span>Total de Notas</span>
                <strong>${totais.total}</strong>
              </div>
              <div class="resumo-item">
                <span>Autorizadas</span>
                <strong class="status-autorizada">${totais.autorizadas}</strong>
              </div>
              <div class="resumo-item">
                <span>Canceladas</span>
                <strong class="status-cancelada">${totais.canceladas}</strong>
              </div>
              <div class="resumo-item">
                <span>Rejeitadas</span>
                <strong class="status-rejeitada">${totais.rejeitadas}</strong>
              </div>
              <div class="resumo-item">
                <span>Valor Total (Autorizadas)</span>
                <strong>${formatCurrency(totais.valorAutorizadas)}</strong>
              </div>
              <div class="resumo-item">
                <span>Valor Total Geral</span>
                <strong>${formatCurrency(totais.valorTotal)}</strong>
              </div>
            </div>
          </div>

          <br>
          <button onclick="window.print()">Imprimir / Salvar como PDF</button>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

      toast({
        title: "PDF Gerado",
        description: "Use Ctrl+P ou o botão para salvar como PDF"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar PDF",
        variant: "destructive"
      });
    } finally {
      setExporting(null);
    }
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    autorizada: { label: 'Autorizada', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500' },
    pendente: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500' },
    rejeitada: { label: 'Rejeitada', color: 'bg-red-500/10 text-red-600 border-red-500' },
    cancelada: { label: 'Cancelada', color: 'bg-muted text-muted-foreground border-border' },
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Relatório de NFC-e
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Atalhos de período */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPresetPeriod('mes_atual')}>
              Mês Atual
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetPeriod('mes_anterior')}>
              Mês Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetPeriod('ultimos_3_meses')}>
              Últimos 3 Meses
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetPeriod('ano_atual')}>
              Ano Atual
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {/* Data Início */}
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover open={popoverInicioOpen} onOpenChange={setPopoverInicioOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataInicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataInicio}
                    onSelect={(date) => {
                      if (date) setDataInicio(date);
                      setPopoverInicioOpen(false);
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover open={popoverFimOpen} onOpenChange={setPopoverFimOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataFim && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFim}
                    onSelect={(date) => {
                      if (date) setDataFim(date);
                      setPopoverFimOpen(false);
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="autorizada">Autorizadas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="rejeitada">Rejeitadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ambiente */}
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <Select value={filterAmbiente} onValueChange={setFilterAmbiente}>
                <SelectTrigger>
                  <SelectValue placeholder="Ambiente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="homologacao">Homologação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="flex gap-2 pt-2">
            <Button onClick={exportToExcel} disabled={exporting !== null || filteredNotas.length === 0}>
              {exporting === 'excel' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Exportar Excel
            </Button>
            <Button onClick={exportToPDF} disabled={exporting !== null || filteredNotas.length === 0} variant="outline">
              {exporting === 'pdf' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Exportar PDF
            </Button>
            <Button variant="ghost" onClick={onClose} className="ml-auto">
              Fechar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total de Notas</p>
            <p className="text-2xl font-bold">{totais.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Autorizadas</p>
            <p className="text-2xl font-bold text-emerald-600">{totais.autorizadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Canceladas</p>
            <p className="text-2xl font-bold text-muted-foreground">{totais.canceladas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Rejeitadas</p>
            <p className="text-2xl font-bold text-destructive">{totais.rejeitadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valor (Autorizadas)</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totais.valorAutorizadas)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Notas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detalhamento</span>
            <Badge variant="outline">{filteredNotas.length} notas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : filteredNotas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma nota encontrada no período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ambiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotas.map(nota => {
                    const status = statusConfig[nota.status] || statusConfig.pendente;
                    return (
                      <TableRow key={nota.id}>
                        <TableCell className="font-medium">{nota.numero}/{nota.serie}</TableCell>
                        <TableCell>{format(new Date(nota.data_emissao), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{nota.cliente_nome || 'Não identificado'}</TableCell>
                        <TableCell>{nota.cliente_cpf || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(nota.valor_total))}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {nota.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
