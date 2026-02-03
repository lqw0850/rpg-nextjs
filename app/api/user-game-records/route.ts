import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';
import { createClient } from '../../../lib/supabase/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const gameService = getGameService();
    const gameRecords = await gameService.getUserGameRecords(user.id);
    
    return NextResponse.json({ gameRecords });
  } catch (error) {
    console.error('Error getting user game records:', error);
    return NextResponse.json({ error: 'Failed to get user game records' }, { status: 500 });
  }
}
