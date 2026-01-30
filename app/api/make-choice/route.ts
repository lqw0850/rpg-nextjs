import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { choiceText } = await request.json();
    
    if (!choiceText || typeof choiceText !== 'string') {
      return NextResponse.json({ error: 'Invalid choice text' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const nextNode = await gameService.makeChoice(choiceText);
    
    return NextResponse.json(nextNode);
  } catch (error) {
    console.error('Error making choice:', error);
    return NextResponse.json({ error: 'Failed to make choice' }, { status: 500 });
  }
}
