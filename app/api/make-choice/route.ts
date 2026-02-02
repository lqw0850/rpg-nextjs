import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, choiceText } = await request.json();
    
    if (!sessionId || !choiceText || typeof sessionId !== 'string' || typeof choiceText !== 'string') {
      return NextResponse.json({ error: 'Invalid session ID or choice text' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const nextNode = await gameService.makeChoice(sessionId, choiceText);
    
    return NextResponse.json(nextNode);
  } catch (error) {
    console.error('Error making choice:', error);
    return NextResponse.json({ error: 'Failed to make choice' }, { status: 500 });
  }
}
