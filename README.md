# DEEPCONTENT

A research-backed content creation tool for educational, news, political, and pop culture content. DEEPCONTENT uses AI to help you create well-researched and professionally styled content.

## Features

- Content idea input
- Target style selection and reference transcripts
- AI-generated follow-up questions to expand your ideas
- Deep research using Perplexity's sonar-deep-research API
- Content generation in your desired style using Claude AI
- Copy-to-clipboard functionality for easy export

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key (Claude)
- Perplexity API key (specifically for the sonar-deep-research model)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template and add your API keys:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` to add your actual API keys.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. **Enter your content idea**: Describe what content you want to create
2. **Select content type and paste a reference**: Choose your content format and paste a transcript to use as a style reference
3. **Answer follow-up questions**: The AI will generate questions to help you expand on your ideas
4. **Generate content**: The app will research your topic using Perplexity's Deep Research API and create content in your desired style with Claude AI
5. **Copy and use**: Copy the generated content to use in your projects

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `PERPLEXITY_API_KEY`: Your Perplexity API key

## Technologies

- Next.js 14 App Router
- React
- TypeScript
- Tailwind CSS
- Anthropic Claude API
- Perplexity Deep Research API