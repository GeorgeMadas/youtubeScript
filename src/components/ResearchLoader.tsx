'use client';

import { useState, useEffect } from 'react';

interface ResearchLoaderProps {
  isResearching: boolean;
  isGeneratingContent: boolean;
  isAnalyzingYouTube?: boolean;
  onCancel: () => void;
}

export default function ResearchLoader({ isResearching, isGeneratingContent, isAnalyzingYouTube, onCancel }: ResearchLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  
  // Reset progress when research starts
  useEffect(() => {
    if (isResearching) {
      setProgress(0);
    }
  }, [isResearching]);
  
  // Simulate progress for the research phase
  useEffect(() => {
    if (!isResearching && !isGeneratingContent) {
      setProgress(0);
      return;
    }
    
    let interval: NodeJS.Timeout;
    
    if (isResearching) {
      // For research phase - aim to reach ~95% in about 130 seconds
      // The remaining 5% will be for content generation
      interval = setInterval(() => {
        setProgress(prevProgress => {
          if (prevProgress < 95) {
            // Use a non-linear progression to make it feel more realistic
            // Start faster, slow down as it progresses
            const increment = (95 - prevProgress) / 20;
            return prevProgress + Math.max(0.2, increment);
          }
          return prevProgress;
        });
        
        // Update status messages based on progress and current activity
        if (isAnalyzingYouTube) {
          if (progress < 15) {
            setStatus('Analyzing successful YouTube videos...');
          } else if (progress < 30) {
            setStatus('Extracting patterns from top performers...');
          } else if (progress < 45) {
            setStatus('Identifying audience preferences...');
          } else {
            setStatus('Generating audience insights from video data...');
          }
        } else if (progress < 10) {
          setStatus('Gathering factual information...');
        } else if (progress < 25) {
          setStatus('Researching relevant sources...');
        } else if (progress < 40) {
          setStatus('Compiling academic and statistical data...');
        } else if (progress < 60) {
          setStatus('Analyzing factual information...');
        } else if (progress < 75) {
          setStatus('Organizing research findings...');
        } else if (progress < 90) {
          setStatus('Preparing to combine data streams...');
        } else {
          setStatus('Finalizing research...');
        }
      }, 1000);
    } else if (isGeneratingContent) {
      // For content generation phase - complete the remaining progress
      interval = setInterval(() => {
        setProgress(prevProgress => {
          if (prevProgress < 100) {
            return prevProgress + (100 - prevProgress) / 5;
          }
          return 100;
        });
        setStatus('Creating content by combining YouTube insights with factual research...');
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isResearching, isGeneratingContent, isAnalyzingYouTube, progress]);
  
  if (!isResearching && !isGeneratingContent) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50 p-6">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl">
        <h3 className="text-xl font-bold mb-4 text-center">
          {isAnalyzingYouTube 
            ? 'Analyzing YouTube Videos & Audience' 
            : isResearching 
              ? 'Gathering Factual Research' 
              : 'Creating Content From Multiple Sources'}
        </h3>
        
        <div className="relative pt-1 mb-4">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {isAnalyzingYouTube 
                  ? 'YouTube audience data' 
                  : isResearching 
                    ? 'Factual research' 
                    : 'Content generation'}
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
            <div 
              style={{ width: `${progress}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-300 ease-out"
            ></div>
          </div>
        </div>
        
        <p className="text-gray-700 text-center mb-4">{status}</p>
        
        <div className="flex justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
            <div className="h-3 w-3 bg-blue-600 rounded-full animation-delay-200"></div>
            <div className="h-3 w-3 bg-blue-600 rounded-full animation-delay-400"></div>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-6 text-center">
          This process typically takes 2-3 minutes. Please don't close this window.
        </p>
        
        <div className="mt-6 flex justify-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Cancel Research
          </button>
        </div>
      </div>
    </div>
  );
} 