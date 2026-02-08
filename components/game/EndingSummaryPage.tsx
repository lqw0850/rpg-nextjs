import React from 'react';
import { type StoryNode } from '../../types';
import { TribalBackground } from '../TribalBackground';

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
       
       <TribalBackground />

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
             <h1 className="font-theme font-bold text-7xl md:text-9xl text-[#5D4037] leading-none select-none tracking-widest ml-[-4px]"
                 style={{ 
                   textShadow: '3px 3px 0px rgba(255,255,255,0.4)',
                   fontVariant: 'small-caps',
                   textTransform: 'uppercase'
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

       <div className="fixed bottom-10 left-0 right-0 flex justify-center z-10">
          <button 
             onClick={onRestart}
             className="font-theme text-5xl md:text-5xl text-[#5D4037] hover:scale-105 hover:-translate-y-1 transition-all duration-300 font-bold tracking-wider drop-shadow-sm flex items-center gap-2"
             style={{ textShadow: '2px 2px 0px rgba(255,255,255,0.5)' }}
          >
             play again
          </button>
       </div>

    </div>
  );
};
