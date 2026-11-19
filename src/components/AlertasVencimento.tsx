import React, { useState, useEffect } from 'react';
import { AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { differenceInDays, format, startOfDay } from 'date-fns';
import { diaCalendario } from '@/lib/dia';
import { ajustarParaProximoDiaUtil } from '@/utils/feriadosUtils';
import { useNavigate } from 'react-router-dom';

interface ContaAlerta {
  id: string;
  description: string;
  supplier_name: string;
  amount: number;
  due_on: string;
  status: string;
  diasRestantes: number;
}

export const AlertasVencimento = () => {
  const { user } = useAuth();
  const { companyId } = useEmpresa();
  const navigate = useNavigate();
  const [contasVencidas, setContasVencidas] = useState<ContaAlerta[]>([]);
  const [contasProximas, setContasProximas] = useState<ContaAlerta[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user && companyId) {
      fetchContasAlerta();
    }
  }, [user, companyId]);

  const fetchContasAlerta = async () => {
    const hoje = startOfDay(new Date());
    const hojeStr = format(hoje, 'yyyy-MM-dd');
    
    // Buscar contas pendentes
    const { data } = await api
      .from('payable')
      .select('*')
      .eq('status', 'pendente')
      .eq('company_id', companyId)
      .order('due_on', { ascending: true });

    if (data) {
      const vencidas: ContaAlerta[] = [];
      const proximas: ContaAlerta[] = [];

      // Atualizar status de contas vencidas no banco
      const contasParaAtualizar: string[] = [];

      data.forEach(conta => {
        const dataVencOriginal = diaCalendario(conta.due_on);
        if (!dataVencOriginal) return;
        const dataVencAjustada = ajustarParaProximoDiaUtil(dataVencOriginal);
        const diasRestantes = differenceInDays(dataVencAjustada, hoje);

        const contaAlerta: ContaAlerta = {
          ...conta,
          diasRestantes,
        };

        if (diasRestantes < 0) {
          vencidas.push(contaAlerta);
          contasParaAtualizar.push(conta.id);
        } else if (diasRestantes <= 7) {
          proximas.push(contaAlerta);
        }
      });

      // Atualizar status das contas vencidas para 'vencido'
      if (contasParaAtualizar.length > 0) {
        await api
          .from('payable')
          .update({ status: 'vencido' })
          .in('id', contasParaAtualizar);
      }

      setContasVencidas(vencidas);
      setContasProximas(proximas);
    }
  };

  const formatCurrency = (value: unknown) => {
    const n = Number(value ?? 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(n) ? n : 0);
  };

  if (dismissed || (contasVencidas.length === 0 && contasProximas.length === 0)) {
    return null;
  }

  const totalVencido = contasVencidas.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalProximo = contasProximas.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className="space-y-3">
      {contasVencidas.length > 0 && (
        <div
          className="liquid-glass p-4"
          style={{ borderColor: 'rgba(239,68,68,0.35)', borderTopColor: 'rgba(255,255,255,0.80)' }}
        >
          {/* Tint de cor semântica por cima do glass */}
          <div
            className="absolute inset-0 rounded-[inherit] pointer-events-none"
            style={{ background: 'rgba(239,68,68,0.05)', zIndex: 0 }}
          />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(239,68,68,0.12)' }}>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <AlertTitle className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-destructive">Contas Vencidas</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={() => setDismissed(true)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Você tem {contasVencidas.length} conta(s) vencida(s) totalizando{' '}
                    <span className="text-destructive font-semibold">{formatCurrency(totalVencido)}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {contasVencidas.slice(0, 3).map(conta => (
                      <Badge key={conta.id} variant="outline"
                        className="bg-destructive/10 border-destructive/25 text-destructive text-[11px]">
                        {conta.description} · {formatCurrency(conta.amount)} ({Math.abs(conta.diasRestantes)}d atraso)
                      </Badge>
                    ))}
                    {contasVencidas.length > 3 && (
                      <Badge variant="outline" className="bg-destructive/10 border-destructive/25 text-destructive text-[11px]">
                        +{contasVencidas.length - 3} mais
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="mt-1 h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => navigate('/contas-a-pagar')}
                  >
                    Ver todas as contas
                  </Button>
                </div>
              </AlertDescription>
            </div>
          </div>
        </div>
      )}

      {contasProximas.length > 0 && (
        <div
          className="liquid-glass p-4"
          style={{ borderColor: 'rgba(245,158,11,0.35)', borderTopColor: 'rgba(255,255,255,0.80)' }}
        >
          <div
            className="absolute inset-0 rounded-[inherit] pointer-events-none"
            style={{ background: 'rgba(245,158,11,0.04)', zIndex: 0 }}
          />
          <div className="relative z-10 flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'rgba(245,158,11,0.12)' }}>
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <AlertTitle className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-warning">Contas Próximas do Vencimento</span>
                {contasVencidas.length === 0 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={() => setDismissed(true)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {contasProximas.length} conta(s) vencem nos próximos 7 dias — Total:{' '}
                    <span className="text-warning font-semibold">{formatCurrency(totalProximo)}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {contasProximas.slice(0, 5).map(conta => (
                      <Badge key={conta.id} variant="outline"
                        className="bg-warning/10 border-warning/25 text-warning text-[11px]">
                        {conta.description} · {formatCurrency(conta.amount)} (
                        {conta.diasRestantes === 0 ? 'Hoje' : `${conta.diasRestantes}d`})
                      </Badge>
                    ))}
                    {contasProximas.length > 5 && (
                      <Badge variant="outline" className="bg-warning/10 border-warning/25 text-warning text-[11px]">
                        +{contasProximas.length - 5} mais
                      </Badge>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
