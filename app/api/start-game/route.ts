import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';
import { createClient } from '../../../lib/supabase/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    const { ipName, characterName, startNode, isOc, finalOcProfile, artStyleId } = await request.json();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!ipName || !characterName || !startNode || typeof ipName !== 'string' || typeof characterName !== 'string' || typeof startNode !== 'string' || typeof isOc !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    const isAnonymous = user.app_metadata?.provider === 'anonymous' || user.app_metadata?.is_anonymous === true;
    
    const gameService = getGameService();
    const { sessionId, storyNode, gameRecordId, chatHistory } = await gameService.startGame(user.id, ipName, characterName, startNode, isOc, finalOcProfile, isAnonymous, artStyleId);
    
    return NextResponse.json({ sessionId, gameRecordId, ...storyNode, chatHistory });
  } catch (error) {
    console.error('Error starting game:', error);
    return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
  }
}
