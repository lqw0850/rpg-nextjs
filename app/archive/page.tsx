"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, ChevronRight, User, ArrowLeft, Clock, ScrollText, CheckCircle2, Play } from 'lucide-react';
import { useSupabase } from '../../lib/supabase/supabaseProvider';
import { supabase } from '../../lib/supabase/supabaseClient';
import { GameStatus } from '../../types';
import { LoadingComponent } from '../../components/ui/LoadingComponent';
import { TribalBackground } from '../../components/TribalBackground';

interface ArchiveSession {
  id: string;
  ipName: string;
  characterName: string;
  date: string;
  status: GameStatus;
  turns: TurnRecord[];
  finalAnalysis?: string;
}

interface TurnRecord {
  turnNumber: number;
  narrative: string;
  choices: any[];
  selectedChoice: string;
}

export default function ArchivePage() {
  const { user, loading: authLoading } = useSupabase();
  const router = useRouter();
  
  const [archives, setArchives] = useState<ArchiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ArchiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [latestPlayingSession, setLatestPlayingSession] = useState<ArchiveSession | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    // 只有当用户存在且数据未加载过时才查询数据
    if (user && !dataFetched && !loading) {
      fetchGameRecords();
    }
  }, [user, authLoading, router, dataFetched, loading]);

  const fetchGameRecords = async () => {
    if (!user || dataFetched || loading) return;
    
    setLoading(true);
    try {
      // 获取用户游戏记录
      const { data: gameRecords, error: recordsError } = await supabase
        .from('user_game_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (recordsError) {
        console.error('Failed to fetch game records:', recordsError);
        return;
      }

      if (!gameRecords || gameRecords.length === 0) {
        setArchives([]);
        setLoading(false);
        return;
      }

      // 为每个游戏记录获取对应的轮次记录
      const archiveSessions: ArchiveSession[] = [];
      
      for (const record of gameRecords) {
        const { data: rounds, error: roundsError } = await supabase
          .from('game_round_records')
          .select('*')
          .eq('user_game_record_id', record.id)
          .order('round_number', { ascending: true });

        if (roundsError) {
          console.error('Failed to fetch round records:', roundsError);
          continue;
        }

        // 转换数据格式
        const turns: TurnRecord[] = (rounds || []).map(round => ({
          turnNumber: round.round_number,
          narrative: round.plot,
          choices: round.options || [],
          selectedChoice: round.user_choice || 'Not selected'
        }));

        // 转换状态
        let status: GameStatus;
        switch (record.status) {
          case 0:
            status = GameStatus.PLAYING;
            break;
          case 1:
            status = GameStatus.VICTORY;
            break;
          case 2:
            status = GameStatus.GAME_OVER;
            break;
          default:
            status = GameStatus.GAME_OVER;
        }

        const archiveSession: ArchiveSession = {
          id: record.id.toString(),
          ipName: record.ip_name,
          characterName: record.character_name,
          date: new Date(record.created_at).toLocaleDateString('en-US'),
          status: status,
          turns: turns,
          finalAnalysis: record.character_summary
        };

        archiveSessions.push(archiveSession);
      }

      setArchives(archiveSessions);
      
      // 先取出最新一条记录，再判断是否为PLAYING状态
      const sortedSessions = archiveSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestSession = sortedSessions[0]; // 最新一条记录
      
      // 判断最新记录是否为PLAYING状态
      if (latestSession && latestSession.status === 'PLAYING') {
        setLatestPlayingSession(latestSession);
      } else {
        setLatestPlayingSession(null);
      }
      
      setDataFetched(true);
    } catch (error) {
      console.error('获取存档数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleContinueGame = async (session: ArchiveSession) => {
    try {
      // 调用继续游戏的API
      const response = await fetch('/api/continue-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          gameRecordId: parseInt(session.id),
          ipName: session.ipName,
          characterName: session.characterName
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // 存储sessionId到localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('gameSessionId', data.sessionId);
          // 存储继续游戏的状态标记
          localStorage.setItem('continueGame', 'true');
          // 存储游戏信息
          localStorage.setItem('currentIpName', session.ipName);
          localStorage.setItem('currentCharacterName', session.characterName);
          localStorage.setItem('currentGameRecordId', session.id);
        }
        
        // 跳转到游戏页面，并传递继续游戏的标记
        router.push('/?continue=true');
      } else {
        alert('Failed to continue game, please try again');
      }
    } catch (error) {
      console.error('Failed to continue game:', error);
      alert('Failed to continue game, please try again');
    }
  };

  if (loading) {
    return <LoadingComponent />;
  }

  if (selectedSession) {
    return (
      <div className="min-h-screen bg-[#EFEAD8] text-[#5D4037] p-6 relative">
        <TribalBackground />
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300 relative z-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[#EFEAD8]/90 backdrop-blur-md p-4 rounded-xl border border-[#D7CCC8] z-20 shadow-xl">
            <button onClick={() => setSelectedSession(null)} className="p-2 px-3 bg-[#EFEAD8] hover:bg-[#BCAAA4] rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-[#5D4037]" />
            </button>
            <div>
              <h2 className="text-xl font-serif flex items-center gap-2">
                {selectedSession.ipName} <span className="text-[#5D4037] text-sm">•</span> {selectedSession.characterName}
              </h2>
              <div className="flex items-center gap-3 text-xs text-[#8D6E63] mt-1">
                <span className="flex items-center gap-1"><Calendar size={12}/> {selectedSession.date}</span>
                <span className={`px-2 py-0.5 rounded-full border ${selectedSession.status === 'VICTORY' ? 'border-yellow-500/50 text-yellow-700 bg-yellow-100' : selectedSession.status === 'GAME_OVER' ? 'border-red-500/50 text-red-700 bg-red-100' : 'border-blue-500/50 text-blue-700 bg-blue-100'}`}>
                  {selectedSession.status === 'PLAYING' ? 'In Progress' : selectedSession.status}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-8 relative px-2 md:px-6 pb-12">
            {/* Vertical Line */}
            <div className="absolute left-6 md:left-10 top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#8D6E63]/50 via-[#A1887F]/30 to-transparent"></div>

            {selectedSession.turns.map((turn, idx) => (
              <div key={idx} className="relative pl-12 md:pl-16 group">
                {/* Turn Number Bubble */}
                <div className="absolute left-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#EFEAD8] border-2 border-[#8D6E63] flex items-center justify-center z-10 shadow-[0_0_15px_rgba(141,110,99,0.3)] text-[#5D4037] font-serif font-bold text-lg md:text-xl">
                  {turn.turnNumber}
                </div>

                {/* Content Card */}
                <div className="bg-[#fafaed] border border-[#D7CCC8] rounded-xl overflow-hidden hover:bg-[#FFFDE7] transition-colors">
                  {/* Narrative */}
                  <div className="p-5 md:p-6 text-[#5D4037]/90 font-story leading-relaxed whitespace-pre-wrap text-base md:text-lg">
                    {turn.narrative}
                  </div>
                  
                  {/* Choice Made */}
                  <div className="bg-[#EFEAD8] p-4 border-t border-[#D7CCC8] flex items-start gap-3">
                    <div className="mt-1 text-green-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <span className="text-xs text-[#8D6E63] font-serif uppercase tracking-wider block mb-1">Your Choice</span>
                      <p className="text-[#5D4037] font-story italic">"{turn.selectedChoice}"</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Final Analysis if exists */}
            {selectedSession.finalAnalysis && (
              <div className="relative pl-12 md:pl-16">
                <div className="absolute left-1 md:left-2 top-0">
                  <ScrollText size={32} className="text-purple-600 filter drop-shadow-[0_0_8px_rgba(142,68,173,0.3)]" />
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-[#F5F5DC] border border-purple-300 rounded-xl p-6 shadow-2xl">
                  <h3 className="font-serif text-lg text-purple-700 mb-3 flex items-center gap-2">
                    <ScrollText size={18}/> Soul Reflection (Ending Analysis)
                  </h3>
                  <p className="font-story text-[#5D4037] leading-relaxed italic">
                    {selectedSession.finalAnalysis}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFEAD8] text-[#5D4037] p-6 relative">
      <TribalBackground />
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#fafaed] rounded-lg border border-[#D7CCC8]">
              <Clock size={24} className="text-[#8D6E63]" />
            </div>
            <div>
              <h2 className="text-2xl font-serif">Time Archives</h2>
              <p className="text-[#8D6E63] text-sm">Recall the fate lines you've experienced</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {latestPlayingSession && (
              <button 
                onClick={() => handleContinueGame(latestPlayingSession)}
                className="flex items-center gap-2 bg-[#8D6E63] hover:bg-[#6D4C41] text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Play size={16} />
                Continue Game
              </button>
            )}
            <button onClick={handleBack} className="bg-[#D7CCC8] hover:bg-[#BCAAA4] text-[#5D4037] px-4 py-2 rounded-lg transition-colors">
              Back to Main Console
            </button>
          </div>
        </div>

        {archives.length === 0 ? (
          <div className="col-span-full py-16 text-center text-[#8D6E63]/50 border-2 border-dashed border-[#D7CCC8] rounded-xl">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50"/>
            <p className="font-serif">No Archive Records</p>
            <p className="text-sm mt-2">Go create new stories...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archives.map((session) => {
              const isLatestPlaying = latestPlayingSession && latestPlayingSession.id === session.id;
              
              return (
                <div key={session.id} className="relative">
                  <button
                    onClick={() => setSelectedSession(session)}
                    className={`group w-full bg-[#fafaed] border hover:border-[#8D6E63] p-5 rounded-xl text-left transition-all duration-300 shadow-lg relative overflow-hidden border-[#D7CCC8]`
                    }>
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <BookOpen size={64} />
                    </div>

                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-serif font-bold group-hover:text-[#5D4037] transition-colors">
                          {session.ipName}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider ${
                          session.status === 'VICTORY' ? 'border-yellow-500/30 text-yellow-700' : 
                          session.status === 'GAME_OVER' ? 'border-red-500/30 text-red-700' : 'border-blue-500/30 text-blue-700'
                        }`}>
                          {session.status === 'PLAYING' ? 'In Progress' : session.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[#8D6E63] text-sm">
                        <User size={14} />
                        <span>{session.characterName}</span>
                      </div>

                      <div className="pt-2 border-t border-[#D7CCC8] flex justify-between items-center text-xs text-[#8D6E63]">
                        <span>{session.date}</span>
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-[#8D6E63] group-hover:text-[#5D4037]">
                          View Record ({session.turns.length} turns) <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}