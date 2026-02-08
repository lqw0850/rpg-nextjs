import React from 'react';

export const TribalBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-10">
      <img 
        src="/v2_t9p0dd.png" 
        alt="Tribal Background" 
        width="800" 
        height="800" 
        className="animate-spin-slow" 
        style={{ animationDuration: '60s', width: '500px', height: '500px' }} 
      />
    </div>
  );
};
