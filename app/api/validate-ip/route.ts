import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { ipName } = await request.json();
    
    if (!ipName || typeof ipName !== 'string') {
      return NextResponse.json({ error: 'Invalid IP name' }, { status: 400 });
    }
    
    const gameService = getGameService();
    const result = await gameService.validateIp(ipName);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error validating IP:', error);
    return NextResponse.json({ error: 'Failed to validate IP' }, { status: 500 });
  }
}
