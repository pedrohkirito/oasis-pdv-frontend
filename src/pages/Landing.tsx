import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion';
import {
  ShoppingCart, FileText, Receipt,
  UserPlus, Building2, TrendingUp,
  Instagram, Linkedin, Twitter,
  Check, ArrowRight,
  Smartphone, Package, Users, BarChart3, Zap,

  Settings2, Rocket, FileCheck, Wallet,
  Star, Minus, CheckCircle,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

// ─── CustomCursor ─────────────────────────────────────────────────────────────

const CustomCursor = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [delayed, setDelayed] = useState({ x: -100, y: -100 });
  const posRef = useRef({ x: -100, y: -100 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', move);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const animate = () => {
      setDelayed((prev) => ({
        x: lerp(prev.x, posRef.current.x, 0.08),
        y: lerp(prev.y, posRef.current.y, 0.08),
      }));
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', move);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <>
      {/* ponto central */}
      <div style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        left: pos.x - 4,
        top: pos.y - 4,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#8E5FCF',
        opacity: 0.9,
        transition: 'opacity 0.2s',
      }} />
      {/* anel externo com delay */}
      <div style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9998,
        left: delayed.x - 18,
        top: delayed.y - 18,
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '1.5px solid rgba(142,95,207,0.5)',
        background: 'rgba(142,95,207,0.05)',
      }} />
    </>
  );
};

// ─── ParallaxImage — imagem com parallax ao scroll ───────────────────────────

const ParallaxImage = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl">
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
};

// ─── GradientIcon ─────────────────────────────────────────────────────────────

const GradientIcon = ({
  icon: Icon,
  gradient,
  iconSize = 22,
  containerSize = 44,
  borderRadius = '14px',
  padding = '10px',
}: {
  icon: React.ElementType;
  gradient?: string;
  iconSize?: number;
  containerSize?: number;
  borderRadius?: string;
  padding?: string;
}) => (
  <div style={{
    background: gradient || 'linear-gradient(135deg, #FFB347, #FAF66B)',
    borderRadius,
    padding,
    width: containerSize,
    height: containerSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    flexShrink: 0,
  }}>
    <Icon size={iconSize} color={gradient ? '#FFFFFF' : '#1F2937'} strokeWidth={1.5} />
  </div>
);

// ─── PastelBadge ─────────────────────────────────────────────────────────────

const PastelBadge = ({ text, color }: { text: string; color: string }) => (
  <span style={{
    background: color + '20',
    border: `1px solid ${color}40`,
    color,
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '0.8rem',
    fontWeight: 500,
    display: 'inline-block',
  }}>
    {text}
  </span>
);

// ─── GradientText ─────────────────────────────────────────────────────────────

type GradientVariant = 'purple' | 'warm' | 'cool' | 'green' | 'multi';

const GRADIENTS: Record<GradientVariant, string> = {
  purple: 'linear-gradient(135deg, #8E5FCF 0%, #B987FF 100%)',
  warm:   'linear-gradient(135deg, #F59E0B 0%, #FAF66B 100%)',
  cool:   'linear-gradient(135deg, #3B82F6 0%, #93C5FD 100%)',
  green:  'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)',
  multi:  'linear-gradient(135deg, #8E5FCF 0%, #B987FF 40%, #E0DC41 100%)',
};

const GradientText = ({ children, gradient = 'purple' }: { children: React.ReactNode; gradient?: GradientVariant }) => (
  <span style={{
    background: GRADIENTS[gradient],
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }}>
    {children}
  </span>
);

// ─── Glass tokens ─────────────────────────────────────────────────────────────

const glass = {
  light: {
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 4px 24px rgba(142,95,207,0.06)',
  },
  medium: {
    background: 'rgba(255,255,255,0.4)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.6)',
  },
  purple: {
    background: 'rgba(142,95,207,0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(185,135,255,0.4)',
    boxShadow: '0 8px 32px rgba(142,95,207,0.25)',
  },
  dark: {
    background: 'rgba(10,0,16,0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
} satisfies Record<string, React.CSSProperties>;

// ─── SectionDivider ───────────────────────────────────────────────────────────

const SectionDivider = () => (
  <div style={{
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(142,95,207,0.15), transparent)',
    margin: '0 auto',
    maxWidth: '600px',
  }} />
);

// ─── FadeIn — wrapper de animação ao entrar no viewport ──────────────────────

const FadeIn = ({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}) => {
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 40 : direction === 'down' ? -40 : 0,
      x: direction === 'left' ? -40 : direction === 'right' ? 40 : 0,
    },
    visible: { opacity: 1, y: 0, x: 0 },
  };
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── TiltCard — hover 3D para cards ──────────────────────────────────────────

