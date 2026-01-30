import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { ipName, characterName, concept } = await request.json();
    
    if (!ipName || !characterName || typeof ipName !== 'string' || typeof characterName !== 'string') {
      return NextResponse.json({ error: 'Invalid IP or character name' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const questions = await gameService.generateOcQuestions(ipName, characterName, concept || '');
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error generating OC questions:', error);
    return NextResponse.json({ error: 'Failed to generate OC questions' }, { status: 500 });
  }
}
