"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { GameStatus, type StoryNode, type Choice } from '../types';
import { TribalBackground } from '../components/TribalBackground';
import { useSupabase } from '../lib/supabase/supabaseProvider';
import { supabase } from '../lib/supabase/supabaseClient';
import { useRouter } from 'next/navigation';
import { ART_STYLES, DEFAULT_ART_STYLE, type ArtStyle } from '../lib/artStyles';
import { IpSelectionPage } from '../components/game/IpSelectionPage';
import { StoryDetailsPage } from '../components/game/StoryDetailsPage';
import { RoleSelectionPage } from '../components/game/RoleSelectionPage';
import { OcQuestionnairePage } from '../components/game/OcQuestionnairePage';
import { CharacterImagePage } from '../components/game/CharacterImagePage';
import { PlotNodeSelectionPage } from '../components/game/PlotNodeSelectionPage';
import { GameMainPage } from '../components/game/GameMainPage';
import { EndingSummaryPage } from '../components/game/EndingSummaryPage';

type SetupStep = 'SELECT_IP' | 'STORY_DETAILS' | 'ROLE_SELECTION' | 'SELECT_START_NODE' | 'OC_QUESTIONS';
type CharacterMode = 'CANON' | 'OC';
type OcStep = 'CONCEPT' | 'QUESTIONS' | 'IMAGE_GEN';

