import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';
import { getSession } from '../../../lib/sessionManager';
import { databaseService } from '../../../lib/databaseService';
import { createClient } from '../../../lib/supabase/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }
    
    // 获取会话
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // 获取游戏记录ID
    const gameRecordId = (session as any).gameRecordId;
    if (!gameRecordId) {
      return NextResponse.json({ error: 'Game record not found in session' }, { status: 404 });
    }
    
    // 获取最新的轮次记录
    const gameRounds = await databaseService.getGameRounds(gameRecordId);
    if (!gameRounds || gameRounds.length === 0) {
      return NextResponse.json({ error: 'No game rounds found' }, { status: 404 });
    }
    
    // 获取最新轮次
    const latestRound = gameRounds[gameRounds.length - 1];
    
    // 构建真实的故事节点
    console.log(latestRound.options)
    // let choices;
    // try {
    //   if (typeof latestRound.options === 'string') {
    //     // 如果是字符串，解析为JSON
    //     choices = JSON.parse(latestRound.options);
    //   } else {
    //     // 如果已经是对象，直接使用
    //     choices = latestRound.options;
    //   }
      
    //   // 确保choices是数组格式
    //   if (!Array.isArray(choices)) {
    //     console.warn('options不是数组格式，使用默认选项');
    //     choices = [
    //       { id: 'A', text: '继续之前的行动' },
    //       { id: 'B', text: '重新考虑策略' },
    //       { id: 'C', text: '观察当前局势' }
    //     ];
    //   }
    // } catch (error) {
    //   console.error('处理options失败:', error);
    //   choices = [
    //     { id: 'A', text: '继续之前的行动' },
    //     { id: 'B', text: '重新考虑策略' },
    //     { id: 'C', text: '观察当前局势' }
    //   ];
    // }
    const storyNode = {
      narrative: latestRound.plot,
      choices: latestRound.options,
      status: 'CONTINUE',
      characterAnalysis: ''
    };
    
    return NextResponse.json({ storyNode });
  } catch (error) {
    console.error('Error getting game state:', error);
    return NextResponse.json({ error: 'Failed to get game state' }, { status: 500 });
  }
}