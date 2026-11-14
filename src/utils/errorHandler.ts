import { toast } from "sonner";

interface PostgrestError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Checks if an error is an RLS (Row Level Security) permission error
 * and shows a friendly toast message to the user.
 * Returns true if it was an RLS error (so caller can skip generic error handling).
 */
export function handleSupabaseError(
  error: PostgrestError | null | undefined,
  fallbackMessage = "Ocorreu um erro inesperado."
): boolean {
  if (!error) return false;

  const msg = error.message?.toLowerCase() || "";
  const code = error.code || "";

  // RLS violation on INSERT/UPDATE
  if (
    code === "42501" ||
    msg.includes("row-level security") ||
    msg.includes("new row violates") ||
    msg.includes("permission denied") ||
    msg.includes("insufficient_privilege")
  ) {
    toast.error("Acesso negado", {
      description:
        "Você não tem permissão para realizar esta ação. Verifique seu nível de acesso com o administrador.",
      duration: 6000,
    });
    return true;
  }

  // RLS returns empty but user expected data (handled differently by caller)
  // Foreign key violation
  if (code === "23503") {
    toast.error("Registro vinculado", {
      description:
        "Este registro está vinculado a outros dados e não pode ser alterado/excluído.",
      duration: 5000,
    });
    return true;
  }

  // Unique constraint
  if (code === "23505") {
    toast.error("Registro duplicado", {
      description: "Já existe um registro com esses dados.",
      duration: 5000,
    });
    return true;
  }

  // Fallback — show generic message (do not leak raw DB error details)
  if (error.message) {
    console.error('[Supabase error]', error);
  }
  toast.error(fallbackMessage, {
    duration: 5000,
  });
  return true;

}
