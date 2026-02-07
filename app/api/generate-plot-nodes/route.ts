import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { ipName, characterName, charMode, ocProfile } = await request.json();
    console.log('Received request:', { ipName, characterName, charMode, ocProfile });
    if (!ipName || !characterName || !charMode || typeof ipName !== 'string' || typeof characterName !== 'string' || typeof charMode !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const nodes = await gameService.generatePlotNodes(ipName, characterName, charMode as 'CANON' | 'OC', ocProfile);
    
    return NextResponse.json(nodes);
  } catch (error) {
    console.error('Error generating plot nodes:', error);
    return NextResponse.json({ error: 'Failed to generate plot nodes' }, { status: 500 });
  }
}
