import React from 'react';

export const TribalBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-10">
      <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" className="animate-spin-slow" style={{ animationDuration: '60s' }}>
        <g stroke="#5D4037" fill="none" strokeWidth="2">
          <circle cx="400" cy="400" r="380" strokeWidth="4" />
          <circle cx="400" cy="400" r="360" strokeDasharray="10 10" />
          
          <path d="M 400 20 Q 550 20 600 150" strokeWidth="3" />
          <path d="M 400 780 Q 250 780 200 650" strokeWidth="3" />
          <path d="M 20 400 Q 20 250 150 200" strokeWidth="3" />
          <path d="M 780 400 Q 780 550 650 600" strokeWidth="3" />

          <circle cx="400" cy="400" r="250" strokeWidth="1" />
          <path d="M 400 400 m -200, 0 a 200,200 0 1,0 400,0 a 200,200 0 1,0 -400,0" strokeDasharray="50 20" strokeWidth="5" opacity="0.5"/>
          
          <path d="M 400 400 m -150, 0 a 150,150 0 1,1 300,0 a 150,150 0 1,1 -300,0" strokeWidth="2" />
          
          <circle cx="400" cy="400" r="80" strokeWidth="8" stroke="#5D4037" opacity="0.3" />
          <circle cx="400" cy="400" r="50" strokeWidth="4" />
          <circle cx="400" cy="400" r="20" fill="#5D4037" opacity="0.2" />
          
          <circle cx="550" cy="250" r="10" fill="#5D4037" opacity="0.4" />
          <circle cx="250" cy="550" r="10" fill="#5D4037" opacity="0.4" />
          <circle cx="250" cy="250" r="15" strokeWidth="2" />
          <circle cx="550" cy="550" r="15" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};
