import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { contentIdea, targetAudience } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert content strategy researcher. Your task is to analyze target audiences and provide detailed insights about their preferences, pain points, and successful content examples in their niche."
        },
        {
          role: "user",
          content: `Please conduct detailed audience research for a ${contentIdea} targeting ${targetAudience}.

Focus on:
1. Successful similar content from other creators in this space
2. Common pain points and challenges this audience faces
3. Content preferences (style, tone, format) that resonate with this audience
4. Key topics and themes that perform well
5. Engagement patterns and what drives shares/likes
6. Demographic and psychographic insights

Format your response in clear sections with specific examples and actionable insights.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
} 