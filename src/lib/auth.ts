/**
 * Helpers de autenticação e autorização multi-tenant.
 *
 * company_id vem do JWT app_metadata (definido pelo custom_access_token_hook).
 * app_metadata é server-side only — não pode ser editado pelo usuário.
 *
 * USO:
 *   import { getEmpresaId, requireEmpresaId, getEmpresaRole } from '@/lib/auth';
 */

import { api, type Session, type User } from '@/lib/api';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type AppRole = 'admin' | 'manager' | 'seller' | 'viewer';

export interface EmpresaContext {
  companyId: string;
  role: AppRole;
  userId: string;
}

// ---------------------------------------------------------------------------
// Extrair company_id do JWT (sincrono — usa sessão em cache)
// ---------------------------------------------------------------------------

/**
 * Retorna o company_id do JWT da sessão atual, ou null se não estiver presente.
 * Não faz chamada ao banco — lê do token em memória.
 */
export function getEmpresaIdFromSession(session: Session | null): string | null {
  return (session?.user?.app_metadata?.company_id as string | undefined) ?? null;
}

/**
 * Retorna o role do usuário na empresa atual (do JWT), ou null.
 */
export function getEmpresaRoleFromSession(session: Session | null): AppRole | null {
  return (session?.user?.app_metadata?.empresa_role as AppRole | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// Helpers assíncronos (leem a sessão atual)
// ---------------------------------------------------------------------------

/**
 * Retorna o company_id do usuário autenticado atual.
 * Lê do JWT — sem query ao banco.
 *
 * @returns company_id (uuid string) ou null se não autenticado / sem empresa
 */
export async function getEmpresaId(): Promise<string | null> {
  const { data } = await api.auth.getSession();
  return getEmpresaIdFromSession(data.session);
}

/**
 * Retorna o company_id ou lança erro se não estiver disponível.
 * Use em contextos onde company_id é obrigatório (ex: ao criar registros).
 *
 * @throws Error se o usuário não estiver autenticado ou sem empresa associada
 */
export async function requireEmpresaId(): Promise<string> {
  const companyId = await getEmpresaId();

  if (!companyId) {
    throw new Error(
      'company_id não encontrado no JWT. ' +
        'Verifique se o Custom Access Token Hook está configurado e se o usuário ' +
        'está associado a uma empresa em user_empresas.'
    );
  }

  return companyId;
}

/**
 * Retorna o contexto completo da empresa: companyId + role + userId.
 * @throws Error se não autenticado ou sem empresa
 */
export async function getEmpresaContext(): Promise<EmpresaContext> {
  const { data, error } = await api.auth.getSession();

  if (error || !data.session) {
    throw new Error('Usuário não autenticado.');
  }

  const companyId = getEmpresaIdFromSession(data.session);
  const role = getEmpresaRoleFromSession(data.session);

  if (!companyId) {
    throw new Error(
      'company_id não encontrado no JWT. Configure o Custom Access Token Hook.'
    );
  }

  return {
    companyId,
    role: role ?? 'viewer',
    userId: data.session.user.id,
  };
}

/**
 * Retorna o usuário autenticado.
 */
export async function getAuthUser(): Promise<User | null> {
  const { data } = await api.auth.getUser();
  return data.user;
}

// ---------------------------------------------------------------------------
// Verificações de role
// ---------------------------------------------------------------------------

export function isAdmin(session: Session | null): boolean {
  return getEmpresaRoleFromSession(session) === 'admin';
}

export function isAdminOrGerente(session: Session | null): boolean {
  const role = getEmpresaRoleFromSession(session);
  return role === 'admin' || role === 'manager';
}

export function canWrite(session: Session | null): boolean {
  const role = getEmpresaRoleFromSession(session);
  return role === 'admin' || role === 'manager' || role === 'seller';
}

// ---------------------------------------------------------------------------
// Helper para garantir que inserts/updates incluam company_id
// ---------------------------------------------------------------------------

/**
 * Retorna os campos obrigatórios de tenant para inserts.
 * Uso: await api.from('sale').insert({ ...dados, ...await tenantFields() })
 */
export async function tenantFields(): Promise<{ company_id: string; user_id: string }> {
  const { data, error } = await api.auth.getSession();

  if (error || !data.session) throw new Error('Usuário não autenticado.');

  const companyId = getEmpresaIdFromSession(data.session);
  if (!companyId) throw new Error('company_id não disponível no JWT.');

  return {
    company_id: companyId,
    user_id: data.session.user.id,
  };
}

// ---------------------------------------------------------------------------
// Diagnóstico
// ---------------------------------------------------------------------------

/**
 * Exibe no console os claims relevantes do JWT atual.
 * Use apenas em desenvolvimento para depuração.
 */
export async function debugJwtClaims(): Promise<void> {
  const { data } = await api.auth.getSession();
  const meta = data.session?.user?.app_metadata;

  console.group('[Auth Debug] JWT app_metadata');
  console.log('company_id  :', meta?.company_id ?? '⚠️  NÃO ENCONTRADO');
  console.log('empresa_role:', meta?.empresa_role ?? '⚠️  NÃO ENCONTRADO');
  console.log('user_id     :', data.session?.user?.id ?? 'não autenticado');

  if (!meta?.company_id) {
    console.warn(
      'company_id ausente. Verifique:\n' +
        '  1. custom_access_token_hook está registrado no Dashboard?\n' +
        '  2. O usuário está em user_empresas?\n' +
        '  3. Faça logout + login para forçar novo JWT.'
    );
  }
  console.groupEnd();
}
