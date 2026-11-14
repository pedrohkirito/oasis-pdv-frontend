export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      becoming_ids: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          id_becoming: number
          tipo: string
          user_id: string
          uuid_local: string
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          id_becoming: number
          tipo: string
          user_id: string
          uuid_local: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          id_becoming?: number
          tipo?: string
          user_id?: string
          uuid_local?: string
        }
        Relationships: [
          {
            foreignKeyName: "becoming_ids_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_produto: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_produto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          telefone_adicional: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          telefone_adicional?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          telefone_adicional?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          created_at: string
          data_calculo: string
          empresa_id: string | null
          id: string
          percentual: number
          valor_base: number
          valor_comissao: number
          venda_id: string
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          data_calculo?: string
          empresa_id?: string | null
          id?: string
          percentual?: number
          valor_base?: number
          valor_comissao?: number
          venda_id: string
          vendedor_id: string
        }
        Update: {
          created_at?: string
          data_calculo?: string
          empresa_id?: string | null
          id?: string
          percentual?: number
          valor_base?: number
          valor_comissao?: number
          venda_id?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco_codigo: string | null
          banco_nome: string | null
          cor: string | null
          created_at: string
          data_inicio: string
          digito: string | null
          empresa_id: string
          id: string
          nome: string
          numero_conta: string | null
          padrao: boolean
          pluggy_item_id: string | null
          saldo_atual: number
          saldo_inicial: number
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco_codigo?: string | null
          banco_nome?: string | null
          cor?: string | null
          created_at?: string
          data_inicio?: string
          digito?: string | null
          empresa_id: string
          id?: string
          nome: string
          numero_conta?: string | null
          padrao?: boolean
          pluggy_item_id?: string | null
          saldo_atual?: number
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco_codigo?: string | null
          banco_nome?: string | null
          cor?: string | null
          created_at?: string
          data_inicio?: string
          digito?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          numero_conta?: string | null
          padrao?: boolean
          pluggy_item_id?: string | null
          saldo_atual?: number
          saldo_inicial?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          categoria: string | null
          centro_custo: string | null
          codigo_pagamento: string | null
          comprovante_url: string | null
          conta_bancaria_id: string | null
          conta_contabil_id: string | null
          conta_pai_id: string | null
          conta_recorrente_id: string | null
          created_at: string
          data_pagamento: string | null
          data_pagamento_efetivo: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          fornecedor_nome: string
          historico: Json | null
          id: string
          metodo_pagamento: string | null
          nota_fiscal: string | null
          numero_documento: string | null
          observacoes: string | null
          parcela: string | null
          parcela_numero: number | null
          parcela_total: number | null
          provisionada: boolean | null
          recorrencia_fim: string | null
          recorrencia_tipo: string | null
          recorrente: boolean | null
          status: string
          updated_at: string
          user_id: string | null
          valor: number
          valor_desconto: number | null
          valor_juros: number | null
          valor_multa: number | null
          valor_original: number | null
          valor_pago: number | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria?: string | null
          centro_custo?: string | null
          codigo_pagamento?: string | null
          comprovante_url?: string | null
          conta_bancaria_id?: string | null
          conta_contabil_id?: string | null
          conta_pai_id?: string | null
          conta_recorrente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_pagamento_efetivo?: string | null
          data_vencimento: string
          descricao: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome: string
          historico?: Json | null
          id?: string
          metodo_pagamento?: string | null
          nota_fiscal?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          parcela?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          provisionada?: boolean | null
          recorrencia_fim?: string | null
          recorrencia_tipo?: string | null
          recorrente?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string | null
          valor: number
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original?: number | null
          valor_pago?: number | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          categoria?: string | null
          centro_custo?: string | null
          codigo_pagamento?: string | null
          comprovante_url?: string | null
          conta_bancaria_id?: string | null
          conta_contabil_id?: string | null
          conta_pai_id?: string | null
          conta_recorrente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_pagamento_efetivo?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string
          historico?: Json | null
          id?: string
          metodo_pagamento?: string | null
          nota_fiscal?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          parcela?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          provisionada?: boolean | null
          recorrencia_fim?: string | null
          recorrencia_tipo?: string | null
          recorrente?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string | null
          valor?: number
          valor_desconto?: number | null
          valor_juros?: number | null
          valor_multa?: number | null
          valor_original?: number | null
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_contabil_id_fkey"
            columns: ["conta_contabil_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_recorrente_id_fkey"
            columns: ["conta_recorrente_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string | null
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          empresa_id: string | null
          forma_recebimento: string | null
          id: string
          numero_parcela: number | null
          observacoes: string | null
          status: string | null
          total_parcelas: number | null
          updated_at: string | null
          valor: number
          valor_recebido: number | null
          venda_id: string | null
        }
        Insert: {
          categoria?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string | null
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          empresa_id?: string | null
          forma_recebimento?: string | null
          id?: string
          numero_parcela?: number | null
          observacoes?: string | null
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string | null
          valor: number
          valor_recebido?: number | null
          venda_id?: string | null
        }
        Update: {
          categoria?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string | null
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          empresa_id?: string | null
          forma_recebimento?: string | null
          id?: string
          numero_parcela?: number | null
          observacoes?: string | null
          status?: string | null
          total_parcelas?: number | null
          updated_at?: string | null
          valor?: number
          valor_recebido?: number | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_fiscal: {
        Row: {
          ambiente: string
          certificado_validade: string | null
          certificado_valido: boolean | null
          cnae_codigo: string | null
          cnpj: string
          created_at: string
          crt_codigo: number | null
          csc: string | null
          csc_id: string | null
          empresa_id: string | null
          endereco_bairro: string
          endereco_cep: string
          endereco_cidade: string
          endereco_codigo_municipio: string
          endereco_complemento: string | null
          endereco_logradouro: string
          endereco_numero: string
          endereco_uf: string
          id: string
          inscricao_estadual: string
          inscricao_municipal: string | null
          nome_fantasia: string | null
          numero_nfce: number
          provedor_nfce: string | null
          razao_social: string
          regime_tributario: string
          serie_nfce: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ambiente?: string
          certificado_validade?: string | null
          certificado_valido?: boolean | null
          cnae_codigo?: string | null
          cnpj: string
          created_at?: string
          crt_codigo?: number | null
          csc?: string | null
          csc_id?: string | null
          empresa_id?: string | null
          endereco_bairro: string
          endereco_cep: string
          endereco_cidade: string
          endereco_codigo_municipio: string
          endereco_complemento?: string | null
          endereco_logradouro: string
          endereco_numero: string
          endereco_uf: string
          id?: string
          inscricao_estadual: string
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          numero_nfce?: number
          provedor_nfce?: string | null
          razao_social: string
          regime_tributario?: string
          serie_nfce?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ambiente?: string
          certificado_validade?: string | null
          certificado_valido?: boolean | null
          cnae_codigo?: string | null
          cnpj?: string
          created_at?: string
          crt_codigo?: number | null
          csc?: string | null
          csc_id?: string | null
          empresa_id?: string | null
          endereco_bairro?: string
          endereco_cep?: string
          endereco_cidade?: string
          endereco_codigo_municipio?: string
          endereco_complemento?: string | null
          endereco_logradouro?: string
          endereco_numero?: string
          endereco_uf?: string
          id?: string
          inscricao_estadual?: string
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          numero_nfce?: number
          provedor_nfce?: string | null
          razao_social?: string
          regime_tributario?: string
          serie_nfce?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_fiscal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          logo_url: string | null
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      fechamento_comissao: {
        Row: {
          created_at: string
          data_fechamento: string | null
          empresa_id: string | null
          fechado_por: string | null
          id: string
          mes_referencia: string
          status: string
          total_comissao: number
          total_vendido: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fechamento?: string | null
          empresa_id?: string | null
          fechado_por?: string | null
          id?: string
          mes_referencia: string
          status?: string
          total_comissao?: number
          total_vendido?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fechamento?: string | null
          empresa_id?: string | null
          fechado_por?: string | null
          id?: string
          mes_referencia?: string
          status?: string
          total_comissao?: number
          total_vendido?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_comissao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          empresa_id: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          razao_social: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      inutilizacoes_nfce: {
        Row: {
          ambiente: string
          ano: number
          cnpj: string
          created_at: string
          data_inutilizacao: string
          empresa_id: string | null
          id: string
          justificativa: string
          numero_final: number
          numero_inicial: number
          protocolo: string | null
          resposta_sefaz: Json | null
          serie: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ambiente?: string
          ano: number
          cnpj: string
          created_at?: string
          data_inutilizacao?: string
          empresa_id?: string | null
          id?: string
          justificativa: string
          numero_final: number
          numero_inicial: number
          protocolo?: string | null
          resposta_sefaz?: Json | null
          serie: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ambiente?: string
          ano?: number
          cnpj?: string
          created_at?: string
          data_inutilizacao?: string
          empresa_id?: string | null
          id?: string
          justificativa?: string
          numero_final?: number
          numero_inicial?: number
          protocolo?: string | null
          resposta_sefaz?: Json | null
          serie?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inutilizacoes_nfce_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda: {
        Row: {
          created_at: string
          custo_unitario: number | null
          desconto: number | null
          desconto_tipo: string | null
          id: string
          observacao: string | null
          preco_unitario: number
          produto_id: string
          quantidade: number
          subtotal: number
          variacao_id: string | null
          venda_id: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number | null
          desconto?: number | null
          desconto_tipo?: string | null
          id?: string
          observacao?: string | null
          preco_unitario: number
          produto_id: string
          quantidade?: number
          subtotal: number
          variacao_id?: string | null
          venda_id: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number | null
          desconto?: number | null
          desconto_tipo?: string | null
          id?: string
          observacao?: string | null
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          subtotal?: number
          variacao_id?: string | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_variacao_id_fkey"
            columns: ["variacao_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_contabeis: {
        Row: {
          created_at: string
          created_by: string | null
          data_lancamento: string
          empresa_id: string
          historico: string
          id: string
          origem: string
          origem_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_lancamento?: string
          empresa_id: string
          historico: string
          id?: string
          origem?: string
          origem_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_lancamento?: string
          empresa_id?: string
          historico?: string
          id?: string
          origem?: string
          origem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_contabeis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_contabeis_itens: {
        Row: {
          conta_id: string
          created_at: string
          id: string
          lancamento_id: string
          tipo: string
          valor: number
        }
        Insert: {
          conta_id: string
          created_at?: string
          id?: string
          lancamento_id: string
          tipo: string
          valor: number
        }
        Update: {
          conta_id?: string
          created_at?: string
          id?: string
          lancamento_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_contabeis_itens_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contabeis_itens_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_contabeis"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          criado_por: string | null
          data_fim: string
          data_inicio: string
          empresa_id: string
          id: string
          periodo: string
          quantidade: number | null
          tipo: string
          updated_at: string
          usuario_id: string | null
          usuario_nome: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          criado_por?: string | null
          data_fim: string
          data_inicio: string
          empresa_id: string
          id?: string
          periodo: string
          quantidade?: number | null
          tipo: string
          updated_at?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          criado_por?: string | null
          data_fim?: string
          data_inicio?: string
          empresa_id?: string
          id?: string
          periodo?: string
          quantidade?: number | null
          tipo?: string
          updated_at?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor?: number
        }
        Relationships: []
      }
      metas_vendedor: {
        Row: {
          created_at: string
          criado_por: string
          empresa_id: string
          id: string
          mes_referencia: string
          updated_at: string
          valor_meta: number
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          empresa_id: string
          id?: string
          mes_referencia: string
          updated_at?: string
          valor_meta?: number
          vendedor_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          empresa_id?: string
          id?: string
          mes_referencia?: string
          updated_at?: string
          valor_meta?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedor_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      metodos_pagamento: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metodos_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_bancarias: {
        Row: {
          categoria: string | null
          conta_id: string
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          data_movimentacao: string
          descricao: string | null
          empresa_id: string
          id: string
          identificador_externo: string | null
          origem: string | null
          status_conciliacao: string | null
          tipo: string
          updated_at: string
          valor: number
          venda_id: string | null
        }
        Insert: {
          categoria?: string | null
          conta_id: string
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_movimentacao?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          identificador_externo?: string | null
          origem?: string | null
          status_conciliacao?: string | null
          tipo?: string
          updated_at?: string
          valor: number
          venda_id?: string | null
        }
        Update: {
          categoria?: string | null
          conta_id?: string
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_movimentacao?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          identificador_externo?: string | null
          origem?: string | null
          status_conciliacao?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_bancarias_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_caixa: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          motivo: string | null
          operador_id: string
          operador_nome: string | null
          sessao_id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          motivo?: string | null
          operador_id: string
          operador_nome?: string | null
          sessao_id: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          motivo?: string | null
          operador_id?: string
          operador_nome?: string | null
          sessao_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_caixa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_caixa_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_caixa"
            referencedColumns: ["id"]
          },
        ]
      }
      niveis_acesso: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          is_sistema: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          is_sistema?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          is_sistema?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveis_acesso_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      nivel_acesso_permissoes: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          id: string
          modulo: string
          nivel_acesso_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          modulo: string
          nivel_acesso_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          modulo?: string
          nivel_acesso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nivel_acesso_permissoes_nivel_acesso_id_fkey"
            columns: ["nivel_acesso_id"]
            isOneToOne: false
            referencedRelation: "niveis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          ambiente: string
          chave_acesso: string | null
          cliente_cpf: string | null
          cliente_nome: string | null
          created_at: string
          data_cancelamento: string | null
          data_emissao: string
          empresa_id: string | null
          id: string
          motivo_cancelamento: string | null
          motivo_rejeicao: string | null
          numero: number
          nuvem_fiscal_id: string | null
          pdf_url: string | null
          protocolo_autorizacao: string | null
          serie: number
          status: string
          tipo: string
          updated_at: string
          user_id: string
          valor_total: number
          venda_id: string | null
          xml_url: string | null
        }
        Insert: {
          ambiente?: string
          chave_acesso?: string | null
          cliente_cpf?: string | null
          cliente_nome?: string | null
          created_at?: string
          data_cancelamento?: string | null
          data_emissao?: string
          empresa_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          motivo_rejeicao?: string | null
          numero: number
          nuvem_fiscal_id?: string | null
          pdf_url?: string | null
          protocolo_autorizacao?: string | null
          serie: number
          status?: string
          tipo?: string
          updated_at?: string
          user_id: string
          valor_total: number
          venda_id?: string | null
          xml_url?: string | null
        }
        Update: {
          ambiente?: string
          chave_acesso?: string | null
          cliente_cpf?: string | null
          cliente_nome?: string | null
          created_at?: string
          data_cancelamento?: string | null
          data_emissao?: string
          empresa_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          motivo_rejeicao?: string | null
          numero?: number
          nuvem_fiscal_id?: string | null
          pdf_url?: string | null
          protocolo_autorizacao?: string | null
          serie?: number
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
          venda_id?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      operacao_historico: {
        Row: {
          created_at: string
          descricao: string
          id: string
          operacao_id: string
          status_anterior: string | null
          status_novo: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          operacao_id: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          operacao_id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacao_historico_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      operacao_tarefas: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          concluida_por: string | null
          created_at: string
          id: string
          operacao_id: string
          ordem: number
          titulo: string
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          id?: string
          operacao_id: string
          ordem?: number
          titulo: string
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          created_at?: string
          id?: string
          operacao_id?: string
          ordem?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacao_tarefas_operacao_id_fkey"
            columns: ["operacao_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes: {
        Row: {
          cliente_email: string | null
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          data_entrega: string | null
          data_montagem: string | null
          data_prevista: string | null
          empresa_id: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          id: string
          observacoes: string | null
          produtos: string
          status: string
          status_pagamento: string | null
          tipo: string
          updated_at: string
          urgencia: string | null
          user_id: string
          venda_id: string | null
        }
        Insert: {
          cliente_email?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          data_entrega?: string | null
          data_montagem?: string | null
          data_prevista?: string | null
          empresa_id?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          observacoes?: string | null
          produtos: string
          status?: string
          status_pagamento?: string | null
          tipo?: string
          updated_at?: string
          urgencia?: string | null
          user_id: string
          venda_id?: string | null
        }
        Update: {
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          data_entrega?: string | null
          data_montagem?: string | null
          data_prevista?: string | null
          empresa_id?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          observacoes?: string | null
          produtos?: string
          status?: string
          status_pagamento?: string | null
          tipo?: string
          updated_at?: string
          urgencia?: string | null
          user_id?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          created_at: string | null
          desconto_item: number | null
          empresa_id: string | null
          id: string
          orcamento_id: string | null
          preco_unitario: number
          produto_id: string | null
          produto_nome: string | null
          quantidade: number | null
          total: number | null
          variacao: string | null
        }
        Insert: {
          created_at?: string | null
          desconto_item?: number | null
          empresa_id?: string | null
          id?: string
          orcamento_id?: string | null
          preco_unitario: number
          produto_id?: string | null
          produto_nome?: string | null
          quantidade?: number | null
          total?: number | null
          variacao?: string | null
        }
        Update: {
          created_at?: string | null
          desconto_item?: number | null
          empresa_id?: string | null
          id?: string
          orcamento_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          produto_nome?: string | null
          quantidade?: number | null
          total?: number | null
          variacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          condicao_pagamento: string | null
          created_at: string | null
          desconto: number | null
          empresa_id: string | null
          id: string
          numero: string | null
          observacoes: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          validade: string | null
          venda_id: string | null
        }
        Insert: {
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          condicao_pagamento?: string | null
          created_at?: string | null
          desconto?: number | null
          empresa_id?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          validade?: string | null
          venda_id?: string | null
        }
        Update: {
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          condicao_pagamento?: string | null
          created_at?: string | null
          desconto?: number | null
          empresa_id?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          validade?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_entrega_historico: {
        Row: {
          created_at: string
          descricao: string
          id: string
          pedido_id: string
          status_anterior: string | null
          status_novo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          pedido_id: string
          status_anterior?: string | null
          status_novo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          pedido_id?: string
          status_anterior?: string | null
          status_novo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_entrega_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_entrega"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_compra: {
        Row: {
          condicao_pagamento: string | null
          created_at: string
          empresa_id: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          id: string
          numero_nf_fornecedor: string | null
          numero_pedido: string | null
          observacoes: string | null
          prazo_entrega: string | null
          recebido_em: string | null
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          condicao_pagamento?: string | null
          created_at?: string
          empresa_id?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          numero_nf_fornecedor?: string | null
          numero_pedido?: string | null
          observacoes?: string | null
          prazo_entrega?: string | null
          recebido_em?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          condicao_pagamento?: string | null
          created_at?: string
          empresa_id?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          numero_nf_fornecedor?: string | null
          numero_pedido?: string | null
          observacoes?: string | null
          prazo_entrega?: string | null
          recebido_em?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_compra_historico: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          observacao: string | null
          pedido_id: string
          status_anterior: string | null
          status_novo: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          pedido_id: string
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          pedido_id?: string
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_compra_itens: {
        Row: {
          created_at: string
          empresa_id: string | null
          id: string
          pedido_id: string
          produto_id: string | null
          produto_nome: string | null
          quantidade: number
          quantidade_recebida: number
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          pedido_id: string
          produto_id?: string | null
          produto_nome?: string | null
          quantidade?: number
          quantidade_recebida?: number
          valor_total?: number | null
          valor_unitario: number
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          id?: string
          pedido_id?: string
          produto_id?: string | null
          produto_nome?: string | null
          quantidade?: number
          quantidade_recebida?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_entrega: {
        Row: {
          cliente_cpf: string | null
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          data_emissao: string
          empresa_id: string | null
          endereco_entrega: string | null
          forma_pagamento: string | null
          id: string
          numero_pedido: number
          observacoes: string | null
          previsao_entrega: string | null
          status: string
          updated_at: string
          user_id: string
          venda_id: string | null
          vendedor: string | null
        }
        Insert: {
          cliente_cpf?: string | null
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          data_emissao?: string
          empresa_id?: string | null
          endereco_entrega?: string | null
          forma_pagamento?: string | null
          id?: string
          numero_pedido?: number
          observacoes?: string | null
          previsao_entrega?: string | null
          status?: string
          updated_at?: string
          user_id: string
          venda_id?: string | null
          vendedor?: string | null
        }
        Update: {
          cliente_cpf?: string | null
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          data_emissao?: string
          empresa_id?: string | null
          endereco_entrega?: string | null
          forma_pagamento?: string | null
          id?: string
          numero_pedido?: number
          observacoes?: string | null
          previsao_entrega?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          venda_id?: string | null
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_entrega_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_entrega_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          ativo: boolean
          codigo: string
          conta_pai_id: string | null
          created_at: string
          empresa_id: string
          id: string
          natureza: string
          nome: string
          padrao: boolean
          sintetica: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          conta_pai_id?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          natureza: string
          nome: string
          padrao?: boolean
          sintetica?: boolean
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          conta_pai_id?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          natureza?: string
          nome?: string
          padrao?: boolean
          sintetica?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_contas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_atributos: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          nome: string
          tipo: string | null
          valores: string[]
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          tipo?: string | null
          valores?: string[]
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          valores?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "produto_atributos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_variacoes: {
        Row: {
          ativo: boolean | null
          atributos: Json
          created_at: string | null
          empresa_id: string | null
          estoque: number | null
          estoque_minimo: number | null
          id: string
          preco: number | null
          preco_custo: number | null
          produto_id: string | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          atributos?: Json
          created_at?: string | null
          empresa_id?: string | null
          estoque?: number | null
          estoque_minimo?: number | null
          id?: string
          preco?: number | null
          preco_custo?: number | null
          produto_id?: string | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          atributos?: Json
          created_at?: string | null
          empresa_id?: string | null
          estoque?: number | null
          estoque_minimo?: number | null
          id?: string
          preco?: number | null
          preco_custo?: number | null
          produto_id?: string | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_variacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_variacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          aliquota_cofins: number | null
          aliquota_icms: number | null
          aliquota_pis: number | null
          ativo: boolean | null
          categoria: string | null
          cest: string | null
          cfop: string | null
          codigo: string | null
          codigo_fornecedor: string | null
          created_at: string
          custo: number | null
          descricao: string | null
          ean: string | null
          empresa_id: string | null
          estoque: number | null
          estoque_minimo: number | null
          fornecedor_id: string | null
          id: string
          ncm: string | null
          nome: string
          origem: string | null
          preco: number
          tem_variacoes: boolean | null
          unidade_comercial: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aliquota_cofins?: number | null
          aliquota_icms?: number | null
          aliquota_pis?: number | null
          ativo?: boolean | null
          categoria?: string | null
          cest?: string | null
          cfop?: string | null
          codigo?: string | null
          codigo_fornecedor?: string | null
          created_at?: string
          custo?: number | null
          descricao?: string | null
          ean?: string | null
          empresa_id?: string | null
          estoque?: number | null
          estoque_minimo?: number | null
          fornecedor_id?: string | null
          id?: string
          ncm?: string | null
          nome: string
          origem?: string | null
          preco: number
          tem_variacoes?: boolean | null
          unidade_comercial?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aliquota_cofins?: number | null
          aliquota_icms?: number | null
          aliquota_pis?: number | null
          ativo?: boolean | null
          categoria?: string | null
          cest?: string | null
          cfop?: string | null
          codigo?: string | null
          codigo_fornecedor?: string | null
          created_at?: string
          custo?: number | null
          descricao?: string | null
          ean?: string | null
          empresa_id?: string | null
          estoque?: number | null
          estoque_minimo?: number | null
          fornecedor_id?: string | null
          id?: string
          ncm?: string | null
          nome?: string
          origem?: string | null
          preco?: number
          tem_variacoes?: boolean | null
          unidade_comercial?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_comissao: {
        Row: {
          created_at: string
          criado_por: string
          data_fim_vigencia: string | null
          data_inicio_vigencia: string
          empresa_id: string | null
          id: string
          percentual: number
          usuario_id: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          empresa_id?: string | null
          id?: string
          percentual?: number
          usuario_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          empresa_id?: string | null
          id?: string
          percentual?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_comissao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_caixa: {
        Row: {
          aberto_em: string
          created_at: string
          empresa_id: string
          fechado_em: string | null
          fechado_por_id: string | null
          fechado_por_nome: string | null
          id: string
          observacao_fechamento: string | null
          operador_id: string
          operador_nome: string | null
          quebra_caixa: number | null
          status: string
          total_credito: number
          total_debito: number
          total_dinheiro: number
          total_pix: number
          total_sangrias: number
          total_suprimentos: number
          total_vendas: number
          valor_abertura: number
          valor_fechamento_fisico: number | null
        }
        Insert: {
          aberto_em?: string
          created_at?: string
          empresa_id: string
          fechado_em?: string | null
          fechado_por_id?: string | null
          fechado_por_nome?: string | null
          id?: string
          observacao_fechamento?: string | null
          operador_id: string
          operador_nome?: string | null
          quebra_caixa?: number | null
          status?: string
          total_credito?: number
          total_debito?: number
          total_dinheiro?: number
          total_pix?: number
          total_sangrias?: number
          total_suprimentos?: number
          total_vendas?: number
          valor_abertura?: number
          valor_fechamento_fisico?: number | null
        }
        Update: {
          aberto_em?: string
          created_at?: string
          empresa_id?: string
          fechado_em?: string | null
          fechado_por_id?: string | null
          fechado_por_nome?: string | null
          id?: string
          observacao_fechamento?: string | null
          operador_id?: string
          operador_nome?: string | null
          quebra_caixa?: number | null
          status?: string
          total_credito?: number
          total_debito?: number
          total_dinheiro?: number
          total_pix?: number
          total_sangrias?: number
          total_suprimentos?: number
          total_vendas?: number
          valor_abertura?: number
          valor_fechamento_fisico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_caixa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_pagamento: {
        Row: {
          bandeira: string
          created_at: string
          empresa_id: string
          id: string
          metodo_pagamento: string
          parcelas: number
          prazo_recebimento: string
          taxa_percentual: number
          tipo_taxa: string
          updated_at: string
        }
        Insert: {
          bandeira?: string
          created_at?: string
          empresa_id: string
          id?: string
          metodo_pagamento: string
          parcelas?: number
          prazo_recebimento?: string
          taxa_percentual?: number
          tipo_taxa?: string
          updated_at?: string
        }
        Update: {
          bandeira?: string
          created_at?: string
          empresa_id?: string
          id?: string
          metodo_pagamento?: string
          parcelas?: number
          prazo_recebimento?: string
          taxa_percentual?: number
          tipo_taxa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxas_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias_bancarias: {
        Row: {
          conta_destino_id: string
          conta_origem_id: string
          created_at: string
          data_transferencia: string
          descricao: string | null
          empresa_id: string
          id: string
          valor: number
        }
        Insert: {
          conta_destino_id: string
          conta_origem_id: string
          created_at?: string
          data_transferencia?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          valor: number
        }
        Update: {
          conta_destino_id?: string
          conta_origem_id?: string
          created_at?: string
          data_transferencia?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_bancarias_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_bancarias_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_empresas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          nivel_acesso_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          nivel_acesso_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          nivel_acesso_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_empresas_nivel_acesso_id_fkey"
            columns: ["nivel_acesso_id"]
            isOneToOne: false
            referencedRelation: "niveis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venda_alteracoes: {
        Row: {
          campo_alterado: string
          created_at: string
          id: string
          user_id: string
          valor_anterior: string | null
          valor_novo: string | null
          venda_id: string
        }
        Insert: {
          campo_alterado: string
          created_at?: string
          id?: string
          user_id: string
          valor_anterior?: string | null
          valor_novo?: string | null
          venda_id: string
        }
        Update: {
          campo_alterado?: string
          created_at?: string
          id?: string
          user_id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_alteracoes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          bandeira: string
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          data_venda: string
          desconto: number | null
          desconto_geral: number | null
          desconto_geral_tipo: string | null
          empresa_id: string | null
          id: string
          metodo_pagamento: string
          observacoes: string | null
          parcelas: number | null
          produtos: string
          updated_at: string
          user_id: string
          valor: number
          valor_bruto: number | null
          valor_final: number | null
          valor_liquido: number | null
          vendedor: string | null
          vendedor_id: string | null
        }
        Insert: {
          bandeira?: string
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          data_venda?: string
          desconto?: number | null
          desconto_geral?: number | null
          desconto_geral_tipo?: string | null
          empresa_id?: string | null
          id?: string
          metodo_pagamento: string
          observacoes?: string | null
          parcelas?: number | null
          produtos: string
          updated_at?: string
          user_id: string
          valor: number
          valor_bruto?: number | null
          valor_final?: number | null
          valor_liquido?: number | null
          vendedor?: string | null
          vendedor_id?: string | null
        }
        Update: {
          bandeira?: string
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          data_venda?: string
          desconto?: number | null
          desconto_geral?: number | null
          desconto_geral_tipo?: string | null
          empresa_id?: string | null
          id?: string
          metodo_pagamento?: string
          observacoes?: string | null
          parcelas?: number | null
          produtos?: string
          updated_at?: string
          user_id?: string
          valor?: number
          valor_bruto?: number | null
          valor_final?: number | null
          valor_liquido?: number | null
          vendedor?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _conta_debito_pagamento: {
        Args: {
          p_categoria: string
          p_conta_contabil_id: string
          p_empresa_id: string
        }
        Returns: string
      }
      _conta_debito_pagamento_por_categoria: {
        Args: { p_categoria: string; p_empresa_id: string }
        Returns: string
      }
      _conta_id: {
        Args: { p_codigo: string; p_empresa_id: string }
        Returns: string
      }
      _contabilizar_venda: { Args: { p_venda_id: string }; Returns: undefined }
      _inserir_lancamento: {
        Args: {
          p_data: string
          p_empresa_id: string
          p_historico: string
          p_itens: Json
          p_origem: string
          p_origem_id: string
        }
        Returns: string
      }
      balancete: {
        Args: { p_data_fim: string; p_data_ini: string; p_empresa_id: string }
        Returns: {
          codigo: string
          conta_id: string
          natureza: string
          nome: string
          saldo: number
          sintetica: boolean
          tipo: string
          total_credito: number
          total_debito: number
        }[]
      }
      buscar_usuario_id_por_email: {
        Args: { p_email: string }
        Returns: string
      }
      contabilizar_historico: {
        Args: { p_empresa_id: string; p_executar?: boolean }
        Returns: Json
      }
      criar_lancamento_contabil: {
        Args: { p_header: Json; p_itens: Json }
        Returns: string
      }
      criar_venda_completa: {
        Args: { p_itens: Json; p_venda: Json }
        Returns: Json
      }
      estornar_lancamento_contabil: {
        Args: { p_lancamento_id: string; p_motivo: string }
        Returns: string
      }
      get_percentual_comissao: {
        Args: { _data?: string; _empresa_id: string; _usuario_id: string }
        Returns: number
      }
      get_user_empresas: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_empresa_access: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      has_empresa_role: {
        Args: {
          _empresa_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_nivel_acesso_permission: {
        Args: {
          _empresa_id: string
          _modulo: string
          _permission?: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_mes_fechado: {
        Args: { _empresa_id: string; _mes: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      listar_lancamentos_contabeis: {
        Args: {
          p_data_fim: string
          p_data_ini: string
          p_empresa_id: string
          p_limite?: number
          p_offset?: number
          p_origem?: string
        }
        Returns: {
          created_at: string
          data_lancamento: string
          estornado: boolean
          historico: string
          id: string
          itens: Json
          origem: string
          origem_id: string
          total: number
          total_registros: number
        }[]
      }
      pode_gerenciar_usuarios: {
        Args: { p_empresa_id: string }
        Returns: boolean
      }
      recontabilizar_pagamentos: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      saldos_patrimoniais: {
        Args: { p_data: string; p_empresa_id: string }
        Returns: {
          codigo: string
          conta_id: string
          natureza: string
          nome: string
          saldo: number
        }[]
      }
      seed_plano_contas_padrao: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "gerente" | "vendedor" | "visualizador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "vendedor", "visualizador"],
    },
  },
} as const
