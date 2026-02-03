import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { gameRecordId, status, characterSummary } = await request.json();
    
    if (!gameRecordId || typeof gameRecordId !== 'number' || typeof status !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const success = await gameService.updateGameStatus(gameRecordId, status, characterSummary);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update game status' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating game status:', error);
    return NextResponse.json({ error: 'Failed to update game status' }, { status: 500 });
  }
}
