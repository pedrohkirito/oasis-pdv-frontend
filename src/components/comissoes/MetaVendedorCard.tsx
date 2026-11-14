import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { staggerItem } from '@/components/layout/PageTransition';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface MetaVendedorCardProps {
  vendedorNome: string;
  meta: number;
  vendido: number;
  showVendedorName?: boolean;
}

const MetaVendedorCard: React.FC<MetaVendedorCardProps> = ({ vendedorNome, meta, vendido, showVendedorName = true }) => {
  const percentual = meta > 0 ? Math.min((vendido / meta) * 100, 100) : 0;
  const percentualReal = meta > 0 ? (vendido / meta) * 100 : 0;
  const faltando = Math.max(meta - vendido, 0);
  const atingiu = vendido >= meta && meta > 0;

  return (
    <motion.div variants={staggerItem}>
      <Card className={`hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-l-4 ${
        atingiu ? 'border-l-emerald-500' : percentualReal >= 70 ? 'border-l-amber-500' : 'border-l-muted'
      }`}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className={`h-4 w-4 ${atingiu ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              {showVendedorName && (
                <span className="text-sm font-semibold truncate max-w-[160px]">{vendedorNome}</span>
              )}
              {!showVendedorName && (
                <span className="text-sm font-medium text-muted-foreground">Minha Meta</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {atingiu ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`text-lg font-bold ${
                atingiu ? 'text-emerald-600' : percentualReal >= 70 ? 'text-amber-600' : 'text-foreground'
              }`}>
                {percentualReal.toFixed(0)}%
              </span>
            </div>
          </div>

          <Progress value={percentual} className="h-2.5" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{formatCurrency(vendido)}</span>
              {' '}de {formatCurrency(meta)}
            </div>
            {!atingiu && meta > 0 && (
              <span>Faltam {formatCurrency(faltando)}</span>
            )}
            {atingiu && (
              <span className="text-emerald-600 font-semibold">Meta atingida! 🎯</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MetaVendedorCard;
