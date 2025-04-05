'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import LoginModal from './LoginModal';
import { useSearchHistory } from '@/lib/contexts/SearchHistoryContext';

// Animation component for letter-by-letter text reveal with word pauses
const AnimatedText = ({ text, delay = 40, wordPause = 150 }: { text: string; delay?: number; wordPause?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let currentIndex = 0;
    setDisplayedText('');
    setIsComplete(false);

    const animateText = () => {
      if (currentIndex < text.length) {
        const currentChar = text[currentIndex];
        setDisplayedText(prev => prev + currentChar);
        currentIndex++;
        
        // Determine if the next character is a space or if current character is the last one
        const isWordEnd = currentIndex < text.length && text[currentIndex] === ' ';
        
        // Schedule the next character with regular delay or word pause
        timer = setTimeout(
          animateText, 
          isWordEnd ? wordPause : delay
        );
      } else {
        setIsComplete(true);
      }
    };

    timer = setTimeout(animateText, delay);

    return () => clearTimeout(timer);
  }, [text, delay, wordPause]);

  return (
    <div className="relative">
      <span className={`${!isComplete ? 'after:content-["_|"] after:animate-pulse after:opacity-70' : ''} break-words whitespace-normal`}>
        {displayedText}
      </span>
    </div>
  );
};

export default function Sidebar() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { searchHistory, clearHistory } = useSearchHistory();
  const [animatedItems, setAnimatedItems] = useState<Record<number, boolean>>({});

  const handleLogIn = () => {
    setIsLoginModalOpen(true);
  };

  // Track when items have completed animation
  useEffect(() => {
    if (searchHistory.length > 0) {
      // Reset animation state when history changes
      const initialState: Record<number, boolean> = {};
      searchHistory.forEach((_, index) => {
        initialState[index] = false;
      });
      setAnimatedItems(initialState);
      
      // Set up timeouts to mark animations as complete
      const timers: NodeJS.Timeout[] = [];
      searchHistory.forEach((search, index) => {
        // Estimate animation duration based on text length
        const wordCount = search.split(' ').length;
        const charCount = search.length;
        const animationDuration = (charCount * 40) + (wordCount * 150) + 500; // in ms
        
        const timer = setTimeout(() => {
          setAnimatedItems(prev => ({
            ...prev,
            [index]: true
          }));
        }, animationDuration + (index * 150)); // Add staggered delay
        
        timers.push(timer);
      });
      
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [searchHistory]);

  return (
    <div className="fixed left-0 top-0 flex flex-col justify-between h-screen bg-black text-white w-[260px] min-w-[260px] z-30">
      <div className="flex flex-col p-3">
        <Link 
          href="/" 
          className="border border-white/20 rounded p-2 mb-6 text-left flex items-center"
          key={Date.now().toString()}
          onClick={(e) => {
            e.preventDefault();
            window.location.href = '/';
          }}
        >
          <span className="mr-2">+</span> New chat
        </Link>
        
        {searchHistory.length > 0 && (
          <div className="mb-4 animate-fadeIn pr-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm text-gray-400">Recent Searches</h3>
              <button 
                onClick={clearHistory} 
                className="text-xs text-gray-500 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col space-y-1 max-h-[40vh] overflow-y-auto pr-2">
              {searchHistory.map((search, index) => (
                <Link 
                  key={index} 
                  href="/" 
                  className="text-sm p-2 hover:bg-gray-800 rounded-md transition-all duration-300 animate-slideIn break-words whitespace-normal"
                  title={search}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {animatedItems[index] ? (
                    search
                  ) : (
                    <AnimatedText 
                      text={search} 
                      delay={40} 
                      wordPause={150} 
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
        
        <nav className="flex flex-col space-y-2">
          <Link href="/" className="flex items-center p-2 hover:bg-gray-800 rounded-md">
            <span className="mr-2">•</span> DeepContent
          </Link>
          <Link href="/explore" className="flex items-center p-2 hover:bg-gray-800 rounded-md">
            <span className="mr-2">•</span> Explore GPTs
          </Link>
          <Link href="/api-test" className="flex items-center p-2 hover:bg-gray-800 rounded-md">
            <span className="mr-2">•</span> Google API Test
          </Link>
        </nav>
      </div>
      
      <div className="p-3 border-t border-white/10">
        <button 
          onClick={handleLogIn}
          className="w-full border border-white/20 text-white rounded p-2"
        >
          Log In
        </button>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
} 