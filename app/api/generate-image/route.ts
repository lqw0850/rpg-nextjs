import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, narrative, isOcPortrait, ocVisualDescription } = await request.json();
    
    if (!sessionId || !narrative || typeof sessionId !== 'string' || typeof narrative !== 'string') {
      return NextResponse.json({ error: 'Invalid session ID or narrative' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const image = await gameService.generateImage(sessionId, narrative, isOcPortrait || false, ocVisualDescription);
    
    return NextResponse.json(image);
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
