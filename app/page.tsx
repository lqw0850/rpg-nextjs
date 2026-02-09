"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { GameStatus, type StoryNode, type Choice } from '../types';
import { useSupabase } from '../lib/supabase/supabaseProvider';
import { supabase } from '../lib/supabase/supabaseClient';
import { useRouter } from 'next/navigation';
import { getArtStyleById, DEFAULT_ART_STYLE, getArtStyleByCategory, type ArtStyle } from '../lib/artStyles';
import { useIndexedDBSession, useIndexedDBCleanup } from '../hooks/useIndexedDBSession';
import { IpSelectionPage } from '../components/game/IpSelectionPage';
import { StoryDetailsPage } from '../components/game/StoryDetailsPage';
import { RoleSelectionPage } from '../components/game/RoleSelectionPage';
import { OcQuestionnairePage } from '../components/game/OcQuestionnairePage';
import { CharacterImagePage } from '../components/game/CharacterImagePage';
import { PlotNodeSelectionPage } from '../components/game/PlotNodeSelectionPage';
import { GameMainPage } from '../components/game/GameMainPage';
import { EndingSummaryPage } from '../components/game/EndingSummaryPage';
import { LoadingComponent } from '../components/ui/LoadingComponent';

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
  const [redrawAttempts, setRedrawAttempts] = useState(0);
  const [showEndingSummary, setShowEndingSummary] = useState(false);
  const [isGeneratingPlotNodes, setIsGeneratingPlotNodes] = useState(false);
  const [isEnteringWorld, setIsEnteringWorld] = useState(false);
  const [isGeneratingNextChapter, setIsGeneratingNextChapter] = useState(false);

  const [plotNodes, setPlotNodes] = useState<string[]>([]);
  const [customStartNode, setCustomStartNode] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const { session: indexedDBSession, saveSession: saveToIndexedDB, updateChatHistory: updateIndexedDBChatHistory } = useIndexedDBSession(sessionId);
  useIndexedDBCleanup();

  useEffect(() => {
    if (!authLoading && user && typeof window !== 'undefined') {
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
        const currentGameRecordId = localStorage.getItem('currentGameRecordId') || '';
        
        setIpName(ipName);
        setCharacterName(characterName);
        setGameRecordId(parseInt(currentGameRecordId));
        
        loadGameState(parseInt(currentGameRecordId));
      }
    }
  }, [authLoading, user, router]);

  const loadGameState = async (currentGameRecordId: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/get-game-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameRecordId: currentGameRecordId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setStoryNode(data.storyNode);
        setChatHistory(data.chatHistory || []);
        setStatus(GameStatus.PLAYING);
        setShowChoices(true);
        
        if (data.gameRecord) {
          setIpName(data.gameRecord.ipName);
          setCharacterName(data.gameRecord.characterName);
          setFinalOcProfile(data.gameRecord.ocProfile || '');
          setSelectedArtStyle(getArtStyleById(data.gameRecord.artStyle) || DEFAULT_ART_STYLE);
          
          const newSessionId = crypto.randomUUID();
          setSessionId(newSessionId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('gameSessionId', newSessionId);
          }
          
          await saveToIndexedDB({
            id: newSessionId,
            gameRecordId: currentGameRecordId,
            ipName: data.gameRecord.ipName,
            charName: data.gameRecord.characterName,
            isOc: data.gameRecord.isOc,
            ocVisualDescription: data.gameRecord.ocProfile || '',
            artStyleId: data.gameRecord.artStyle,
            lastActivity: Date.now(),
            chatHistory: data.chatHistory || []
          });
        }
        
        setLoadingImage(true);
        try {
          const imageResponse = await fetch('/api/generate-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              ipName: data.gameRecord.ipName,
              narrative: data.storyNode.narrative,
              isOcPortrait: false,
              ocVisualDescription: data.gameRecord.ocProfile || '',
              artStyle: data.gameRecord.artStyle,
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
          localStorage.removeItem('currentGameRecordId');
        }
        setGameRecordId(null);
      }
    } catch (error) {
      console.error('加载游戏状态失败:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gameSessionId');
        localStorage.removeItem('currentGameRecordId');
      }
      setGameRecordId(null);
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
        setSelectedArtStyle(getArtStyleByCategory(result.category));
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
          finalOcProfile,
          artStyleId: selectedArtStyle.id,
        }),
      });
      const data = await response.json();
      const { sessionId: newSessionId, gameRecordId: newGameRecordId, chatHistory: newChatHistory, ...initialNode } = data;
      setSessionId(newSessionId);
      setGameRecordId(newGameRecordId);
      setChatHistory(newChatHistory);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('gameSessionId', newSessionId);
        localStorage.setItem('currentGameRecordId', newGameRecordId.toString());
      }
      
      await saveToIndexedDB({
        id: newSessionId,
        gameRecordId: newGameRecordId,
        ipName,
        charName: characterName,
        isOc: charMode === 'OC',
        ocVisualDescription: finalOcProfile || '',
        artStyleId: selectedArtStyle.id,
        lastActivity: Date.now(),
        chatHistory: newChatHistory
      });
      
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
            ipName,
            narrative: initialNode.narrative,
            isOcPortrait: false,
            ocVisualDescription: finalOcProfile || '',
            artStyle: selectedArtStyle.id,
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
      setLoading(false);
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
    
    setIsGeneratingPlotNodes(true);
    await handleGeneratePlotNodes();
    setIsGeneratingPlotNodes(false);
    setOcStep('CONCEPT')
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
    
    setIsEnteringWorld(true);
    await handleStartGame(startNode);
    setIsEnteringWorld(false);
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
          body: JSON.stringify({ ipName, characterName, appearance: result.appearance }),
        });
        const profile = await profileResponse.json();
        setFinalOcProfile(profile);
        
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            ipName,
            narrative: "Character portrait, facing camera, official artwork style.", 
            isOcPortrait: true,
            ocVisualDescription: profile || "",
            artStyle: selectedArtStyle.id,
          }),
        });
        
        if (imageResponse.ok) {
          const image = await imageResponse.json();
          if (image && typeof image === 'string' && image.startsWith('data:')) {
            setOcImage(image);
          }
        }
        
        setOcStep('IMAGE_GEN');
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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCharacterImage = async () => {
    setLoading(true);

    if (charMode === 'OC') {
      const requiredFields = ocQuestions.slice(0, 4).filter((q, idx) => 
        q.toLowerCase().includes('name') || 
        q.toLowerCase().includes('age') || 
        q.toLowerCase().includes('gender') || 
        q.toLowerCase().includes('appearance')
      );
      
      const missingFields = requiredFields.filter((q, idx) => {
        const originalIndex = ocQuestions.indexOf(q);
        return !ocAnswers[originalIndex] || ocAnswers[originalIndex].trim() === '';
      });
      
      if (missingFields.length > 0) {
        setLoading(false);
        alert('Please fill in all required fields (marked with *).');
        return;
      }
    }

    try {
      let visualPrompt = ocVisualDesc;
      let profile;
      
      if (charMode === 'OC') {
        profile = `
Name: ${characterName}
Details:
${ocQuestions
  .map((q, i) => ({ question: q, answer: ocAnswers[i] }))
  .filter(({ answer }) => answer && answer.trim())
  .map(({ question, answer }) => `${question}: ${answer}`)
  .join('\n')}
        `.trim();
        const visualPromptResponse = await fetch('/api/generate-oc-visual-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ profile }),
        });
        visualPrompt = await visualPromptResponse.json();
        setOcVisualDesc(visualPrompt);
        if(visualPrompt) {
          profile += `\n\nAppearance: ${visualPrompt}`;
        }
        setFinalOcProfile(profile);
        // console.log(profile)
      }

      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ipName,
          narrative: "Portrait shot, facing camera, character sheet style.", 
          isOcPortrait: true,
          ocVisualDescription: profile,
          artStyle: selectedArtStyle.id
        }),
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }
      
      const image = await imageResponse.json();
      // console.log('Generated image response:', image);
      
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        setOcImage(image);
      } else {
        console.warn('Invalid image response format:', image);
        setOcImage(null);
      }
      
      setOcStep('IMAGE_GEN');
    } catch (error) {
      console.error(error);
      alert("Character image generation failed, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateOcImage = async (newArtStyle?: string) => {
    if (redrawAttempts >= 2) {
      alert("You have reached the maximum number of redraw attempts (2).");
      return;
    }
    
    setIsRegeneratingOc(true);
    try {
      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ipName,
          narrative: "Portrait shot, facing camera, character sheet style.", 
          isOcPortrait: true,
          ocVisualDescription: finalOcProfile,
          artStyle: newArtStyle || selectedArtStyle.id
        }),
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }
      
      const image = await imageResponse.json();
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        setOcImage(image);
        setRedrawAttempts(prev => prev + 1);
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

  const handleRegenerateWithAdjustments = async (adjustments: string) => {
    if (redrawAttempts >= 2) {
      alert("You have reached the maximum number of redraw attempts (2).");
      return;
    }
    
    setIsRegeneratingOc(true);
    try {
      const newFinalOcProfile = `${finalOcProfile} ${adjustments}`;
      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ipName,
          narrative: `Portrait shot, facing camera, character sheet style.`, 
          isOcPortrait: true,
          ocVisualDescription: newFinalOcProfile,
          artStyle: selectedArtStyle.id
        }),
      });
      
      if (!imageResponse.ok) {
        throw new Error(`Image generation failed: ${imageResponse.status}`);
      }
      
      const image = await imageResponse.json();
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        setOcImage(image);
        setFinalOcProfile(newFinalOcProfile);
        setRedrawAttempts(prev => prev + 1);
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
    setChatHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gameSessionId');
      localStorage.removeItem('currentGameRecordId');
    }
  };

  const handleGoToSummary = () => {
    setShowEndingSummary(true);
  };

  const handleSelectChoice = async (choiceText: string) => {
    if (!choiceText.trim()) return;
    
    setShowChoices(false);
    setIsGeneratingNextChapter(true);
    try {
      const response = await fetch('/api/make-choice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          gameRecordId, 
          choiceText, 
          chatHistory,
          ipName,
          charName: characterName,
          isOc: charMode === 'OC',
          ocProfile: finalOcProfile,
          artStyleId: selectedArtStyle.id
        }),
      });
      const data = await response.json();
      setStoryNode(data);
      setCustomInput('');
      setShowChoices(false);
      
      if (data.status === 'GAME_OVER') {
        setStatus(GameStatus.GAME_OVER);
      } else if (data.status === 'VICTORY') {
        setStatus(GameStatus.VICTORY);
      }
      
      await updateIndexedDBChatHistory(choiceText, data);
      
      const newChatHistory = [...chatHistory];
      newChatHistory.push({
        role: 'user',
        parts: [{ text: `Player makes a choice: ${choiceText}` }]
      });
      newChatHistory.push({
        role: 'model',
        parts: [{ text: JSON.stringify({
          narration: data.narrative,
          options: data.choices,
          status: data.status,
          characterAnalysis: data.characterAnalysis || ''
        }) }]
      });
      setChatHistory(newChatHistory);
      
      setLoadingImage(true);
      try {
        // console.log('generate-image', selectedArtStyle.id);
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            ipName,
            narrative: data.narrative,
            isOcPortrait: false,
            ocVisualDescription: finalOcProfile || '',
            artStyle: selectedArtStyle.id,
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
    } finally {
      setIsGeneratingNextChapter(false);
    }
  };

  const handleGeneratePlotNodes = async () => {
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
                className="absolute top-5 right-32 font-serif font-bold text-ink text-sm z-50 hover:opacity-70"
              >
                Records
              </button>
              <button 
                onClick={handleLogout}
                className="absolute top-5 right-8 font-serif font-bold text-ink text-sm z-50 hover:opacity-70"
              >
                Log Out
              </button>
            </>
          ) : (
            <button 
              onClick={() => router.push('/login')}
              className="absolute top-5 right-8 font-serif font-bold text-ink text-sm z-50 hover:opacity-70"
            >
              Log In
            </button>
          )}

          {setupStep === 'SELECT_IP' && (
            loading ? (
              <LoadingComponent />
            ) : (
              <IpSelectionPage
                ipName={ipName}
                onIpNameChange={setIpName}
                onVerifyIp={handleVerifyIp}
                loading={loading}
              />
            )
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
              loading={loading}
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

          {isGeneratingPlotNodes || isEnteringWorld ? (
            <LoadingComponent />
          ) : ocStep === 'IMAGE_GEN' ? (
            <CharacterImagePage
              characterName={characterName}
              ocImage={ocImage}
              loading={loading}
              isRegeneratingOc={isRegeneratingOc}
              selectedArtStyle={selectedArtStyle}
              showArtStyles={showArtStyles}
              redrawAttempts={redrawAttempts}
              onRegenerateImage={handleRegenerateOcImage}
              onRegenerateWithAdjustments={handleRegenerateWithAdjustments}
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
      
      if (isGeneratingNextChapter) {
        return <LoadingComponent />;
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
          onCustomInputSubmit={() => handleSelectChoice(customInput)}
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
    plotNodes, customStartNode, selectedNodeId, isGeneratingPlotNodes, isEnteringWorld, 
    isGeneratingNextChapter, showEndingSummary
  ]);

  return (
    <div className="relative w-full min-h-screen bg-[#EFEAD8] overflow-hidden">
      {/* <TribalBackground /> */}
      <div className="relative z-10 w-full min-h-screen">
        {renderContent()}
      </div>
    </div>
  );
}
