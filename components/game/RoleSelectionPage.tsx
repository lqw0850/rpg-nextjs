import React from 'react';
import { LoadingComponent } from '../ui/LoadingComponent';

type RoleSelectionPageProps = {
  canonCharacterName: string;
  ocCharacterName: string;
  canonValidationMsg: string;
  loading: boolean;
  onCanonCharacterNameChange: (value: string) => void;
  onOcCharacterNameChange: (value: string) => void;
  onCanonSubmit: () => void;
  onOcSubmit: () => void;
  onBack: () => void;
};

export const RoleSelectionPage: React.FC<RoleSelectionPageProps> = ({
  canonCharacterName,
  ocCharacterName,
  canonValidationMsg,
  loading,
  onCanonCharacterNameChange,
  onOcCharacterNameChange,
  onCanonSubmit,
  onOcSubmit,
  onBack,
}) => {
  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <div className="relative w-full h-screen flex overflow-hidden font-sans">
      <div className="absolute top-[5%] w-full text-center z-30 pointer-events-none">
        <h2 className="font-hand text-5xl md:text-6xl text-[#5D4037] drop-shadow-sm select-none">Choose your role</h2>
      </div>

      <div 
        className="absolute left-1/2 top-0 bottom-0 w-[4px] z-20 transform -translate-x-1/2 h-full pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='8' viewBox='0 0 4 8'%3E%3Crect width='4' height='8' fill='%23F2EFE5'/%3E%3Crect x='1' y='0' width='3' height='4' fill='%23B09882'/%3E%3Crect x='3' y='4' width='1' height='4' fill='%23B09882'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat-y'
        }}
      ></div>

      <div 
        className="w-1/2 h-full bg-[#F2EFE5] flex items-center justify-center relative group cursor-pointer"
      >
        <div className="relative w-[300px] h-[300px] md:w-[480px] md:h-[480px] transition-transform duration-700 ease-out">
          <svg viewBox="0 0 500 500" className="w-full h-full opacity-80" fill="none">
            <g stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="250" cy="250" r="240" strokeWidth="5" />
              <circle cx="250" cy="250" r="220" strokeWidth="1.5" strokeDasharray="15 10"/>
              <path d="M 250 250 m -60 -40 q 60 -60 120 0 t 60 100 t -100 60 t -120 -80" strokeWidth="4" strokeOpacity="0.8"/>
              <path d="M 250 250 m -30 -20 q 30 -30 60 0 t 30 50 t -50 30 t -60 -40" strokeWidth="8" strokeOpacity="0.2"/>
              <path d="M 100 250 q 0 -100 150 -150" strokeWidth="3" />
              <path d="M 400 250 q 0 100 -150 150" strokeWidth="3" />
              <path d="M 250 100 q 100 0 150 150" strokeWidth="3" />
              <path d="M 250 400 q -100 0 -150 -150" strokeWidth="3" />
              <circle cx="250" cy="250" r="15" fill="#5D4037" />
              <circle cx="150" cy="180" r="12" fill="#5D4037" opacity="0.6"/>
              <circle cx="350" cy="320" r="12" fill="#5D4037" opacity="0.6"/>
              <circle cx="350" cy="180" r="12" strokeWidth="3" />
              <circle cx="150" cy="320" r="12" strokeWidth="3" />
              <path d="M 120 120 l 40 40 m 10 -10 l -40 -40" strokeWidth="1"/>
              <path d="M 380 380 l -40 -40 m -10 10 l 40 40" strokeWidth="1"/>
            </g>
          </svg>

          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out translate-y-4 group-hover:translate-y-[-50%]">
            <div className="bg-white rounded-2xl py-4 px-6 shadow-xl border border-[#5D4037]/10 text-center transform scale-95 group-hover:scale-100 transition-transform">
              <input
                type="text"
                value={canonCharacterName}
                onChange={(e) => onCanonCharacterNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCanonSubmit();
                  }
                }}
                placeholder="Existing Character"
                className="w-full bg-transparent border-none text-lg font-serif text-[#5D4037] focus:outline-none text-center placeholder:text-[#5D4037]/50"
              />
              {canonValidationMsg && (
                <p className="text-red-600 text-sm mt-2 font-serif">{canonValidationMsg}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div 
        className="w-1/2 h-full bg-[#B09882] flex items-center justify-center relative group cursor-pointer"
      >
        <div className="relative w-[300px] h-[300px] md:w-[480px] md:h-[480px] transition-transform duration-700 ease-out">
          <svg viewBox="0 0 500 500" className="w-full h-full opacity-50" fill="none">
            <g stroke="#F2EFE5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="250" cy="250" r="240" strokeWidth="5" />
              <circle cx="250" cy="250" r="220" strokeWidth="1.5" strokeDasharray="15 10"/>
              <path d="M 250 250 m -60 -40 q 60 -60 120 0 t 60 100 t -100 60 t -120 -80" strokeWidth="4" strokeOpacity="0.8"/>
              <path d="M 250 250 m -30 -20 q 30 -30 60 0 t 30 50 t -50 30 t -60 -40" strokeWidth="8" strokeOpacity="0.2"/>
              <path d="M 100 250 q 0 -100 150 -150" strokeWidth="3" />
              <path d="M 400 250 q 0 100 -150 150" strokeWidth="3" />
              <path d="M 250 100 q 100 0 150 150" strokeWidth="3" />
              <path d="M 250 400 q -100 0 -150 -150" strokeWidth="3" />
              <circle cx="250" cy="250" r="15" fill="#F2EFE5" />
              <circle cx="150" cy="180" r="12" fill="#F2EFE5" opacity="0.6"/>
              <circle cx="350" cy="320" r="12" fill="#F2EFE5" opacity="0.6"/>
              <circle cx="350" cy="180" r="12" strokeWidth="3" />
              <circle cx="150" cy="320" r="12" strokeWidth="3" />
              <path d="M 120 120 l 40 40 m 10 -10 l -40 -40" strokeWidth="1"/>
              <path d="M 380 380 l -40 -40 m -10 10 l 40 40" strokeWidth="1"/>
            </g>
          </svg>

          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out translate-y-4 group-hover:translate-y-[-50%]">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl py-4 px-6 shadow-xl border border-white/30 text-center transform scale-95 group-hover:scale-100 transition-transform">
              <input
                type="text"
                value={ocCharacterName}
                onChange={(e) => onOcCharacterNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onOcSubmit();
                  }
                }}
                placeholder="Original Character"
                className="w-full bg-transparent border-none text-lg font-serif text-[#5D4037] focus:outline-none text-center placeholder:text-[#5D4037]/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-10 z-40">
        <button 
          onClick={onBack}
          className="font-hand text-3xl text-[#5D4037] hover:translate-x-[-5px] transition-transform flex items-center gap-2 font-bold select-none"
        >
          <span>←</span> BACK
        </button>
      </div>
    </div>
  );
};
