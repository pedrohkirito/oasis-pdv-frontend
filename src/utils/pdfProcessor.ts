// Utility functions for PDF processing and transaction categorization

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  confidence: number;
}

export interface ProcessedPdf {
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  processingDate: string;
}

// Category mapping with keywords for automatic categorization
const CATEGORY_MAPPINGS = {
  'Alimentação': [
    'supermercado', 'mercado', 'padaria', 'restaurante', 'lanchonete', 'ifood',
    'uber eats', 'delivery', 'comida', 'cafe', 'bar', 'cervejaria', 'pizzaria',
    'sao luiz', 'carrefour', 'extra', 'pao de acucar', 'walmart'
  ],
  'Transporte': [
    'combustivel', 'gasolina', 'etanol', 'posto', 'uber', '99', 'taxi',
    'onibus', 'metro', 'trem', 'pedagio', 'estacionamento', 'mecanica',
    'ipva', 'seguro auto', 'vistoria'
  ],
  'Saúde': [
    'farmacia', 'hospital', 'clinica', 'medico', 'dentista', 'laboratorio',
    'exame', 'consulta', 'plano de saude', 'unimed', 'bradesco saude',
    'academia', 'fisioterapia'
  ],
  'Moradia': [
    'aluguel', 'condominio', 'iptu', 'luz', 'energia', 'agua', 'gas',
    'internet', 'telefone', 'net', 'vivo', 'oi', 'tim', 'claro',
    'construcao', 'reforma', 'material construcao'
  ],
  'Educação': [
    'escola', 'faculdade', 'universidade', 'curso', 'livro', 'material escolar',
    'mensalidade', 'matricula', 'estacio', 'unopar', 'anhanguera'
  ],
  'Lazer': [
    'cinema', 'teatro', 'show', 'viagem', 'hotel', 'pousada', 'netflix',
    'spotify', 'amazon prime', 'disney', 'jogos', 'shopping'
  ],
  'Vestuário': [
    'roupa', 'calcado', 'sapato', 'tenis', 'shopping', 'loja', 'c&a',
    'renner', 'riachuelo', 'zara', 'h&m'
  ],
  'Serviços': [
    'banco', 'tarifa', 'anuidade', 'cartao', 'emprestimo', 'financiamento',
    'seguro', 'advocacia', 'contabilidade', 'despachante'
  ],
  'Investimentos': [
    'aplicacao', 'investimento', 'poupanca', 'cdb', 'tesouro', 'acoes',
    'fundo', 'previdencia'
  ],
  'Renda': [
    'salario', 'ordenado', 'pagamento', 'freelance', 'honorario', 'comissao',
    'bonus', 'decimo', 'ferias', 'rescisao', 'pix recebido', 'transferencia recebida'
  ]
};

// Common income keywords
const INCOME_KEYWORDS = [
  'salario', 'ordenado', 'pagamento', 'deposito', 'transferencia recebida',
  'pix recebido', 'credito', 'receita', 'rendimento', 'aplicacao resgate',
  'freelance', 'honorario', 'comissao', 'bonus', 'restituicao'
];

// Extract text from PDF using a simplified approach
export const extractTextFromPdf = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // For now, we'll simulate PDF processing
        // In a real implementation, you would use pdf-parse or similar library
        // Since we can't use Node.js libraries directly in the browser,
        // we'll create a mock response that demonstrates the functionality
        
        setTimeout(() => {
          const mockText = `
            EXTRATO BANCÁRIO
            Período: 01/01/2024 a 31/01/2024
            
            01/01/2024 | DEPOSITO SALARIO           | +5000.00
            02/01/2024 | SUPERMERCADO SAO LUIZ     | -250.00
            03/01/2024 | POSTO SHELL COMBUSTIVEL   | -120.00
            04/01/2024 | FARMACIA DROGASIL         | -80.00
            05/01/2024 | NETFLIX ASSINATURA        | -29.90
            06/01/2024 | PIX RECEBIDO FREELANCE    | +800.00
            07/01/2024 | RESTAURANTE BURGER KING   | -45.00
            08/01/2024 | ACADEMIA SMART FIT        | -89.90
            09/01/2024 | CONDOMINIO JANEIRO        | -350.00
            10/01/2024 | TRANSFERENCIA RECEBIDA    | +200.00
          `;
          resolve(mockText);
        }, 2000);
        
      } catch (error) {
        reject(new Error('Erro ao processar PDF: ' + error));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
};

// Parse extracted text into transactions
export const parseTransactions = (text: string): Transaction[] => {
  const lines = text.split('\n').filter(line => line.trim());
  const transactions: Transaction[] = [];
  
  for (const line of lines) {
    const transactionMatch = line.match(/(\d{2}\/\d{2}\/\d{4})\s*\|\s*(.+?)\s*\|\s*([\+\-]?)(\d+\.?\d*)/);
    
    if (transactionMatch) {
      const [, date, description, sign, amount] = transactionMatch;
      const numericAmount = parseFloat(amount);
      const isIncome = sign === '+' || isIncomeTransaction(description);
      
      const transaction: Transaction = {
        id: `${date}-${Math.random().toString(36).substr(2, 9)}`,
        date: date,
        description: description.trim(),
        amount: numericAmount,
        type: isIncome ? 'income' : 'expense',
        category: categorizeTransaction(description, isIncome),
        confidence: calculateConfidence(description)
      };
      
      transactions.push(transaction);
    }
  }
  
  return transactions;
};

// Determine if a transaction is income based on description
const isIncomeTransaction = (description: string): boolean => {
  const lowerDesc = description.toLowerCase();
  return INCOME_KEYWORDS.some(keyword => lowerDesc.includes(keyword));
};

// Categorize transaction based on description
const categorizeTransaction = (description: string, isIncome: boolean): string => {
  const lowerDesc = description.toLowerCase();
  
  if (isIncome) {
    return 'Renda';
  }
  
  for (const [category, keywords] of Object.entries(CATEGORY_MAPPINGS)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }
  
  return 'Outros';
};

// Calculate confidence level for categorization
const calculateConfidence = (description: string): number => {
  const lowerDesc = description.toLowerCase();
  
  for (const keywords of Object.values(CATEGORY_MAPPINGS)) {
    const matches = keywords.filter(keyword => lowerDesc.includes(keyword));
    if (matches.length > 0) {
      return Math.min(0.9, 0.6 + (matches.length * 0.1));
    }
  }
  
  return 0.3; // Low confidence for uncategorized
};

// Process PDF file and return structured data
export const processPdfFile = async (file: File): Promise<ProcessedPdf> => {
  try {
    const text = await extractTextFromPdf(file);
    const transactions = parseTransactions(text);
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      transactions,
      totalIncome,
      totalExpenses,
      processingDate: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Erro ao processar PDF: ${error}`);
  }
};

// Format currency for display
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

// Get category color for UI display
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Alimentação': 'bg-orange-100 text-orange-800',
    'Transporte': 'bg-blue-100 text-blue-800',
    'Saúde': 'bg-red-100 text-red-800',
    'Moradia': 'bg-purple-100 text-purple-800',
    'Educação': 'bg-indigo-100 text-indigo-800',
    'Lazer': 'bg-pink-100 text-pink-800',
    'Vestuário': 'bg-yellow-100 text-yellow-800',
    'Serviços': 'bg-gray-100 text-gray-800',
    'Investimentos': 'bg-green-100 text-green-800',
    'Renda': 'bg-emerald-100 text-emerald-800',
    'Outros': 'bg-slate-100 text-slate-800'
  };
  
  return colors[category] || colors['Outros'];
};