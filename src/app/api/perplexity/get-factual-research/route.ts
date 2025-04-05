export async function POST(req: Request) {
  try {
    const requestData = await req.json();
    let contentIdea = '';
    let limitedData = false;

    // Handle both the old format (prompt) and the new format (contentIdea, limitedData)
    if (requestData.prompt) {
      // Old format
      contentIdea = requestData.prompt;
    } else if (requestData.contentIdea) {
      // New format
      contentIdea = requestData.contentIdea;
      limitedData = !!requestData.limitedData;
    } else {
      return new Response(JSON.stringify({ error: 'Content idea is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a more comprehensive prompt based on whether we have limited data
    let prompt = '';
    
    if (limitedData) {
      prompt = `I need in-depth, factual research about "${contentIdea}" for creating high-quality content despite having limited audience data.

Since we have limited audience data from similar content, your research is especially crucial. Please provide:

1. Core facts and statistics about this topic
2. Current trends and developments in this area
3. Expert opinions and consensus views
4. Common questions people have about this topic
5. Potential controversies or debates surrounding this topic
6. Practical applications or real-world implications

Format your response as a comprehensive research brief that can inform content creation. Include citations to reputable sources where possible.`;
    } else {
      prompt = `I need factual research about "${contentIdea}" for creating content.

Please provide:
1. Core facts and statistics about this topic
2. Current trends and developments in this area
3. Expert opinions and consensus views
4. Common questions people have about this topic
5. Potential controversies or debates surrounding this topic

Format your response as a comprehensive research brief that can inform content creation. Include citations to reputable sources where possible.`;
    }

    console.log('Perplexity Prompt:', prompt);

    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityApiKey) {
      return new Response(JSON.stringify({ error: 'Perplexity API key is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${perplexityApiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-deep-research',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant with deep knowledge. Provide comprehensive, factual information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Perplexity API error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to fetch from Perplexity API' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    
    // Extract the research content from Perplexity response
    const research = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
      ? data.choices[0].message.content
      : '';
      
    // Support both old format (returning full data) and new format (returning just research)
    return new Response(JSON.stringify({ 
      research,
      choices: data.choices // Include this for backward compatibility
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in Perplexity API:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch from Perplexity API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 