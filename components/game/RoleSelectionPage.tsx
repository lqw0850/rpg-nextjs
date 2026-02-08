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
    <div className="fixed inset-0 w-full h-screen flex overflow-hidden font-sans">
      <div className="absolute top-[5%] w-full text-center z-30 pointer-events-none">
        <h2 className="font-theme text-5xl md:text-6xl text-[#5D4037] drop-shadow-sm select-none">Choose your role</h2>
      </div>

      <div 
        className="absolute left-1/2 top-0 bottom-0 w-[4px] z-20 transform -translate-x-1/2 h-full pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='8' viewBox='0 0 4 8'%3E%3Crect width='4' height='8' fill='%23F2EFE5'/%3E%3Crect x='1' y='0' width='3' height='4' fill='%23B09882'/%3E%3Crect x='3' y='4' width='1' height='4' fill='%23B09882'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat-y'
        }}
      ></div>

      <div 
        className="w-1/2 h-full bg-[#EFEAD8] flex items-center justify-center relative group cursor-pointer"
      >
        <div className="relative w-[300px] h-[300px] md:w-[480px] md:h-[480px] transition-transform duration-700 ease-out">
          <img 
            src="/v2_t9p0dd.png" 
            alt="Existing Character" 
            className="w-full h-full animate-spin-slow" 
            style={{ animationDuration: '60s' }} 
          />

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
        className="w-1/2 h-full bg-[#B1957B] flex items-center justify-center relative group cursor-pointer"
      >
        <div className="relative w-[300px] h-[300px] md:w-[480px] md:h-[480px] transition-transform duration-700 ease-out">
          <img 
            src="/v2_t9xs72.png" 
            alt="Original Character" 
            className="w-full h-full animate-spin-slow" 
            style={{ animationDuration: '60s' }} 
          />

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
          className="font-theme text-3xl text-[#5D4037] hover:translate-x-[-5px] transition-transform flex items-center gap-2 font-bold select-none"
        >
          <span>←</span> BACK
        </button>
      </div>
    </div>
  );
};
