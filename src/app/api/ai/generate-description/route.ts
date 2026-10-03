import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is not configured on the server.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      name,
      category,
      type = 'menu-item', // 'menu-item' | 'offer' | 'restaurant-about' | 'recipe'
      cuisine,
      existingText,
      customPrompt,
    } = body;

    if (!name && !customPrompt) {
      return NextResponse.json(
        { error: 'Item name or prompt is required for AI generation.' },
        { status: 400 }
      );
    }

    let systemInstruction =
      'You are an award-winning executive chef and culinary copywriter for "The Copper Leaf", a luxury fine-dining restaurant brand. Your writing is evocative, sophisticated, appetizing, and concise. Never use cheesy clichés, robotic text, or markdown quotes. Return only the plain generated text.';

    let userPrompt = '';
    if (customPrompt) {
      userPrompt = customPrompt;
    } else if (type === 'menu-item') {
      userPrompt = `Write an exquisite, appetizing 2-3 sentence menu description for the dish: "${name}". ${category ? `Category: ${category}.` : ''} ${cuisine ? `Cuisine style: ${cuisine}.` : ''} Highlight key textures, aromas, authentic preparation, and savory flavor profile. Keep it under 45 words.`;
    } else if (type === 'offer') {
      userPrompt = `Write an alluring, high-converting promotional description (2 sentences) for an exclusive restaurant offer titled: "${name}". Focus on dining indulgence, value, and memorable moments. Keep it under 35 words.`;
    } else if (type === 'restaurant-about') {
      userPrompt = `Write an inspiring, elegant brand story paragraph (3-4 sentences) for "${name || 'The Copper Leaf'}". Highlight artisanal culinary craftsmanship, warm hospitality, and unforgettable gastronomy.`;
    } else if (type === 'recipe') {
      userPrompt = `Write concise culinary preparation notes and chef tips (2-3 sentences) for the recipe: "${name}". Focus on cooking precision, ingredient balance, and finishing touches.`;
    } else {
      userPrompt = `Write a polished, evocative restaurant description for: "${name}".`;
    }

    if (existingText && existingText.trim()) {
      userPrompt += ` Improve and refine upon this existing draft: "${existingText.trim()}".`;
    }

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'The Copper Leaf Multi-Restaurant OS',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 250,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'OpenRouter AI generation failed.' },
        { status: 502 }
      );
    }

    const generatedText = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      success: true,
      text: generatedText.replace(/^["']|["']$/g, ''), // Strip wrapping quotes if any
    });
  } catch (error: any) {
    console.error('AI generate description error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error during AI generation.' },
      { status: 500 }
    );
  }
}
