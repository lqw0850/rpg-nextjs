import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';
import { databaseService } from '../../../lib/databaseService';
import { createClient } from '../../../lib/supabase/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { gameRecordId, ipName, characterName } = await request.json();
    
    if (!gameRecordId || !ipName || !characterName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const gameService = getGameService();
    
    // 获取游戏记录和轮次记录
    const gameRecord = await databaseService.getGameRecordById(gameRecordId);
    if (!gameRecord) {
      return NextResponse.json({ error: 'Game record not found' }, { status: 404 });
    }
    
    // 提取OC信息
    const isOc = gameRecord.is_oc;
    const ocProfile = gameRecord.oc_profile;
    
    // 获取轮次记录
    const gameRounds = await gameService.getGameRounds(gameRecordId);
    if (!gameRounds || gameRounds.length === 0) {
      return NextResponse.json({ error: 'No game rounds found' }, { status: 404 });
    }
    
    // 继续游戏逻辑
    const result = await gameService.continueGame(gameRecordId, ipName, characterName, gameRounds, isOc, ocProfile);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error continuing game:', error);
    return NextResponse.json({ error: 'Failed to continue game' }, { status: 500 });
  }
}