import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEmpresa } from "@/hooks/useEmpresa";
import { motion } from "framer-motion";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import {
  Building2, FileText, Shield, Settings, AlertTriangle, CheckCircle2,
  Loader2, TestTube2, Receipt, ShieldCheck, ShieldX,
} from "lucide-react";

// --- Schemas (unchanged) ---
const empresaSchema = z.object({
  cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos").max(18, "CNPJ inválido"),
  razao_social: z.string().min(3, "Razão social é obrigatória"),
  nome_fantasia: z.string().optional(),
  inscricao_estadual: z.string().min(1, "Inscrição estadual é obrigatória"),
  inscricao_municipal: z.string().optional(),
  regime_tributario: z.string().min(1, "Regime tributário é obrigatório"),
  endereco_logradouro: z.string().min(1, "Logradouro é obrigatório"),
  endereco_numero: z.string().min(1, "Número é obrigatório"),
  endereco_complemento: z.string().optional(),
  endereco_bairro: z.string().min(1, "Bairro é obrigatório"),
  endereco_cidade: z.string().min(1, "Cidade é obrigatória"),
  endereco_uf: z.string().length(2, "UF deve ter 2 caracteres"),
  endereco_cep: z.string().min(8, "CEP é obrigatório"),
  endereco_codigo_municipio: z.string().min(7, "Código do município é obrigatório"),
});

const nfceSchema = z.object({
  ambiente: z.string().min(1, "Ambiente é obrigatório"),
  serie_nfce: z.number().min(1, "Série deve ser maior que 0"),
  numero_nfce: z.number().min(1, "Número deve ser maior que 0"),
  csc: z.string().optional(),
  csc_id: z.string().optional(),
  provedor_nfce: z.string().optional(),
  crt_codigo: z.number().optional(),
  cnae_codigo: z.string().optional(),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;
type NfceFormData = z.infer<typeof nfceSchema>;

const estadosBrasileiros = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const regimesTributarios = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "simples_nacional_excesso", label: "Simples Nacional - Excesso de sublimite de receita bruta" },
  { value: "regime_normal", label: "Regime Normal" },
];

