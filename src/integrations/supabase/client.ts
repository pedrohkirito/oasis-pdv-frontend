/**
 * Cliente compatível com as chamadas que o PDV fazia ao Supabase.
 * Toda leitura e escrita vai para a API do oasis-backend.
 */

const API = '/api';
const EMPRESA_KEY = 'lafiore-empresa-ativa';

type Listener = (event: string, session: Session | null) => void;

interface SessionUser {
  id: string;
  email: string;
  aud: string;
  created_at: string;
  user_metadata: { nome?: string | null; avatar_url?: string | null };
  app_metadata: { empresa_id?: string | null; empresa_role?: string | null };
}

interface Session {
  access_token: string;
  user: SessionUser;
}

interface EmpresaSessao {
  id: string;
  nome: string;
  role: string;
}

let cachedUser: {
  id: string;
  nome: string;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string;
  empresas: EmpresaSessao[];
} | null = null;

const listeners = new Set<Listener>();

function empresaAtivaId() {
  return localStorage.getItem(EMPRESA_KEY);
}

function buildSession(): Session | null {
  if (!cachedUser) return null;
  const empresaId = empresaAtivaId();
  const vinculo = cachedUser.empresas.find((e) => e.id === empresaId);
  return {
    access_token: 'cookie',
    user: {
      id: cachedUser.id,
      email: cachedUser.email,
      aud: 'authenticated',
      created_at: cachedUser.createdAt ?? new Date().toISOString(),
      user_metadata: {
        nome: cachedUser.nome,
        avatar_url: cachedUser.avatarUrl ?? null,
      },
      app_metadata: {
        empresa_id: empresaId,
        empresa_role: vinculo?.role ?? null,
      },
    },
  };
}

function emit(event: string) {
  const session = buildSession();
  for (const listener of listeners) listener(event, session);
}

export function syncEmpresaNaSessao(empresaId: string) {
  localStorage.setItem(EMPRESA_KEY, empresaId);
  emit('TOKEN_REFRESHED');
}

async function api(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const empresaId = empresaAtivaId();
  if (empresaId) headers.set('X-Empresa-Id', empresaId);
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { ok: response.ok, status: response.status, body };
}

async function carregarSessao() {
  const { ok, body } = await api('/auth/sessao');
  if (!ok || !body?.usuario) {
    cachedUser = null;
    return null;
  }
  cachedUser = {
    id: body.usuario.id,
    nome: body.usuario.nome,
    email: body.usuario.email,
    avatarUrl: body.usuario.avatarUrl ?? null,
    createdAt: body.usuario.createdAt,
    empresas: (body.empresas ?? []).map((e: { id: string; role: string; nome: string }) => ({
      id: e.id,
      nome: e.nome,
      role: e.role,
    })),
  };
  return buildSession();
}

class Query {
  table: string;
  action: string | null = null;
  selectClause = '*';
  filters: { op: string; column: string; value: unknown }[] = [];
  nots: { op: string; column: string; value: unknown }[] = [];
  orders: { column: string; ascending: boolean }[] = [];
  limitN: number | null = null;
  rangePair: [number, number] | null = null;
  singleRow = false;
  maybeSingleRow = false;
  countMode: string | null = null;
  head = false;
  returning = false;
  values: unknown = null;
  onConflict: string | null = null;
  executed: Promise<{ data: unknown; error: { message: string; code?: string } | null; count?: number | null }> | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*', options?: { count?: string; head?: boolean }) {
    this.selectClause = columns;
    this.returning = true;
    if (!this.action) this.action = 'select';
    if (options?.count) this.countMode = options.count;
    if (options?.head) this.head = true;
    return this;
  }

  insert(values: unknown) {
    this.action = 'insert';
    this.values = values;
    return this;
  }

  update(values: unknown) {
    this.action = 'update';
    this.values = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(values: unknown, options?: { onConflict?: string }) {
    this.action = 'upsert';
    this.values = values;
    this.onConflict = options?.onConflict ?? null;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: 'eq', column, value });
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push({ op: 'neq', column, value });
    return this;
  }
  gt(column: string, value: unknown) {
    this.filters.push({ op: 'gt', column, value });
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push({ op: 'gte', column, value });
    return this;
  }
  lt(column: string, value: unknown) {
    this.filters.push({ op: 'lt', column, value });
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push({ op: 'lte', column, value });
    return this;
  }
  like(column: string, value: unknown) {
    this.filters.push({ op: 'like', column, value });
    return this;
  }
  ilike(column: string, value: unknown) {
    this.filters.push({ op: 'ilike', column, value });
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push({ op: 'is', column, value });
    return this;
  }
  in(column: string, value: unknown) {
    this.filters.push({ op: 'in', column, value });
    return this;
  }
  not(column: string, op: string, value: unknown) {
    this.nots.push({ op, column, value });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.rangePair = [from, to];
    return this;
  }
  single() {
    this.singleRow = true;
    return this;
  }
  maybeSingle() {
    this.maybeSingleRow = true;
    return this;
  }

  then<TResult1 = { data: unknown; error: { message: string } | null; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string; code?: string } | null; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    if (!this.executed) this.executed = this.run();
    return this.executed.then(onfulfilled, onrejected);
  }

  private async run() {
    try {
      const { ok, body } = await api('/dados', {
        method: 'POST',
        body: JSON.stringify({
          table: this.table,
          action: this.action ?? 'select',
          select: this.selectClause,
          filters: this.filters,
          nots: this.nots,
          order: this.orders,
          limit: this.limitN,
          range: this.rangePair,
          single: this.singleRow,
          maybeSingle: this.maybeSingleRow,
          count: this.countMode,
          head: this.head,
          returning: this.returning,
          values: this.values,
          onConflict: this.onConflict,
        }),
      });
      if (!ok) {
        const message = body?.error?.message ?? body?.message ?? 'Erro ao consultar dados';
        return { data: null, error: { message, code: body?.error?.code }, count: null };
      }
      return {
        data: body?.data ?? null,
        error: body?.error ?? null,
        count: body?.count ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha de rede';
      return { data: null, error: { message }, count: null };
    }
  }
}

