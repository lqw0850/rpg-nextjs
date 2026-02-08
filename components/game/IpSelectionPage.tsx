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
    <div className="flex flex-col items-center justify-center w-full h-screen fixed inset-0 z-10 overflow-hidden">
      {/* 背景图 */}
      <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none z-0">
        <img src="/v2_t9p0dd.png" alt="Background" className="w-[450px] h-[450px] object-contain" 
        style={{ top: '60px', position: 'absolute', opacity: 0.8 }}/>
      </div>
      
      {/* 前景内容 */}
      <div className="relative flex flex-col items-center justify-center h-full z-10 py-20">
        <div className="flex flex-col items-center justify-center relative w-full h-full">
          <h1 className="font-theme absolute select-none drop-shadow-md" 
            style={{ 
              top: '65px',
              color: 'rgba(112,61,27,1)',
              fontSize: '200px',
              textAlign: 'center'
            }}>
            ReBelief
          </h1>

          <h2 className="font-serif text-2xl md:text-3xl text-[#5D4037] mb-10 font-bold tracking-wide mt-[450px]">The world to ReBelief</h2>
          
          <div className="w-full max-w-2xl px-8 flex flex-col items-center">
            <div className="w-full relative group flex justify-center">
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
                style={{ width: '830px', height: '55px' }}
              />
            </div>
            
            <p className="mt-4 font-serif text-[#8D6E63] text-lg opacity-80">Press Enter to continue</p>
          </div>
        </div>
      </div>
    </div>
  );
};
