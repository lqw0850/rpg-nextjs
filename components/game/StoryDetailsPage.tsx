import React from 'react';

type StoryDetailsPageProps = {
  ipName: string;
  ipSummary: string;
  ipAuthor: string;
  ipCategory: string;
  ipOriginLang: string;
  onBack: () => void;
  onNext: () => void;
};

export const StoryDetailsPage: React.FC<StoryDetailsPageProps> = ({
  ipName,
  ipSummary,
  ipAuthor,
  ipCategory,
  ipOriginLang,
  onBack,
  onNext,
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen relative z-10 px-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-6xl w-full">
        {/* Left Side: Description */}
        <div className="font-serif text-lg leading-relaxed text-[#5D4037] text-center">
          <p className="mb-4">
            {ipSummary}
          </p>
        </div>

        {/* Right Side: Title & Metadata */}
        <div className="flex flex-col items-center pl-8 border-l border-[#5D4037]/10">
          <h1 className="font-hand text-7xl text-[#5D4037] mb-12 text-center">{ipName}</h1>
          
          <div className="grid grid-cols-[100px_1fr] gap-y-6 text-xl w-full">
            <span className="font-bold text-[#5D4037]/80 font-serif text-right pr-4">Author</span>
            <span className="font-serif text-[#5D4037] text-left">{ipAuthor}</span>

            <span className="font-bold text-[#5D4037]/80 font-serif text-right pr-4">Language</span>
            <span className="font-serif text-[#5D4037] text-left">{ipOriginLang || 'Unknown'}</span>

            <span className="font-bold text-[#5D4037]/80 font-serif text-right pr-4">Genre</span>
            <span className="font-serif text-[#5D4037] text-left">{ipCategory}</span>
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

      <div className="mt-16">
        <button
          onClick={onNext}
          className="font-hand text-4xl text-[#5D4037] hover:scale-105 transition-transform font-bold select-none"
        >
          Go to choose your role
        </button>
      </div>
    </div>
  );
};