// --- Style constants ---
const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(142,95,207,0.12)",
  borderRadius: 20,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 13,
  border: "1px solid rgba(142,95,207,0.2)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.8)",
  outline: "none",
  fontFamily: "Gilroy, sans-serif",
  color: "#1F2937",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#374151",
  fontFamily: "Gilroy, sans-serif",
  marginBottom: 6,
  display: "block",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#9CA3AF",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontFamily: "Gilroy, sans-serif",
  marginBottom: 20,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export default function ConfiguracoesFiscais() {
  const { user } = useAuth();
  const { companyId } = useEmpresa();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("empresa");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const { data: empresaFiscal, isLoading } = useQuery({
    queryKey: ["empresa-fiscal", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await api
        .from("company_fiscal_profile")
        .select("*")
        .eq("company_id", companyId)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user && !!companyId,
  });

  const empresaForm = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      cnpj: "", razao_social: "", nome_fantasia: "",
      inscricao_estadual: "", inscricao_municipal: "",
      regime_tributario: "simples_nacional",
      endereco_logradouro: "", endereco_numero: "", endereco_complemento: "",
      endereco_bairro: "", endereco_cidade: "", endereco_uf: "",
      endereco_cep: "", endereco_codigo_municipio: "",
    },
  });

  const nfceForm = useForm<NfceFormData>({
    resolver: zodResolver(nfceSchema),
    defaultValues: {
      ambiente: "homologacao", serie_nfce: 1, numero_nfce: 1,
      csc: "", csc_id: "", provedor_nfce: "becoming", crt_codigo: 1, cnae_codigo: "",
    },
  });

  useEffect(() => {
    if (empresaFiscal) {
      empresaForm.reset({
        cnpj: empresaFiscal.cnpj || "",
        razao_social: empresaFiscal.razao_social || "",
        nome_fantasia: empresaFiscal.nome_fantasia || "",
        inscricao_estadual: empresaFiscal.inscricao_estadual || "",
        inscricao_municipal: empresaFiscal.inscricao_municipal || "",
        regime_tributario: empresaFiscal.regime_tributario || "simples_nacional",
        endereco_logradouro: empresaFiscal.endereco_logradouro || "",
        endereco_numero: empresaFiscal.endereco_numero || "",
        endereco_complemento: empresaFiscal.endereco_complemento || "",
        endereco_bairro: empresaFiscal.endereco_bairro || "",
        endereco_cidade: empresaFiscal.endereco_cidade || "",
        endereco_uf: empresaFiscal.endereco_uf || "",
        endereco_cep: empresaFiscal.endereco_cep || "",
        endereco_codigo_municipio: empresaFiscal.endereco_codigo_municipio || "",
      });
      nfceForm.reset({
        ambiente: empresaFiscal.ambiente || "homologacao",
        serie_nfce: empresaFiscal.serie_nfce || 1,
        numero_nfce: empresaFiscal.numero_nfce || 1,
        csc: empresaFiscal.csc || "",
        csc_id: empresaFiscal.csc_id || "",
        provedor_nfce: "becoming",
        crt_codigo: (empresaFiscal as any).crt_codigo || 1,
        cnae_codigo: (empresaFiscal as any).cnae_codigo || "",
      });
    }
  }, [empresaFiscal]);

  const saveEmpresaMutation = useMutation({
    mutationFn: async (data: EmpresaFormData) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (empresaFiscal?.id) {
        const { error } = await api.from("company_fiscal_profile").update({ ...data, user_id: user.id }).eq("id", empresaFiscal.id);
        if (error) throw error;
      } else {
        const { error } = await api.from("company_fiscal_profile").insert({
          cnpj: data.cnpj, razao_social: data.razao_social, nome_fantasia: data.nome_fantasia || null,
          inscricao_estadual: data.inscricao_estadual, inscricao_municipal: data.inscricao_municipal || null,
          regime_tributario: data.regime_tributario, endereco_logradouro: data.endereco_logradouro,
          endereco_numero: data.endereco_numero, endereco_complemento: data.endereco_complemento || null,
          endereco_bairro: data.endereco_bairro, endereco_cidade: data.endereco_cidade,
          endereco_uf: data.endereco_uf, endereco_cep: data.endereco_cep,
          endereco_codigo_municipio: data.endereco_codigo_municipio,
          user_id: user.id, company_id: companyId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresa-fiscal", companyId] });
      toast.success("Dados da empresa salvos com sucesso!");
    },
    onError: (error) => { toast.error("Erro ao salvar dados: " + error.message); },
  });

  const saveNfceMutation = useMutation({
    mutationFn: async (data: NfceFormData) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!empresaFiscal?.id) throw new Error("Cadastre os dados da empresa primeiro");
      const { error } = await api.from("company_fiscal_profile").update(data).eq("id", empresaFiscal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresa-fiscal", companyId] });
      toast.success("Configurações de NFC-e salvas com sucesso!");
    },
    onError: (error) => { toast.error("Erro ao salvar configurações: " + error.message); },
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const testNfceMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!empresaFiscal) throw new Error("Configure os dados da empresa primeiro");
      const testData = {
        empresaFiscal: { ...empresaFiscal, ambiente: "homologacao" },
        venda: { id: null, user_id: user.id, cliente_nome: "CONSUMIDOR TESTE", valor: 1.00, valor_bruto: 1.00, valor_final: 1.00, metodo_pagamento: "dinheiro", observacoes: "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" },
        itens: [{ id: "teste-001", code: "TESTE001", name: "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL", ncm: "00000000", cfop: "5102", unidade_comercial: "UN", quantidade: 1, preco_unitario: 1.00, subtotal: 1.00, origem: "0" }],
        cliente: null,
      };
      const { data, error } = await api.functions.invoke("becoming-nfce", { body: { action: "emitir", data: testData } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.status === "autorizado" || data.status === "autorizada") {
        setTestResult({ success: true, message: "NFC-e de teste emitida com sucesso!", details: data });
        toast.success("Teste realizado com sucesso! NFC-e emitida em homologação.");
        queryClient.invalidateQueries({ queryKey: ["empresa-fiscal", companyId] });
      } else if (data.status === "rejeitado" || data.status === "rejeitada") {
        setTestResult({ success: false, message: `NFC-e rejeitada: ${data.motivo_rejeicao || "Verifique os dados fiscais"}`, details: data });
        toast.error("NFC-e rejeitada pela SEFAZ");
      } else {
        setTestResult({ success: false, message: `Status: ${data.status}`, details: data });
      }
    },
    onError: (error: any) => {
      setTestResult({ success: false, message: error.message || "Erro ao emitir NFC-e de teste", details: error });
      toast.error("Erro no teste: " + error.message);
    },
  });

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d)/, "$1-$2").slice(0, 18);
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{5})(\d)/, "$1-$2").slice(0, 9);
  };

  const tabs = [
    { key: "empresa", label: "🏢 Dados da Empresa" },
    { key: "nfce", label: "📜 Configurações NFC-e" },
  ];

  const tabActiveStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #8E5FCF, #47118F)",
    color: "#fff",
    boxShadow: "0 4px 15px rgba(142,95,207,0.4)",
    transform: "translateY(-1px)",
    border: "none",
    borderRadius: 12,
    padding: "10px 20px",
    fontFamily: "Gilroy, sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.25s ease",
  };

  const tabInactiveStyle = (key: string): React.CSSProperties => ({
    background: hoveredTab === key ? "rgba(142,95,207,0.08)" : "transparent",
    color: hoveredTab === key ? "#8E5FCF" : "#6B7280",
    border: "none",
    borderRadius: 12,
    padding: "10px 20px",
    fontFamily: "Gilroy, sans-serif",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.25s ease",
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, color: "#8E5FCF", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)" }}>
      {/* Orbs */}
      <div style={{ position: "fixed", top: -200, left: -200, width: 600, height: 600, borderRadius: "50%", background: "#8E5FCF", opacity: 0.06, filter: "blur(80px)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -150, right: -150, width: 400, height: 400, borderRadius: "50%", background: "#FAF66B", opacity: 0.04, filter: "blur(80px)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, padding: "32px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, marginBottom: 4, fontFamily: "Gilroy, sans-serif" }}>
              Oasis › Configurações › Fiscal
            </p>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 4px 0", fontFamily: "Gilroy, sans-serif", background: "linear-gradient(135deg, #47118F, #8E5FCF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Configurações Fiscais
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: 0, fontFamily: "Gilroy, sans-serif" }}>
              Configure os dados da empresa e parâmetros para emissão de NFC-e
            </p>
          </div>
        </div>

        {/* Status Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
          {/* Dados da Empresa */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.4 }}
            style={{ ...glassCard, padding: 24, borderTop: `4px solid ${empresaFiscal ? "#10B981" : "#F59E0B"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: empresaFiscal ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Building2 style={{ width: 20, height: 20, color: empresaFiscal ? "#10B981" : "#F59E0B" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px", fontFamily: "Gilroy, sans-serif" }}>
                  Dados da Empresa
                </p>
                <span style={{ background: empresaFiscal ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: empresaFiscal ? "#10B981" : "#F59E0B", border: `1px solid ${empresaFiscal ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`, borderRadius: 20, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600, fontFamily: "Gilroy, sans-serif" }}>
                  {empresaFiscal ? "Configurado" : "Pendente"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Certificado Digital */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
            style={{ ...glassCard, padding: 24, borderTop: `4px solid ${empresaFiscal?.certificado_valido ? "#10B981" : "#EF4444"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: empresaFiscal?.certificado_valido ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {empresaFiscal?.certificado_valido
                  ? <ShieldCheck style={{ width: 20, height: 20, color: "#10B981" }} />
                  : <ShieldX style={{ width: 20, height: 20, color: "#EF4444" }} />}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px", fontFamily: "Gilroy, sans-serif" }}>
                  Certificado Digital
                </p>
                <span style={{ background: empresaFiscal?.certificado_valido ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: empresaFiscal?.certificado_valido ? "#10B981" : "#EF4444", border: `1px solid ${empresaFiscal?.certificado_valido ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 20, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600, fontFamily: "Gilroy, sans-serif" }}>
                  {empresaFiscal?.certificado_valido ? "Válido" : "Não configurado"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Ambiente */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
            style={{ ...glassCard, padding: 24, borderTop: `4px solid ${empresaFiscal?.ambiente === "producao" ? "#10B981" : "#F59E0B"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: empresaFiscal?.ambiente === "producao" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Settings style={{ width: 20, height: 20, color: empresaFiscal?.ambiente === "producao" ? "#10B981" : "#F59E0B" }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px", fontFamily: "Gilroy, sans-serif" }}>
                  Ambiente
                </p>
                <span style={{ background: empresaFiscal?.ambiente === "producao" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", color: empresaFiscal?.ambiente === "producao" ? "#10B981" : "#F59E0B", border: `1px solid ${empresaFiscal?.ambiente === "producao" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`, borderRadius: 20, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600, fontFamily: "Gilroy, sans-serif" }}>
                  {empresaFiscal?.ambiente === "producao" ? "Produção" : "Homologação"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tab pills */}
        <div style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(142,95,207,0.12)", borderRadius: 16, padding: 6, display: "inline-flex", gap: 4, marginBottom: 24 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              onMouseEnter={() => setHoveredTab(tab.key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={activeTab === tab.key ? tabActiveStyle : tabInactiveStyle(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Empresa ── */}
        {activeTab === "empresa" && (
          <Form {...empresaForm}>
            <form onSubmit={empresaForm.handleSubmit((data) => saveEmpresaMutation.mutate(data))}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Dados Cadastrais */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.4 }} style={{ ...glassCard, padding: 24 }}>
                  <p style={sectionTitleStyle}>
                    <Building2 style={{ width: 14, height: 14, color: "#8E5FCF" }} />
                    Dados Cadastrais
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <FormField control={empresaForm.control} name="cnpj" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>CNPJ *</label>
                        <FormControl>
                          <input {...field} placeholder="00.000.000/0000-00" onChange={(e) => field.onChange(formatCnpj(e.target.value))} style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="inscricao_estadual" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Inscrição Estadual *</label>
                        <FormControl>
                          <input {...field} placeholder="000000000" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="legal_name" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Razão Social *</label>
                        <FormControl>
                          <input {...field} placeholder="Razão social da empresa" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="trade_name" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Nome Fantasia</label>
                        <FormControl>
                          <input {...field} placeholder="Nome fantasia" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="inscricao_municipal" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Inscrição Municipal</label>
                        <FormControl>
                          <input {...field} placeholder="Inscrição municipal" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="regime_tributario" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Regime Tributário *</label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(142,95,207,0.2)", borderRadius: 12, fontFamily: "Gilroy, sans-serif", fontSize: 13, height: "auto", padding: "10px 14px" }}>
                              <SelectValue placeholder="Selecione o regime" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regimesTributarios.map((regime) => (
                              <SelectItem key={regime.value} value={regime.value}>{regime.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </motion.div>

                {/* Endereço */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} style={{ ...glassCard, padding: 24 }}>
                  <p style={sectionTitleStyle}>
                    <Settings style={{ width: 14, height: 14, color: "#8E5FCF" }} />
                    Endereço
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }}>
                    <FormField control={empresaForm.control} name="address_postal_code" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>CEP *</label>
                        <FormControl>
                          <input {...field} placeholder="00000-000" onChange={(e) => field.onChange(formatCep(e.target.value))} style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="address_street" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Logradouro *</label>
                        <FormControl>
                          <input {...field} placeholder="Rua, Avenida, etc." style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 16, marginBottom: 16 }}>
                    <FormField control={empresaForm.control} name="address_number" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Número *</label>
                        <FormControl>
                          <input {...field} placeholder="123" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="endereco_complemento" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Complemento</label>
                        <FormControl>
                          <input {...field} placeholder="Sala, Loja, etc." style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="address_district" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Bairro *</label>
                        <FormControl>
                          <input {...field} placeholder="Bairro" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
                    <FormField control={empresaForm.control} name="address_city" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Cidade *</label>
                        <FormControl>
                          <input {...field} placeholder="Cidade" style={inputStyle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="address_state" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>UF *</label>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(142,95,207,0.2)", borderRadius: 12, fontFamily: "Gilroy, sans-serif", fontSize: 13, height: "auto", padding: "10px 14px" }}>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {estadosBrasileiros.map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={empresaForm.control} name="endereco_codigo_municipio" render={({ field }) => (
                      <FormItem>
                        <label style={labelStyle}>Cód. Município *</label>
                        <FormControl>
                          <input {...field} placeholder="0000000" style={inputStyle} />
                        </FormControl>
                        <p style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: "4px 0 0", fontFamily: "Gilroy, sans-serif" }}>Código IBGE</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </motion.div>

                {/* Save button */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={saveEmpresaMutation.isPending}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "none", background: saveEmpresaMutation.isPending ? "rgba(142,95,207,0.3)" : "linear-gradient(135deg, #47118F, #8E5FCF)", color: "#fff", cursor: saveEmpresaMutation.isPending ? "not-allowed" : "pointer", fontFamily: "Gilroy, sans-serif" }}
                  >
                    {saveEmpresaMutation.isPending && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
                    Salvar Dados da Empresa
                  </button>
                </motion.div>
              </div>
            </form>
          </Form>
        )}

        {/* ── TAB: NFC-e ── */}
        {activeTab === "nfce" && (
          <div>
            {!empresaFiscal ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                style={{ ...glassCard, padding: 48, textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <AlertTriangle style={{ width: 32, height: 32, color: "#F59E0B" }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#1F2937", margin: "0 0 8px", fontFamily: "Gilroy, sans-serif" }}>Dados da empresa pendentes</p>
                <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 24px", fontFamily: "Gilroy, sans-serif" }}>
                  Configure os dados da empresa antes de configurar a NFC-e
                </p>
                <button onClick={() => setActiveTab("empresa")} style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, borderRadius: 12, border: "1px solid rgba(142,95,207,0.25)", background: "rgba(255,255,255,0.7)", color: "#47118F", cursor: "pointer", fontFamily: "Gilroy, sans-serif" }}>
                  Ir para Dados da Empresa
                </button>
              </motion.div>
            ) : (
              <Form {...nfceForm}>
                <form onSubmit={nfceForm.handleSubmit((data) => saveNfceMutation.mutate(data))}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* NFC-e settings */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.4 }} style={{ ...glassCard, padding: 24 }}>
                      <p style={sectionTitleStyle}>
                        <FileText style={{ width: 14, height: 14, color: "#8E5FCF" }} />
                        Configurações NFC-e
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <FormField control={nfceForm.control} name="crt_codigo" render={({ field }) => (
                          <FormItem>
                            <label style={labelStyle}>CRT (Código de Regime Tributário)</label>
                            <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(142,95,207,0.2)", borderRadius: 12, fontFamily: "Gilroy, sans-serif", fontSize: 13, height: "auto", padding: "10px 14px" }}>
                                  <SelectValue placeholder="Selecione o CRT" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">1 - Simples Nacional</SelectItem>
                                <SelectItem value="2">2 - Simples Nacional - Excesso sublimite</SelectItem>
                                <SelectItem value="3">3 - Regime Normal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={nfceForm.control} name="cnae_codigo" render={({ field }) => (
                          <FormItem>
                            <label style={labelStyle}>CNAE</label>
                            <FormControl>
                              <input {...field} placeholder="Ex: 5611-2/01" style={inputStyle} />
                            </FormControl>
                            <p style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: "4px 0 0", fontFamily: "Gilroy, sans-serif" }}>
                              Código CNAE da atividade principal (opcional)
                            </p>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div style={{ height: 1, background: "rgba(142,95,207,0.08)", margin: "8px 0 20px" }} />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                        <FormField control={nfceForm.control} name="ambiente" render={({ field }) => (
                          <FormItem>
                            <label style={labelStyle}>Ambiente *</label>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(142,95,207,0.2)", borderRadius: 12, fontFamily: "Gilroy, sans-serif", fontSize: 13, height: "auto", padding: "10px 14px" }}>
                                  <SelectValue placeholder="Selecione o ambiente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                                <SelectItem value="producao">Produção</SelectItem>
                              </SelectContent>
                            </Select>
                            <p style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: "4px 0 0", fontFamily: "Gilroy, sans-serif" }}>
                              Use homologação para testes
                            </p>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={nfceForm.control} name="serie_nfce" render={({ field }) => (
                          <FormItem>
                            <label style={labelStyle}>Série NFC-e *</label>
                            <FormControl>
                              <input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} style={inputStyle} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField control={nfceForm.control} name="numero_nfce" render={({ field }) => (
                          <FormItem>
                            <label style={labelStyle}>Próximo Número *</label>
                            <FormControl>
                              <input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} style={inputStyle} />
                            </FormControl>
                            <p style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: "4px 0 0", fontFamily: "Gilroy, sans-serif" }}>
                              Número da próxima NFC-e
                            </p>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </motion.div>

                    {/* Provedor info */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
                      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", borderLeft: "4px solid #10B981", borderRadius: 16, padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <CheckCircle2 style={{ width: 20, height: 20, color: "#10B981", flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#10B981", margin: "0 0 4px", fontFamily: "Gilroy, sans-serif" }}>Provedor Becoming</p>
                        <p style={{ fontSize: 13, color: "#6B7280", margin: 0, fontFamily: "Gilroy, sans-serif" }}>
                          A Becoming é um sistema PAF-ECF credenciado que gerencia o certificado digital e CSC automaticamente.
                          Não é necessário configurar certificado digital nem CSC nesta tela.
                        </p>
                      </div>
                    </motion.div>

                    {/* Test emission */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} style={{ ...glassCard, padding: 24 }}>
                      <p style={sectionTitleStyle}>
                        <TestTube2 style={{ width: 14, height: 14, color: "#8E5FCF" }} />
                        Teste de Emissão NFC-e
                      </p>

                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: "0 0 4px", fontFamily: "Gilroy, sans-serif" }}>Emitir NFC-e de Teste</p>
                          <p style={{ fontSize: 13, color: "#6B7280", margin: 0, fontFamily: "Gilroy, sans-serif" }}>
                            Emita uma NFC-e de teste no ambiente de homologação para validar a configuração
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => testNfceMutation.mutate()}
                          disabled={testNfceMutation.isPending || nfceForm.watch("ambiente") !== "homologacao"}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, borderRadius: 12, border: "1px solid rgba(142,95,207,0.25)", background: testNfceMutation.isPending || nfceForm.watch("ambiente") !== "homologacao" ? "rgba(142,95,207,0.08)" : "rgba(255,255,255,0.8)", color: "#47118F", cursor: testNfceMutation.isPending || nfceForm.watch("ambiente") !== "homologacao" ? "not-allowed" : "pointer", opacity: nfceForm.watch("ambiente") !== "homologacao" ? 0.5 : 1, fontFamily: "Gilroy, sans-serif", flexShrink: 0 }}
                        >
                          {testNfceMutation.isPending ? (
                            <><Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Emitindo...</>
                          ) : (
                            <><Receipt style={{ width: 14, height: 14 }} /> Emitir NFC-e de Teste</>
                          )}
                        </button>
                      </div>

                      {nfceForm.watch("ambiente") !== "homologacao" && (
                        <div style={{ background: "rgba(245,158,11,0.06)", borderLeft: "4px solid #F59E0B", borderRadius: 12, padding: "12px 16px", marginBottom: 12 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <AlertTriangle style={{ width: 16, height: 16, color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", margin: "0 0 2px", fontFamily: "Gilroy, sans-serif" }}>Ambiente de Produção</p>
                              <p style={{ fontSize: 12, color: "#6B7280", margin: 0, fontFamily: "Gilroy, sans-serif" }}>
                                O teste só está disponível no ambiente de homologação. Altere o ambiente para realizar testes.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {testResult && (
                        <div style={{ background: testResult.success ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${testResult.success ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, borderLeft: `4px solid ${testResult.success ? "#10B981" : "#EF4444"}`, borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            {testResult.success
                              ? <CheckCircle2 style={{ width: 16, height: 16, color: "#10B981", flexShrink: 0 }} />
                              : <AlertTriangle style={{ width: 16, height: 16, color: "#EF4444", flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: testResult.success ? "#10B981" : "#EF4444", margin: "0 0 4px", fontFamily: "Gilroy, sans-serif" }}>
                                {testResult.success ? "Sucesso!" : "Falha no teste"}
                              </p>
                              <p style={{ fontSize: 12, color: "#6B7280", margin: 0, fontFamily: "Gilroy, sans-serif" }}>{testResult.message}</p>
                              {testResult.details && (
                                <details style={{ marginTop: 8 }}>
                                  <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6B7280", fontFamily: "Gilroy, sans-serif" }}>Ver detalhes</summary>
                                  <pre style={{ marginTop: 8, fontSize: 11, background: "rgba(0,0,0,0.04)", padding: 8, borderRadius: 8, overflow: "auto", maxHeight: 160, fontFamily: "monospace", color: "#374151" }}>
                                    {JSON.stringify(testResult.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Save NFC-e */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="submit"
                        disabled={saveNfceMutation.isPending}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "none", background: saveNfceMutation.isPending ? "rgba(142,95,207,0.3)" : "linear-gradient(135deg, #47118F, #8E5FCF)", color: "#fff", cursor: saveNfceMutation.isPending ? "not-allowed" : "pointer", fontFamily: "Gilroy, sans-serif" }}
                      >
                        {saveNfceMutation.isPending && <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />}
                        Salvar Configurações NFC-e
                      </button>
                    </motion.div>
                  </div>
                </form>
              </Form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
