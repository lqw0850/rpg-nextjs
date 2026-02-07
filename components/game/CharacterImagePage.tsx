import React from 'react';
import { ART_STYLES, type ArtStyle } from '../../lib/artStyles';

type CharacterImagePageProps = {
  characterName: string;
  ocImage: string | null;
  loading: boolean;
  isRegeneratingOc: boolean;
  selectedArtStyle: ArtStyle;
  showArtStyles: boolean;
  onRegenerateImage: () => void;
  onSelectArtStyle: (style: ArtStyle) => void;
  onToggleArtStyles: () => void;
  onBack: () => void;
  onConfirm: () => void;
};

export const CharacterImagePage: React.FC<CharacterImagePageProps> = ({
  characterName,
  ocImage,
  loading,
  isRegeneratingOc,
  selectedArtStyle,
  showArtStyles,
  onRegenerateImage,
  onSelectArtStyle,
  onToggleArtStyles,
  onBack,
  onConfirm,
}) => {
  const buttonStyle = "bg-[#D7C9B6] hover:bg-[#c9bba6] border border-[#a89580] text-ink font-serif py-2 px-4 rounded-full shadow-sm text-sm transition-colors w-40 text-center whitespace-nowrap";

  return (
    <div className="flex flex-col items-center w-full h-full relative z-10 pt-6">
      <h2 className="font-serif text-xl text-ink mb-6 text-center italic">Here's your generated look!</h2>

      <div className="relative w-full max-w-4xl flex justify-center items-center h-[500px]">
        <div className="bg-[#9fa0d7] rounded-3xl p-8 shadow-inner relative w-[400px] h-[400px] flex items-center justify-center z-20">
          {loading || isRegeneratingOc ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-ink/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
              <p className="text-xs mt-2">Generating...</p>
            </div>
          ) : ocImage ? (
            <img 
              src={ocImage} 
              alt="Character Avatar" 
              className="w-64 h-64 object-contain pixelated rendering-pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-ink/50">
              <p className="text-xs">No image generated</p>
            </div>
          )}
        </div>

        {showArtStyles && (
          <>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 space-y-8 flex flex-col items-end pr-4">
              {ART_STYLES.slice(0, 4).map(style => (
                <button 
                  key={style.id}
                  onClick={() => onSelectArtStyle(style)}
                  className={buttonStyle}
                  title={style.name}
                >
                  {style.name}
                </button>
              ))}
            </div>
            
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 space-y-8 flex flex-col items-start pl-4">
              {ART_STYLES.slice(4).map(style => (
                <button 
                  key={style.id}
                  onClick={() => onSelectArtStyle(style)}
                  className={buttonStyle}
                  title={style.name}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-[#FF7043] font-hand text-lg mt-4 mb-2 text-center max-w-2xl">
        Regenerating with a new style will overwrite your current image. Make sure you're ready before clicking a button!
      </p>

      <button 
        onClick={onConfirm}
        disabled={loading || !ocImage}
        className="font-hand text-5xl text-ink drop-shadow-md hover:scale-105 transition-transform mb-4 disabled:opacity-50"
      >
        Confirm
      </button>

      <div className="w-full max-w-2xl px-8">
        <label className="font-serif text-sm text-ink mb-1 block pl-2">Enter your specific adjustment details below.</label>
        <input
          type="text"
          placeholder="Enter all your adjustment details at once. Press 'Enter' when ready and wait a moment"
          className="w-full bg-white rounded-lg py-3 px-4 text-sm font-serif text-gray-700 shadow-md border-none focus:outline-none focus:ring-1 focus:ring-ink/20"
        />
        <div className="text-center mt-2 text-[10px] text-gray-400">
          Unsatisfied with result? You have 2 redraw attempts remaining (processing time required). <span className="underline cursor-pointer" onClick={onToggleArtStyles}>Click here to continue</span>
        </div>
      </div>
    </div>
  );
};
