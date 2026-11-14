import React, { useState } from 'react';
import { Transaction, formatCurrency, getCategoryColor } from '@/utils/pdfProcessor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Edit3, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionReviewProps {
  transactions: Transaction[];
  onTransactionsUpdate: (transactions: Transaction[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
  totalIncome: number;
  totalExpenses: number;
}

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Saúde', 'Moradia', 'Educação',
  'Lazer', 'Vestuário', 'Serviços', 'Investimentos', 'Renda', 'Outros'
];

export const TransactionReview: React.FC<TransactionReviewProps> = ({
  transactions,
  onTransactionsUpdate,
  onConfirm,
  onCancel,
  totalIncome,
  totalExpenses
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditForm(transaction);
  };

  const saveEdit = () => {
    if (editingId && editForm) {
      const updatedTransactions = transactions.map(t =>
        t.id === editingId ? { ...t, ...editForm } : t
      );
      onTransactionsUpdate(updatedTransactions);
      setEditingId(null);
      setEditForm({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    } else if (confidence >= 0.5) {
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.5) return 'Média';
    return 'Baixa';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Receitas</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Despesas</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Líquido</p>
                <p className={cn(
                  "text-2xl font-bold",
                  totalIncome - totalExpenses >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(totalIncome - totalExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transações Identificadas ({transactions.length})</span>
            <Badge variant="outline">
              {transactions.filter(t => t.confidence < 0.5).length} precisam revisão
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions.map((transaction, index) => (
              <div key={transaction.id}>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  {editingId === transaction.id ? (
                    /* Edit Mode */
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <Label htmlFor="date" className="text-xs">Data</Label>
                        <Input
                          id="date"
                          value={editForm.date || ''}
                          onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-xs">Descrição</Label>
                        <Input
                          id="description"
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category" className="text-xs">Categoria</Label>
                        <Select
                          value={editForm.category}
                          onValueChange={(value) => setEditForm({...editForm, category: value})}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount" className="text-xs">Valor</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={editForm.amount || ''}
                          onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                          className="h-8"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={saveEdit} className="h-8 px-2">
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} className="h-8 px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <p className="font-medium text-sm">{transaction.date}</p>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getConfidenceIcon(transaction.confidence)}
                            <span className="text-xs text-muted-foreground">
                              Confiança: {getConfidenceText(transaction.confidence)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <Badge className={getCategoryColor(transaction.category)}>
                            {transaction.category}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "font-bold",
                            transaction.type === 'income' ? "text-success" : "text-destructive"
                          )}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(transaction)}
                            className="h-8 px-2"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {index < transactions.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} className="bg-success hover:bg-success/90">
          <CheckCircle className="h-4 w-4 mr-2" />
          Confirmar e Importar ({transactions.length} transações)
        </Button>
      </div>
    </div>
  );
};