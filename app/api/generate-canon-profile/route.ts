import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { ipName, characterName } = await request.json();
    
    if (!ipName || !characterName || typeof ipName !== 'string' || typeof characterName !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    // 为原著角色生成档案描述
    const profile = `Character Name: ${characterName}
Source Work: 《${ipName}》
Character Type: Canon Character

Character Description:
${characterName} is a canon character from 《${ipName}》, possessing unique personality and background story. This character holds significant importance and influence within the original work.`;
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error generating canon profile:', error);
    return NextResponse.json({ error: 'Failed to generate profile' }, { status: 500 });
  }
}