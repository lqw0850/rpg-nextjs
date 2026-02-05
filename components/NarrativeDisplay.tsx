import React, { useState, useEffect, useRef } from 'react';

interface NarrativeDisplayProps {
  text: string;
  onComplete: () => void;
}

export const NarrativeDisplay: React.FC<NarrativeDisplayProps> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    // 如果已经跳过，直接显示全部文本
    if (isSkipped) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      onComplete();
      return;
    }
    
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
  }, [text, currentIndex, onComplete, isSkipped]);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
    setIsSkipped(false);
  }, [text]);

  const handleSkip = () => {
    if (!isSkipped && currentIndex < text.length) {
      setIsSkipped(true);
    }
  };

  return (
    <div 
      className="bg-ocean-900/40 border border-ocean-700/50 rounded-xl p-6 text-left shadow-lg cursor-pointer transition-all duration-200 hover:bg-ocean-900/60 active:scale-[0.99]"
      onClick={handleSkip}
      title={currentIndex < text.length ? "点击跳过动画" : ""}
    >
      <p className="text-lg md:text-xl font-serif text-ocean-100 leading-relaxed">
        {displayedText}
        {currentIndex < text.length && (
          <span className="inline-block w-2 h-6 bg-ocean-400 animate-pulse ml-1 align-middle"></span>
        )}
      </p>
      {currentIndex < text.length && (
        <div className="mt-2 text-xs text-ocean-400 text-center opacity-70 hover:opacity-100 transition-opacity">
          点击跳过动画
        </div>
      )}
    </div>
  );
};
