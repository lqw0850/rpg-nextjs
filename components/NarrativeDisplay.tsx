import React, { useEffect, useState, useRef } from 'react';

interface NarrativeDisplayProps {
  text: string;
  onComplete?: () => void;
}

export const NarrativeDisplay: React.FC<NarrativeDisplayProps> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const indexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    indexRef.current = 0;
    
    if (!text) {
      setIsTyping(false);
      if (onComplete) onComplete();
      return;
    }

    // Calculate typing speed
    const speed = Math.max(10, Math.min(30, 1500 / text.length));

    const typeChar = () => {
      setDisplayedText((prev) => {
        const currentIndex = indexRef.current;
        if (currentIndex >= text.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsTyping(false);
          if (onComplete) onComplete();
          return text;
        }
        
        const char = text.charAt(currentIndex);
        indexRef.current = currentIndex + 1;
        return prev + char;
      });
    };

    timerRef.current = setInterval(typeChar, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, onComplete]);

  const handleSkip = () => {
    if (isTyping) {
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedText(text);
      setIsTyping(false);
      indexRef.current = text.length;
      if (onComplete) onComplete();
    }
  };

  return (
    <div 
      onClick={handleSkip}
      className={`bg-ocean-900/40 backdrop-blur-md p-6 md:p-8 rounded-xl border border-ocean-400/30 shadow-2xl min-h-[150px] md:min-h-[200px] flex flex-col justify-center relative overflow-hidden transition-colors duration-300 ${isTyping ? 'cursor-pointer hover:bg-ocean-900/60' : ''}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-ocean-400 to-transparent opacity-50"></div>
      <p className="font-serif text-lg md:text-xl leading-relaxed text-ocean-100 drop-shadow-sm whitespace-pre-wrap">
        {displayedText}
        {isTyping && <span className="animate-pulse inline-block w-2 h-5 ml-1 bg-ocean-400 align-middle"></span>}
      </p>
      {isTyping && (
        <div className="absolute bottom-2 right-4 text-xs text-ocean-400/50 animate-pulse font-sans">
          点击跳过...
        </div>
      )}
    </div>
  );
};
