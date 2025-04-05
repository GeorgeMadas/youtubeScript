import { NextResponse } from 'next/server';

// Helper function to convert ISO 8601 duration to minutes
function isoDurationToMinutes(duration: string): number {
  // Example format: PT1H23M45S (1 hour, 23 minutes, 45 seconds)
  const hourMatch = duration.match(/(\d+)H/);
  const minuteMatch = duration.match(/(\d+)M/);
  const secondMatch = duration.match(/(\d+)S/);
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
  const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
  
  return hours * 60 + minutes + seconds / 60;
}

// Helper function to get the target duration in minutes
function getTargetDurationMinutes(durationStr: string | undefined): number {
  if (!durationStr) return 0;
  
  if (durationStr === '5min') return 5;
  if (durationStr === '10min') return 10;
  if (durationStr === '20min') return 20;
  
  // For custom duration, extract the number
  const customMatch = durationStr.match(/^custom-(\d+)$/);
  if (customMatch) {
    return parseInt(customMatch[1]);
  }
  
  return 0; // Default if format is unknown
}

export async function POST(request: Request) {
  try {
    const { contentIdea, targetAudience, contentType, duration } = await request.json();
    
    if (!contentIdea || !targetAudience) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get target duration in minutes
    const targetDurationMinutes = getTargetDurationMinutes(duration);

    // Calculate the date 5 years ago for filtering
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const publishedAfter = fiveYearsAgo.toISOString();

    // Construct query based on content idea and target audience
    const searchQuery = `${contentIdea} for ${targetAudience} ${contentType || ''}`.trim();
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    // Search for top videos related to the query
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.append('part', 'snippet');
    searchUrl.searchParams.append('q', searchQuery);
    searchUrl.searchParams.append('type', 'video');
    searchUrl.searchParams.append('maxResults', '50'); // Increase max results to allow for filtering
    searchUrl.searchParams.append('order', 'relevance');
    searchUrl.searchParams.append('publishedAfter', publishedAfter); // Filter for videos in the last 5 years
    searchUrl.searchParams.append('key', apiKey);

    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error('YouTube API search error:', error);
      return NextResponse.json({ error: 'Failed to search YouTube videos' }, { status: 500 });
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items.map((item: any) => item.id.videoId);

    if (videoIds.length === 0) {
      return NextResponse.json({ error: 'No videos found matching the query' }, { status: 404 });
    }

    // Get video details including statistics
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.append('part', 'snippet,statistics,contentDetails');
    videosUrl.searchParams.append('id', videoIds.join(','));
    videosUrl.searchParams.append('key', apiKey);

    const videosResponse = await fetch(videosUrl.toString());
    
    if (!videosResponse.ok) {
      const error = await videosResponse.text();
      console.error('YouTube API videos error:', error);
      return NextResponse.json({ error: 'Failed to get video details' }, { status: 500 });
    }

    const videosData = await videosResponse.json();

    // Process the data to extract insights
    const processedVideos = videosData.items.map((video: any) => {
      const durationMinutes = isoDurationToMinutes(video.contentDetails.duration);
      
      return {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        publishedAt: video.snippet.publishedAt,
        channelTitle: video.snippet.channelTitle,
        views: parseInt(video.statistics.viewCount || '0'),
        likes: parseInt(video.statistics.likeCount || '0'),
        comments: parseInt(video.statistics.commentCount || '0'),
        duration: video.contentDetails.duration,
        durationMinutes,
        thumbnails: video.snippet.thumbnails
      };
    });

    // Apply performance filters:
    // 1. Minimum view count threshold: >100,000 views
    // 2. Published date: Already filtered in API query
    // 3. Video length: Within ±3 minutes of target duration
    const filteredVideos = processedVideos.filter((video: any) => {
      // Filter by minimum views
      if (video.views < 100000) return false;
      
      // Filter by duration if target duration is specified
      if (targetDurationMinutes > 0) {
        const minDuration = targetDurationMinutes - 3;
        const maxDuration = targetDurationMinutes + 3;
        if (video.durationMinutes < minDuration || video.durationMinutes > maxDuration) {
          return false;
        }
      }
      
      return true;
    });

    // Check if we have enough videos that match all filters
    if (filteredVideos.length < 3) {
      return NextResponse.json({
        error: 'insufficient_matching_videos',
        message: 'Could not find enough related videos matching your content criteria',
        details: {
          totalFound: processedVideos.length,
          matchingFilters: filteredVideos.length,
          requiredMatches: 3
        }
      }, { status: 422 });
    }

    // Sort videos by view count to identify most successful ones
    const sortedVideos = filteredVideos.sort((a: any, b: any) => b.views - a.views);
    
    // Get top performing videos
    const topVideos = sortedVideos.slice(0, 5);

    return NextResponse.json({
      searchQuery,
      topVideos,
      totalResults: videosData.pageInfo.totalResults,
      filteredCount: filteredVideos.length,
      metadata: {
        timestamp: new Date().toISOString(),
        query: searchQuery,
        filters: {
          minViews: 100000,
          publishedAfter: publishedAfter,
          targetDuration: targetDurationMinutes,
          durationTolerance: 3
        }
      }
    });
  } catch (error) {
    console.error('Error in YouTube API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 