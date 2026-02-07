import React, { useState } from 'react';
import { type StoryNode, type Choice } from '../../types';

type GameMainPageProps = {
  storyNode: StoryNode | null;
  showChoices: boolean;
  loading: boolean;
  sceneImage: string | null;
  customInput: string;
  onCustomInputChange: (value: string) => void;
  onChoiceSelect: (choice: Choice) => void;
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
      onChoiceSelect(selectedChoice);
    }
  };

  const isGameOver = storyNode?.status === 'GAME_OVER' || storyNode?.status === 'VICTORY';

  return (
    <div className="flex flex-col w-full min-h-screen relative z-10 overflow-y-auto">
      <div className="fixed inset-0 z-0">
        {sceneImage ? (
          <img src={sceneImage} className="w-full h-full object-cover opacity-60" alt="Scene" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink/20 to-ink/10"></div>
        )}
        <div className="absolute inset-0 bg-[#F2EFE5]/30 mix-blend-multiply"></div>
      </div>

      <div 
        className="relative z-10 py-10 pl-10 pr-8 shadow-xl backdrop-blur-sm"
        style={{
          marginTop: '5.1vh', 
          marginLeft: '9.6vw',
          maxWidth: '80.7%',
          width: '78.8%',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(180,154,132,1) 0%, rgba(180,154,132,0.94) 33%, rgba(221,209,190,0.59) 80%, rgba(239,234,216,0.69) 100%)',
          border: '1px solid rgba(112,61,27,1)',
        }}
      >
        <p className="font-serif leading-tight text-2xl text-justify"
          style={{
            color: 'rgba(112,61,27,1)',
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
              className={`w-full bg-white/70 hover:bg-white/90 text-left p-4 rounded-xl border border-white/40 shadow-sm flex items-start gap-4 transition-colors group ${selectedChoice?.id === choice.id ? 'ring-2 ring-ink' : ''}`}
            >
              <div className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                selectedChoice?.id === choice.id 
                  ? 'bg-[#8D6E63] border-[#8D6E63]' 
                  : 'border-gray-400 group-hover:border-ink'
              }`}></div>
              <span className="font-serif text-lg text-ink font-bold shadow-black drop-shadow-sm">{choice.text}</span>
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
              className="font-hand text-3xl text-ink drop-shadow-lg disabled:opacity-50"
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
              className="font-hand text-3xl text-ink drop-shadow-lg"
            >
              GO TO SUMMARY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
