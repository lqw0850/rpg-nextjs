import { NextRequest, NextResponse } from 'next/server';
import { getGameService } from '../../../lib/gameService';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, narrative, isOcPortrait, ocVisualDescription, artStyle } = await request.json();
    console.log('Received request:', { sessionId, narrative, isOcPortrait, ocVisualDescription, artStyle });
    // 如果是OC角色图像生成（isOcPortrait为true），sessionId是可选的
    if (!narrative || typeof narrative !== 'string') {
      return NextResponse.json({ error: 'Invalid narrative' }, { status: 400 });
    }
    
    // 如果是场景图像生成（isOcPortrait为false），sessionId是必填的
    if (!isOcPortrait && (!sessionId || typeof sessionId !== 'string')) {
      return NextResponse.json({ error: 'Invalid session ID for scene generation' }, { status: 400 });
    }
    
    const gameService = getGameService();
    
    // 对于OC角色图像生成，使用一个临时的sessionId
    const effectiveSessionId = isOcPortrait ? 'oc-image-generation' : sessionId;
    const image = await gameService.generateImage(
      effectiveSessionId, 
      narrative, 
      isOcPortrait || false, 
      ocVisualDescription, 
      artStyle
    );
    
    return NextResponse.json(image);
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
