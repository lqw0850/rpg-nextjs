import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { profile } = await request.json();
    
    if (!profile || typeof profile !== 'string') {
      return NextResponse.json({ error: 'Invalid profile' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const visualPrompt = await gameService.generateOcVisualPrompt(profile);
    
    return NextResponse.json(visualPrompt);
  } catch (error) {
    console.error('Error generating OC visual prompt:', error);
    return NextResponse.json({ error: 'Failed to generate OC visual prompt' }, { status: 500 });
  }
}
