import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { ipName, characterName, appearance } = await request.json();
    
    if (!ipName || !characterName || typeof ipName !== 'string' || typeof characterName !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    
    if (appearance !== undefined && typeof appearance !== 'string') {
      return NextResponse.json({ error: 'Invalid appearance parameter' }, { status: 400 });
    }
    
    let description = `${characterName} is a canon character from 《${ipName}》, possessing unique personality and background story. This character holds significant importance and influence within the original work.`;
    
    if (appearance && appearance.trim()) {
      description += `\n\nAppearance: ${appearance}`;
    }
    
    const profile = `Character Name: ${characterName}
Source Work: 《${ipName}》
Character Type: Canon Character

Character Description:
${description}`;
    
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error generating canon profile:', error);
    return NextResponse.json({ error: 'Failed to generate profile' }, { status: 500 });
  }
}