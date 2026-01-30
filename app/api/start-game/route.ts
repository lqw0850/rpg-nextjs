import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { ipName, characterName, startNode, finalOcProfile } = await request.json();
    
    if (!ipName || !characterName || !startNode || typeof ipName !== 'string' || typeof characterName !== 'string' || typeof startNode !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const initialNode = await gameService.startGame(ipName, characterName, startNode, finalOcProfile);
    
    return NextResponse.json(initialNode);
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
