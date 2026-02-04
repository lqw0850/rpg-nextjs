"use client"

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, ChevronRight, User, ArrowLeft, Clock, ScrollText, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { useSupabase } from '../../lib/supabase/supabaseProvider';
import { supabase } from '../../lib/supabase/supabaseClient';
import { GameStatus } from '../../types';

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
        console.error('获取游戏记录失败:', recordsError);
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
          console.error('获取轮次记录失败:', roundsError);
          continue;
        }

        // 转换数据格式
        const turns: TurnRecord[] = (rounds || []).map(round => ({
          turnNumber: round.round_number,
          narrative: round.plot,
          choices: round.options || [],
          selectedChoice: round.user_choice || '未选择'
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
          date: new Date(record.created_at).toLocaleDateString('zh-CN'),
          status: status,
          turns: turns,
          finalAnalysis: record.character_summary
        };

        archiveSessions.push(archiveSession);
      }

      setArchives(archiveSessions);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ocean-400 mx-auto mb-4"></div>
          <p className="text-ocean-300 font-serif">正在加载时空档案...</p>
        </div>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900 text-white p-6">
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 sticky top-0 bg-ocean-900/90 backdrop-blur-md p-4 rounded-xl border border-ocean-700/50 z-20 shadow-xl">
            <Button onClick={() => setSelectedSession(null)} variant="secondary" className="p-2 px-3">
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h2 className="text-xl font-serif text-white flex items-center gap-2">
                {selectedSession.ipName} <span className="text-ocean-400 text-sm">•</span> {selectedSession.characterName}
              </h2>
              <div className="flex items-center gap-3 text-xs text-ocean-300 mt-1">
                <span className="flex items-center gap-1"><Calendar size={12}/> {selectedSession.date}</span>
                <span className={`px-2 py-0.5 rounded-full border ${selectedSession.status === 'VICTORY' ? 'border-yellow-500/50 text-yellow-200 bg-yellow-900/20' : selectedSession.status === 'GAME_OVER' ? 'border-red-500/50 text-red-200 bg-red-900/20' : 'border-blue-500/50 text-blue-200 bg-blue-900/20'}`}>
                  {selectedSession.status === 'PLAYING' ? '未完结' : selectedSession.status}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-8 relative px-2 md:px-6 pb-12">
            {/* Vertical Line */}
            <div className="absolute left-6 md:left-10 top-4 bottom-4 w-0.5 bg-gradient-to-b from-ocean-400/50 via-ocean-600/30 to-transparent"></div>

            {selectedSession.turns.map((turn, idx) => (
              <div key={idx} className="relative pl-12 md:pl-16 group">
                {/* Turn Number Bubble */}
                <div className="absolute left-0 top-0 w-12 h-12 md:w-14 md:h-14 rounded-full bg-ocean-900 border-2 border-ocean-500 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(96,165,250,0.3)] text-ocean-100 font-serif font-bold text-lg md:text-xl">
                  {turn.turnNumber}
                </div>

                {/* Content Card */}
                <div className="bg-ocean-800/30 border border-ocean-600/30 rounded-xl overflow-hidden hover:bg-ocean-800/50 transition-colors">
                  {/* Narrative */}
                  <div className="p-5 md:p-6 text-ocean-100/90 font-story leading-relaxed whitespace-pre-wrap text-base md:text-lg">
                    {turn.narrative}
                  </div>
                  
                  {/* Choice Made */}
                  <div className="bg-ocean-900/50 p-4 border-t border-ocean-700/50 flex items-start gap-3">
                    <div className="mt-1 text-green-400">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <span className="text-xs text-ocean-400 font-serif uppercase tracking-wider block mb-1">你的抉择</span>
                      <p className="text-white font-story italic">"{turn.selectedChoice}"</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Final Analysis if exists */}
            {selectedSession.finalAnalysis && (
              <div className="relative pl-12 md:pl-16">
                <div className="absolute left-1 md:left-2 top-0">
                  <ScrollText size={32} className="text-purple-300 filter drop-shadow-[0_0_8px_rgba(216,180,254,0.6)]" />
                </div>
                <div className="bg-gradient-to-br from-purple-900/30 to-ocean-900/50 border border-purple-500/30 rounded-xl p-6 shadow-2xl">
                  <h3 className="font-serif text-lg text-purple-200 mb-3 flex items-center gap-2">
                    <ScrollText size={18}/> 灵魂映像 (Ending Analysis)
                  </h3>
                  <p className="font-story text-ocean-100 leading-relaxed italic">
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
    <div className="min-h-screen bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-900 text-white p-6">
      <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-ocean-800/50 rounded-lg border border-ocean-600/50">
              <Clock size={24} className="text-ocean-200" />
            </div>
            <div>
              <h2 className="text-2xl font-serif text-white">时空档案</h2>
              <p className="text-ocean-300 text-sm">回顾你所经历的命运线</p>
            </div>
          </div>
          <Button onClick={handleBack} variant="secondary">
            返回主控台
          </Button>
        </div>

        {archives.length === 0 ? (
          <div className="col-span-full py-16 text-center text-ocean-400/50 border-2 border-dashed border-ocean-800 rounded-xl">
            <BookOpen size={48} className="mx-auto mb-4 opacity-50"/>
            <p className="font-serif">暂无存档记录</p>
            <p className="text-sm mt-2">去创造新的故事吧...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archives.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="group bg-ocean-900/40 border border-ocean-700/50 hover:border-ocean-400 hover:bg-ocean-800/40 p-5 rounded-xl text-left transition-all duration-300 shadow-lg relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BookOpen size={64} />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-serif font-bold text-white group-hover:text-ocean-100 transition-colors">
                      {session.ipName}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider ${
                      session.status === 'VICTORY' ? 'border-yellow-500/30 text-yellow-200' : 
                      session.status === 'GAME_OVER' ? 'border-red-500/30 text-red-200' : 'border-blue-500/30 text-blue-200'
                    }`}>
                      {session.status === 'PLAYING' ? '未完结' : session.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-ocean-200 text-sm">
                    <User size={14} />
                    <span>{session.characterName}</span>
                  </div>

                  <div className="pt-2 border-t border-ocean-700/30 flex justify-between items-center text-xs text-ocean-400">
                    <span>{session.date}</span>
                    <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-ocean-300 group-hover:text-white">
                      查看记录 ({session.turns.length} 轮) <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}