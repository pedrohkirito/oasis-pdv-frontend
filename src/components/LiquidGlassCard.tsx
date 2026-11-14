import React from 'react';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type LiquidVariant = 'default' | 'purple' | 'strong' | 'static';

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variante visual do glass:
   * - `default`  — branco translúcido com hover lift (padrão)
   * - `static`   — igual ao default mas sem hover transform (containers de layout)
   * - `strong`   — mais opaco e mais blur (modais, sidebars)
   * - `purple`   — fundo roxo translúcido (cards destaque, banners, CTAs)
   */
  variant?: LiquidVariant;
  /** Padding interno padrão (equivalente a p-6). Passe false para desativar. */
  padded?: boolean;
  /** Renderiza como outro elemento HTML (ex: `as="button"`, `as="section"`) */
  as?: keyof React.JSX.IntrinsicElements;
  children?: React.ReactNode;
}

const variantClass: Record<LiquidVariant, string> = {
  default:  'liquid-glass',
  static:   'liquid-glass-static',
  strong:   'liquid-glass-strong',
  purple:   'liquid-glass-purple',
};

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * LiquidGlassCard
 *
 * Wrapper genérico que aplica o efeito Liquid Glass ao container.
 * Substitui qualquer `<div className="liquid-glass ...">` manual.
 *
 * @example
 * // Card métrico simples
 * <LiquidGlassCard padded>
 *   <p>Vendas Hoje</p>
 *   <p>R$ 1.234,00</p>
 * </LiquidGlassCard>
 *
 * @example
 * // Banner de destaque
 * <LiquidGlassCard variant="purple" className="col-span-2">
 *   ...
 * </LiquidGlassCard>
 *
 * @example
 * // Container de layout sem hover
 * <LiquidGlassCard variant="static" padded={false}>
 *   <table>...</table>
 * </LiquidGlassCard>
 */
export function LiquidGlassCard({
  variant = 'default',
  padded = false,
  as: Tag = 'div',
  className,
  children,
  ...props
}: LiquidGlassCardProps) {
  return (
    // @ts-expect-error — Tag é dinâmico mas válido
    <Tag
      className={cn(
        variantClass[variant],
        padded && 'p-6',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ─── Sub-componentes de conveniência ──────────────────────────────────────────

/**
 * Header do LiquidGlassCard — equivalente ao CardHeader do shadcn/ui.
 * Inclui label de seção uppercase, título principal e subtítulo opcional.
 */
export function LiquidGlassCardHeader({
  label,
  title,
  subtitle,
  action,
  className,
}: {
  label?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between p-6 pb-2', className)}>
      <div className="min-w-0 flex-1">
        {label && (
          <p style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            marginBottom: '4px',
          }}>
            {label}
          </p>
        )}
        <div className="text-base font-semibold text-foreground leading-tight">
          {title}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Corpo do LiquidGlassCard com padding padrão.
 */
export function LiquidGlassCardBody({
  children,
  className,
  noPadTop = true,
}: {
  children?: React.ReactNode;
  className?: string;
  noPadTop?: boolean;
}) {
  return (
    <div className={cn('px-6 pb-6', noPadTop && 'pt-0', className)}>
      {children}
    </div>
  );
}
