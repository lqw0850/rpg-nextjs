export interface ArtStyle {
  id: string;
  name: string;
  prompt: string;
  description?: string;
}

export const ART_STYLES: ArtStyle[] = [
  {
    id: 'minimalist_pixel',
    name: 'Minimalist Pixel',
    prompt: 'minimalist pixel art sprite, Perler bead style, 32-bit, Chibi, distinct square pixel blocks, high contrast, clean edges, flat colors, no gradients',
    description: '简约像素风格，适合复古游戏感'
  },
  {
    id: 'oil_painting',
    name: 'Oil Painting',
    prompt: 'Intense Chiaroscuro: Dramatic, harsh lighting from an unseen high window, casting deep, cavernous shadows and highlighting the glint of steel and the rich texture of the fabrics. Emotional Sfumato: A slight atmospheric haze to represent Caesar\'s fading consciousness. Rich Texture: Thick impasto on the white marble floor and the folds of the togas; visible cracks in the old canvas. Palette: Stark contrasts of bone-white, deep shadow-black, and shocking splashes of fresh crimson blood.',
    description: '油画质感，强烈的光影对比和丰富的纹理'
  },
  {
    id: 'watercolor',
    name: 'WaterColor',
    prompt: 'Soft watercolor washes with beautiful pigment "blooms" and bleeding edges. Delicate hand-drawn pencil or charcoal outlines. Visible cold-press watercolor paper texture. Warm, diffused natural lighting from the train window. Pastel-leaning but rich palette: soft ambers, warm reds, gentle sky blues, and earthy browns.',
    description: '水彩风格，柔和的色彩渐变和自然的光影'
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    prompt: 'Ethereal & Sacred, Serene & Soothing, Warm & Gentle, Soft Gradient Lighting, Cinematic Ambiance, Soft Diffused Light, Translucent & Luminous Textures, Low-saturation Pastel Palette, Lavender to Gold-orange Gradient, Soft Cool-Warm Color Contrast, Ultra-detailed Photorealism, Classical Aesthetic, Intricate Texture Rendering, Shallow Depth of Field with Soft Bokeh, Immersive First-person Perspective, Narrative & Quiet Atmosphere',
    description: '奇幻风格，梦幻的光影和精致的细节'
  },
  {
    id: 'modern',
    name: 'Modern',
    prompt: 'Digital Hand-Painted Aesthetic: Soft, blended brushwork, delicate facial features, and soulful eyes. Lighting: Warm, hazy afternoon sunlight filtering through a window, creating a dreamy, high-key glow. Palette: Cherry blossom pink, pale mint green, snowy white, and touches of soft crimson. Atmosphere: Pure, romantic, and nostalgic.',
    description: '现代风格，柔和的数字手绘感和温暖的光影'
  },
  {
    id: 'mystery',
    name: 'Mystery',
    prompt: 'Period-appropriate mystery noir, dramatic shadows, intricate details, moody and suspenseful lighting, professional digital painting, 8k resolution, cinematic composition, aesthetic book cover design.',
    description: '悬疑风格，戏剧性的阴影和神秘的氛围'
  },
  {
    id: 'ink_wash',
    name: 'Ink Wash',
    prompt: 'Traditional Chinese ink wash painting (Shuimo). The painting should feature expressive brushwork, varying shades of black ink on aged textured rice paper, minimalist composition, and a sense of harmony. Focus on iconic silhouettes rendered with artistic ink strokes. No modern photographic elements.',
    description: '水墨风格，传统中国水墨画的意境和笔触'
  },
  {
    id: 'anime',
    name: 'Anime',
    prompt: 'High-Key Lighting: Bright, airy, and ethereal with soft-focus edges. Iridescent Textures: Translucent fabrics, shimmering pearls, and glowing bioluminescence. Watercolor-like Clarity: Pure, clean colors without heavy shadows. Palette: Pearlescent White, Soft Rose Gold, Pale Lavender, and Ethereal Aquamarine.',
    description: '动漫风格，明亮的光影和纯净的色彩'
  }
];

// 默认画风
export const DEFAULT_ART_STYLE = ART_STYLES[0]; // Minimalist Pixel

// 创建映射表
const categoryToStyleMap: Record<string, string> = {
  "Fairy Tale": "watercolor",
  "Western Fantasy": "fantasy",
  "Eastern Fantasy": "ink_wash",
  "Modern Urban": "modern",
  "Mystery & Horror": "mystery",
  "War": "Oil Painting",
  "Western": "minimalist_pixel",
  "Science Fiction": "anime"
};

// 根据作品获取画风
export function getArtStyleByCategory(category: string): ArtStyle | undefined {
  const normalizedCategory = category.trim();

  // 获取映射结果
  // 如果匹配不到（例如输入了不在列表中的分类），默认返回 'Modern'
  const style = categoryToStyleMap[normalizedCategory];

  if (!style) {
    console.warn(`未找到分类 [${normalizedCategory}] 对应的映射，已返回默认画风。`);
    return DEFAULT_ART_STYLE;
  }

  return getArtStyleById(style);
}

// 根据ID获取画风
export function getArtStyleById(id: string): ArtStyle | undefined {
  return ART_STYLES.find(style => style.id === id);
}

// 获取画风名称列表
export function getArtStyleNames(): { id: string; name: string; description?: string }[] {
  return ART_STYLES.map(style => ({
    id: style.id,
    name: style.name,
    description: style.description
  }));
}