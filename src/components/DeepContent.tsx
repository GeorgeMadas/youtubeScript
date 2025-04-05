'use client';

import { useState, useRef, useEffect } from 'react';
import ResearchLoader from './ResearchLoader';
import { useSearchHistory } from '@/lib/contexts/SearchHistoryContext';

type Step = 'idea' | 'target' | 'questions' | 'research' | 'result';
type ContentType = 'youtube';

interface DurationOption {
  label: string;
  value: string;
}

const contentTypeDurations: Record<ContentType, DurationOption[]> = {
  youtube: [
    { label: "5 minutes", value: "5min" },
    { label: "10 minutes", value: "10min" },
    { label: "20 minutes", value: "20min" },
    { label: "Custom duration", value: "custom" }
  ]
};

export default function DeepContent() {
  const [step, setStep] = useState<Step>('idea');
  const [contentIdea, setContentIdea] = useState('');
  const [contentType, setContentType] = useState<ContentType>('youtube');
  const [selectedDuration, setSelectedDuration] = useState<string>('');
  const [customDuration, setCustomDuration] = useState<string>('');
  const [targetTranscript, setTargetTranscript] = useState('');
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [researchResults, setResearchResults] = useState('');
  const [finalContent, setFinalContent] = useState('');
  const [contentWordCount, setContentWordCount] = useState(0);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'warning' | 'error'>('error');
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [youtubeInsights, setYoutubeInsights] = useState('');
  const [isAnalyzingYouTube, setIsAnalyzingYouTube] = useState(false);
  const [showInsufficientVideosModal, setShowInsufficientVideosModal] = useState(false);
  const [limitedYoutubeData, setLimitedYoutubeData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [researchStatus, setResearchStatus] = useState<'idle' | 'in-progress' | 'complete' | 'error'>('idle');
  const [openAIResults, setOpenAIResults] = useState<any>(null);
  const [perplexityResults, setPerplexityResults] = useState<string>('');
  
  // Add AbortController ref to cancel fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addSearch } = useSearchHistory();

  const showDurationSelector = contentType === 'youtube';
  const durationOptions = contentTypeDurations[contentType] || [];

  const handleContentTypeChange = (type: ContentType) => {
    setContentType(type);
    setSelectedDuration(''); // Reset duration when content type changes
    setCustomDuration(''); // Reset custom duration when content type changes
  };

  const handleDurationChange = (value: string) => {
    setSelectedDuration(value);
    if (value !== 'custom') {
      setCustomDuration('');
    }
  };

  const generateFollowUpQuestions = async () => {
    if (!contentIdea || !targetTranscript) {
      setError('Please fill in all fields');
      return;
    }

    if (showDurationSelector) {
      if (!selectedDuration) {
        setError('Please select a content duration');
        return;
      }
      if (selectedDuration === 'custom' && !customDuration.trim()) {
        setError('Please enter a custom duration');
        return;
      }
    }

    setIsGeneratingQuestions(true);
    setError('');

    try {
      // Updated fixed questions - removed first question and kept two
      const fixedQuestions = [
        "Target Audience?",
        "What you want to include? (Optional)"
      ];
      
      // Set the fixed questions and move to the next step
      setFollowUpQuestions(fixedQuestions);
      setStep('questions');
    } catch (err) {
      console.error('Error setting up questions:', err);
      setError('Failed to set up questions. Please try again.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const conductResearch = async () => {
    if (!answers[0].trim()) {
      setError('Please answer the target audience question');
      return;
    }

    addSearch(contentIdea);

    setIsResearching(true);
    setIsAnalyzingYouTube(true);
    setError('');
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Start multiple API calls in parallel
      console.log('%cStarting Parallel Research', 'color: #008000; font-weight: bold', {
        timestamp: new Date().toISOString()
      });

      // 1. YouTube API call to analyze successful videos
      console.log('%cStarting YouTube Analysis', 'color: #FF0000; font-weight: bold');
      console.log({
        contentIdea,
        targetAudience: answers[0],
        contentType,
        timestamp: new Date().toISOString()
      });

      const youtubePromise = fetch('/api/youtube/analyze-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentIdea,
          targetAudience: answers[0],
          contentType,
          duration: selectedDuration === 'custom' ? `custom-${customDuration}` : selectedDuration
        }),
        signal,
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('YouTube API error:', errorText);
          
          // Try to parse the error to check if it's the specific "insufficient videos" error
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error === 'insufficient_matching_videos') {
              // Store the limited data that was returned
              setLimitedYoutubeData({
                topVideos: errorData.details?.totalFound > 0 ? [] : null,
                error: 'insufficient_matching_videos',
                details: errorData.details
              });
              
              // Show the modal instead of throwing an error
              setShowInsufficientVideosModal(true);
              
              // Abort other API calls - use the controller ref that was already created
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              
              // Return a dummy object to prevent error propagation
              return { cancelled: true };
            }
          } catch (parseError) {
            // If parsing fails, continue with generic error
            console.error('Error parsing error response:', parseError);
          }
          
          throw new Error('Failed to analyze YouTube videos');
        }
        return response.json();
      });

      // 2. Perplexity API call for factual research - start independently
      console.log('%cStarting Perplexity Research', 'color: #0000ff; font-weight: bold');
      const perplexityPromise = fetch('/api/perplexity/deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          contentIdea,
          limitedData: false
        }),
        signal,
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to conduct research with Perplexity');
        }
        return response.json();
      });

      // Wait for YouTube data first
      const youtubeData = await youtubePromise;
      
      // If YouTube analysis was cancelled, exit early
      if (youtubeData.cancelled) {
        return;
      }
      
      console.log('%cYouTube Analysis Complete', 'color: #FF0000; font-weight: bold', {
        videosFound: youtubeData.topVideos?.length || 0,
        timestamp: new Date().toISOString()
      });

      // 3. Use OpenAI to analyze YouTube data and extract audience insights
      console.log('%cStarting OpenAI Analysis of YouTube Data', 'color: #00A67E; font-weight: bold');
      
      const openaiPromise = fetch('/api/openai/analyze-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeData,
          contentIdea,
          targetAudience: answers[0]
        }),
        signal,
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI Analysis error:', errorText);
          throw new Error('Failed to analyze YouTube data with OpenAI');
        }
        return response.json();
      });

      // Wait for both OpenAI and Perplexity to complete
      const [openaiData, perplexityData] = await Promise.all([openaiPromise, perplexityPromise]);
      
      console.log('%cOpenAI Analysis Complete', 'color: #00A67E; font-weight: bold', {
        insightsExtracted: !!openaiData.analysis,
        timestamp: new Date().toISOString()
      });

      // Save YouTube insights for display
      setYoutubeInsights(JSON.stringify(openaiData.analysis, null, 2));
      setIsAnalyzingYouTube(false);
      
      console.log('%cPerplexity Response Received', 'color: #0000ff; font-weight: bold', {
        timestamp: new Date().toISOString()
      });

      // Extract research content from response
      let researchContent = '';
      if (perplexityData.research) {
        // New API format
        researchContent = perplexityData.research;
      } else if (perplexityData.choices && perplexityData.choices[0] && perplexityData.choices[0].message && perplexityData.choices[0].message.content) {
        // Old API format
        researchContent = perplexityData.choices[0].message.content;
      } else {
        console.warn('%cUnexpected Perplexity response format', 'color: #ff8800; font-weight: bold', perplexityData);
        throw new Error('Invalid response format from Perplexity API');
      }
      
      setResearchResults(researchContent);
      console.log('%cResearch Results Set', 'color: #0000ff; font-weight: bold');

      console.log('%cAll Parallel Research Completed', 'color: #008000; font-weight: bold', {
        timestamp: new Date().toISOString()
      });
      
      // Move to content generation with all research data
      generateContent(researchContent, openaiData.analysis);
    } catch (err) {
      console.error('%cError in Research Process', 'color: #ff0000; font-weight: bold', {
        error: err,
        timestamp: new Date().toISOString()
      });
      
      if ((err as Error).name === 'AbortError') {
        setError('Research was cancelled.');
      } else {
        // Check if the error is about insufficient matching videos
        const errorMessage = (err as Error).message;
        if (errorMessage.includes('Could not find enough related videos matching your content criteria')) {
          const friendlyMessage = `${errorMessage} Try modifying your content idea or target audience to find more matching videos.`;
          setErrorType('warning');
          setError(friendlyMessage);
          // Explicitly cancel the research process
          cancelResearch(friendlyMessage);
        } else {
          setErrorType('error');
          setError(`Failed to conduct research: ${errorMessage || 'Unknown error'}`);
        }
      }
    } finally {
      setIsResearching(false);
      setIsAnalyzingYouTube(false);
    }
  };

  const generateContent = async (research: string, youtubeAnalysis?: any) => {
    setIsGeneratingContent(true);
    
    const signal = abortControllerRef.current?.signal;
    
    try {
      // Check if we're working with limited YouTube data
      const isLimitedDataAnalysis = youtubeAnalysis && 
        (typeof youtubeAnalysis === 'object' && youtubeAnalysis.isLimitedDataAnalysis) ||
        (typeof youtubeAnalysis === 'string' && youtubeAnalysis.includes('"isLimitedDataAnalysis": true'));
      
      console.log('%cStarting Claude Content Generation', 'color: purple; font-weight: bold');
      console.log({
        contentType,
        contentIdea,
        targetAudience: answers[0],
        duration: selectedDuration,
        customDuration,
        hasYouTubeAnalysis: !!youtubeAnalysis,
        isLimitedDataAnalysis,
        hasFactualResearch: !!research,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Create content in ${contentType} format based on my ideas and the two separate research sources provided.

              My Original Idea: ${contentIdea}
              
              My Specifications:
              Target Audience: ${answers[0]}
              ${answers[1].trim() ? `What to include: ${answers[1]}` : ''}
              ${selectedDuration ? `Content Duration: ${selectedDuration === 'custom' ? `${customDuration} minutes` : selectedDuration}` : ''}
              
              Target Style Reference (please format the content based on this style): 
              ${targetTranscript.substring(0, 500)}...
              
              SOURCE 1 - YouTube Audience Analysis${isLimitedDataAnalysis ? " (Limited Data)" : ""}:
              ${youtubeAnalysis ? JSON.stringify(youtubeAnalysis, null, 2) : 'No YouTube analysis available'}
              ${isLimitedDataAnalysis ? "\nNote: This analysis is based on AI expertise rather than specific videos that matched all performance criteria because we couldn't find enough videos that met all criteria (100k+ views, recent, matching duration)." : ""}
              
              SOURCE 2 - Factual Research Data (from separate research):
              ${research}
              
              Please create ${contentType} content by combining these two sources. The content should:
              1. Use the audience insights from the YouTube analysis to target pain points and interests
              2. Follow content structure patterns identified as successful in the YouTube analysis
              3. ${selectedDuration ? `Fit within the ${selectedDuration === 'custom' ? `${customDuration} minutes` : selectedDuration} duration` : 'Have an appropriate length'} for this type of content
              4. Incorporate the recommended tone, style, and keywords from the YouTube analysis
              5. Include factual information from the research data to support main points
              6. Match the target reference style while maintaining what works for this audience
              
              ${isLimitedDataAnalysis ? "Important: Even though we're working with limited YouTube data, please create high-quality content using the best available insights and factual research." : ""}
              
              Note: The YouTube analysis and factual research are from separate sources. Please combine them effectively to create comprehensive, accurate, and engaging content.`
            }
          ]
        }),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error:', errorText);
        throw new Error('Failed to generate content');
      }

      console.log('%cClaude Response Received', 'color: purple; font-weight: bold', {
        status: response.status,
        timestamp: new Date().toISOString()
      });

      const data = await response.json();
      console.log('%cClaude Response Data', 'color: purple; font-weight: bold', data);
      
      // Updated response format handling for Anthropic API
      if (!data) {
        throw new Error('Empty response from Claude API');
      }
      
      let generatedContent = '';
      
      // Handle different possible response formats
      if (data.content && Array.isArray(data.content) && data.content[0] && data.content[0].text) {
        // Standard Anthropic v1/messages format
        generatedContent = data.content[0].text;
      } else if (data.completion) {
        // Legacy Anthropic format
        generatedContent = data.completion;
      } else if (data.message && data.message.content) {
        // OpenAI-like format some middleware might convert to
        generatedContent = data.message.content;
      } else if (typeof data === 'string') {
        // Plain text fallback
        generatedContent = data;
      } else {
        // Last resort - stringify the whole response
        console.warn('Unexpected Claude response format:', data);
        generatedContent = JSON.stringify(data, null, 2);
      }
      
      setFinalContent(generatedContent);
      // Calculate and set word count
      const wordCount = generatedContent.trim().split(/\s+/).length;
      setContentWordCount(wordCount);
      
      console.log('%cContent Generation Completed', 'color: purple; font-weight: bold');
      
      setStep('result');
    } catch (err) {
      console.error('%cError in Content Generation', 'color: #ff0000; font-weight: bold', {
        error: err,
        timestamp: new Date().toISOString()
      });
      
      if ((err as Error).name === 'AbortError') {
        setError('Content generation was cancelled.');
      } else {
        setError('Failed to generate content. Please try again.');
      }
    } finally {
      // Make sure all loading states are reset
      setIsGeneratingContent(false);
      setIsResearching(false);
      setIsAnalyzingYouTube(false);
      setShowInsufficientVideosModal(false);
      setResearchStatus("complete");
    }
  };

  const cancelResearch = (customErrorMessage?: string, type: 'warning' | 'error' = 'error') => {
    console.log('%cCancelling Research', 'color: #ff0000; font-weight: bold');
    
    // Abort any in-progress fetches
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }
    
    // Reset ALL research states
    setIsResearching(false);
    setIsAnalyzingYouTube(false);
    setIsGeneratingContent(false);
    setShowInsufficientVideosModal(false);
    setResearchStatus('error');
    setProgress(0);
    setCurrentStep('');
    
    // Set error message if provided
    if (customErrorMessage) {
      setError(customErrorMessage);
      setErrorType(type);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(finalContent);
    setShowCopySuccess(true);
    setTimeout(() => {
      setShowCopySuccess(false);
    }, 600);
  };

  const continueWithLimitedData = async () => {
    console.log('%cContinueWithLimitedData: Function Called', 'color: #ff00ff; font-weight: bold', {
      limitedYoutubeData,
      contentIdea,
      timestamp: new Date().toISOString()
    });
    
    // Clear any previous errors
    setError('');
    
    // Set appropriate states to show loading/research in progress
    setShowInsufficientVideosModal(false);
    setIsResearching(true);
    setIsAnalyzingYouTube(true);
    setResearchStatus("in-progress");
    setCurrentStep("Analyzing content...");

    try {
      // Create a new AbortController for this operation
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      console.log('%cContinueWithLimitedData: AbortController created', 'color: #ff00ff; font-weight: bold');

      // Run both API calls in parallel to avoid dependency between them
      setProgress(20);
      setCurrentStep("Gathering research data...");
      
      // Start both API calls in parallel
      console.log('%cContinueWithLimitedData: Starting OpenAI API call', 'color: #ff00ff; font-weight: bold', {
        endpoint: '/api/openai/analyze-content',
        payload: {
          contentIdea,
          youtubeData: limitedYoutubeData,
          targetAudience: answers[0],
        }
      });
      
      const openaiPromise = fetch('/api/openai/analyze-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentIdea,
          youtubeData: limitedYoutubeData,
          targetAudience: answers[0],
        }),
        signal,
      }).then(async (response) => {
        console.log('%cContinueWithLimitedData: OpenAI response received', 'color: #ff00ff; font-weight: bold', {
          status: response.status,
          ok: response.ok
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('%cContinueWithLimitedData: OpenAI error', 'color: #ff0000; font-weight: bold', errorText);
          throw new Error(`OpenAI analysis failed: ${response.statusText}`);
        }
        return response.json();
      }).catch(error => {
        console.error('%cContinueWithLimitedData: OpenAI fetch error', 'color: #ff0000; font-weight: bold', error);
        throw error;
      });
      
      console.log('%cContinueWithLimitedData: Starting Perplexity API call', 'color: #ff00ff; font-weight: bold', {
        endpoint: '/api/perplexity/deep-research',
        payload: {
          contentIdea,
          limitedData: true
        }
      });
      
      const perplexityPromise = fetch('/api/perplexity/deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentIdea,
          limitedData: true
        }),
        signal,
      }).then(async (response) => {
        console.log('%cContinueWithLimitedData: Perplexity response received', 'color: #ff00ff; font-weight: bold', {
          status: response.status,
          ok: response.ok
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('%cContinueWithLimitedData: Perplexity error', 'color: #ff0000; font-weight: bold', errorText);
          throw new Error(`Perplexity research failed: ${response.statusText}`);
        }
        return response.json();
      }).catch(error => {
        console.error('%cContinueWithLimitedData: Perplexity fetch error', 'color: #ff0000; font-weight: bold', error);
        throw error;
      });
      
      console.log('%cContinueWithLimitedData: Waiting for API promises to resolve', 'color: #ff00ff; font-weight: bold');
      
      // Wait for both promises to complete
      const [openaiData, perplexityData] = await Promise.all([openaiPromise, perplexityPromise]);
      
      console.log('%cOpenAI Analysis Complete', 'color: green; font-weight: bold', openaiData);
      setOpenAIResults(openaiData);
      
      console.log('%cPerplexity Research Complete', 'color: green; font-weight: bold', perplexityData);
      setIsAnalyzingYouTube(false);
      
      // Get the research content - either from the new format or old format
      const researchContent = perplexityData.research || 
        (perplexityData.choices?.[0]?.message?.content || '');
      
      setPerplexityResults(researchContent);
      
      // Finally, generate content with Claude
      setProgress(100);
      setCurrentStep("Done!");
      setResearchStatus("complete");
      
      // Generate content with Claude using both analyses
      generateContent(researchContent, openaiData);
    } catch (error: any) {
      console.error('%cError in research process with limited data:', 'color: #ff0000; font-weight: bold', error);
      if (error.name === 'AbortError') {
        console.log('Research process was aborted');
      } else {
        cancelResearch(`Error: ${error.message}`, 'error');
      }
      
      // Reset all loading states to ensure the UI is clean
      setIsResearching(false);
      setIsAnalyzingYouTube(false);
      setShowInsufficientVideosModal(false);
      setResearchStatus("error");
      return true; // Indicate error
    }
    return false; // No error
  };

  useEffect(() => {
    console.log('%cLimitedYoutubeData changed:', 'color: blue; font-weight: bold', limitedYoutubeData);
  }, [limitedYoutubeData]);

  return (
    <div className="w-full max-w-4xl">
      <ResearchLoader 
        isResearching={isResearching} 
        isGeneratingContent={isGeneratingContent} 
        isAnalyzingYouTube={isAnalyzingYouTube}
        onCancel={cancelResearch}
      />
      
      {/* Insufficient Videos Modal */}
      {showInsufficientVideosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <div className="p-2 bg-yellow-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-center mb-2">Limited Video Data Available</h3>
            
            <p className="mb-3 text-center">
              We couldn't find enough YouTube videos that match your criteria:
            </p>
            
            <div className="bg-gray-100 p-4 rounded-md mb-4">
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Must have over 100,000 views</li>
                <li>Published within the last 5 years</li>
                <li>Duration similar to your selected length</li>
              </ul>
              
              {limitedYoutubeData?.details && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-sm font-medium text-gray-900">Statistics:</p>
                  <ul className="text-xs text-gray-600 space-y-1 mt-1">
                    <li>Total videos found: {limitedYoutubeData.details.totalFound}</li>
                    <li>Videos matching all criteria: {limitedYoutubeData.details.matchingFilters}</li>
                    <li>Minimum required: {limitedYoutubeData.details.requiredMatches}</li>
                  </ul>
                </div>
              )}
            </div>
            
            <p className="mb-6 text-sm text-gray-600">
              Continuing with limited data may result in less accurate content recommendations. 
              You can either:
            </p>
            
            <div className="flex justify-between space-x-3">
              <button 
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700"
                onClick={() => {
                  console.log('%cCancelling limited data process', 'color: orange; font-weight: bold');
                  setShowInsufficientVideosModal(false);
                }}
              >
                Cancel
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => {
                  console.log('%cContinue Anyway clicked', 'color: orange; font-weight: bold');
                  continueWithLimitedData();
                }}
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      
      {error && !showInsufficientVideosModal && (
        <div className={`mb-4 p-4 rounded-md ${
          errorType === 'warning' 
            ? 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500' 
            : 'bg-red-100 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {step === 'idea' && (
        <div className="space-y-6">
          <div>
            <label htmlFor="content-idea" className="block text-lg font-medium mb-2">
              What content do you want to create?
            </label>
            <textarea
              id="content-idea"
              className="w-full p-3 border rounded-md h-32"
              placeholder="Describe your content idea in detail..."
              value={contentIdea}
              onChange={(e) => setContentIdea(e.target.value)}
            />
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={() => setStep('target')}
            disabled={!contentIdea.trim()}
          >
            Next
          </button>
        </div>
      )}

      {step === 'target' && (
        <div className="space-y-6">
          <div>
            <label htmlFor="content-type" className="block text-lg font-medium mb-2">
              What type of content are you creating?
            </label>
            <select
              id="content-type"
              className="w-full p-3 border rounded-md"
              value={contentType}
              onChange={(e) => handleContentTypeChange(e.target.value as ContentType)}
            >
              <option value="youtube">YouTube Video</option>
            </select>
          </div>

          {showDurationSelector && durationOptions.length > 0 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="duration" className="block text-lg font-medium mb-2">
                  Select content duration: <span className="text-red-500">*</span>
                </label>
                <select
                  id="duration"
                  className="w-full p-3 border rounded-md"
                  value={selectedDuration}
                  onChange={(e) => handleDurationChange(e.target.value)}
                >
                  <option value="">Select duration...</option>
                  {durationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDuration === 'custom' && (
                <div>
                  <label htmlFor="custom-duration" className="block text-lg font-medium mb-2">
                    Enter custom duration: <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      id="custom-duration"
                      className="flex-1 p-3 border rounded-md"
                      placeholder="Enter duration in minutes..."
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                    />
                    <span className="text-gray-600">
                      minutes
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="target-transcript" className="block text-lg font-medium mb-2">
              Paste a target transcript for style reference
            </label>
            <textarea
              id="target-transcript"
              className="w-full p-3 border rounded-md h-64"
              placeholder="Paste the transcript of a similar content piece to use as a style reference..."
              value={targetTranscript}
              onChange={(e) => setTargetTranscript(e.target.value)}
            />
          </div>
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              onClick={() => setStep('idea')}
            >
              Back
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={generateFollowUpQuestions}
              disabled={!targetTranscript.trim() || isGeneratingQuestions}
            >
              {isGeneratingQuestions ? 'Generating Questions...' : 'Generate Follow-Up Questions'}
            </button>
          </div>
        </div>
      )}

      {step === 'questions' && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Please answer these follow-up questions:</h3>
          {followUpQuestions.map((question, index) => (
            <div key={index} className="space-y-2">
              <p className="font-medium">{question}</p>
              <textarea
                className="w-full p-3 border rounded-md h-32"
                placeholder="Your answer..."
                value={answers[index]}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
              />
            </div>
          ))}
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              onClick={() => setStep('target')}
            >
              Back
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={conductResearch}
              disabled={isResearching || isGeneratingContent}
            >
              {isResearching 
                ? 'Running Deep Research...' 
                : isGeneratingContent 
                  ? 'Generating Content...' 
                  : 'Start Research & Generate Content'}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-6">
          <h3 className="text-xl font-medium">Generated Content:</h3>
          
          <div className="p-4 border rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
                onClick={handleCopyClick}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                {showCopySuccess ? 'Copied!' : 'Copy'}
              </button>
              
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {contentWordCount.toLocaleString()} words
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  ~{Math.round(contentWordCount / 200)} min speaking time
                </span>
                {selectedDuration && (
                  <span className={`px-2 py-1 rounded-full ${
                    selectedDuration === 'custom' 
                      ? (contentWordCount >= parseInt(customDuration) * 180 && contentWordCount <= parseInt(customDuration) * 220)
                      : (
                        selectedDuration === '5min' && contentWordCount >= 900 && contentWordCount <= 1100 ||
                        selectedDuration === '10min' && contentWordCount >= 1800 && contentWordCount <= 2200 ||
                        selectedDuration === '20min' && contentWordCount >= 3600 && contentWordCount <= 4400
                      )
                    ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    Target: {selectedDuration === 'custom' ? `${customDuration} min` : selectedDuration}
                  </span>
                )}
              </div>
            </div>
            
            <div className="prose max-w-none whitespace-pre-wrap">
              {finalContent}
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              onClick={() => setShowResearch(!showResearch)}
            >
              {showResearch ? 'Hide Research' : 'Show Research'}
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              onClick={() => setStep('idea')}
            >
              Start New
            </button>
          </div>
          
          {showResearch && (
            <div className="mt-4 space-y-4">
              {youtubeInsights && (
                <div className="p-4 border rounded-md bg-gray-50">
                  <h4 className="text-lg font-medium mb-2 flex items-center">
                    YouTube Audience Analysis:
                    {youtubeInsights.includes('"isLimitedDataAnalysis": true') && (
                      <span className="ml-2 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        Limited Data
                      </span>
                    )}
                  </h4>
                  
                  {youtubeInsights.includes('"isLimitedDataAnalysis": true') && (
                    <div className="mb-3 p-3 text-sm bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700">
                      Note: This analysis is based on AI expertise rather than specific videos that matched all performance criteria.
                    </div>
                  )}
                  
                  <div className="prose max-w-none whitespace-pre-wrap bg-white p-4 rounded-md border overflow-auto max-h-[400px]">
                    {youtubeInsights}
                  </div>
                </div>
              )}
              
              <div className="p-4 border rounded-md bg-gray-50">
                <h4 className="text-lg font-medium mb-2">Additional Research Data:</h4>
                <div className="prose max-w-none whitespace-pre-wrap bg-white p-4 rounded-md border overflow-auto max-h-[400px]">
                  {researchResults}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 



