import React, { useState, useEffect, useRef } from 'react';

interface NarrativeDisplayProps {
  text: string;
  onComplete: () => void;
}

export const NarrativeDisplay: React.FC<NarrativeDisplayProps> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (text && currentIndex < text.length) {
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          setDisplayedText(prev => prev + text[currentIndex]);
          setCurrentIndex(prevIndex => prevIndex + 1);
        }
      }, 20); // Adjust typing speed here

      return () => clearTimeout(timeoutId);
    } else if (currentIndex >= text.length && text) {
      // Text is fully displayed, call onComplete
      onComplete();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [text, currentIndex, onComplete]);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <div className="bg-ocean-900/40 border border-ocean-700/50 rounded-xl p-6 text-left shadow-lg">
      <p className="text-lg md:text-xl font-serif text-ocean-100 leading-relaxed">
        {displayedText}
        {currentIndex < text.length && (
          <span className="inline-block w-2 h-6 bg-ocean-400 animate-pulse ml-1 align-middle"></span>
        )}
      </p>
    </div>
  );
};
