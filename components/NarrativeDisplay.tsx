import React, { useEffect, useState } from 'react';

interface NarrativeDisplayProps {
  text: string;
  onComplete?: () => void;
}

export const NarrativeDisplay: React.FC<NarrativeDisplayProps> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;
    
    // Calculate typing speed based on length, aiming for a reasonable read time but maxing out
    const speed = Math.max(15, Math.min(30, 2000 / text.length));

    const intervalId = setInterval(() => {
      setDisplayedText((prev) => {
        if (index >= text.length) {
          clearInterval(intervalId);
          setIsTyping(false);
          if (onComplete) onComplete();
          return text;
        }
        const char = text.charAt(index);
        index++;
        return prev + char;
      });
    }, speed);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="bg-ocean-900/40 backdrop-blur-md p-6 md:p-8 rounded-xl border border-ocean-400/30 shadow-2xl min-h-[200px] flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-ocean-400 to-transparent opacity-50"></div>
      <p className="font-serif text-lg md:text-xl leading-relaxed text-ocean-100 drop-shadow-sm">
        {displayedText}
        {isTyping && <span className="animate-pulse inline-block w-1 h-5 ml-1 bg-ocean-400 align-middle"></span>}
      </p>
    </div>
  );
};