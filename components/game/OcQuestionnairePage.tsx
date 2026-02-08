import React from 'react';

type OcQuestionnairePageProps = {
  ocQuestions: string[];
  ocAnswers: string[];
  loading: boolean;
  onAnswerChange: (index: number, value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export const OcQuestionnairePage: React.FC<OcQuestionnairePageProps> = ({
  ocQuestions,
  ocAnswers,
  loading,
  onAnswerChange,
  onSubmit,
  onBack,
}) => {
  return (
    <div className="flex flex-col items-center w-full h-screen relative z-10 overflow-y-auto px-4 pb-20 pt-12 custom-scrollbar">
      <div className="text-center max-w-4xl mb-12">
        <h2 className="font-serif text-2xl md:text-3xl text-[#5D4037] font-bold mb-4 leading-tight">
          Please complete the following questionnaire to help the system better understand your original character.
        </h2>
        <p className="font-serif text-sm text-[#8D6E63]">
          Fields marked with an asterisk (*) are required.
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-8 relative z-20">
        {ocQuestions.map((q, idx) => (
          <div key={idx} className="space-y-2">
            <label className="block font-hand text-xl font-bold text-[#5D4037]">
              {idx + 1}. {q}{q.toLowerCase().includes('name') || q.toLowerCase().includes('age') || q.toLowerCase().includes('gender') || q.toLowerCase().includes('appearance') ? '*' : ''}
            </label>
            <input
              type="text"
              value={ocAnswers[idx] || ''}
              onChange={(e) => onAnswerChange(idx, e.target.value)}
              className="w-full bg-[#EFEBE9]/40 border border-[#8D6E63]/30 rounded-xl py-3 px-4 text-lg font-serif text-[#5D4037] focus:outline-none focus:ring-1 focus:ring-[#8D6E63] shadow-sm transition-all hover:bg-[#EFEBE9]/60"
            />
          </div>
        ))}

        <div className="pt-12 pb-8 flex justify-center w-full">
          <button 
            onClick={onSubmit}
            disabled={loading}
            className="font-hand text-4xl text-[#5D4037] hover:scale-105 transition-transform font-bold tracking-widest drop-shadow-sm disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'SUBMIT'}
          </button>
        </div>
      </div>

      <div className="fixed bottom-10 left-10 z-30">
        <button 
          onClick={onBack}
          className="font-theme text-3xl text-[#5D4037] hover:translate-x-[-5px] transition-transform flex items-center gap-2 font-bold select-none bg-[#F2EFE5]/80 rounded-lg pr-4"
        >
          <span>←</span> BACK
        </button>
      </div>
    </div>
  );
};