const TiltCard = ({
  children,
  className = '',
  style: extStyle,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [4, -4]);
  const rotateY = useTransform(x, [-100, 100], [-4, 4]);

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', ...extStyle }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      whileHover={{ scale: 1.02, zIndex: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── AnimatedCounter — número animado ao entrar no viewport ──────────────────

const AnimatedCounter = ({
  end,
  prefix = '',
  suffix = '',
}: {
  end: number;
  prefix?: string;
  suffix?: string;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 2000;
          const steps = 60;
          const increment = end / steps;
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
};

// ─── InfiniteMarquee ─────────────────────────────────────────────────────────

const InfiniteMarquee = () => {
  const items = [
    { Icon: ShoppingCart, text: 'PDV Completo'         },
    { Icon: FileText,     text: 'Emissão de NF-e'      },
    { Icon: Smartphone,   text: 'NFC-e Integrada'      },
    { Icon: Receipt,      text: 'Contas a Pagar'       },
    { Icon: TrendingUp,   text: 'Fluxo de Caixa'       },
    { Icon: Package,      text: 'Controle de Estoque'  },
    { Icon: Users,        text: 'Gestão de Clientes'   },
    { Icon: BarChart3,    text: 'Relatórios Completos' },
    { Icon: Building2,    text: 'Multi-empresa'        },
    { Icon: Zap,          text: 'Tempo Real'           },
  ];

  return (
    <div style={{
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
      background: 'rgba(255,255,255,0.25)',
      backdropFilter: 'blur(30px) saturate(180%)',
      WebkitBackdropFilter: 'blur(30px) saturate(180%)',
      borderTop: '1px solid rgba(255,255,255,0.5)',
      borderBottom: '1px solid rgba(255,255,255,0.5)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.3)',
      padding: '14px 0',
    }}>
      {/* Fade esquerda */}
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: '120px', height: '100%',
        background: 'linear-gradient(90deg, rgba(248,246,255,0.9), transparent)',
        zIndex: 2, pointerEvents: 'none',
      }} />
      {/* Fade direita */}
      <div style={{
        position: 'absolute', right: 0, top: 0,
        width: '120px', height: '100%',
        background: 'linear-gradient(-90deg, rgba(248,246,255,0.9), transparent)',
        zIndex: 2, pointerEvents: 'none',
      }} />
      <motion.div
        className="flex gap-8 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {[...items, ...items].map((item, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              border: '1px solid rgba(255,255,255,0.7)',
              borderRadius: '100px',
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 4px rgba(142,95,207,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
              color: '#6B7280',
              fontSize: '0.85rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            <item.Icon size={16} strokeWidth={1.5} color="#8E5FCF" />
            <span className="tracking-wide">{item.text}</span>
            <div style={{
              width: '4px', height: '4px',
              borderRadius: '50%',
              background: 'rgba(142,95,207,0.25)',
            }} />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// ─── Header ──────────────────────────────────────────────────────────────────

function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#funcionalidades', label: 'Funcionalidades' },
    { href: '#como-funciona',   label: 'Como funciona'   },
    { href: '#planos',          label: 'Planos'           },
    { href: '#faq',             label: 'FAQ'              },
  ];

  const handleAnchor = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        background: scrolled ? 'rgba(255,255,255,0.25)' : 'transparent',
        backdropFilter: scrolled ? 'blur(30px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(30px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.4)' : 'none',
        boxShadow: scrolled
          ? '0 1px 0 rgba(255,255,255,0.5), 0 4px 20px rgba(142,95,207,0.06)'
          : 'none',
        transition: 'all 0.4s ease',
        zIndex: 50,
      }}
    >
      <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          className="select-none"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          <img src="/images/oasis-logo-white.svg" alt="Oasis" className="h-16 w-auto object-fill" />
        </a>

        {/* Nav links — desktop */}
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => handleAnchor(l.href)}
              className="text-sm font-medium text-[#6B7280] hover:text-[#8E5FCF] transition-colors duration-200"
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* CTAs — desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-semibold transition-all duration-200 hover:opacity-80"
            style={{ ...glass.medium, borderRadius: '12px', padding: '8px 20px', color: '#6B7280' }}
          >
            Entrar
          </Link>
          <a
            href="#planos"
            onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="text-sm transition-all duration-200 hover:opacity-90"
            style={{ ...glass.purple, borderRadius: '12px', padding: '8px 20px', color: 'white', fontWeight: 600 }}
          >
            Começar grátis
          </a>
        </div>

        {/* Hamburger — mobile */}
        <button
          className="md:hidden p-2 rounded-lg text-[#1F2937] hover:bg-[#8E5FCF]/5 transition-colors duration-200"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Abrir menu"
        >
          <span className="block w-5 h-0.5 bg-current mb-1 transition-all duration-200" />
          <span className="block w-5 h-0.5 bg-current mb-1 transition-all duration-200" />
          <span className="block w-5 h-0.5 bg-current transition-all duration-200" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden px-6 py-4 space-y-3" style={{ ...glass.light, borderRadius: 0, borderTop: '1px solid rgba(255,255,255,0.6)', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => handleAnchor(l.href)}
              className="block w-full text-left text-sm font-medium text-[#1F2937] hover:text-[#8E5FCF] py-2 transition-colors duration-200"
            >
              {l.label}
            </button>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full py-2.5 text-sm font-semibold rounded-xl border border-[#8E5FCF] text-[#8E5FCF] hover:bg-[#8E5FCF]/5 transition-colors duration-200 text-center"
            >
              Entrar
            </Link>
            <button
              onClick={() => { setMobileOpen(false); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="w-full py-2.5 text-sm font-semibold rounded-xl bg-[#8E5FCF] text-white hover:bg-[#47118F] transition-colors duration-200"
            >
              Começar grátis
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { scrollYProgress } = useScroll();
  const mockupY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);

  return (
    <section
      className="relative"
      style={{
        minHeight: '100vh',
        background: 'transparent',
        paddingTop: '80px',
      }}
    >
      {/* Blob estático grande — centro-direita */}
      <div style={{
        position: 'absolute',
        right: '5%',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '500px',
        height: '500px',
        borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
        background: `
          radial-gradient(ellipse at 30% 30%,
            rgba(185,135,255,0.8) 0%,
            rgba(142,95,207,0.4) 40%,
            transparent 70%),
          radial-gradient(ellipse at 70% 70%,
            rgba(250,246,107,0.6) 0%,
            rgba(224,220,65,0.3) 40%,
            transparent 70%)
        `,
        filter: 'blur(40px)',
        opacity: 0.7,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Blob menor animado — topo direito */}
      <motion.div
        animate={{
          borderRadius: [
            '60% 40% 70% 30% / 50% 60% 40% 50%',
            '40% 60% 30% 70% / 60% 40% 50% 50%',
            '60% 40% 70% 30% / 50% 60% 40% 50%',
          ],
          rotate: [0, 10, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          right: '8%',
          top: '15%',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(255,179,71,0.5), transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Conteúdo centrado */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-32 pb-20">


        {/* H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="font-medium text-[#0A0010] leading-tight tracking-tight"
          style={{ fontSize: 'clamp(3rem, 7vw, 5rem)' }}
        >
          Seu negócio no
          <span
            style={{
              background: 'linear-gradient(135deg, #8E5FCF 0%, #B987FF 50%, #E0DC41 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'block',
            }}
          >
            controle total
          </span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-2xl mx-auto text-[#6B7280] text-xl mt-6 leading-relaxed"
        >
          Venda, emita notas e gerencie suas contas a pagar em uma plataforma
          simples, rápida e feita para pequenos comércios.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-10"
        >
          <motion.button
            className="text-sm"
            style={{ ...glass.dark, borderRadius: '14px', padding: '14px 32px', color: 'white', fontWeight: 600 }}
            whileHover={{ y: -2, opacity: 0.9 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Começar grátis por 14 dias
          </motion.button>

          <motion.div
            className="inline-block"
            whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(142,95,207,0.12)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Link
              to="/demo/contas-a-pagar"
              className="text-sm inline-block"
              style={{ ...glass.light, borderRadius: '14px', padding: '14px 32px', color: '#1F2937', fontWeight: 600 }}
            >
              Ver demonstração
            </Link>
          </motion.div>
        </motion.div>

        {/* Social proof — pill com 3 stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{
            ...glass.light,
            borderRadius: '100px',
            padding: '16px 40px',
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            width: 'fit-content',
            margin: '64px auto 0',
          }}
        >
          {[
            { value: '+50',   label: 'empresas ativas' },
            { value: '+10k',  label: 'notas emitidas'  },
            { value: '+R$2M', label: 'processados'     },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <div style={{ width: 1, height: 32, background: '#E2E8F0', flexShrink: 0 }} />}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0A0010', lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>
                  {stat.label}
                </p>
              </div>
            </React.Fragment>
          ))}
        </motion.div>

        {/* Mockup do browser com parallax */}
        <motion.div style={{ marginTop: '80px', perspective: '1200px', y: mockupY }}>
          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, rotateX: 6 }}
            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            style={{
              ...glass.light,
              borderRadius: '20px',
              padding: '10px',
              transformStyle: 'preserve-3d',
              boxShadow: '0 50px 100px rgba(10,0,16,0.12), 0 0 80px rgba(142,95,207,0.1), 0 4px 24px rgba(142,95,207,0.06)',
            }}
          >
            <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
            {/* Barra do browser */}
            <div style={{
              background: '#F3F4F6',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#FF5F57', '#FFBD2E', '#28C840'].map((c) => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{
                flex: 1,
                background: 'white',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '0.75rem',
                color: '#9CA3AF',
                textAlign: 'center',
                border: '1px solid #E5E7EB',
              }}>
                app.oasis.com.br/dashboard
              </div>
            </div>

            {/* Imagem do dashboard */}
            <img
              src="/images/dashboard-v2.png"
              alt="Dashboard Oasis"
              style={{ width: '100%', display: 'block' }}
            />
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}

// ─── Seção: Problema → Solução ────────────────────────────────────────────────

function ProblemaSolucao() {
  const stats = [
    { value: '73%',  label: 'das PMEs usam planilha',                     color: '#8E5FCF' },
    { value: '4h',   label: 'perdidas por dia em processos manuais',       color: '#F59E0B' },
    { value: 'R$0',  label: 'de visibilidade financeira real',             color: '#EF4444' },
  ];

  const tags = [
    { label: 'PDV Integrado',  color: '#8E5FCF' },
    { label: 'NF Automática',  color: '#F59E0B' },
    { label: 'Fluxo de Caixa', color: '#10B981' },
    { label: 'Tempo Real',     color: '#3B82F6' },
  ];

  return (
    <section id="problema" className="scroll-mt-20" style={{ padding: '128px 24px', position: 'relative', overflow: 'visible' }}> 
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Coluna esquerda — números grandes ── */}
        <FadeIn delay={0} direction="left">
          <div>
            {stats.map((stat, i) => (
              <div
                key={stat.value}
                style={{
                  ...glass.light,
                  borderRadius: '20px',
                  padding: '28px',
                  marginBottom: i < stats.length - 1 ? '16px' : 0,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.7)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.55)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <p style={{
                  fontSize: '4rem',
                  fontWeight: 700,
                  color: stat.color,
                  lineHeight: 1,
                  fontFamily: 'Gilroy, sans-serif',
                }}>
                  {stat.value}
                </p>
                <div style={{ width: '40px', height: '1px', background: '#E2E8F0', margin: '12px 0' }} />
                <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ── Coluna central — blob decorativo + ícone ── */}
        <FadeIn delay={0.2}>
          <div style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 40%,
              rgba(142,95,207,0.3),
              rgba(250,246,107,0.2) 50%,
              transparent 70%)`,
            filter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #8E5FCF, #B987FF)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 60px rgba(142,95,207,0.4)',
              filter: 'blur(0)',
            }}>
              <Zap size={36} color="white" strokeWidth={1.5} />
            </div>
          </div>
        </FadeIn>

        {/* ── Coluna direita — solução ── */}
        <FadeIn delay={0.35} direction="right">
          <div style={{ paddingTop: '48px' }}>
            {/* Ícone */}
            <div style={{ marginBottom: '20px' }}>
              <GradientIcon
                icon={CheckCircle}
                gradient="linear-gradient(135deg, #10B981, #6EE7B7)"
                iconSize={24}
                containerSize={52}
                borderRadius="14px"
                padding="12px"
              />
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0A0010', marginBottom: '16px' }}>
              Solução
            </h3>

            <p style={{ color: '#6B7280', lineHeight: 1.7 }}>
              O Oasis integra PDV, emissão de NF e gestão financeira numa plataforma
              única — eliminando planilhas, processos manuais e a falta de
              visibilidade do seu negócio.
            </p>

            {/* Tags pastel */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '24px' }}>
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  style={{
                    background: tag.color + '15',
                    border: `1px solid ${tag.color}30`,
                    color: tag.color,
                    borderRadius: '100px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}

// ─── Seção: Funcionalidades (Bento Grid) ─────────────────────────────────────

function Funcionalidades() {
  return (
    <section
      id="funcionalidades"
      className="py-24 scroll-mt-20"
      style={{ position: 'relative', background: 'transparent' }}
    >
      <div className="max-w-6xl mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
        {/* Cabeçalho */}
        <FadeIn delay={0}>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] tracking-tight mb-3">
              Tudo que <GradientText gradient="purple">seu negócio</GradientText> precisa
            </h2>
            <p className="text-lg text-[#6B7280]">Três módulos poderosos, uma plataforma só</p>
          </div>
        </FadeIn>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* CARD A — PDV (col-span-2) */}
          <FadeIn delay={0.1} className="md:col-span-2">
            <div className="flex flex-col md:flex-row gap-6 h-full transition-all duration-300" style={{ ...glass.light, borderRadius: '24px', padding: '32px' }}>
              {/* Texto */}
              <div className="flex-1">
                <div className="mb-4"><GradientIcon icon={ShoppingCart} gradient="linear-gradient(135deg, #8E5FCF, #B987FF)" /></div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-2">PDV <GradientText gradient="purple">rápido</GradientText> e intuitivo</h3>
                <p className="text-[#6B7280] text-sm mb-4 leading-relaxed">
                  Registre vendas em segundos, controle seu caixa diário e acompanhe cada transação em tempo real.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Abertura/fechamento de caixa', 'Múltiplas formas de pagamento', 'Histórico de vendas', 'Funciona no celular'].map((f) => (
                    <PastelBadge key={f} text={f} color="#8E5FCF" />
                  ))}
                </div>
              </div>
              {/* Imagem */}
              <div className="flex-1">
                <img
                  src="/images/dashboard.png"
                  alt="PDV Oasis"
                  className="w-full rounded-xl border border-[#E2E8F0] object-cover object-top shadow-sm"
                  style={{ height: '192px' }}
                />
              </div>
            </div>
          </FadeIn>

          {/* CARD B — NF/NFC-e (col-span-1) */}
          <FadeIn delay={0.2} className="md:col-span-1">
            <div className="h-full transition-all duration-300" style={{ ...glass.light, borderRadius: '24px', padding: '32px' }}>
              <img
                src="/images/notas-fiscais.png"
                alt="Notas Fiscais"
                className="w-full rounded-xl border border-[#E2E8F0] object-cover object-top mb-4 shadow-sm"
                style={{ height: '160px' }}
              />
              <div className="mb-3"><GradientIcon icon={FileCheck} gradient="linear-gradient(135deg, #F59E0B, #FCD34D)" /></div>
              <h3 className="text-lg font-bold text-[#1F2937] mb-2">Emissão de NF e <GradientText gradient="warm">NFC-e</GradientText></h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                Emita notas fiscais diretamente pelo sistema, sem complicação, integrado ao seu PDV.
              </p>
            </div>
          </FadeIn>

          {/* CARD C — Contas a Pagar (col-span-1) */}
          <FadeIn delay={0.3} className="md:col-span-1">
            <div className="h-full transition-all duration-300" style={{ ...glass.light, borderRadius: '24px', padding: '32px' }}>
              <img
                src="/images/contas-a-pagar.png"
                alt="Contas a Pagar"
                className="w-full rounded-xl border border-[#E2E8F0] object-cover object-top mb-4 shadow-sm"
                style={{ height: '160px' }}
              />
              <div className="mb-3"><GradientIcon icon={Wallet} gradient="linear-gradient(135deg, #10B981, #6EE7B7)" /></div>
              <h3 className="text-lg font-bold text-[#1F2937] mb-2">Gestão de <GradientText gradient="green">contas a pagar</GradientText></h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                Nunca mais perca um vencimento. Controle fornecedores e tenha visão total do financeiro.
              </p>
            </div>
          </FadeIn>

          {/* CARD D — Stats destaque (col-span-2) */}
          <FadeIn delay={0.4} className="md:col-span-2">
            <div
              className="flex flex-col justify-center h-full"
              style={{ ...glass.purple, borderRadius: '24px', padding: '32px' }}
            >
              <p className="text-white/70 text-sm font-medium mb-6 uppercase tracking-widest">
                Números que <GradientText gradient="warm">falam</GradientText> por si
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'R$ 2M+', label: 'processados' },
                  { value: '10k+',   label: 'notas emitidas' },
                  { value: '50+',    label: 'empresas ativas' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '16px',
                      padding: '16px',
                    }}
                  >
                    <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-white/60 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <a
                  href="#planos"
                  onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex items-center gap-2 bg-[#FAF66B] text-[#1F2937] font-bold px-6 py-3 rounded-xl hover:brightness-110 transition duration-200 text-sm"
                >
                  Começar grátis
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  );
}

// ─── Seção: Como funciona ─────────────────────────────────────────────────────

function ComoFunciona() {
  const passos = [
    {
      num: '01',
      icon: UserPlus,
      titulo: 'Crie sua conta',
      desc: 'Cadastro em menos de 2 minutos. Sem cartão de crédito necessário.',
    },
    {
      num: '02',
      icon: Settings2,
      titulo: 'Configure sua empresa',
      desc: 'Adicione dados fiscais, produtos e usuários em poucos cliques.',
    },
    {
      num: '03',
      icon: Rocket,
      titulo: 'Comece a vender',
      desc: 'PDV pronto para uso. Resultados desde o primeiro dia.',
    },
  ];

  return (
    <section
      id="como-funciona"
      className="py-24 px-6 scroll-mt-20"
      style={{ background: 'transparent', position: 'relative' }}
    >
      <div className="max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        {/* Cabeçalho */}
        <FadeIn delay={0}>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] tracking-tight mb-3">
              Comece em <GradientText gradient="multi">minutos</GradientText>
            </h2>
            <p className="text-lg text-[#6B7280]">Sem instalação, sem complicação</p>
          </div>
        </FadeIn>

        {/* Passos */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Linha conectora dashed — visible apenas em md+ */}
          <div
            className="hidden md:block absolute top-[3.75rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px"
            style={{ borderTop: '2px dashed rgba(142,95,207,0.2)' }}
          />

          {passos.map((p, i) => {
            const Icon = p.icon;
            const stepDelays = [0.1, 0.3, 0.5];
            return (
              <FadeIn key={p.num} delay={stepDelays[i]}>
              <div style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(40px) saturate(1.8)',
                WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                border: '1px solid rgba(255,255,255,0.45)',
                borderTop: '1px solid rgba(255,255,255,0.7)',
                borderLeft: '1px solid rgba(255,255,255,0.5)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.1), 0 8px 40px rgba(142,95,207,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                borderRadius: '24px',
                padding: '32px',
              }}>
              <div className="flex flex-col items-center text-center space-y-3 z-10">
                {/* Número */}
                <span
                  className="leading-none select-none"
                  style={{
                    background: 'linear-gradient(135deg, #8E5FCF, #E0DC41)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '4rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {p.num}
                </span>

                {/* Ícone */}
                <div>
                  <div style={{
                    background: 'rgba(142,95,207,0.1)',
                    border: '1px solid rgba(142,95,207,0.2)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '14px',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={28} color="#8E5FCF" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Texto */}
                <div className="pt-1">
                  <h3 className="text-lg font-bold text-[#1F2937] mb-1">{p.titulo}</h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed max-w-[200px] mx-auto">{p.desc}</p>
                </div>
              </div>
              </div>
              </FadeIn>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <motion.button
            className="px-8 py-3.5 text-sm font-semibold rounded-xl text-white"
            style={{ background: '#0A0010', boxShadow: '0 8px 30px rgba(10,0,16,0.2)' }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            Criar conta grátis
          </motion.button>
        </div>
      </div>
    </section>
  );
}

// ─── Seção: Social Proof ─────────────────────────────────────────────────────

function SocialProof() {

  const depoimentos = [
    {
      iniciais: 'MS',
      nome: 'Maria S.',
      empresa: 'Loja de roupas, SP',
      texto: 'Antes eu usava planilha e perdia horas. Com o Oasis, fecho o caixa em segundos.',
    },
    {
      iniciais: 'CM',
      nome: 'Carlos M.',
      empresa: 'Mercadinho, MG',
      texto: 'A emissão de NFC-e integrada ao PDV mudou completamente minha rotina.',
    },
    {
      iniciais: 'AL',
      nome: 'Ana L.',
      empresa: 'Papelaria, PR',
      texto: 'Finalmente sei o que vence essa semana. Nunca mais paguei multa de fornecedor.',
    },
  ];

  return (
    <section
      className="py-24 px-6"
      style={{ position: 'relative', background: 'transparent' }}
    >
      <div className="max-w-6xl mx-auto space-y-14" style={{ position: 'relative', zIndex: 1 }}>

        {/* Números */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <FadeIn delay={0.1}>
            <div className="text-center">
              <p style={{
                fontSize: '3.5rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #8E5FCF, #B987FF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>
                <AnimatedCounter end={50} prefix="+" />
              </p>
              <p className="text-[#6B7280] text-sm mt-1 font-medium">empresas ativas</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="text-center">
              <p style={{
                fontSize: '3.5rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #E0DC41, #FAF66B)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>
                <AnimatedCounter end={10000} prefix="+" />
              </p>
              <p className="text-[#6B7280] text-sm mt-1 font-medium">notas fiscais emitidas</p>
            </div>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="text-center">
              <p style={{
                fontSize: '3.5rem', fontWeight: 700,
                background: 'linear-gradient(135deg, #4ADE80, #86EFAC)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>
                <AnimatedCounter end={2} prefix="+R$ " suffix="M" />
              </p>
              <p className="text-[#6B7280] text-sm mt-1 font-medium">em vendas processadas</p>
            </div>
          </FadeIn>
        </div>

        {/* Depoimentos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {depoimentos.map((d, i) => (
            <FadeIn key={d.nome} delay={0.1 + i * 0.1}>
              <TiltCard className="flex flex-col gap-4" style={{ ...glass.light, borderRadius: '20px', padding: '28px', transition: 'all 0.3s ease' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8E5FCF] text-white flex items-center justify-center text-sm font-bold shrink-0 select-none">
                    {d.iniciais}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1F2937]">{d.nome}</p>
                    <p className="text-xs text-[#6B7280]">{d.empresa}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="#FAF66B" color="#FAF66B" strokeWidth={1.5} />
                  ))}
                </div>
                <p className="text-sm text-[#6B7280] leading-relaxed">"{d.texto}"</p>
              </TiltCard>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  );
}

// ─── Seção: Planos ────────────────────────────────────────────────────────────

function Planos() {
  const [anual, setAnual] = useState(false); // pricing toggle

  const planos = [
    {
      nome: 'Essencial',
      desc: 'Para quem está começando',
      mensal: 110,
      anual: 99,
      destaque: false,
      features: [
        { ok: true,  texto: 'PDV completo'              },
        { ok: true,  texto: 'Contas a pagar'            },
        { ok: true,  texto: 'Até 2 usuários'            },
        { ok: true,  texto: '1 empresa'                 },
        { ok: true,  texto: 'Relatórios básicos'        },
        { ok: true,  texto: 'Suporte por email'         },
        { ok: false, texto: 'Emissão de NF/NFC-e'       },
      ],
    },
    {
      nome: 'Profissional',
      desc: 'O favorito dos nossos clientes',
      mensal: 399,
      anual: 349,
      destaque: true,
      features: [
        { ok: true, texto: 'Tudo do Essencial'          },
        { ok: true, texto: 'Emissão de NF e NFC-e'      },
        { ok: true, texto: 'Até 5 usuários'             },
        { ok: true, texto: '1 empresa'                  },
        { ok: true, texto: 'Relatórios completos'       },
        { ok: true, texto: 'Suporte email e chat'       },
      ],
    },
    {
      nome: 'Premium',
      desc: 'Para quem quer o máximo',
      mensal: 599,
      anual: 549,
      destaque: false,
      features: [
        { ok: true, texto: 'Tudo do Profissional'       },
        { ok: true, texto: 'Usuários ilimitados'        },
        { ok: true, texto: 'Até 2 empresas'             },
        { ok: true, texto: 'Relatórios + export CSV/PDF'},
        { ok: true, texto: 'Suporte prioritário'        },
        { ok: true, texto: 'Onboarding personalizado'   },
      ],
    },
  ];

  return (
    <section id="planos" className="py-24 px-6 scroll-mt-20" style={{ position: 'relative', background: 'transparent' }}>
      <div className="max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>

        {/* Cabeçalho */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] tracking-tight mb-3">
            Planos <GradientText gradient="purple">transparentes</GradientText>, sem surpresas
          </h2>
          <p className="text-lg text-[#6B7280]">Cancele quando quiser. Sem fidelidade.</p>
        </div>

        {/* Toggle mensal / anual */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={cn('text-sm font-medium transition-colors duration-200', !anual ? 'text-[#1F2937]' : 'text-[#6B7280]')}>
            Mensal
          </span>
          <button
            onClick={() => setAnual((a) => !a)}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors duration-200',
              anual ? 'bg-[#8E5FCF]' : 'bg-[#D1D5DB]',
            )}
            aria-label="Alternar período"
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                anual && 'translate-x-5',
              )}
            />
          </button>
          <span className={cn('text-sm font-medium transition-colors duration-200 flex items-center gap-2', anual ? 'text-[#1F2937]' : 'text-[#6B7280]')}>
            Anual
            <span className="bg-[#FAF66B] text-[#1F2937] rounded-full text-xs font-bold px-2 py-0.5">
              Economize 20%
            </span>
          </span>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {planos.map((p) => {
            const preco = anual ? p.anual : p.mensal;
            return p.destaque ? (
              /* Card destaque */
              <motion.div
                key={p.nome}
                className="flex flex-col gap-6"
                style={{ ...glass.purple, borderRadius: '24px', padding: '36px', transform: 'scale(1.04)', position: 'relative', overflow: 'hidden' }}
                animate={{ boxShadow: [
                  '0 0 20px rgba(142,95,207,0.2)',
                  '0 0 50px rgba(142,95,207,0.5)',
                  '0 0 20px rgba(142,95,207,0.2)',
                ]}}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                {/* Orb decorativo interno */}
                <div style={{
                  position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
                  width: '200px', height: '100px', borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
                  background: 'radial-gradient(ellipse, rgba(185,135,255,0.4) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }} />
                <div className="flex items-start justify-between" style={{ position: 'relative', zIndex: 1 }}>
                  <div>
                    <p className="text-lg font-bold text-white">{p.nome}</p>
                    <p className="text-sm text-white/70 mt-0.5">{p.desc}</p>
                  </div>
                  <span
                    className="shrink-0"
                    style={{
                      background: 'rgba(250,246,107,0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255,255,255,0.6)',
                      borderRadius: '100px',
                      padding: '4px 14px',
                      color: '#1F2937',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                    }}
                  >
                    Mais Popular
                  </span>
                </div>
                <div>
                  <span className="text-4xl font-bold text-white">R$ {preco}</span>
                  <span className="text-sm text-white/70">/mês</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f.texto} className="flex items-center gap-2 text-sm text-white">
                      <Check size={16} strokeWidth={2.5} color="#4ade80" className="shrink-0" />
                      {f.texto}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 rounded-xl bg-[#FAF66B] text-[#1F2937] font-bold text-sm hover:brightness-110 transition-all duration-200">
                  Começar grátis
                </button>
              </motion.div>
            ) : (
              /* Card normal */
              <TiltCard
                key={p.nome}
                className="flex flex-col gap-6 transition-all duration-300"
                style={{ ...glass.light, borderRadius: '24px', padding: '36px' }}
              >
                <div>
                  <p className="text-lg font-bold text-[#1F2937]">{p.nome}</p>
                  <p className="text-sm text-[#6B7280] mt-0.5">{p.desc}</p>
                </div>
                <div>
                  <span className="text-4xl font-bold text-[#1F2937]">R$ {preco}</span>
                  <span className="text-sm text-[#6B7280]">/mês</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li
                      key={f.texto}
                      className={cn(
                        'flex items-center gap-2 text-sm',
                        f.ok ? 'text-[#1F2937]' : 'text-[#9CA3AF]',
                      )}
                    >
                      {f.ok
                        ? <Check size={16} className="text-[#10B981] shrink-0" strokeWidth={2.5} />
                        : <Minus size={16} className="text-[#D1D5DB] shrink-0" strokeWidth={2} />
                      }
                      {f.texto}
                    </li>
                  ))}
                </ul>
                <motion.button
                  className="w-full py-3 rounded-xl border border-[#8E5FCF] text-[#8E5FCF] font-semibold text-sm hover:bg-[#8E5FCF]/5 transition-colors duration-200"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  Começar grátis
                </motion.button>
              </TiltCard>
            );
          })}
        </div>

        {/* Nota */}
        <p className="text-sm text-[#6B7280] text-center mt-8">
          14 dias grátis. Sem cartão de crédito. Cancele quando quiser.
        </p>

      </div>
    </section>
  );
}

// ─── Seção: FAQ ──────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'Preciso de cartão de crédito para testar?',
    a: 'Não. Os 14 dias grátis não exigem cartão. Só pedimos após o trial.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, sem multa e sem burocracia. Seu acesso fica ativo até o fim do período pago.',
  },
  {
    q: 'O sistema funciona no celular?',
    a: 'Sim. O Oasis é responsivo e funciona em qualquer dispositivo.',
  },
  {
    q: 'A emissão de NF está inclusa no plano?',
    a: 'Nos planos Profissional e Premium, sim. O Essencial não inclui emissão fiscal.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Sim. Criptografia e backups automáticos diários.',
  },
  {
    q: 'Consigo migrar dados de outro sistema?',
    a: 'Sim. Nossa equipe auxilia na importação no processo de onboarding.',
  },
  {
    q: 'Funciona para mais de uma loja?',
    a: 'Sim. O plano Premium suporta até 3 empresas.',
  },
  {
    q: 'O suporte é em português?',
    a: 'Sim. Suporte 100% em português, por chat e email em dias úteis.',
  },
];

function FAQ() {
  return (
    <section
      id="faq"
      style={{ background: 'transparent', position: 'relative' }}
      className="py-24 px-6 scroll-mt-20"
    >
      <div className="max-w-3xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        <FadeIn delay={0}>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1F2937] tracking-tight text-center mb-12">
            Dúvidas <GradientText gradient="warm">frequentes</GradientText>
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <Accordion type="single" collapsible>
            {faqs.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="px-6"
                style={{ ...glass.medium, borderRadius: '16px', marginBottom: '8px', overflow: 'hidden' }}
              >
                <AccordionTrigger className="text-sm font-semibold text-[#1F2937] hover:text-[#8E5FCF] hover:no-underline py-5 text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-[#6B7280] leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Seção: CTA Final ─────────────────────────────────────────────────────────

function CTAFinal() {
  return (
    <section
      style={{ background: 'transparent', position: 'relative' }}
      className="py-24 px-6 text-center"
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ ...glass.light, borderRadius: '32px', padding: '64px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <FadeIn delay={0}>
            <h2 className="text-4xl font-bold text-[#1F2937] tracking-tight">
              Pronto para <GradientText gradient="multi">organizar seu negócio</GradientText>?
            </h2>
          </FadeIn>
          <FadeIn delay={0.15}>
            <p className="text-[#6B7280] text-xl mt-4 leading-relaxed">
              Junte-se a mais de 50 empresas que já usam o Oasis para vender mais e se preocupar menos.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <motion.a
                href="#planos"
                onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-sm"
                style={{ ...glass.dark, borderRadius: '14px', padding: '14px 32px', color: 'white', fontWeight: 600 }}
                whileHover={{ y: -2, opacity: 0.9 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                Começar grátis por 14 dias
              </motion.a>
              <motion.button
                className="text-sm"
                style={{ ...glass.light, borderRadius: '14px', padding: '14px 32px', color: '#1F2937', fontWeight: 600 }}
                whileHover={{ scale: 1.02, y: -1, boxShadow: '0 8px 30px rgba(142,95,207,0.12)' }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                Falar com especialista
              </motion.button>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ─── Footer completo ──────────────────────────────────────────────────────────

const footerLinks = {
  Produto:  ['Funcionalidades', 'Como funciona', 'Planos', 'FAQ'],
  Empresa:  ['Sobre nós', 'Blog', 'Contato', 'Trabalhe conosco'],
  Legal:    ['Termos de uso', 'Política de privacidade', 'LGPD'],
};

function Footer() {
  return (
    <footer
      className="py-16 px-6"
      style={{
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(40px) saturate(200%)',
        WebkitBackdropFilter: 'blur(40px) saturate(200%)',
        borderTop: '1px solid rgba(255,255,255,0.8)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 -4px 30px rgba(142,95,207,0.06)',
        position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute', top: '-60px', left: '10%', zIndex: 0,
        width: '300px', height: '300px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(142,95,207,0.07), transparent 70%)',
        filter: 'blur(50px)',
      }} />
      <div className="max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Col 1 — Marca */}
          <div className="space-y-4">
            <span className="text-2xl font-bold text-[#8E5FCF]">Oasis</span>
            <p className="text-sm text-[#6B7280] leading-relaxed max-w-[200px]">
              PDV, NF e financeiro em uma plataforma feita para pequenos comércios.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {[
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Linkedin,  label: 'LinkedIn'  },
                { Icon: Twitter,   label: 'Twitter/X' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="transition-colors duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.8)',
                    borderRadius: '10px',
                    padding: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(142,95,207,0.08)',
                    color: '#8E5FCF',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.5)'; }}
                >
                  <Icon size={18} strokeWidth={1.5} />
                </a>
              ))}
            </div>
          </div>

          {/* Cols 2–4 — Links */}
          {Object.entries(footerLinks).map(([titulo, links]) => (
            <div key={titulo} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1F2937]">{titulo}</p>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-[#6B7280] hover:text-[#8E5FCF] transition-colors duration-200">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divisor + copyright */}
        <div
          className="mt-12"
          style={{
            borderTop: '1px solid rgba(142,95,207,0.1)',
            background: 'rgba(255,255,255,0.3)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '20px 0',
            textAlign: 'center',
          }}
        >
          <p className="text-sm text-[#9CA3AF]">
            © {new Date().getFullYear()} Oasis. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Landing() {
  const { scrollYProgress } = useScroll();

  // scroll-behavior: smooth no html enquanto esta página está montada
  useEffect(() => {
    const html = document.documentElement;
    html.style.scrollBehavior = 'smooth';
    return () => { html.style.scrollBehavior = ''; };
  }, []);

  // cursor customizado
  useEffect(() => {
    document.body.style.cursor = 'none';
    return () => { document.body.style.cursor = 'auto'; };
  }, []);

  const goToPlanos = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div
      className="font-sans antialiased"
      style={{ background: 'linear-gradient(180deg, #FAF8FF 0%, #FAFAFC 100%)', minHeight: '100vh', position: 'relative', overflowX: 'clip' as React.CSSProperties['overflowX'] }}
    >
      {/* ── Orbs fixos — seguem o scroll em toda a página ──────────── */}
      <div style={{
        position: 'fixed', top: '-5%', right: '-5%', zIndex: 0,
        width: '500px', height: '500px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(142,95,207,0.18), transparent 70%)',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'fixed', top: '35%', right: '-8%', zIndex: 0,
        width: '420px', height: '420px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(224,220,65,0.14), transparent 70%)',
        filter: 'blur(55px)',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '-8%', zIndex: 0,
        width: '400px', height: '400px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(185,135,255,0.12), transparent 70%)',
        filter: 'blur(55px)',
      }} />
      <div style={{
        position: 'fixed', bottom: '5%', left: '5%', zIndex: 0,
        width: '350px', height: '350px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(250,246,107,0.12), transparent 70%)',
        filter: 'blur(50px)',
      }} />
      <div style={{
        position: 'fixed', bottom: '-5%', right: '15%', zIndex: 0,
        width: '380px', height: '380px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(142,95,207,0.1), transparent 70%)',
        filter: 'blur(55px)',
      }} />

      <CustomCursor />
      <motion.div
        style={{ scaleX: scrollYProgress, transformOrigin: '0%', background: 'linear-gradient(90deg, #8E5FCF, #FAF66B)' }}
        className="fixed top-0 left-0 right-0 h-0.5 z-50"
      />
      <Header />
      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* Global purple blobs layer — continuous across all sections */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '3%', right: '-8%',
            width: '700px', height: '280px',
            borderRadius: '30% 70% 60% 40% / 50% 40% 60% 50%',
            background: 'radial-gradient(ellipse at 40% 50%, rgba(142,95,207,0.22), transparent 70%)',
            filter: 'blur(60px)', transform: 'rotate(-15deg)',
          }} />
          <div style={{
            position: 'absolute', top: '12%', left: '-6%',
            width: '650px', height: '250px',
            borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%',
            background: 'radial-gradient(ellipse at 60% 50%, rgba(185,135,255,0.18), transparent 70%)',
            filter: 'blur(55px)', transform: 'rotate(10deg)',
          }} />
          <div style={{
            position: 'absolute', top: '25%', left: '30%',
            width: '800px', height: '220px',
            borderRadius: '50% 50% 30% 70% / 40% 60% 40% 60%',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(142,95,207,0.15), transparent 70%)',
            filter: 'blur(80px)', transform: 'rotate(-5deg)',
          }} />
          <div style={{
            position: 'absolute', top: '38%', right: '-5%',
            width: '700px', height: '260px',
            borderRadius: '40% 60% 50% 50% / 50% 40% 60% 50%',
            background: 'radial-gradient(ellipse at 30% 50%, rgba(142,95,207,0.20), transparent 70%)',
            filter: 'blur(60px)', transform: 'rotate(12deg)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '-4%',
            width: '600px', height: '220px',
            borderRadius: '60% 40% 50% 50% / 40% 60% 40% 60%',
            background: 'radial-gradient(ellipse at 70% 50%, rgba(185,135,255,0.16), transparent 70%)',
            filter: 'blur(55px)', transform: 'rotate(-18deg)',
          }} />
          <div style={{
            position: 'absolute', top: '62%', left: '40%',
            width: '750px', height: '240px',
            borderRadius: '50% 50% 40% 60% / 40% 60% 40% 60%',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(142,95,207,0.18), transparent 70%)',
            filter: 'blur(70px)', transform: 'rotate(8deg)',
          }} />
          <div style={{
            position: 'absolute', top: '75%', right: '-6%',
            width: '650px', height: '250px',
            borderRadius: '30% 70% 50% 50% / 40% 60% 40% 60%',
            background: 'radial-gradient(ellipse at 40% 50%, rgba(142,95,207,0.22), transparent 70%)',
            filter: 'blur(60px)', transform: 'rotate(-10deg)',
          }} />
          <div style={{
            position: 'absolute', top: '88%', left: '-5%',
            width: '600px', height: '220px',
            borderRadius: '60% 40% 40% 60% / 50% 40% 60% 50%',
            background: 'radial-gradient(ellipse at 60% 50%, rgba(185,135,255,0.16), transparent 70%)',
            filter: 'blur(55px)', transform: 'rotate(15deg)',
          }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Hero />
          <InfiniteMarquee />
          <ProblemaSolucao />
          <Funcionalidades />
          <ComoFunciona />
          <SocialProof />
          <Planos />
          <FAQ />
          <CTAFinal />
        </div>
      </main>
      <Footer />
    </div>
  );
}
