import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfUploader } from './PdfUploader';
import { TransactionReview } from './TransactionReview';
import { processPdfFile, Transaction, ProcessedPdf } from '@/utils/pdfProcessor';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface PdfImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (transactions: Transaction[]) => void;
}

type ImportStep = 'upload' | 'processing' | 'review' | 'complete';

export const PdfImportDialog: React.FC<PdfImportDialogProps> = ({
  open,
  onOpenChange,
  onImportComplete
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [processedData, setProcessedData] = useState<ProcessedPdf | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    setStep('processing');
    setError('');

    try {
      const result = await processPdfFile(file);
      setProcessedData(result);
      setTransactions(result.transactions);
      setStep('review');
      
      toast({
        title: "PDF processado com sucesso!",
        description: `${result.transactions.length} transações encontradas`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStep('upload');
      
      toast({
        title: "Erro ao processar PDF",
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const handleTransactionsUpdate = (updatedTransactions: Transaction[]) => {
    setTransactions(updatedTransactions);
  };

  const handleConfirmImport = () => {
    onImportComplete(transactions);
    setStep('complete');
    
    toast({
      title: "Transações importadas!",
      description: `${transactions.length} transações foram adicionadas ao seu sistema`,
    });

    // Close dialog after a short delay
    setTimeout(() => {
      onOpenChange(false);
      resetDialog();
    }, 1500);
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetDialog();
  };

  const resetDialog = () => {
    setStep('upload');
    setProcessedData(null);
    setTransactions([]);
    setError('');
  };

  const renderStepContent = () => {
    switch (step) {
      case 'upload':
        return (
          <PdfUploader
            onFileUpload={handleFileUpload}
            error={error}
          />
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Processando extrato...</h3>
              <p className="text-muted-foreground mt-1">
                Analisando transações e categorizando automaticamente
              </p>
            </div>
          </div>
        );

      case 'review':
        return processedData ? (
          <TransactionReview
            transactions={transactions}
            onTransactionsUpdate={handleTransactionsUpdate}
            onConfirm={handleConfirmImport}
            onCancel={handleCancel}
            totalIncome={processedData.totalIncome}
            totalExpenses={processedData.totalExpenses}
          />
        ) : null;

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-success">Importação concluída!</h3>
              <p className="text-muted-foreground mt-1">
                Suas transações foram adicionadas com sucesso
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    switch (step) {
      case 'upload':
        return 'Importar Extrato Bancário';
      case 'processing':
        return 'Processando Extrato';
      case 'review':
        return 'Revisar Transações';
      case 'complete':
        return 'Importação Concluída';
      default:
        return 'Importar Extrato';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
};