import { NextResponse } from 'next/server';

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    console.log('Anthropic API route called');
    const { messages } = await req.json();
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      console.error('Missing Anthropic API key');
      return NextResponse.json(
        { error: "Anthropic API key is not configured" },
        { status: 500 }
      );
    }

    // Extract system message if present
    let systemMessage = "You are a helpful AI assistant";
    let userMessages = [...messages];

    // If the first message is a system message, extract it
    if (userMessages.length > 0 && userMessages[0].role === 'system') {
      systemMessage = userMessages[0].content;
      userMessages = userMessages.slice(1);
    }

    // Format messages for Anthropic API
    const formattedMessages = userMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    console.log('Calling external Anthropic API...');
    console.log('API Version: 2023-06-01');
    console.log('Model: claude-3-opus-20240229');
    console.log('Message Count:', formattedMessages.length);
    
    const requestBody = {
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      messages: formattedMessages,
      system: systemMessage
    };
    
    console.log('Request body structure:', Object.keys(requestBody).join(', '));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Anthropic API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error status:', response.status);
      console.error('Anthropic API error details:', errorText);
      
      try {
        // Try to parse the error as JSON
        const errorData = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorData },
          { status: response.status }
        );
      } catch (e) {
        // If parsing fails, return the raw error text
        return NextResponse.json(
          { error: errorText },
          { status: response.status }
        );
      }
    }

    const data = await response.json();
    console.log('Successful response from Anthropic API');
    console.log('Response structure:', Object.keys(data).join(', '));
    
    // Return the content directly from the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Anthropic API route:', error);
    return NextResponse.json(
      { error: 'Failed to generate response from Anthropic', details: String(error) },
      { status: 500 }
    );
  }
}
