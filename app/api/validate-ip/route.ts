import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';
import { createClient } from '../../../lib/supabase/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError) {
      console.error('获取用户会话失败:', authError.message);
    } else if (user) {
      console.log('✅ API 路由获取到用户会话:', user.id, user.email);
    }
    
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
