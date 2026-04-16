import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AccessibilityContextType {
  isReadAloudEnabled: boolean;
  setIsReadAloudEnabled: (val: boolean) => void;
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  currentWordIndex: number;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  isReadAloudEnabled: false,
  setIsReadAloudEnabled: () => {},
  speak: () => {},
  stop: () => {},
  isSpeaking: false,
  currentWordIndex: -1,
});

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReadAloudEnabled, setIsReadAloudEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Small delay to ensure previous cancel finished
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a clear English voice
      const preferredVoice = voices.find(v => v.lang.includes('en-US')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.1; // Friendly pitch

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
      };
      
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          // This is a bit tricky across browsers, simple logic to find word index
          const charIndex = event.charIndex;
          const textUpToChar = text.substring(0, charIndex + 1).trim();
          const wordCount = textUpToChar.split(/\s+/).length - 1;
          setCurrentWordIndex(wordCount);
        }
      };

      window.speechSynthesis.speak(utterance);
    }, 50);
  }, [voices]);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentWordIndex(-1);
    }
  }, []);

  return (
    <AccessibilityContext.Provider value={{ 
      isReadAloudEnabled, 
      setIsReadAloudEnabled, 
      speak, 
      stop, 
      isSpeaking, 
      currentWordIndex,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => useContext(AccessibilityContext);

export const ReadAloudText: React.FC<{ text: string, className?: string }> = ({ text, className }) => {
  const { currentWordIndex, isSpeaking } = useAccessibility();
  const words = text.split(/\s+/);

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span 
          key={i} 
          className={`${(isSpeaking && i === currentWordIndex) ? 'bg-amber-300 text-slate-900 rounded px-0.5' : ''} transition-colors duration-200`}
        >
          {word}{' '}
        </span>
      ))}
    </span>
  );
};
