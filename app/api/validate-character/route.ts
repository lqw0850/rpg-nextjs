import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { ipName, characterName } = await request.json();
    
    if (!ipName || !characterName || typeof ipName !== 'string' || typeof characterName !== 'string') {
      return NextResponse.json({ error: 'Invalid IP or character name' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const result = await gameService.validateCharacter(ipName, characterName);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error validating character:', error);
    return NextResponse.json({ error: 'Failed to validate character' }, { status: 500 });
  }
}
