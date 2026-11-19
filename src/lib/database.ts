export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      becoming_ids: {
        Row: {
          created_at: string | null
          company_id: string | null
          id: string
          becoming_remote_id: number
          kind: string
          user_id: string
          local_uuid: string
        }
        Insert: {
          created_at?: string | null
          company_id?: string | null
          id?: string
          becoming_remote_id: number
          kind: string
          user_id: string
          local_uuid: string
        }
        Update: {
          created_at?: string | null
          company_id?: string | null
          id?: string
          becoming_remote_id?: number
          kind?: string
          user_id?: string
          local_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "becoming_ids_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_produto: {
        Row: {
          active: boolean
          cor: string | null
          created_at: string
          company_id: string
          id: string
          name: string
          kind: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cor?: string | null
          created_at?: string
          company_id: string
          id?: string
          name: string
          kind?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cor?: string | null
          created_at?: string
          company_id?: string
          id?: string
          name?: string
          kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_produto_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          active: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          birth_date: string | null
          email: string | null
          company_id: string | null
          endereco: string | null
          estado: string | null
          id: string
          name: string
          observacoes: string | null
          telefone: string | null
          telefone_adicional: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          birth_date?: string | null
          email?: string | null
          company_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          name: string
          observacoes?: string | null
          telefone?: string | null
          telefone_adicional?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          birth_date?: string | null
          email?: string | null
          company_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          name?: string
          observacoes?: string | null
          telefone?: string | null
          telefone_adicional?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          created_at: string
          calculated_on: string
          company_id: string | null
          id: string
          percentual: number
          base_amount: number
          commission_amount: number
          sale_id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          calculated_on?: string
          company_id?: string | null
          id?: string
          percentual?: number
          base_amount?: number
          commission_amount?: number
          sale_id: string
          seller_id: string
        }
        Update: {
          created_at?: string
          calculated_on?: string
          company_id?: string | null
          id?: string
          percentual?: number
          base_amount?: number
          commission_amount?: number
          sale_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_venda_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          active: boolean
          bank_code: string | null
          bank_name: string | null
          cor: string | null
          created_at: string
          start_on: string
          digito: string | null
          company_id: string
          id: string
          name: string
          account_number: string | null
          padrao: boolean
          pluggy_item_id: string | null
          current_balance: number
          opening_balance: number
          kind: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          active?: boolean
          bank_code?: string | null
          bank_name?: string | null
          cor?: string | null
          created_at?: string
          start_on?: string
          digito?: string | null
          company_id: string
          id?: string
          name: string
          account_number?: string | null
          padrao?: boolean
          pluggy_item_id?: string | null
          current_balance?: number
          opening_balance?: number
          kind?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          active?: boolean
          bank_code?: string | null
          bank_name?: string | null
          cor?: string | null
          created_at?: string
          start_on?: string
          digito?: string | null
          company_id?: string
          id?: string
          name?: string
          account_number?: string | null
          padrao?: boolean
          pluggy_item_id?: string | null
          current_balance?: number
          opening_balance?: number
          kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          categoria: string | null
          cost_center: string | null
          payment_code: string | null
          receipt_url: string | null
          bank_account_id: string | null
          ledger_account_id: string | null
          parent_account_id: string | null
          recurring_payable_id: string | null
          created_at: string
          paid_on: string | null
          settled_on: string | null
          due_on: string
          descricao: string
          company_id: string | null
          payment_form: string | null
          supplier_id: string | null
          supplier_name: string
          historico: Json | null
          id: string
          payment_method: string | null
          invoice_number: string | null
          document_number: string | null
          observacoes: string | null
          parcela: string | null
          installment_number: number | null
          installment_count: number | null
          provisionada: boolean | null
          recurrence_end_on: string | null
          recurrence_kind: string | null
          recorrente: boolean | null
          status: string
          updated_at: string
          user_id: string | null
          valor: number
          discount_amount: number | null
          interest_amount: number | null
          penalty_amount: number | null
          original_amount: number | null
          paid_amount: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          categoria?: string | null
          cost_center?: string | null
          payment_code?: string | null
          receipt_url?: string | null
          bank_account_id?: string | null
          ledger_account_id?: string | null
          parent_account_id?: string | null
          recurring_payable_id?: string | null
          created_at?: string
          paid_on?: string | null
          settled_on?: string | null
          due_on: string
          descricao: string
          company_id?: string | null
          payment_form?: string | null
          supplier_id?: string | null
          supplier_name: string
          historico?: Json | null
          id?: string
          payment_method?: string | null
          invoice_number?: string | null
          document_number?: string | null
          observacoes?: string | null
          parcela?: string | null
          installment_number?: number | null
          installment_count?: number | null
          provisionada?: boolean | null
          recurrence_end_on?: string | null
          recurrence_kind?: string | null
          recorrente?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string | null
          valor: number
          discount_amount?: number | null
          interest_amount?: number | null
          penalty_amount?: number | null
          original_amount?: number | null
          paid_amount?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          categoria?: string | null
          cost_center?: string | null
          payment_code?: string | null
          receipt_url?: string | null
          bank_account_id?: string | null
          ledger_account_id?: string | null
          parent_account_id?: string | null
          recurring_payable_id?: string | null
          created_at?: string
          paid_on?: string | null
          settled_on?: string | null
          due_on?: string
          descricao?: string
          company_id?: string | null
          payment_form?: string | null
          supplier_id?: string | null
          supplier_name?: string
          historico?: Json | null
          id?: string
          payment_method?: string | null
          invoice_number?: string | null
          document_number?: string | null
          observacoes?: string | null
          parcela?: string | null
          installment_number?: number | null
          installment_count?: number | null
          provisionada?: boolean | null
          recurrence_end_on?: string | null
          recurrence_kind?: string | null
          recorrente?: boolean | null
          status?: string
          updated_at?: string
          user_id?: string | null
          valor?: number
          discount_amount?: number | null
          interest_amount?: number | null
          penalty_amount?: number | null
          original_amount?: number | null
          paid_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_conta_bancaria_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_contabil_id_fkey"
            columns: ["ledger_account_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_pai_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_recorrente_id_fkey"
            columns: ["recurring_payable_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          categoria: string | null
          customer_id: string | null
          customer_name: string | null
          created_at: string | null
          received_on: string | null
          due_on: string
          descricao: string
          company_id: string | null
          receipt_form: string | null
          id: string
          installment_number: number | null
          observacoes: string | null
          status: string | null
          installment_count: number | null
          updated_at: string | null
          valor: number
          received_amount: number | null
          sale_id: string | null
        }
        Insert: {
          categoria?: string | null
          customer_id?: string | null
          customer_name?: string | null
          created_at?: string | null
          received_on?: string | null
          due_on: string
          descricao: string
          company_id?: string | null
          receipt_form?: string | null
          id?: string
          installment_number?: number | null
          observacoes?: string | null
          status?: string | null
          installment_count?: number | null
          updated_at?: string | null
          valor: number
          received_amount?: number | null
          sale_id?: string | null
        }
        Update: {
          categoria?: string | null
          customer_id?: string | null
          customer_name?: string | null
          created_at?: string | null
          received_on?: string | null
          due_on?: string
          descricao?: string
          company_id?: string | null
          receipt_form?: string | null
          id?: string
          installment_number?: number | null
          observacoes?: string | null
          status?: string | null
          installment_count?: number | null
          updated_at?: string | null
          valor?: number
          received_amount?: number | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_venda_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_fiscal: {
        Row: {
          ambiente: string
          certificate_expires_on: string | null
          certificate_valid: boolean | null
          cnae_code: string | null
          cnpj: string
          created_at: string
          crt_code: number | null
          csc: string | null
          csc_id: string | null
          company_id: string | null
          address_district: string
          address_postal_code: string
          address_city: string
          address_municipality_code: string
          address_complement: string | null
          address_street: string
          address_number: string
          address_state: string
          id: string
          state_registration: string
          municipal_registration: string | null
          trade_name: string | null
          nfce_number: number
          nfce_provider: string | null
          legal_name: string
          tax_regime: string
          nfce_series: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ambiente?: string
          certificate_expires_on?: string | null
          certificate_valid?: boolean | null
          cnae_code?: string | null
          cnpj: string
          created_at?: string
          crt_code?: number | null
          csc?: string | null
          csc_id?: string | null
          company_id?: string | null
          address_district: string
          address_postal_code: string
          address_city: string
          address_municipality_code: string
          address_complement?: string | null
          address_street: string
          address_number: string
          address_state: string
          id?: string
          state_registration: string
          municipal_registration?: string | null
          trade_name?: string | null
          nfce_number?: number
          nfce_provider?: string | null
          legal_name: string
          tax_regime?: string
          nfce_series?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ambiente?: string
          certificate_expires_on?: string | null
          certificate_valid?: boolean | null
          cnae_code?: string | null
          cnpj?: string
          created_at?: string
          crt_code?: number | null
          csc?: string | null
          csc_id?: string | null
          company_id?: string | null
          address_district?: string
          address_postal_code?: string
          address_city?: string
          address_municipality_code?: string
          address_complement?: string | null
          address_street?: string
          address_number?: string
          address_state?: string
          id?: string
          state_registration?: string
          municipal_registration?: string | null
          trade_name?: string | null
          nfce_number?: number
          nfce_provider?: string | null
          legal_name?: string
          tax_regime?: string
          nfce_series?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_fiscal_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      fechamento_comissao: {
        Row: {
          created_at: string
          closed_on: string | null
          company_id: string | null
          closed_by: string | null
          id: string
          reference_month: string
          status: string
          total_commission: number
          total_sold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          closed_on?: string | null
          company_id?: string | null
          closed_by?: string | null
          id?: string
          reference_month: string
          status?: string
          total_commission?: number
          total_sold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          closed_on?: string | null
          company_id?: string | null
          closed_by?: string | null
          id?: string
          reference_month?: string
          status?: string
          total_commission?: number
          total_sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_comissao_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          active: boolean | null
          categoria: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          company_id: string | null
          endereco: string | null
          estado: string | null
          id: string
          name: string
          legal_name: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          categoria?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          company_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          name: string
          legal_name?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          categoria?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          company_id?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          name?: string
          legal_name?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_empresa_id_fkey"
            columns: ["company_id"]
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
          voided_on: string
          company_id: string | null
          id: string
          justificativa: string
          number_end: number
          number_start: number
          protocolo: string | null
          sefaz_response: Json | null
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
          voided_on?: string
          company_id?: string | null
          id?: string
          justificativa: string
          number_end: number
          number_start: number
          protocolo?: string | null
          sefaz_response?: Json | null
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
          voided_on?: string
          company_id?: string | null
          id?: string
          justificativa?: string
          number_end?: number
          number_start?: number
          protocolo?: string | null
          sefaz_response?: Json | null
          serie?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inutilizacoes_nfce_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda: {
        Row: {
          created_at: string
          unit_cost: number | null
          desconto: number | null
          discount_kind: string | null
          id: string
          observacao: string | null
          unit_price: number
          product_id: string
          quantidade: number
          recurrence_periods: number | null
          subtotal: number
          variant_id: string | null
          sale_id: string
        }
        Insert: {
          created_at?: string
          unit_cost?: number | null
          desconto?: number | null
          discount_kind?: string | null
          id?: string
          observacao?: string | null
          unit_price: number
          product_id: string
          quantidade?: number
          recurrence_periods?: number | null
          subtotal: number
          variant_id?: string | null
          sale_id: string
        }
        Update: {
          created_at?: string
          unit_cost?: number | null
          desconto?: number | null
          discount_kind?: string | null
          id?: string
          observacao?: string | null
          unit_price?: number
          product_id?: string
          quantidade?: number
          recurrence_periods?: number | null
          subtotal?: number
          variant_id?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_variacao_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["sale_id"]
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
          posted_on: string
          company_id: string
          historico: string
          id: string
          origem: string
          source_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          posted_on?: string
          company_id: string
          historico: string
          id?: string
          origem?: string
          source_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          posted_on?: string
          company_id?: string
          historico?: string
          id?: string
          origem?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_contabeis_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_contabeis_itens: {
        Row: {
          account_id: string
          created_at: string
          id: string
          journal_entry_id: string
          kind: string
          valor: number
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          journal_entry_id: string
          kind: string
          valor: number
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          journal_entry_id?: string
          kind?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_contabeis_itens_conta_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contabeis_itens_lancamento_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "lancamentos_contabeis"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          active: boolean
          categoria: string | null
          created_at: string
          created_by_name: string | null
          end_on: string
          start_on: string
          company_id: string
          id: string
          periodo: string
          quantidade: number | null
          kind: string
          updated_at: string
          user_id: string | null
          user_name: string | null
          valor: number
        }
        Insert: {
          active?: boolean
          categoria?: string | null
          created_at?: string
          created_by_name?: string | null
          end_on: string
          start_on: string
          company_id: string
          id?: string
          periodo: string
          quantidade?: number | null
          kind: string
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
          valor?: number
        }
        Update: {
          active?: boolean
          categoria?: string | null
          created_at?: string
          created_by_name?: string | null
          end_on?: string
          start_on?: string
          company_id?: string
          id?: string
          periodo?: string
          quantidade?: number | null
          kind?: string
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
          valor?: number
        }
        Relationships: []
      }
      metas_vendedor: {
        Row: {
          created_at: string
          created_by_name: string
          company_id: string
          id: string
          reference_month: string
          updated_at: string
          goal_amount: number
          seller_id: string
        }
        Insert: {
          created_at?: string
          created_by_name: string
          company_id: string
          id?: string
          reference_month: string
          updated_at?: string
          goal_amount?: number
          seller_id: string
        }
        Update: {
          created_at?: string
          created_by_name?: string
          company_id?: string
          id?: string
          reference_month?: string
          updated_at?: string
          goal_amount?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedor_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      metodos_pagamento: {
        Row: {
          active: boolean
          created_at: string
          company_id: string
          id: string
          name: string
          kind: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          company_id: string
          id?: string
          name: string
          kind?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          company_id?: string
          id?: string
          name?: string
          kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metodos_pagamento_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_bancarias: {
        Row: {
          categoria: string | null
          account_id: string
          payable_id: string | null
          receivable_id: string | null
          created_at: string
          moved_on: string
          descricao: string | null
          company_id: string
          id: string
          external_id: string | null
          origem: string | null
          reconciliation_status: string | null
          kind: string
          updated_at: string
          valor: number
          sale_id: string | null
        }
        Insert: {
          categoria?: string | null
          account_id: string
          payable_id?: string | null
          receivable_id?: string | null
          created_at?: string
          moved_on?: string
          descricao?: string | null
          company_id: string
          id?: string
          external_id?: string | null
          origem?: string | null
          reconciliation_status?: string | null
          kind?: string
          updated_at?: string
          valor: number
          sale_id?: string | null
        }
        Update: {
          categoria?: string | null
          account_id?: string
          payable_id?: string | null
          receivable_id?: string | null
          created_at?: string
          moved_on?: string
          descricao?: string | null
          company_id?: string
          id?: string
          external_id?: string | null
          origem?: string | null
          reconciliation_status?: string | null
          kind?: string
          updated_at?: string
          valor?: number
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_bancarias_conta_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_pagar_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_receber_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_venda_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_caixa: {
        Row: {
          created_at: string
          company_id: string | null
          id: string
          motivo: string | null
          operator_id: string
          operator_name: string | null
          cash_session_id: string
          kind: string
          valor: number
        }
        Insert: {
          created_at?: string
          company_id?: string | null
          id?: string
          motivo?: string | null
          operator_id: string
          operator_name?: string | null
          cash_session_id: string
          kind: string
          valor: number
        }
        Update: {
          created_at?: string
          company_id?: string | null
          id?: string
          motivo?: string | null
          operator_id?: string
          operator_name?: string | null
          cash_session_id?: string
          kind?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_caixa_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_caixa_sessao_id_fkey"
            columns: ["cash_session_id"]
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
          company_id: string
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          company_id: string
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          company_id?: string
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveis_acesso_empresa_id_fkey"
            columns: ["company_id"]
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
          module: string
          access_level_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          module: string
          access_level_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          id?: string
          module?: string
          access_level_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nivel_acesso_permissoes_nivel_acesso_id_fkey"
            columns: ["access_level_id"]
            isOneToOne: false
            referencedRelation: "niveis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          ambiente: string
          access_key: string | null
          customer_tax_id: string | null
          customer_name: string | null
          created_at: string
          cancelled_at: string | null
          issued_at: string
          company_id: string | null
          id: string
          cancellation_reason: string | null
          rejection_reason: string | null
          numero: number
          cloud_fiscal_id: string | null
          pdf_url: string | null
          authorization_protocol: string | null
          serie: number
          status: string
          kind: string
          updated_at: string
          user_id: string
          total_amount: number
          sale_id: string | null
          xml_url: string | null
        }
        Insert: {
          ambiente?: string
          access_key?: string | null
          customer_tax_id?: string | null
          customer_name?: string | null
          created_at?: string
          cancelled_at?: string | null
          issued_at?: string
          company_id?: string | null
          id?: string
          cancellation_reason?: string | null
          rejection_reason?: string | null
          numero: number
          cloud_fiscal_id?: string | null
          pdf_url?: string | null
          authorization_protocol?: string | null
          serie: number
          status?: string
          kind?: string
          updated_at?: string
          user_id: string
          total_amount: number
          sale_id?: string | null
          xml_url?: string | null
        }
        Update: {
          ambiente?: string
          access_key?: string | null
          customer_tax_id?: string | null
          customer_name?: string | null
          created_at?: string
          cancelled_at?: string | null
          issued_at?: string
          company_id?: string | null
          id?: string
          cancellation_reason?: string | null
          rejection_reason?: string | null
          numero?: number
          cloud_fiscal_id?: string | null
          pdf_url?: string | null
          authorization_protocol?: string | null
          serie?: number
          status?: string
          kind?: string
          updated_at?: string
          user_id?: string
          total_amount?: number
          sale_id?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_venda_id_fkey"
            columns: ["sale_id"]
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
          operation_id: string
          previous_status: string | null
          new_status: string | null
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          operation_id: string
          previous_status?: string | null
          new_status?: string | null
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          operation_id?: string
          previous_status?: string | null
          new_status?: string | null
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacao_historico_operacao_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      operacao_tarefas: {
        Row: {
          concluida: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          operation_id: string
          ordem: number
          titulo: string
        }
        Insert: {
          concluida?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          operation_id: string
          ordem?: number
          titulo: string
        }
        Update: {
          concluida?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          operation_id?: string
          ordem?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "operacao_tarefas_operacao_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "operacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      operacoes: {
        Row: {
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          created_at: string
          delivered_on: string | null
          assembly_on: string | null
          expected_on: string | null
          company_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          id: string
          observacoes: string | null
          produtos: string
          status: string
          payment_status: string | null
          kind: string
          updated_at: string
          urgencia: string | null
          user_id: string
          sale_id: string | null
        }
        Insert: {
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          created_at?: string
          delivered_on?: string | null
          assembly_on?: string | null
          expected_on?: string | null
          company_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          id?: string
          observacoes?: string | null
          produtos: string
          status?: string
          payment_status?: string | null
          kind?: string
          updated_at?: string
          urgencia?: string | null
          user_id: string
          sale_id?: string | null
        }
        Update: {
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          created_at?: string
          delivered_on?: string | null
          assembly_on?: string | null
          expected_on?: string | null
          company_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          id?: string
          observacoes?: string | null
          produtos?: string
          status?: string
          payment_status?: string | null
          kind?: string
          updated_at?: string
          urgencia?: string | null
          user_id?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operacoes_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_fornecedor_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operacoes_venda_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          created_at: string | null
          item_discount: number | null
          company_id: string | null
          id: string
          quote_id: string | null
          unit_price: number
          product_id: string | null
          product_name: string | null
          quantidade: number | null
          total: number | null
          variacao: string | null
        }
        Insert: {
          created_at?: string | null
          item_discount?: number | null
          company_id?: string | null
          id?: string
          quote_id?: string | null
          unit_price: number
          product_id?: string | null
          product_name?: string | null
          quantidade?: number | null
          total?: number | null
          variacao?: string | null
        }
        Update: {
          created_at?: string | null
          item_discount?: number | null
          company_id?: string | null
          id?: string
          quote_id?: string | null
          unit_price?: number
          product_id?: string | null
          product_name?: string | null
          quantidade?: number | null
          total?: number | null
          variacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_produto_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          payment_terms: string | null
          created_at: string | null
          desconto: number | null
          company_id: string | null
          id: string
          numero: string | null
          observacoes: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
          validade: string | null
          sale_id: string | null
        }
        Insert: {
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          payment_terms?: string | null
          created_at?: string | null
          desconto?: number | null
          company_id?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          validade?: string | null
          sale_id?: string | null
        }
        Update: {
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          payment_terms?: string | null
          created_at?: string | null
          desconto?: number | null
          company_id?: string | null
          id?: string
          numero?: string | null
          observacoes?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
          validade?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_venda_id_fkey"
            columns: ["sale_id"]
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
          purchase_order_id: string
          previous_status: string | null
          new_status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          purchase_order_id: string
          previous_status?: string | null
          new_status: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          purchase_order_id?: string
          previous_status?: string | null
          new_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_entrega_historico_pedido_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "pedidos_entrega"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_compra: {
        Row: {
          payment_terms: string | null
          created_at: string
          company_id: string | null
          supplier_id: string | null
          supplier_name: string | null
          id: string
          supplier_invoice_number: string | null
          order_number: string | null
          observacoes: string | null
          delivery_deadline_on: string | null
          received_on: string | null
          status: string
          updated_at: string
          total_amount: number
        }
        Insert: {
          payment_terms?: string | null
          created_at?: string
          company_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          id?: string
          supplier_invoice_number?: string | null
          order_number?: string | null
          observacoes?: string | null
          delivery_deadline_on?: string | null
          received_on?: string | null
          status?: string
          updated_at?: string
          total_amount?: number
        }
        Update: {
          payment_terms?: string | null
          created_at?: string
          company_id?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          id?: string
          supplier_invoice_number?: string | null
          order_number?: string | null
          observacoes?: string | null
          delivery_deadline_on?: string | null
          received_on?: string | null
          status?: string
          updated_at?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_fornecedor_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_compra_historico: {
        Row: {
          created_at: string
          company_id: string | null
          id: string
          observacao: string | null
          purchase_order_id: string
          previous_status: string | null
          new_status: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          company_id?: string | null
          id?: string
          observacao?: string | null
          purchase_order_id: string
          previous_status?: string | null
          new_status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          company_id?: string | null
          id?: string
          observacao?: string | null
          purchase_order_id?: string
          previous_status?: string | null
          new_status?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_historico_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_historico_pedido_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_compra_itens: {
        Row: {
          created_at: string
          company_id: string | null
          id: string
          purchase_order_id: string
          product_id: string | null
          product_name: string | null
          quantidade: number
          quantity_received: number
          total_amount: number | null
          unit_amount: number
        }
        Insert: {
          created_at?: string
          company_id?: string | null
          id?: string
          purchase_order_id: string
          product_id?: string | null
          product_name?: string | null
          quantidade?: number
          quantity_received?: number
          total_amount?: number | null
          unit_amount: number
        }
        Update: {
          created_at?: string
          company_id?: string | null
          id?: string
          purchase_order_id?: string
          product_id?: string | null
          product_name?: string | null
          quantidade?: number
          quantity_received?: number
          total_amount?: number | null
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_itens_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_itens_pedido_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_itens_produto_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_entrega: {
        Row: {
          customer_tax_id: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          created_at: string
          issued_at: string
          company_id: string | null
          delivery_address: string | null
          payment_form: string | null
          id: string
          order_number: number
          observacoes: string | null
          delivery_eta_on: string | null
          status: string
          updated_at: string
          user_id: string
          sale_id: string | null
          vendedor: string | null
        }
        Insert: {
          customer_tax_id?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          created_at?: string
          issued_at?: string
          company_id?: string | null
          delivery_address?: string | null
          payment_form?: string | null
          id?: string
          order_number?: number
          observacoes?: string | null
          delivery_eta_on?: string | null
          status?: string
          updated_at?: string
          user_id: string
          sale_id?: string | null
          vendedor?: string | null
        }
        Update: {
          customer_tax_id?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          created_at?: string
          issued_at?: string
          company_id?: string | null
          delivery_address?: string | null
          payment_form?: string | null
          id?: string
          order_number?: number
          observacoes?: string | null
          delivery_eta_on?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          sale_id?: string | null
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_entrega_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_entrega_venda_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          active: boolean
          code: string
          parent_account_id: string | null
          created_at: string
          company_id: string
          id: string
          natureza: string
          name: string
          padrao: boolean
          sintetica: boolean
          kind: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          parent_account_id?: string | null
          created_at?: string
          company_id: string
          id?: string
          natureza: string
          name: string
          padrao?: boolean
          sintetica?: boolean
          kind: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          parent_account_id?: string | null
          created_at?: string
          company_id?: string
          id?: string
          natureza?: string
          name?: string
          padrao?: boolean
          sintetica?: boolean
          kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_conta_pai_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_contas_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_atributos: {
        Row: {
          created_at: string | null
          company_id: string | null
          id: string
          name: string
          kind: string | null
          valores: string[]
        }
        Insert: {
          created_at?: string | null
          company_id?: string | null
          id?: string
          name: string
          kind?: string | null
          valores?: string[]
        }
        Update: {
          created_at?: string | null
          company_id?: string | null
          id?: string
          name?: string
          kind?: string | null
          valores?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "produto_atributos_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_variacoes: {
        Row: {
          active: boolean | null
          atributos: Json
          created_at: string | null
          company_id: string | null
          estoque: number | null
          minimum_stock: number | null
          id: string
          preco: number | null
          cost_price: number | null
          product_id: string | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          atributos?: Json
          created_at?: string | null
          company_id?: string | null
          estoque?: number | null
          minimum_stock?: number | null
          id?: string
          preco?: number | null
          cost_price?: number | null
          product_id?: string | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          atributos?: Json
          created_at?: string | null
          company_id?: string | null
          estoque?: number | null
          minimum_stock?: number | null
          id?: string
          preco?: number | null
          cost_price?: number | null
          product_id?: string | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_variacoes_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_variacoes_produto_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          cofins_rate: number | null
          icms_rate: number | null
          pis_rate: number | null
          active: boolean | null
          categoria: string | null
          cest: string | null
          cfop: string | null
          code: string | null
          supplier_code: string | null
          created_at: string
          custo: number | null
          descricao: string | null
          ean: string | null
          company_id: string | null
          estoque: number | null
          minimum_stock: number | null
          supplier_id: string | null
          id: string
          ncm: string | null
          name: string
          origem: string | null
          preco: number
          has_variants: boolean | null
          recurrence_kind: string | null
          recorrente: boolean
          tipo: string
          commercial_unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cofins_rate?: number | null
          icms_rate?: number | null
          pis_rate?: number | null
          active?: boolean | null
          categoria?: string | null
          cest?: string | null
          cfop?: string | null
          code?: string | null
          supplier_code?: string | null
          created_at?: string
          custo?: number | null
          descricao?: string | null
          ean?: string | null
          company_id?: string | null
          estoque?: number | null
          minimum_stock?: number | null
          supplier_id?: string | null
          id?: string
          ncm?: string | null
          name: string
          origem?: string | null
          preco: number
          has_variants?: boolean | null
          recurrence_kind?: string | null
          recorrente?: boolean
          tipo?: string
          commercial_unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cofins_rate?: number | null
          icms_rate?: number | null
          pis_rate?: number | null
          active?: boolean | null
          categoria?: string | null
          cest?: string | null
          cfop?: string | null
          code?: string | null
          supplier_code?: string | null
          created_at?: string
          custo?: number | null
          descricao?: string | null
          ean?: string | null
          company_id?: string | null
          estoque?: number | null
          minimum_stock?: number | null
          supplier_id?: string | null
          id?: string
          ncm?: string | null
          name?: string
          origem?: string | null
          preco?: number
          has_variants?: boolean | null
          recurrence_kind?: string | null
          recorrente?: boolean
          tipo?: string
          commercial_unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_comissao: {
        Row: {
          created_at: string
          created_by_name: string
          valid_until: string | null
          valid_from: string
          company_id: string | null
          id: string
          percentual: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by_name: string
          valid_until?: string | null
          valid_from?: string
          company_id?: string | null
          id?: string
          percentual?: number
          user_id: string
        }
        Update: {
          created_at?: string
          created_by_name?: string
          valid_until?: string | null
          valid_from?: string
          company_id?: string | null
          id?: string
          percentual?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_comissao_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_caixa: {
        Row: {
          opened_at: string
          created_at: string
          company_id: string
          closed_at: string | null
          closed_by_id: string | null
          closed_by_name: string | null
          id: string
          closing_note: string | null
          operator_id: string
          operator_name: string | null
          cash_variance: number | null
          status: string
          total_credit: number
          total_debit: number
          total_cash: number
          total_pix: number
          total_withdrawals: number
          total_deposits: number
          total_sales: number
          opening_amount: number
          physical_closing_amount: number | null
        }
        Insert: {
          opened_at?: string
          created_at?: string
          company_id: string
          closed_at?: string | null
          closed_by_id?: string | null
          closed_by_name?: string | null
          id?: string
          closing_note?: string | null
          operator_id: string
          operator_name?: string | null
          cash_variance?: number | null
          status?: string
          total_credit?: number
          total_debit?: number
          total_cash?: number
          total_pix?: number
          total_withdrawals?: number
          total_deposits?: number
          total_sales?: number
          opening_amount?: number
          physical_closing_amount?: number | null
        }
        Update: {
          opened_at?: string
          created_at?: string
          company_id?: string
          closed_at?: string | null
          closed_by_id?: string | null
          closed_by_name?: string | null
          id?: string
          closing_note?: string | null
          operator_id?: string
          operator_name?: string | null
          cash_variance?: number | null
          status?: string
          total_credit?: number
          total_debit?: number
          total_cash?: number
          total_pix?: number
          total_withdrawals?: number
          total_deposits?: number
          total_sales?: number
          opening_amount?: number
          physical_closing_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_caixa_empresa_id_fkey"
            columns: ["company_id"]
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
          company_id: string
          id: string
          payment_method: string
          parcelas: number
          receipt_term: string
          fee_percent: number
          fee_kind: string
          updated_at: string
        }
        Insert: {
          bandeira?: string
          created_at?: string
          company_id: string
          id?: string
          payment_method: string
          parcelas?: number
          receipt_term?: string
          fee_percent?: number
          fee_kind?: string
          updated_at?: string
        }
        Update: {
          bandeira?: string
          created_at?: string
          company_id?: string
          id?: string
          payment_method?: string
          parcelas?: number
          receipt_term?: string
          fee_percent?: number
          fee_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxas_pagamento_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias_bancarias: {
        Row: {
          destination_account_id: string
          source_account_id: string
          created_at: string
          transferred_on: string
          descricao: string | null
          company_id: string
          id: string
          valor: number
        }
        Insert: {
          destination_account_id: string
          source_account_id: string
          created_at?: string
          transferred_on?: string
          descricao?: string | null
          company_id: string
          id?: string
          valor: number
        }
        Update: {
          destination_account_id?: string
          source_account_id?: string
          created_at?: string
          transferred_on?: string
          descricao?: string | null
          company_id?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_bancarias_conta_destino_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_bancarias_conta_origem_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_bancarias_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_empresas: {
        Row: {
          created_at: string
          company_id: string
          id: string
          access_level_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          company_id: string
          id?: string
          access_level_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          company_id?: string
          id?: string
          access_level_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_empresas_empresa_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_empresas_nivel_acesso_id_fkey"
            columns: ["access_level_id"]
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
          field_changed: string
          created_at: string
          id: string
          user_id: string
          previous_value: string | null
          new_value: string | null
          sale_id: string
        }
        Insert: {
          field_changed: string
          created_at?: string
          id?: string
          user_id: string
          previous_value?: string | null
          new_value?: string | null
          sale_id: string
        }
        Update: {
          field_changed?: string
          created_at?: string
          id?: string
          user_id?: string
          previous_value?: string | null
          new_value?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_alteracoes_venda_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          bandeira: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          created_at: string
          sold_on: string
          desconto: number | null
          general_discount: number | null
          general_discount_kind: string | null
          company_id: string | null
          id: string
          payment_method: string
          observacoes: string | null
          parcelas: number | null
          produtos: string
          updated_at: string
          user_id: string
          valor: number
          gross_amount: number | null
          final_amount: number | null
          net_amount: number | null
          vendedor: string | null
          seller_id: string | null
        }
        Insert: {
          bandeira?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          created_at?: string
          sold_on?: string
          desconto?: number | null
          general_discount?: number | null
          general_discount_kind?: string | null
          company_id?: string | null
          id?: string
          payment_method: string
          observacoes?: string | null
          parcelas?: number | null
          produtos: string
          updated_at?: string
          user_id: string
          valor: number
          gross_amount?: number | null
          final_amount?: number | null
          net_amount?: number | null
          vendedor?: string | null
          seller_id?: string | null
        }
        Update: {
          bandeira?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          created_at?: string
          sold_on?: string
          desconto?: number | null
          general_discount?: number | null
          general_discount_kind?: string | null
          company_id?: string | null
          id?: string
          payment_method?: string
          observacoes?: string | null
          parcelas?: number | null
          produtos?: string
          updated_at?: string
          user_id?: string
          valor?: number
          gross_amount?: number | null
          final_amount?: number | null
          net_amount?: number | null
          vendedor?: string | null
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["company_id"]
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
          p_company_id: string
        }
        Returns: string
      }
      _conta_debito_pagamento_por_categoria: {
        Args: { p_categoria: string; p_company_id: string }
        Returns: string
      }
      _conta_id: {
        Args: { p_codigo: string; p_company_id: string }
        Returns: string
      }
      _contabilizar_venda: { Args: { p_venda_id: string }; Returns: undefined }
      _inserir_lancamento: {
        Args: {
          p_data: string
          p_company_id: string
          p_historico: string
          p_itens: Json
          p_origem: string
          p_origem_id: string
        }
        Returns: string
      }
      balancete: {
        Args: { p_data_fim: string; p_data_ini: string; p_company_id: string }
        Returns: {
          code: string
          account_id: string
          natureza: string
          name: string
          saldo: number
          sintetica: boolean
          kind: string
          total_credit: number
          total_debit: number
        }[]
      }
      buscar_usuario_id_por_email: {
        Args: { p_email: string }
        Returns: string
      }
      contabilizar_historico: {
        Args: { p_company_id: string; p_executar?: boolean }
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
          p_company_id: string
          p_limite?: number
          p_offset?: number
          p_origem?: string
        }
        Returns: {
          created_at: string
          posted_on: string
          estornado: boolean
          historico: string
          id: string
          itens: Json
          origem: string
          source_id: string
          total: number
          total_registros: number
        }[]
      }
      pode_gerenciar_usuarios: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      recontabilizar_pagamentos: {
        Args: { p_company_id: string }
        Returns: Json
      }
      saldos_patrimoniais: {
        Args: { p_data: string; p_company_id: string }
        Returns: {
          code: string
          account_id: string
          natureza: string
          name: string
          saldo: number
        }[]
      }
      seed_plano_contas_padrao: {
        Args: { p_company_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "seller" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Database

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
      app_role: ["admin", "manager", "seller", "viewer"],
    },
  },
} as const
