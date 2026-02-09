import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '../../../lib/databaseService';
import { createClient } from '../../../lib/supabase/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { gameRecordId } = await request.json();
    
    if (!gameRecordId) {
      return NextResponse.json({ error: 'Missing gameRecordId' }, { status: 400 });
    }
    
    const gameRecord = await databaseService.getGameRecordById(gameRecordId);
    if (!gameRecord) {
      return NextResponse.json({ error: 'Game record not found' }, { status: 404 });
    }
    
    const gameRounds = await databaseService.getGameRounds(gameRecordId);
    if (!gameRounds || gameRounds.length === 0) {
      return NextResponse.json({ error: 'No game rounds found' }, { status: 404 });
    }
    
    const latestRound = gameRounds[gameRounds.length - 1];
    const historyRounds = gameRounds.slice(0, -1);
    
    const chatHistory = [];
    
    for (const round of historyRounds) {
      chatHistory.push({
        role: 'model',
        parts: [{ text: JSON.stringify({
          narration: round.plot,
          options: round.options,
          status: 'CONTINUE',
          characterAnalysis: ''
        }) }]
      });
      chatHistory.push({
        role: 'user',
        parts: [{ text: `Player makes a choice: ${round.user_choice}` }]
      });
    }
    
    chatHistory.push({
      role: 'model',
      parts: [{ text: JSON.stringify({
        narration: latestRound.plot,
        options: latestRound.options,
        status: 'CONTINUE',
        characterAnalysis: ''
      }) }]
    });
    
    const storyNode = {
      narrative: latestRound.plot,
      choices: latestRound.options,
      status: 'CONTINUE',
      characterAnalysis: ''
    };
    
    return NextResponse.json({ 
      storyNode,
      chatHistory,
      gameRecord: {
        id: gameRecord.id,
        ipName: gameRecord.ip_name,
        characterName: gameRecord.character_name,
        isOc: gameRecord.is_oc,
        ocProfile: gameRecord.oc_profile,
        artStyle: gameRecord.art_style
      }
    });
  } catch (error) {
    console.error('Error getting game state:', error);
    return NextResponse.json({ error: 'Failed to get game state' }, { status: 500 });
  }
}