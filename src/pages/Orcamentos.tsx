import React from 'react';
import { OrcamentosPanel } from '@/components/orcamentos/OrcamentosPanel';

const Orcamentos = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FAFAFC 0%, #F0EAFA 50%, #FAFAFC 100%)',
      position: 'relative',
    }}>
      {/* Orb roxo */}
      <div style={{
        position: 'fixed', top: -200, left: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: '#8E5FCF', opacity: 0.06,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
      {/* Orb amarelo */}
      <div style={{
        position: 'fixed', bottom: -150, right: -150,
        width: 400, height: 400, borderRadius: '50%',
        background: '#FAF66B', opacity: 0.04,
        filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <OrcamentosPanel />
      </div>
    </div>
  );
};

export default Orcamentos;