async function invoke(name: string, options?: { body?: unknown; method?: string }) {
  try {
    const { ok, body } = await api(`/functions/${name}`, {
      method: options?.method ?? 'POST',
      body: JSON.stringify(options?.body ?? {}),
    });
    if (!ok) {
      return {
        data: body,
        error: { message: body?.error?.message ?? body?.message ?? body?.error ?? 'Erro na função' },
      };
    }
    return { data: body, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Falha de rede' } };
  }
}

export const supabase = {
  from(table: string) {
    return new Query(table);
  },
  rpc(name: string, args?: Record<string, unknown>) {
    return api(`/rpc/${name}`, { method: 'POST', body: JSON.stringify(args ?? {}) }).then(({ ok, body }) => {
      if (!ok) {
        return { data: null, error: { message: body?.error?.message ?? body?.error ?? 'Erro ao executar operação' } };
      }
      if (body?.error) return { data: null, error: { message: String(body.error) } };
      return { data: body?.data ?? null, error: null };
    });
  },
  functions: {
    invoke(name: string, options?: { body?: unknown; method?: string }) {
      return invoke(name, options);
    },
  },
  channel(_name: string) {
    const handle = {
      on() {
        return handle;
      },
      subscribe() {
        return handle;
      },
    };
    return handle;
  },
  removeChannel() {
    return Promise.resolve('ok');
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: Blob) {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] ?? 0);
          const { ok, body } = await api(`/storage/${bucket}`, {
            method: 'POST',
            body: JSON.stringify({
              path,
              contentType: file.type || 'application/octet-stream',
              data: btoa(binary),
            }),
          });
          if (!ok) return { data: null, error: { message: body?.error?.message ?? 'Falha no upload' } };
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `/api/arquivos/${bucket}/${path}` } };
        },
      };
    },
  },
  auth: {
    async getSession() {
      try {
        const session = cachedUser ? buildSession() : await carregarSessao();
        return { data: { session }, error: null };
      } catch (error) {
        return { data: { session: null }, error };
      }
    },
    async getUser() {
      const session = cachedUser ? buildSession() : await carregarSessao();
      return { data: { user: session?.user ?? null }, error: null };
    },
    onAuthStateChange(callback: Listener) {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const { ok, body } = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!ok) return { data: null, error: { message: body?.error?.message ?? 'E-mail ou senha inválidos.' } };
      await carregarSessao();
      emit('SIGNED_IN');
      return { data: { user: buildSession()?.user ?? null }, error: null };
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { nome?: string }; emailRedirectTo?: string } }) {
      const { ok, body } = await api('/auth/cadastro', {
        method: 'POST',
        body: JSON.stringify({ email, password, nome: options?.data?.nome }),
      });
      if (!ok) return { data: null, error: { message: body?.error?.message ?? 'Não foi possível cadastrar.' } };
      await carregarSessao();
      emit('SIGNED_IN');
      return { data: { user: buildSession()?.user ?? null }, error: null };
    },
    async signOut() {
      await api('/auth/logout', { method: 'POST', body: '{}' });
      cachedUser = null;
      emit('SIGNED_OUT');
      return { error: null };
    },
    async updateUser(payload: { password?: string; data?: Record<string, unknown> }) {
      const { ok, body } = await api('/auth/perfil', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!ok) return { data: null, error: { message: body?.error?.message ?? 'Não foi possível atualizar o perfil.' } };
      await carregarSessao();
      emit('USER_UPDATED');
      return { data: { user: buildSession()?.user ?? null }, error: null };
    },
    async resetPasswordForEmail() {
      return {
        data: null,
        error: { message: 'A recuperação de senha por e-mail ainda não está configurada. Peça a um administrador.' },
      };
    },
  },
};
