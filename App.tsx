import React, { useState, useRef, useEffect } from 'react';
import { GameStatus, type StoryNode, type Choice } from './types';
import { gameService } from './services/gemini';
import { NarrativeDisplay } from './components/NarrativeDisplay';
import { Button } from './components/Button';
import { Waves, Sparkles, Crown, Anchor, Image as ImageIcon, Send, ScrollText, BookOpen, User, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Sparkle, UserPlus, FileQuestion, Feather, Tag, RefreshCw, Camera, Globe } from 'lucide-react';

type SetupStep = 'SELECT_IP' | 'SELECT_CHARACTER';
type CharacterMode = 'CANON' | 'OC';
type OcStep = 'CONCEPT' | 'QUESTIONS' | 'IMAGE_GEN';

// Mapping categories to Chinese for display
const CATEGORY_MAP: Record<string, string> = {
  'Fairy Tale': '童话故事',
  'Western Fantasy': '西方奇幻',
  'Eastern Fantasy': '东方玄幻',
  'Modern Urban': '现代都市',
  'Mystery & Horror': '悬疑恐怖',
  'War': '战争',
  'Western': '西部',
  'Science Fiction': '科幻'
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [storyNode, setStoryNode] = useState<StoryNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [customInput, setCustomInput] = useState('');
  
  // Setup State
  const [setupStep, setSetupStep] = useState<SetupStep>('SELECT_IP');
  const [ipName, setIpName] = useState('');
  const [ipSummary, setIpSummary] = useState('');
  const [ipAuthor, setIpAuthor] = useState('');
  const [ipCategory, setIpCategory] = useState('');
  const [ipOriginLang, setIpOriginLang] = useState('');
  
  // Character Selection State
  const [charMode, setCharMode] = useState<CharacterMode>('CANON');
  const [characterName, setCharacterName] = useState('');
  const [canonValidationMsg, setCanonValidationMsg] = useState('');
  
  // OC State
  const [ocStep, setOcStep] = useState<OcStep>('CONCEPT');
  const [ocConcept, setOcConcept] = useState('');
  const [ocQuestions, setOcQuestions] = useState<string[]>([]);
  const [ocAnswers, setOcAnswers] = useState<string[]>([]);
  const [ocImage, setOcImage] = useState<string | null>(null);
  const [ocVisualDesc, setOcVisualDesc] = useState('');
  const [isRegeneratingOc, setIsRegeneratingOc] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const handleVerifyIp = async () => {
    if (!ipName.trim()) return;
    setLoading(true);
    setIpSummary('');
    setIpAuthor('');
    setIpCategory('');
    setIpOriginLang('');
    
    try {
      const result = await gameService.validateIp(ipName);
      if (result.isExist) {
        setIpSummary(result.abstract || "无简介");
        setIpAuthor(result.author || "佚名");
        setIpCategory(result.category || "其他");
        setIpOriginLang(result.originalLanguage || "");
        setSetupStep('SELECT_CHARACTER');
        // Reset character state
        setCharMode('CANON');
        setCharacterName('');
        setOcStep('CONCEPT');
        setOcConcept('');
        setOcQuestions([]);
        setOcImage(null);
        setOcVisualDesc('');
      } else {
        alert(`无法找到作品《${ipName}》或该作品不符合收录标准。请尝试更精确的名称。`);
      }
    } catch (error) {
      console.error("IP Validation failed", error);
      alert("验证服务暂时不可用，请重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async (ocProfile?: string) => {
    if (!ipName.trim() || !characterName.trim()) {
      alert("请填写完整信息");
      return;
    }

    setLoading(true);
    setSceneImage(null);
    setCustomInput('');
    try {
      const initialNode = await gameService.startGame(ipName, characterName, ocProfile);
      setStoryNode(initialNode);
      setStatus(GameStatus.PLAYING);
      setShowChoices(false);
    } catch (error) {
      console.error("Error starting game", error);
      alert("无法连接到万界枢纽 (API 错误)，请检查网络连接。");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndStartCanon = async () => {
    if (!characterName.trim()) return;
    setLoading(true);
    setCanonValidationMsg('');
    try {
      const result = await gameService.validateCharacter(ipName, characterName);
      if (result.isExist) {
        // Use extracted appearance for consistent visuals, even for canon characters
        if (result.appearance) {
           gameService.setOcVisualDescription(result.appearance);
        } else {
           gameService.setOcVisualDescription(""); 
        }
        await handleStartGame();
      } else {
        setCanonValidationMsg("该角色似乎不属于此世界，请检查拼写或尝试创建原创角色。");
        setLoading(false); 
      }
    } catch (error) {
       console.error(error);
       alert("验证失败，请重试");
       setLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!characterName.trim() || !ocConcept.trim()) {
      alert("请填写角色名称和初步构想");
      return;
    }
    setLoading(true);
    try {
      const questions = await gameService.generateOcQuestions(ipName, characterName, ocConcept);
      setOcQuestions(questions);
      
      // Auto-fill 'Name' if present in questions
      const initialAnswers = new Array(questions.length).fill('');
      questions.forEach((q, i) => {
        if (q.toLowerCase() === 'name') {
          initialAnswers[i] = characterName;
        }
      });
      setOcAnswers(initialAnswers);
      
      setOcStep('QUESTIONS');
    } catch (error) {
      console.error(error);
      alert("生成问题失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOcImage = async () => {
    setLoading(true);
    try {
      // 1. Construct the profile text
      const profile = `
Name: ${characterName}
Concept: ${ocConcept}
Details:
${ocQuestions.map((q, i) => `${q}: ${ocAnswers[i] || 'Unknown'}`).join('\n')}
      `.trim();

      // 2. Generate Visual Prompt
      const visualPrompt = await gameService.generateOcVisualPrompt(profile);
      setOcVisualDesc(visualPrompt);
      gameService.setOcVisualDescription(visualPrompt);

      // 3. Generate the Image
      const image = await gameService.generateImage("Portrait shot, facing camera, character sheet style.", true);
      setOcImage(image);
      setOcStep('IMAGE_GEN');
    } catch (error) {
      console.error(error);
      alert("形象生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateOcImage = async () => {
    if (!ocVisualDesc) return;
    setIsRegeneratingOc(true);
    try {
      const image = await gameService.generateImage("Portrait shot, facing camera, character sheet style.", true);
      setOcImage(image);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRegeneratingOc(false);
    }
  };

  const handleConfirmOcAndStart = async () => {
    const profile = `
角色概念: ${ocConcept}
设定问答:
${ocQuestions.map((q, i) => `问: ${q}\n答: ${ocAnswers[i] || '未知'}`).join('\n')}
    `.trim();
    
    await handleStartGame(profile);
  };

  const handleChoice = async (text: string) => {
    setLoading(true);
    setShowChoices(false);
    setSceneImage(null);
    setCustomInput('');
    try {
      const nextNode = await gameService.makeChoice(text);
      setStoryNode(nextNode);
      
      if (nextNode.status === 'GAME_OVER') {
        setStatus(GameStatus.GAME_OVER);
      } else if (nextNode.status === 'VICTORY') {
        setStatus(GameStatus.VICTORY);
      }
    } catch (error) {
      console.error("Error making choice", error);
      alert("时空乱流干扰了连接 (API 错误)，请重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAction = () => {
    if (!customInput.trim()) return;
    handleChoice(customInput);
  };

  const handleRestart = () => {
    setStoryNode(null);
    setSceneImage(null);
    setStatus(GameStatus.IDLE);
    setSetupStep('SELECT_IP');
    setCustomInput('');
    setIpSummary('');
    setIpAuthor('');
    setIpCategory('');
    setIpOriginLang('');
    setOcImage(null);
    setOcVisualDesc('');
  };

  // Generate image when story node changes
  useEffect(() => {
    let isMounted = true;
    if (storyNode?.narrative) {
      setLoadingImage(true);
      gameService.generateImage(storyNode.narrative)
        .then(image => {
          if (isMounted) {
             setSceneImage(image);
             setLoadingImage(false);
          }
        });
    }
    return () => { isMounted = false; };
  }, [storyNode]);

  // Auto-scroll logic (same as before)
  useEffect(() => {
    if (bottomRef.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [storyNode, showChoices, loading, sceneImage, setupStep, ocStep]);

  const renderContent = () => {
    if (status === GameStatus.IDLE) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-float px-4">
          <div className="relative">
            <div className="absolute -inset-4 bg-ocean-400/20 rounded-full blur-xl animate-pulse-slow"></div>
            <BookOpen size={80} className="text-ocean-100 relative z-10" />
          </div>
          <div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-ocean-400 mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              万界传说
            </h1>
            <p className="text-ocean-100/80 text-lg font-sans max-w-lg mx-auto">
              {setupStep === 'SELECT_IP' 
                ? "第一步：连接时空坐标。输入你向往的世界名称。" 
                : "第二步：塑造化身。选择你的降临身份。"}
            </p>
          </div>

          <div className="w-full max-w-xl bg-ocean-900/40 p-6 rounded-xl border border-ocean-700/50 backdrop-blur-sm shadow-xl transition-all duration-500">
            
            {setupStep === 'SELECT_IP' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="space-y-2 text-left">
                  <label className="text-ocean-100 text-sm font-serif flex items-center gap-2">
                    <BookOpen size={16} /> 目标世界 (IP名称)
                  </label>
                  <input 
                    type="text" 
                    value={ipName}
                    onChange={(e) => setIpName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyIp()}
                    placeholder="例如：三体、哈利波特、权力的游戏..."
                    className="w-full bg-ocean-900/80 border border-ocean-600 rounded-lg px-4 py-3 text-white placeholder-ocean-500/70 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-all"
                    autoFocus
                  />
                  <p className="text-xs text-ocean-400/60 pl-1">AI 将验证该世界是否存在。</p>
                </div>
                
                <Button onClick={handleVerifyIp} isLoading={loading} className="w-full text-lg mt-4 flex justify-between items-center group">
                  <span>验证并继续</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}

            {setupStep === 'SELECT_CHARACTER' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                
                {/* IP Info - Enhanced Card */}
                <div className="bg-ocean-800/40 p-5 rounded-lg border border-ocean-600/30 text-left relative overflow-hidden group hover:bg-ocean-800/60 transition-colors shadow-inner">
                   {/* Header Row: Title & Confirmation */}
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-green-300">
                          <CheckCircle2 size={18} />
                          <span className="text-xs font-bold uppercase tracking-wider">世界已确认</span>
                      </div>
                      
                       {ipCategory && (
                         <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-ocean-700/60 text-ocean-200 border border-ocean-600/50 flex items-center gap-1">
                           <Tag size={10} />
                           {CATEGORY_MAP[ipCategory] || ipCategory}
                         </span>
                       )}
                   </div>

                   <h3 className="text-xl font-serif text-white mb-1">{ipName}</h3>
                   
                   {(ipAuthor || ipOriginLang) && (
                     <div className="flex items-center gap-3 text-xs text-ocean-300 mb-3 italic">
                        {ipAuthor && (
                          <div className="flex items-center gap-1">
                             <Feather size={12} />
                             <span>{ipAuthor}</span>
                          </div>
                        )}
                        
                        {ipOriginLang && (
                          <div className="flex items-center gap-1 border-l border-ocean-600 pl-3">
                             <Globe size={12} />
                             <span>{ipOriginLang}</span>
                          </div>
                        )}
                     </div>
                   )}

                   <p className="text-sm text-ocean-100/80 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-300 cursor-help border-l-2 border-ocean-500/30 pl-3">
                     {ipSummary}
                   </p>
                </div>

                {/* Character Mode Tabs */}
                <div className="flex p-1 bg-ocean-900/60 rounded-lg border border-ocean-700">
                  <button 
                    onClick={() => { setCharMode('CANON'); setCharacterName(''); setCanonValidationMsg(''); }}
                    className={`flex-1 py-2 rounded-md text-sm font-serif transition-all ${charMode === 'CANON' ? 'bg-ocean-700 text-white shadow-md' : 'text-ocean-400 hover:text-white'}`}
                  >
                    原著角色
                  </button>
                  <button 
                    onClick={() => { setCharMode('OC'); setCharacterName(''); setOcStep('CONCEPT'); }}
                    className={`flex-1 py-2 rounded-md text-sm font-serif transition-all ${charMode === 'OC' ? 'bg-ocean-700 text-white shadow-md' : 'text-ocean-400 hover:text-white'}`}
                  >
                    原创角色 (OC)
                  </button>
                </div>

                {/* Canon Character Flow */}
                {charMode === 'CANON' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-2 text-left">
                      <label className="text-ocean-100 text-sm font-serif flex items-center gap-2">
                        <User size={16} /> 角色名称
                      </label>
                      <input 
                        type="text" 
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyAndStartCanon()}
                        placeholder="例如：罗辑、马尔福..."
                        className="w-full bg-ocean-900/80 border border-ocean-600 rounded-lg px-4 py-3 text-white placeholder-ocean-500/70 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-all"
                        autoFocus
                      />
                      {canonValidationMsg && (
                        <p className="text-xs text-red-300 pl-1 flex items-center gap-1">
                          <AlertCircle size={12} /> {canonValidationMsg}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <Button onClick={() => setSetupStep('SELECT_IP')} variant="secondary" className="px-4">
                        <ArrowLeft size={20} />
                      </Button>
                      <Button onClick={handleVerifyAndStartCanon} isLoading={loading} className="flex-1 text-lg group">
                        <span className="flex items-center justify-center gap-2">
                          验证并开始 <Sparkles size={18} className="group-hover:animate-spin" />
                        </span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* OC Flow */}
                {charMode === 'OC' && (
                   <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                     {ocStep === 'CONCEPT' && (
                       <div className="space-y-4">
                          <div className="space-y-2 text-left">
                            <label className="text-ocean-100 text-sm font-serif flex items-center gap-2">
                              <UserPlus size={16} /> 角色名称
                            </label>
                            <input 
                              type="text" 
                              value={characterName}
                              onChange={(e) => setCharacterName(e.target.value)}
                              placeholder="你的原创角色名字"
                              className="w-full bg-ocean-900/80 border border-ocean-600 rounded-lg px-4 py-3 text-white placeholder-ocean-500/70 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-all"
                            />
                          </div>
                          <div className="space-y-2 text-left">
                            <label className="text-ocean-100 text-sm font-serif flex items-center gap-2">
                              <Sparkle size={16} /> 初步构想
                            </label>
                            <textarea 
                              value={ocConcept}
                              onChange={(e) => setOcConcept(e.target.value)}
                              placeholder="例如：一个流浪的剑客，失去了一切记忆，但剑术超群..."
                              className="w-full bg-ocean-900/80 border border-ocean-600 rounded-lg px-4 py-3 text-white placeholder-ocean-500/70 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-all h-24 resize-none"
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button onClick={() => setSetupStep('SELECT_IP')} variant="secondary" className="px-4">
                              <ArrowLeft size={20} />
                            </Button>
                            <Button onClick={handleGenerateQuestions} isLoading={loading} className="flex-1 text-lg group">
                              <span className="flex items-center justify-center gap-2">
                                下一步：完善设定 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                              </span>
                            </Button>
                          </div>
                       </div>
                     )}
                     
                     {ocStep === 'QUESTIONS' && (
                       <div className="space-y-4">
                          <div className="bg-ocean-800/20 p-3 rounded text-left border border-ocean-700/50">
                             <h4 className="text-ocean-100 text-sm font-bold flex items-center gap-2 mb-2">
                               <FileQuestion size={16} className="text-purple-300"/> 设定完善问卷
                             </h4>
                             <p className="text-xs text-ocean-400/80">请回答以下问题，帮助 AI 更好地理解你的角色。</p>
                          </div>
                          
                          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                            {ocQuestions.map((q, idx) => (
                              <div key={idx} className="space-y-1 text-left">
                                <label className="text-ocean-200 text-sm">{idx + 1}. {q}</label>
                                <input
                                  type="text"
                                  value={ocAnswers[idx] || ''}
                                  onChange={(e) => {
                                    const newAnswers = [...ocAnswers];
                                    newAnswers[idx] = e.target.value;
                                    setOcAnswers(newAnswers);
                                  }}
                                  className="w-full bg-ocean-900/60 border border-ocean-600/50 rounded px-3 py-2 text-white text-sm focus:border-ocean-400 focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-3 pt-2">
                            <Button onClick={() => setOcStep('CONCEPT')} variant="secondary" className="px-4">
                              <ArrowLeft size={20} />
                            </Button>
                            <Button onClick={handleGenerateOcImage} isLoading={loading} className="flex-1 text-lg group">
                              <span className="flex items-center justify-center gap-2">
                                生成形象 <Camera size={18} className="group-hover:scale-110 transition-transform" />
                              </span>
                            </Button>
                          </div>
                       </div>
                     )}

                     {ocStep === 'IMAGE_GEN' && (
                       <div className="space-y-6 text-center animate-in fade-in zoom-in duration-500">
                         <div className="relative mx-auto w-48 h-48 md:w-64 md:h-64 rounded-xl overflow-hidden border-2 border-ocean-400/50 shadow-[0_0_30px_rgba(96,165,250,0.3)] bg-ocean-900/50">
                           {ocImage ? (
                             <img src={ocImage} alt="OC Character" className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-ocean-400/50">
                               <User size={48} className="mb-2"/>
                             </div>
                           )}
                           <div className="absolute inset-0 border-4 border-ocean-900/20 rounded-xl pointer-events-none"></div>
                         </div>
                         
                         <div>
                            <h3 className="text-xl font-serif text-white">{characterName}</h3>
                            <p className="text-xs text-ocean-300 mt-1 max-w-xs mx-auto line-clamp-2">{ocConcept}</p>
                         </div>

                         <div className="flex gap-3 pt-2">
                            <Button 
                              onClick={handleRegenerateOcImage} 
                              variant="secondary" 
                              className="flex-1"
                              isLoading={isRegeneratingOc}
                              disabled={loading}
                            >
                              <RefreshCw size={18} className={`mr-2 ${isRegeneratingOc ? 'animate-spin' : ''}`} /> 重绘
                            </Button>
                            <Button onClick={handleConfirmOcAndStart} isLoading={loading} className="flex-1 group">
                              <span className="flex items-center justify-center gap-2">
                                确认并开始 <Crown size={18} className="text-yellow-300 group-hover:scale-110" />
                              </span>
                            </Button>
                          </div>
                       </div>
                     )}
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 pb-12">
        {storyNode && (
          <>
            <div className="flex items-center justify-center gap-2 text-ocean-400/60 text-sm font-serif tracking-widest uppercase mb-[-20px]">
               {ipName} • {characterName}
            </div>

            <div className="relative w-full aspect-square md:aspect-video rounded-xl overflow-hidden border border-ocean-400/30 bg-ocean-900/50 shadow-2xl flex items-center justify-center group">
              {sceneImage ? (
                <img 
                  src={sceneImage} 
                  alt="Scene visualization" 
                  className="w-full h-full object-cover animate-in fade-in duration-1000"
                />
              ) : (
                <div className="flex flex-col items-center text-ocean-400/50 animate-pulse">
                  <ImageIcon size={48} className="mb-2" />
                  <span className="text-sm font-serif">正在具象化现实...</span>
                </div>
              )}
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-ocean-900 via-transparent to-transparent opacity-60"></div>
              
              {/* Optional: Show OC portrait in corner if exists */}
              {ocImage && (
                <div className="absolute bottom-3 right-3 w-16 h-16 rounded-lg border border-ocean-400/50 overflow-hidden shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
                   <img src={ocImage} className="w-full h-full object-cover" alt="OC" />
                </div>
              )}
            </div>

            <NarrativeDisplay 
              text={storyNode.narrative} 
              onComplete={() => setShowChoices(true)} 
            />
            
            <div className={`transition-opacity duration-700 ${showChoices && !loading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {(status === GameStatus.PLAYING) && (
                 <div className="space-y-6 mt-6">
                   {/* Preset Choices */}
                   <div className="grid grid-cols-1 gap-3">
                     {storyNode.choices.map((choice) => (
                       <button
                         key={choice.id}
                         onClick={() => handleChoice(choice.text)}
                         className="group relative p-4 bg-ocean-800/40 border border-ocean-700 hover:bg-ocean-700/50 hover:border-ocean-400 rounded-lg text-left transition-all duration-300 overflow-hidden shadow-lg"
                       >
                         <div className="absolute inset-0 w-0 bg-white/5 transition-all duration-[250ms] ease-out group-hover:w-full"></div>
                         <div className="relative flex items-center justify-between">
                           <span className="font-serif text-lg text-ocean-100 group-hover:text-white">{choice.text}</span>
                           <Waves size={18} className="opacity-0 group-hover:opacity-100 transition-opacity text-ocean-400" />
                         </div>
                       </button>
                     ))}
                   </div>

                   {/* Divider */}
                   <div className="flex items-center gap-4 text-ocean-400/50">
                      <div className="h-px bg-ocean-400/20 flex-1"></div>
                      <span className="font-serif text-sm tracking-wider">或 自由行动</span>
                      <div className="h-px bg-ocean-400/20 flex-1"></div>
                   </div>

                   {/* Custom Input */}
                   <div className="flex gap-2">
                     <input
                       type="text"
                       value={customInput}
                       onChange={(e) => setCustomInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleCustomAction()}
                       placeholder="描述你想做的事情..."
                       className="flex-1 bg-ocean-900/50 border border-ocean-700 rounded-lg px-4 py-3 text-ocean-100 placeholder-ocean-500 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-all font-serif"
                       disabled={loading}
                     />
                     <button 
                       onClick={handleCustomAction}
                       disabled={!customInput.trim() || loading}
                       className="bg-ocean-700 hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 rounded-lg transition-colors flex items-center justify-center border border-ocean-600"
                     >
                       <Send size={20} />
                     </button>
                   </div>
                 </div>
              )}

              {status !== GameStatus.PLAYING && (
                <div className="text-center space-y-6 mt-8 p-6 bg-black/30 rounded-xl border border-ocean-500/30 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <h2 className={`text-3xl font-serif ${status === GameStatus.VICTORY ? 'text-yellow-300' : 'text-red-300'}`}>
                    {status === GameStatus.VICTORY ? "传奇的终章" : "命运的断点"}
                  </h2>
                  <p className="text-ocean-100 italic text-lg">
                    {status === GameStatus.VICTORY ? "你在这个世界留下了不朽的传说。" : "旅途虽然中断，但故事尚未结束。"}
                  </p>

                  {/* Character Analysis Section */}
                  {storyNode.characterAnalysis && (
                    <div className="mt-6 p-6 bg-ocean-900/60 border border-ocean-400/20 rounded-lg relative overflow-hidden group text-left md:text-center">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-50"></div>
                      <div className="flex flex-col items-center gap-3">
                         <div className="p-2 rounded-full bg-ocean-800/50 border border-ocean-400/30">
                           <ScrollText size={20} className="text-purple-300" />
                         </div>
                         <h3 className="font-serif text-xl text-purple-200">灵魂映像</h3>
                         <p className="text-ocean-100/90 leading-relaxed font-sans max-w-xl">
                           {storyNode.characterAnalysis}
                         </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button onClick={handleRestart} variant="secondary">
                      进入新的世界 (重新开始)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
        {loading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ocean-400"></div>
            <span className="ml-3 text-ocean-400 animate-pulse font-serif">
               {setupStep === 'SELECT_IP' && !storyNode ? "正在检索多元宇宙档案..." : "世界正在重构中..."}
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900 text-white overflow-x-hidden relative">
      {/* Background Particles/Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-ocean-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[40%] left-[60%] w-48 h-48 bg-teal-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        
        {/* Bubbles - kept for atmosphere, but less "underwater" specific contextually */}
        {[...Array(10)].map((_, i) => (
           <div 
             key={i}
             className="absolute rounded-full border border-white/10 bg-white/5"
             style={{
               width: Math.random() * 20 + 10 + 'px',
               height: Math.random() * 20 + 10 + 'px',
               left: Math.random() * 100 + '%',
               top: Math.random() * 100 + '%',
               animation: `float ${Math.random() * 10 + 10}s linear infinite`,
               opacity: Math.random() * 0.5
             }}
           />
        ))}
      </div>

      <header className="relative z-10 w-full p-6 flex justify-between items-center backdrop-blur-sm bg-ocean-900/50 border-b border-ocean-800/50 sticky top-0">
        <div className="flex items-center gap-2 text-ocean-100 cursor-pointer" onClick={() => status === GameStatus.IDLE ? null : window.location.reload()}>
          <Anchor size={24} />
          <span className="font-serif font-bold tracking-wider hidden sm:inline">万界传说</span>
        </div>
        <div className="flex items-center gap-2">
           <Sparkles size={20} className="text-yellow-300 animate-pulse" />
           <span className="text-xs uppercase tracking-widest text-ocean-400">Gemini Infinite RPG</span>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 min-h-[calc(100vh-80px)] flex flex-col">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;