import React from 'react';

type IpSelectionPageProps = {
  ipName: string;
  onIpNameChange: (value: string) => void;
  onVerifyIp: () => void;
  loading: boolean;
};

export const IpSelectionPage: React.FC<IpSelectionPageProps> = ({
  ipName,
  onIpNameChange,
  onVerifyIp,
  loading,
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen relative z-10 overflow-hidden">
      {/* SVG背景图 */}
      <div className="absolute inset-0 flex items-center justify-center opacity-100 select-none pointer-events-none z-0">
        <div className="w-[400px] h-[400px] md:w-[550px] md:h-[550px]">
          <svg viewBox="0 0 500 500" className="w-full h-full" fill="none">
            <g stroke="#8D6E63" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
              <circle cx="250" cy="250" r="240" strokeWidth="6" stroke="#A1887F" />
              <circle cx="250" cy="250" r="225" strokeWidth="2" strokeDasharray="15 10"/>
              <path d="M 250 250 m -60 -40 q 60 -60 120 0 t 60 100 t -100 60 t -120 -80" strokeWidth="4" strokeOpacity="0.8"/>
              <path d="M 250 250 m -30 -20 q 30 -30 60 0 t 30 50 t -50 30 t -60 -40" strokeWidth="8" strokeOpacity="0.2"/>
              <path d="M 100 250 q 0 -100 150 -150" strokeWidth="3" />
              <path d="M 400 250 q 0 100 -150 150" strokeWidth="3" />
              <path d="M 250 100 q 100 0 150 150" strokeWidth="3" />
              <path d="M 250 400 q -100 0 -150 -150" strokeWidth="3" />
              <circle cx="250" cy="250" r="15" fill="#8D6E63" />
              <circle cx="150" cy="180" r="12" fill="#8D6E63" opacity="0.6"/>
              <circle cx="350" cy="320" r="12" fill="#8D6E63" opacity="0.6"/>
              <circle cx="350" cy="180" r="12" strokeWidth="3" />
              <circle cx="150" cy="320" r="12" strokeWidth="3" />
              <path d="M 120 120 l 40 40 m 10 -10 l -40 -40" strokeWidth="1"/>
              <path d="M 380 380 l -40 -40 m -10 10 l 40 40" strokeWidth="1"/>
            </g>
          </svg>
        </div>
      </div>
      
      {/* 前景内容 */}
      <div className="relative flex flex-col items-center justify-center h-full z-10 py-20">
        <div className="flex flex-col items-center justify-center">
          <h1 className="font-hand text-6xl md:text-8xl text-[#5D4037] tracking-widest select-none drop-shadow-md" 
            style={{ 
              textShadow: '4px 4px 0px #3E2723', 
              WebkitTextStroke: '2px #3E2723' 
            }}>
            REBELIEF
          </h1>

          <h2 className="font-serif text-2xl md:text-3xl text-[#5D4037] mb-10 font-bold tracking-wide mt-10">The world to ReBelief</h2>
          
          <div className="w-full max-w-2xl px-8 flex flex-col items-center">
            <div className="w-full relative group">
              <input 
                type="text"
                value={ipName}
                onChange={(e) => onIpNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onVerifyIp();
                  }
                }}
                placeholder="Enter world name..."
                className="w-full h-16 bg-[#FDFBF7] rounded-xl shadow-[0_4px_6px_rgba(93,64,55,0.1)] border-2 border-[#EFEBE9] focus:border-[#8D6E63] focus:ring-0 text-center text-xl font-serif text-[#5D4037] outline-none transition-all"
              />
            </div>
            
            <p className="mt-4 font-serif text-[#8D6E63] text-lg opacity-80">Press Enter to continue</p>
          </div>
        </div>
      </div>
    </div>
  );
};