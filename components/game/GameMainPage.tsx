import React, { useState } from 'react';
import { type StoryNode, type Choice } from '../../types';
import { TribalBackground } from '../TribalBackground';

type GameMainPageProps = {
  storyNode: StoryNode | null;
  showChoices: boolean;
  loading: boolean;
  sceneImage: string | null;
  customInput: string;
  onCustomInputChange: (value: string) => void;
  onChoiceSelect: (choiceText: string) => void;
  onCustomInputSubmit: () => void;
  onRestart: () => void;
  onGoToSummary: () => void;
};

export const GameMainPage: React.FC<GameMainPageProps> = ({
  storyNode,
  showChoices,
  loading,
  sceneImage,
  customInput,
  onCustomInputChange,
  onChoiceSelect,
  onCustomInputSubmit,
  onRestart,
  onGoToSummary,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);

  const handleNextChapter = () => {
    if (customInput.trim()) {
      onCustomInputSubmit();
    } else if (selectedChoice) {
      onChoiceSelect(selectedChoice.text);
    }
  };

  const isGameOver = storyNode?.status === 'GAME_OVER' || storyNode?.status === 'VICTORY';

  return (
    <div className="flex flex-col w-full min-h-screen relative z-10 overflow-y-auto">
      <div className="fixed inset-0 z-0">
        {sceneImage ? (
          <img src={sceneImage} className="w-full h-full object-cover opacity-60" alt="Scene" />
        ) : (
          <TribalBackground />
        )}
        <div className="absolute inset-0 bg-[#F2EFE5]/30 mix-blend-multiply"></div>
      </div>

      <div 
        className="relative z-10 py-10 pl-10 pr-8 shadow-xl backdrop-blur-sm"
        style={{
          marginTop: isGameOver ? 'auto' : '5.1vh', 
          marginLeft: '9.6vw',
          maxWidth: '80.7%',
          width: '78.8%',
          maxHeight: '80vh',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(180,154,132,1) 0%, rgba(180,154,132,0.94) 33%, rgba(221,209,190,0.59) 80%, rgba(239,234,216,0.69) 100%)',
          border: '1px solid rgba(112,61,27,1)',
        }}
      >
        <p className="font-serif text-2xl text-justify overflow-y-auto custom-scrollbar pr-4"
          style={{
            color: 'rgba(112,61,27,1)',
            lineHeight: '1.2',
            maxHeight: '70vh'
          }}>
          {storyNode?.narrative || ''}
        </p>
      </div>

      {!isGameOver && showChoices && storyNode && (
        <div className="relative z-10 mt-auto mb-12 space-y-4 pr-8"
          style={{ marginLeft: '9.6vw', maxWidth: '80.7%' }}>
          <h3 className="font-serif text-xl text-ink mb-2 drop-shadow-md text-white md:text-ink">Choose an action</h3>
          
          {storyNode.choices.map((choice, index) => (
            <button 
              key={index}
              onClick={() => setSelectedChoice(choice)}
              className={`w-full text-left p-4 rounded-xl border border-white/40 shadow-sm flex items-start gap-4 transition-colors group ${selectedChoice?.id === choice.id ? 'ring-2 ring-ink' : ''}`}
              style={selectedChoice?.id === choice.id ? {
                background: 'white',
                opacity: 0.9
              } : {
                background: 'radial-gradient(0.5% 0.5% at 50% 50%, rgba(180,154,132,1) 0%, rgba(180,154,154,0.67) 100%)'
              }}
            >
              <div className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                selectedChoice?.id === choice.id 
                  ? 'bg-[#8D6E63] border-[#8D6E63]' 
                  : 'border-gray-400 group-hover:border-ink'
              }`}></div>
              <span className={`font-serif text-lg font-bold shadow-black drop-shadow-sm ${
                selectedChoice?.id === choice.id ? 'text-ink' : ''
              }`} style={selectedChoice?.id === choice.id ? {} : {
                color: '#E7E0C5'
              }}>{choice.text}</span>
            </button>
          ))}

          <div className="pt-4">
            <label className="font-serif text-lg text-white md:text-ink mb-2 block shadow-black drop-shadow-sm">Or enter your own</label>
            <input
              type="text"
              value={customInput}
              onChange={(e) => {
                onCustomInputChange(e.target.value);
                setSelectedChoice(null);
              }}
              className="w-full bg-white/50 backdrop-blur rounded-xl py-3 px-4 text-lg font-serif text-gray-900 placeholder-gray-700 shadow-md border-none focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="Enter your custom action here..."
            />
          </div>

          <div className="text-center pt-4">
            <button 
              onClick={handleNextChapter}
              disabled={!customInput.trim() && !selectedChoice}
              className="font-theme text-5xl text-ink drop-shadow-lg disabled:opacity-50"
            >
              Next Chapter
            </button>
          </div>
        </div>
      )}

      {isGameOver && (
        <div className="relative z-10 mt-auto mb-12 text-center"
          style={{ marginLeft: '9.6vw', maxWidth: '80.7%' }}>
          <div className="text-center pt-4">
            <button 
              onClick={onGoToSummary}
              className="font-theme text-5xl text-ink drop-shadow-lg"
            >
              Profile Recap
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
