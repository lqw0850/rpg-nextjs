import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { gameRecordId, choiceText, chatHistory, ipName, charName, isOc, ocProfile, artStyleId } = await request.json();
    // console.log('make-choice', gameRecordId, choiceText, chatHistory, ipName, charName, isOc, ocProfile, artStyleId);
    
    if (!gameRecordId || !choiceText || typeof gameRecordId !== 'number' || typeof choiceText !== 'string') {
      return NextResponse.json({ error: 'Invalid gameRecordId or choice text' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const nextNode = await gameService.makeChoice(gameRecordId, choiceText, chatHistory, ipName, charName, isOc, ocProfile, artStyleId);
    
    return NextResponse.json(nextNode);
  } catch (error) {
    console.error('Error making choice:', error);
    return NextResponse.json({ error: 'Failed to make choice' }, { status: 500 });
  }
}
