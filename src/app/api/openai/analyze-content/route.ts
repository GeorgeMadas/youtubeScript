import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
  try {
    const { youtubeData, contentIdea, targetAudience } = await request.json();
    
    if (!youtubeData || !contentIdea) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Check if we have limited or insufficient data
    const hasLimitedData = youtubeData.error === 'insufficient_matching_videos';
    
    // Extract relevant information from YouTube data
    const topVideos = youtubeData.topVideos || [];
    
    // Create prompt based on available data
    let prompt = '';
    
    if (hasLimitedData) {
      // Limited data scenario - create a special prompt to generate best-effort analysis
      prompt = `
      I need to create content about "${contentIdea}" for the target audience "${targetAudience}".

      Unfortunately, I couldn't find enough YouTube videos that match these criteria:
      - Over 100,000 views
      - Published within the last 5 years
      - Duration appropriate for this content

      Based on your expertise as a content strategist and knowledge about YouTube content:

      1. What are likely pain points and interests for "${targetAudience}" related to "${contentIdea}"?
      2. What content structure patterns would likely be successful with this audience?
      3. What common themes, keywords, and phrases would likely resonate with viewers?
      4. What tone and presentation style would you recommend?
      5. What would be the optimal content length and structure for this type of content?

      Use your knowledge of successful content strategies to make educated recommendations despite limited specific data. 
      
      Format your response as a structured JSON object with the following keys:
      - painPoints (array of strings)
      - interests (array of strings)
      - contentStructure (array of strings)
      - commonThemes (array of strings)
      - keywords (array of strings)
      - toneAndStyle (object with 'tone' and 'style' keys)
      - optimalLength (string)
      - additionalInsights (string with a note about this being a best-effort analysis due to limited data)
      `;
    } else {
      // Check if we have videos to analyze
      if (topVideos.length === 0) {
        return NextResponse.json({ error: 'No YouTube video data to analyze' }, { status: 400 });
      }

      // Standard prompt for normal operation
      prompt = `
      Below is data from ${topVideos.length} top-performing YouTube videos related to "${contentIdea}" for the target audience "${targetAudience}".
      
      ${topVideos.map((video: any, index: number) => `
      VIDEO ${index + 1}:
      Title: ${video.title}
      Views: ${video.views.toLocaleString()}
      Likes: ${video.likes.toLocaleString()}
      Comments: ${video.comments.toLocaleString()}
      Description: ${video.description.substring(0, 300)}...
      `).join('\n')}
      
      Based on this data, please provide:
      1. Key audience pain points and interests for "${targetAudience}" related to "${contentIdea}"
      2. Content structure patterns that are successful with this audience
      3. Common themes, keywords, and phrases that resonate with viewers
      4. Recommended tone and presentation style based on successful videos
      5. Optimal content length and structure for this type of content
      
      Format your response as a structured JSON object with the following keys:
      - painPoints (array of strings)
      - interests (array of strings)
      - contentStructure (array of strings)
      - commonThemes (array of strings)
      - keywords (array of strings)
      - toneAndStyle (object with 'tone' and 'style' keys)
      - optimalLength (string)
      - additionalInsights (string)
      `;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { 
          role: "system", 
          content: hasLimitedData 
            ? "You are an expert content strategist who provides best-effort audience insights when specific data is limited. Use your expertise to make educated recommendations for content creation." 
            : "You are an expert content strategist who analyzes YouTube data to extract audience insights. Provide actionable insights in JSON format."
        },
        { role: "user", content: prompt }
      ],
    });

    const response = completion.choices[0].message.content;
    
    // Parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(response || '{}');
      
      // Add a flag to indicate if this was a limited data analysis
      if (hasLimitedData) {
        analysisResult.isLimitedDataAnalysis = true;
      }
    } catch (err) {
      console.error('Error parsing OpenAI JSON response:', err);
      return NextResponse.json({ error: 'Invalid response format from OpenAI' }, { status: 500 });
    }

    return NextResponse.json({
      analysis: analysisResult,
      metadata: {
        videosAnalyzed: hasLimitedData ? 0 : topVideos.length,
        contentIdea,
        targetAudience,
        timestamp: new Date().toISOString(),
        limitedDataAnalysis: hasLimitedData
      }
    });
  } catch (error) {
    console.error('Error in OpenAI analysis route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 