export default function Home() {
  const { user, loading: authLoading } = useSupabase();
  const router = useRouter();
  
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [storyNode, setStoryNode] = useState<StoryNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [sessionId, setSessionId] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('gameSessionId') || '' : '';
  });
  const [gameRecordId, setGameRecordId] = useState<number | null>(null);
  
  const [setupStep, setSetupStep] = useState<SetupStep>('SELECT_IP');
  const [ipName, setIpName] = useState('');
  const [ipSummary, setIpSummary] = useState('');
  const [ipAuthor, setIpAuthor] = useState('');
  const [ipCategory, setIpCategory] = useState('');
  const [ipOriginLang, setIpOriginLang] = useState('');
  
  const [charMode, setCharMode] = useState<CharacterMode>('CANON');
  const [characterName, setCharacterName] = useState('');
  const [canonCharacterName, setCanonCharacterName] = useState('');
  const [ocCharacterName, setOcCharacterName] = useState('');
  const [canonValidationMsg, setCanonValidationMsg] = useState('');
  
  const [ocStep, setOcStep] = useState<OcStep>('CONCEPT');
  const [ocQuestions, setOcQuestions] = useState<string[]>([]);
  const [ocAnswers, setOcAnswers] = useState<string[]>([]);
  const [ocImage, setOcImage] = useState<string | null>(null);
  const [ocVisualDesc, setOcVisualDesc] = useState('');
  const [isRegeneratingOc, setIsRegeneratingOc] = useState(false);
  const [finalOcProfile, setFinalOcProfile] = useState<string>('');
  const [selectedArtStyle, setSelectedArtStyle] = useState<ArtStyle>(DEFAULT_ART_STYLE);
  const [showArtStyles, setShowArtStyles] = useState(false);
  const [showEndingSummary, setShowEndingSummary] = useState(false);

  const [plotNodes, setPlotNodes] = useState<string[]>([]);
  const [customStartNode, setCustomStartNode] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && user && sessionId && typeof window !== 'undefined') {
      const continueGame = localStorage.getItem('continueGame');
      const searchParams = new URLSearchParams(window.location.search);
      
      if (continueGame === 'true' || searchParams.get('continue') === 'true') {
        localStorage.removeItem('continueGame');
        localStorage.removeItem('currentIpName');
        localStorage.removeItem('currentCharacterName');
        
        if (searchParams.get('continue') === 'true') {
          searchParams.delete('continue');
          const newUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '');
          window.history.replaceState({}, '', newUrl);
        }
        
        const ipName = localStorage.getItem('currentIpName') || '';
        const characterName = localStorage.getItem('currentCharacterName') || '';
        
        setIpName(ipName);
        setCharacterName(characterName);
        
        loadGameState();
      }
    }
  }, [authLoading, user, sessionId, router]);

  const loadGameState = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/get-game-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setStoryNode(data.storyNode);
        setStatus(GameStatus.PLAYING);
        setShowChoices(true);
        
        setLoadingImage(true);
        try {
          const imageResponse = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              sessionId,
              narrative: data.storyNode.narrative,
              isOcPortrait: false,
            }),
          });
          
          if (imageResponse.ok) {
            const image = await imageResponse.json();
            if (image && typeof image === 'string' && image.startsWith('data:')) {
              setSceneImage(image);
            }
          }
        } catch (imageError) {
          console.error("Error generating scene image:", imageError);
        } finally {
          setLoadingImage(false);
        }
      } else {
        console.error('加载游戏状态失败');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('gameSessionId');
        }
        setSessionId('');
      }
    } catch (error) {
      console.error('加载游戏状态失败:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gameSessionId');
      }
      setSessionId('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      handleRestart();
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const handleVerifyIp = async () => {
    if (!ipName.trim()) return;
    setLoading(true);
    setIpSummary('');
    setIpAuthor('');
    setIpCategory('');
    setIpOriginLang('');
    
    try {
      const response = await fetch('/api/validate-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ipName }),
      });
      const result = await response.json();
      if (result.isExist) {
        setIpSummary(result.abstract || "No summary available");
        setIpAuthor(result.author || "Unknown");
        setIpCategory(result.category || "Other");
        setIpOriginLang(result.originalLanguage || "");
        setSetupStep('STORY_DETAILS');
        setCharMode('CANON');
        setCharacterName('');
        setOcStep('CONCEPT');
        setOcQuestions([]);
        setOcImage(null);
        setOcVisualDesc('');
        setFinalOcProfile('');
        setPlotNodes([]);
        setCustomStartNode('');
      } else {
        alert(`Cannot find the work "${ipName}" or it does not meet the inclusion criteria. Please try a more precise name.`);
      }
    } catch (error) {
      console.error("IP Validation failed", error);
      alert("Validation service is temporarily unavailable, please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async (startNode: string) => {
    if (!startNode.trim()) return;
    
    let currentUser = user;
    let isAnonymous = false;
    
    if (!currentUser) {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('匿名登录失败:', error);
          alert('Unable to create anonymous user, please try logging in');
          setLoading(false);
          return;
        }
        const { data: userData } = await supabase.auth.getUser();
        currentUser = userData.user;
        isAnonymous = true;
        console.log('匿名用户创建成功:', currentUser?.id);
      } catch (error) {
        console.error('匿名登录异常:', error);
        alert('Error creating anonymous user');
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setSceneImage(null);
    setCustomInput('');
    try {
      const response = await fetch('/api/start-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ipName, 
          characterName, 
          startNode, 
          isOc: charMode === 'OC',
          finalOcProfile
        }),
      });
      const data = await response.json();
      const { sessionId: newSessionId, gameRecordId: newGameRecordId, ...initialNode } = data;
      setSessionId(newSessionId);
      setGameRecordId(newGameRecordId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gameSessionId', newSessionId);
      }
      setStoryNode(initialNode);
      setStatus(GameStatus.PLAYING);
      setShowChoices(false);
      
      setLoadingImage(true);
      try {
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            sessionId: newSessionId,
            narrative: initialNode.narrative,
            isOcPortrait: false,
          }),
        });
        
        if (imageResponse.ok) {
          const image = await imageResponse.json();
          if (image && typeof image === 'string' && image.startsWith('data:')) {
            setSceneImage(image);
          }
        }
      } catch (imageError) {
        console.error("Error generating initial scene image:", imageError);
      } finally {
        setLoadingImage(false);
      }
    } catch (error) {
      console.error("Error starting game", error);
      alert("Unable to connect to the world hub (API error), please check your network connection.");
      setLoading(false);
    }
  };

  const handleConfirmCharacterImage = async () => {
    if (!ocImage) {
      alert('Please generate a character image first');
      return;
    }
    
    await handleGeneratePlotNodes();
    setSetupStep('SELECT_START_NODE');
  };

  const handleEnterWorldFromNodeSelection = async () => {
    let startNode = '';
    
    if (customStartNode.trim()) {
      startNode = customStartNode.trim();
      setSelectedNodeId(null);
    } else if (selectedNodeId !== null && plotNodes[selectedNodeId]) {
      startNode = plotNodes[selectedNodeId];
    }
    
    if (!startNode) {
      alert('Please select a starting point or enter your own');
      return;
    }
    
    await handleStartGame(startNode);
  };

  const handleVerifyAndStartCanon = async () => {
    if (!characterName.trim()) return;
    setLoading(true);
    setCanonValidationMsg('');
    try {
      const response = await fetch('/api/validate-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ipName, characterName }),
      });
      const result = await response.json();
      if (result.isExist) {
        if (result.appearance) {
          setOcVisualDesc(result.appearance);
        } else {
          setOcVisualDesc(""); 
        }
        
        const profileResponse = await fetch('/api/generate-canon-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ipName, characterName }),
        });
        const profile = await profileResponse.json();
        setFinalOcProfile(profile);
        
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            sessionId: 'canon-character-preview',
            narrative: "Character portrait, facing camera, official artwork style.", 
            isOcPortrait: false,
            ocVisualDescription: result.appearance || ""
          }),
        });
        
        if (imageResponse.ok) {
          const image = await imageResponse.json();
          if (image && typeof image === 'string' && image.startsWith('data:')) {
            setOcImage(image);
          }
        }
        
        await handleGeneratePlotNodes();
        setSetupStep('SELECT_START_NODE');
      } else {
        setCanonValidationMsg("This character does not seem to belong to this world. Please check the spelling or try creating an original character.");
      }
    } catch (error) {
       console.error(error);
       alert("Validation failed, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async (nameOverride?: string) => {
    const nameToUse = nameOverride || characterName;
    if (!nameToUse.trim()) {
      alert("Please enter a character name");
      return;
    }
    try {
      const response = await fetch('/api/generate-oc-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ipName, characterName: nameToUse, concept: '' }),
      });
      const questions = await response.json();
      setOcQuestions(questions);
      
      const initialAnswers = new Array(questions.length).fill('');
      questions.forEach((q: string, i: number) => {
        if (q.toLowerCase() === 'name') {
          initialAnswers[i] = nameToUse;
        }
      });
      setOcAnswers(initialAnswers);
      
      setOcStep('QUESTIONS');
      setSetupStep('OC_QUESTIONS');
    } catch (error) {
      console.error(error);
      alert("Failed to generate questions, please try again");
    }
  };

  const handleGenerateCharacterImage = async () => {
    setLoading(true);
    try {
      let visualPrompt = ocVisualDesc;
      
      if (charMode === 'OC') {
        const profile = `
Name: ${characterName}
Details:
${ocQuestions.map((q, i) => `${q}: ${ocAnswers[i] || 'Unknown'}`).join('\n')}
        `.trim();
        setFinalOcProfile(profile);
        console.log(profile)
        const visualPromptResponse = await fetch('/api/generate-oc-visual-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ profile }),
        });
        visualPrompt = await visualPromptResponse.json();
        setOcVisualDesc(visualPrompt);
      }

      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          narrative: "Portrait shot, facing camera, character sheet style.", 
          isOcPortrait: true,
          ocVisualDescription: visualPrompt,
          artStyle: selectedArtStyle.id
        }),
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }
      
      const image = await imageResponse.json();
      console.log('Generated image response:', image);
      
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        setOcImage(image);
      } else {
        console.warn('Invalid image response format:', image);
        setOcImage(null);
      }
      
      await handleGeneratePlotNodes();
      setOcStep('IMAGE_GEN');
      setSetupStep('SELECT_START_NODE');
    } catch (error) {
      console.error(error);
      alert("Character image generation failed, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateOcImage = async () => {
    setIsRegeneratingOc(true);
    try {
      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          narrative: "Portrait shot, facing camera, character sheet style.", 
          isOcPortrait: true,
          ocVisualDescription: ocVisualDesc,
          artStyle: selectedArtStyle.id
        }),
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }
      
      const image = await imageResponse.json();
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        setOcImage(image);
      } else {
        console.warn('Invalid image response format:', image);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to regenerate image, please try again");
    } finally {
      setIsRegeneratingOc(false);
    }
  };

  const handleRestart = () => {
    setStatus(GameStatus.IDLE);
    setStoryNode(null);
    setShowChoices(false);
    setSceneImage(null);
    setCustomInput('');
    setSetupStep('SELECT_IP');
    setIpName('');
    setIpSummary('');
    setIpAuthor('');
    setIpCategory('');
    setIpOriginLang('');
    setCharMode('CANON');
    setCharacterName('');
    setCanonCharacterName('');
    setOcCharacterName('');
    setCanonValidationMsg('');
    setOcStep('CONCEPT');
    setOcQuestions([]);
    setOcAnswers([]);
    setOcImage(null);
    setOcVisualDesc('');
    setFinalOcProfile('');
    setPlotNodes([]);
    setCustomStartNode('');
    setSelectedNodeId(null);
    setSelectedArtStyle(DEFAULT_ART_STYLE);
    setShowArtStyles(false);
    setShowEndingSummary(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gameSessionId');
    }
  };

  const handleGoToSummary = () => {
    setShowEndingSummary(true);
  };

  const handleSelectChoice = async (choice: Choice) => {
    setShowChoices(false);
    try {
      const response = await fetch('/api/make-choice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, choiceText: choice.text }),
      });
      const data = await response.json();
      setStoryNode(data);
      setShowChoices(false);
      
      setLoadingImage(true);
      try {
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            sessionId,
            narrative: data.narrative,
            isOcPortrait: false,
          }),
        });
        
        if (imageResponse.ok) {
          const image = await imageResponse.json();
          if (image && typeof image === 'string' && image.startsWith('data:')) {
            setSceneImage(image);
          }
        }
      } catch (imageError) {
        console.error("Error generating scene image:", imageError);
      } finally {
        setLoadingImage(false);
      }
    } catch (error) {
      console.error("Error making choice", error);
      alert("Failed to process your choice, please try again.");
      setShowChoices(true);
    }
  };

  const handleSubmitCustomInput = async () => {
    if (!customInput.trim()) return;
    setShowChoices(false);
    try {
      const response = await fetch('/api/make-choice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, choiceText: customInput }),
      });
      const data = await response.json();
      setStoryNode(data);
      setCustomInput('');
      setShowChoices(false);
      
      setLoadingImage(true);
      try {
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            sessionId,
            narrative: data.narrative,
            isOcPortrait: false,
          }),
        });
        
        if (imageResponse.ok) {
          const image = await imageResponse.json();
          if (image && typeof image === 'string' && image.startsWith('data:')) {
            setSceneImage(image);
          }
        }
      } catch (imageError) {
        console.error("Error generating scene image:", imageError);
      } finally {
        setLoadingImage(false);
      }
    } catch (error) {
      console.error("Error submitting custom input", error);
      alert("Failed to process your input, please try again.");
      setShowChoices(true);
    }
  };

  const handleGeneratePlotNodes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-plot-nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ipName, 
          characterName, 
          charMode, 
          ocProfile: finalOcProfile 
        }),
      });
      const nodes = await response.json();
      setPlotNodes(nodes);
      setCustomStartNode('');
      setSelectedNodeId(null);
    } catch (error) {
      console.error("Error generating plot nodes", error);
      alert("Failed to generate plot nodes, please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === GameStatus.PLAYING && storyNode) {
      const timer = setTimeout(() => {
        setShowChoices(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, storyNode]);

  const renderContent = useCallback(() => {
    if (status === GameStatus.IDLE) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full relative z-10 pb-10 overflow-hidden">
          {user ? (
            <>
              <button 
                onClick={() => router.push('/archive')}
                className="absolute top-6 right-24 font-serif font-bold text-ink text-sm z-50 hover:opacity-70"
              >
                Records
              </button>
              <button 
                onClick={handleLogout}
                className="absolute top-6 right-8 font-serif font-bold text-ink text-sm z-50 hover:opacity-70"
              >
                Log Out
              </button>
            </>
          ) : (
            <button 
              onClick={() => router.push('/login')}
              className="absolute top-6 right-8 font-serif font-bold text-ink text-sm z-50 hover:opacity-70"
            >
              Log In
            </button>
          )}

          {setupStep === 'SELECT_IP' && (
            <IpSelectionPage
              ipName={ipName}
              onIpNameChange={setIpName}
              onVerifyIp={handleVerifyIp}
              loading={loading}
            />
          )}

          {setupStep === 'STORY_DETAILS' && (
            <StoryDetailsPage
              ipName={ipName}
              ipSummary={ipSummary}
              ipAuthor={ipAuthor}
              ipCategory={ipCategory}
              ipOriginLang={ipOriginLang}
              onBack={() => setSetupStep('SELECT_IP')}
              onNext={() => setSetupStep('ROLE_SELECTION')}
            />
          )}

          {setupStep === 'ROLE_SELECTION' && ocStep !== 'IMAGE_GEN' && (
            <RoleSelectionPage
              canonCharacterName={canonCharacterName}
              ocCharacterName={ocCharacterName}
              canonValidationMsg={canonValidationMsg}
              onCanonCharacterNameChange={(value) => {
                setCanonCharacterName(value);
                setCharacterName(value);
              }}
              onOcCharacterNameChange={(value) => {
                setOcCharacterName(value);
                setCharacterName(value);
              }}
              onCanonSubmit={() => {
                setCharacterName(canonCharacterName);
                handleVerifyAndStartCanon();
              }}
              onOcSubmit={() => {
                setCharacterName(ocCharacterName);
                setCharMode('OC');
                handleGenerateQuestions(ocCharacterName);
              }}
              onBack={() => setSetupStep('STORY_DETAILS')}
            />
          )}

          {ocStep === 'IMAGE_GEN' ? (
            <CharacterImagePage
              characterName={characterName}
              ocImage={ocImage}
              loading={loading}
              isRegeneratingOc={isRegeneratingOc}
              selectedArtStyle={selectedArtStyle}
              showArtStyles={showArtStyles}
              onRegenerateImage={handleRegenerateOcImage}
              onSelectArtStyle={setSelectedArtStyle}
              onToggleArtStyles={() => setShowArtStyles(!showArtStyles)}
              onBack={() => setOcStep(charMode === 'OC' ? 'QUESTIONS' : 'CONCEPT')}
              onConfirm={handleConfirmCharacterImage}
            />
          ) : setupStep === 'SELECT_START_NODE' ? (
            <PlotNodeSelectionPage
              plotNodes={plotNodes}
              customStartNode={customStartNode}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onCustomInputChange={setCustomStartNode}
              onEnterWorld={handleEnterWorldFromNodeSelection}
            />
          ) : setupStep === 'OC_QUESTIONS' && (
            <OcQuestionnairePage
              ocQuestions={ocQuestions}
              ocAnswers={ocAnswers}
              loading={loading}
              onAnswerChange={(index, value) => {
                const newAnswers = [...ocAnswers];
                newAnswers[index] = value;
                setOcAnswers(newAnswers);
              }}
              onSubmit={handleGenerateCharacterImage}
              onBack={() => {
                setOcStep('CONCEPT');
                setSetupStep('ROLE_SELECTION');
              }}
            />
          )}
        </div>
      );
    }

    if (status === GameStatus.PLAYING || status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
      if (showEndingSummary) {
        return (
          <EndingSummaryPage
            storyNode={storyNode}
            sceneImage={sceneImage}
            onRestart={handleRestart}
          />
        );
      }
      return (
        <GameMainPage
          storyNode={storyNode}
          showChoices={showChoices}
          loading={loading}
          sceneImage={sceneImage}
          customInput={customInput}
          onCustomInputChange={setCustomInput}
          onChoiceSelect={handleSelectChoice}
          onCustomInputSubmit={handleSubmitCustomInput}
          onRestart={handleRestart}
          onGoToSummary={handleGoToSummary}
        />
      );
    }

    return null;
  }, [
    status, storyNode, showChoices, loading, sceneImage, customInput, setupStep, 
    ipName, ipSummary, ipAuthor, ipCategory, ipOriginLang, canonCharacterName, 
    ocCharacterName, canonValidationMsg, ocQuestions, ocAnswers, ocStep, ocImage, 
    isRegeneratingOc, selectedArtStyle, showArtStyles, user, router,
    plotNodes, customStartNode, selectedNodeId
  ]);

  return (
    <div className="relative w-full min-h-screen bg-[#F2EFE5] overflow-hidden">
      <TribalBackground />
      <div className="relative z-10 w-full min-h-screen">
        {renderContent()}
      </div>
    </div>
  );
}
