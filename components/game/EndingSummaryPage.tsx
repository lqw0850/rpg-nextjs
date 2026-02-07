import React from 'react';
import { type StoryNode } from '../../types';

interface EndingSummaryPageProps {
  storyNode: StoryNode | null;
  sceneImage: string | null;
  onRestart: () => void;
}

export const EndingSummaryPage: React.FC<EndingSummaryPageProps> = ({
  storyNode,
  sceneImage,
  onRestart,
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen relative z-10 overflow-hidden px-4 md:px-12">
       
       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[140vh] h-[140vh] pointer-events-none z-0 opacity-60">
          <svg viewBox="0 0 800 800" className="w-full h-full animate-spin-slow" style={{ animationDuration: '120s' }}>
            <g stroke="white" fill="none" strokeWidth="2">
               <circle cx="400" cy="400" r="380" strokeWidth="30" strokeOpacity="0.8" />
               <circle cx="400" cy="400" r="340" strokeWidth="2" strokeDasharray="10 10" />
               <path d="M 400 100 Q 550 100 650 250" strokeWidth="5" strokeOpacity="0.6"/>
               <path d="M 400 700 Q 250 700 150 550" strokeWidth="5" strokeOpacity="0.6"/>
               <path d="M 100 400 Q 100 250 250 150" strokeWidth="5" strokeOpacity="0.6"/>
               <path d="M 700 400 Q 700 550 550 650" strokeWidth="5" strokeOpacity="0.6"/>
               <circle cx="400" cy="400" r="200" strokeWidth="8" strokeOpacity="0.4" />
               <circle cx="400" cy="400" r="150" strokeWidth="2" />
            </g>
          </svg>
       </div>

       <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-7xl gap-8 md:gap-16 z-10">
          
          <div className="w-full md:w-1/2 max-w-lg">
             <div className="relative rounded-[2rem] overflow-hidden shadow-xl aspect-[16/10] bg-[#EFEBE9] group">
                {sceneImage ? (
                  <img 
                    src={sceneImage} 
                    alt="Scene Visual" 
                    className="w-full h-full object-cover sepia-[0.4] contrast-[0.9] brightness-[1.05] group-hover:scale-105 transition-transform duration-1000"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-ink/20 to-ink/10"></div>
                )}
                <div className="absolute inset-0 bg-[#5D4037]/10 mix-blend-multiply pointer-events-none"></div>
             </div>
          </div>

          <div className="w-full md:w-1/2 flex flex-col items-start text-left space-y-4">
             <h1 className="font-hand text-7xl md:text-9xl text-[#5D4037] leading-none select-none tracking-wide ml-[-4px]"
                 style={{ 
                   textShadow: '3px 3px 0px rgba(255,255,255,0.4)',
                   fontVariant: 'small-caps'
                 }}>
                {storyNode?.characterLabel || 'Ending'}
             </h1>
             
             <div className="font-serif text-lg md:text-xl leading-relaxed text-[#5D4037] text-justify opacity-90 pr-4">
               <p>
                  {storyNode?.characterAnalysis || 'Your journey has come to an end.'}
               </p>
             </div>
          </div>
       </div>

       <div className="mt-12 md:mt-20 z-10 pb-8">
          <button 
             onClick={onRestart}
             className="font-hand text-4xl md:text-5xl text-[#5D4037] hover:scale-105 hover:-translate-y-1 transition-all duration-300 font-bold tracking-wider drop-shadow-sm flex items-center gap-2"
             style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.5)' }}
          >
             Play Again
          </button>
       </div>

    </div>
  );
};
