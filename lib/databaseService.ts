import { createClient } from './supabase/supabaseServer';
import { supabaseAdmin } from './supabase/supabaseAdmin';
import type { IpValidationResult } from './types';

export class DatabaseService {
  /**
   * 查找IP信息
   * @param ipName IP名称
   * @returns IP信息
   */
  public async findIpInfo(ipName: string) {
    const { data, error } = await supabaseAdmin
      .from('ip_infos')
      .select('*')
      .eq('ip_name', ipName)
      .limit(1);

    if (error) {
      console.error('查找IP信息失败:', error);
      return null;
    }
    
    console.log('查找结果:', data);
    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * 保存IP信息
   * @param ipName IP名称
   * @param ipInfo IP信息
   * @returns 保存结果
   */
  public async saveIpInfo(ipName: string, ipInfo: IpValidationResult) {
    const { data, error } = await supabaseAdmin
      .from('ip_infos')
      .upsert({
        ip_name: ipName,
        author: ipInfo.author,
        language: ipInfo.originalLanguage,
        description: ipInfo.abstract,
        type: ipInfo.category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('保存IP信息失败:', error);
      return null;
    }

    return data;
  }

  /**
   * 更新OC问卷
   * @param ipName IP名称
   * @param questionnaire OC问卷
   * @returns 更新结果
   */
  public async updateOcQuestionnaire(ipName: string, questionnaire: string[]) {
    const { data, error } = await supabaseAdmin
      .from('ip_infos')
      .update({
        oc_questionnaire: questionnaire,
        updated_at: new Date().toISOString()
      })
      .eq('ip_name', ipName)
      .select()
      .single();

    if (error) {
      console.error('更新OC问卷失败:', error);
      return null;
    }

    return data;
  }

  /**
   * 创建游戏记录
   * @param userId 用户ID
   * @param ipName IP名称
   * @param characterName 角色名称
   * @param isOc 是否为OC角色
   * @param ocProfile OC档案
   * @param isAnonymous 是否为匿名用户
   * @returns 游戏记录
   */
  public async createGameRecord(userId: string, ipName: string, characterName: string, isOc: boolean, ocProfile?: any, isAnonymous?: boolean) {
    // 如果是匿名用户，不存储游戏记录
    if (isAnonymous) {
      console.log('匿名用户游戏，不存储记录');
      return {
        id: Math.random().toString(36).substring(2, 15), // 生成临时ID
        user_id: userId,
        ip_name: ipName,
        character_name: characterName,
        is_oc: isOc,
        oc_profile: ocProfile,
        status: 0,
        is_anonymous: true
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_game_records')
      .insert({
        user_id: userId,
        ip_name: ipName,
        character_name: characterName,
        is_oc: isOc,
        oc_profile: ocProfile,
        status: 0 // 0: 任务进行中
      })
      .select()
      .single();

    if (error) {
      console.error('创建游戏记录失败:', error);
      return null;
    }

    return data;
  }

  /**
   * 更新游戏记录状态
   * @param recordId 记录ID
   * @param status 状态
   * @param characterSummary 角色总结
   * @returns 更新结果
   */
  public async updateGameRecordStatus(recordId: number, status: number, characterSummary?: string) {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (characterSummary) {
      updates.character_summary = characterSummary;
    }
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_game_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      console.error('更新游戏记录状态失败:', error);
      return null;
    }

    return data;
  }

  public async updateAllIncompleteGameRecords(userId: string, status: number) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('user_game_records')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 0);

    if (error) {
      console.error('更新未完成游戏记录状态失败:', error);
      return false;
    }

    return true;
  }

  /**
   * 创建游戏轮次记录（第一阶段：生成剧情和选项）
   * @param recordId 游戏记录ID
   * @param roundNumber 轮次编号
   * @param plot 情节
   * @param options 选项
   * @param isAnonymous 是否为匿名用户
   * @returns 轮次记录ID
   */
  public async createGameRound(recordId: number, roundNumber: number, plot: string, options: any, isAnonymous?: boolean): Promise<number | null> {
    // 如果是匿名用户，不存储轮次记录
    if (isAnonymous) {
      console.log('匿名用户游戏，不存储轮次记录');
      return Math.floor(Math.random() * 1000000); // 生成临时ID
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('game_round_records')
      .insert({
        user_game_record_id: recordId,
        round_number: roundNumber,
        plot,
        options,
        user_choice: null // 初始为空，用户选择后更新
      })
      .select('id')
      .single();

    if (error) {
      console.error('创建游戏轮次记录失败:', error);
      return null;
    }

    return data.id;
  }

  /**
   * 更新游戏轮次记录（第二阶段：用户选择）
   * @param roundId 轮次记录ID
   * @param userChoice 用户选择
   * @param isAnonymous 是否为匿名用户
   * @returns 更新结果
   */
  public async updateGameRoundChoice(roundId: number, userChoice: string, isAnonymous?: boolean): Promise<boolean> {
    // 如果是匿名用户，不更新数据库
    if (isAnonymous) {
      console.log('匿名用户游戏，不更新选择记录');
      return true;
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from('game_round_records')
      .update({
        user_choice: userChoice,
        updated_at: new Date().toISOString()
      })
      .eq('id', roundId);

    if (error) {
      console.error('更新游戏轮次选择失败:', error);
      return false;
    }

    return true;
  }

  /**
   * 获取用户游戏记录
   * @param userId 用户ID
   * @returns 游戏记录列表
   */
  public async getUserGameRecords(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_game_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取用户游戏记录失败:', error);
      return [];
    }

    return data;
  }

  /**
   * 获取游戏轮次记录
   * @param recordId 游戏记录ID
   * @returns 轮次记录列表
   */
  public async getGameRounds(recordId: number) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('game_round_records')
      .select('*')
      .eq('user_game_record_id', recordId)
      .order('round_number', { ascending: true });

    if (error) {
      console.error('获取游戏轮次记录失败:', error);
      return [];
    }

    return data;
  }

  /**
   * 根据ID获取游戏记录
   * @param gameRecordId 游戏记录ID
   * @returns 游戏记录
   */
  public async getGameRecordById(gameRecordId: number) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_game_records')
      .select('*')
      .eq('id', gameRecordId)
      .single();

    if (error) {
      console.error('获取游戏记录失败:', error);
      return null;
    }

    return data;
  }
}

// 导出单例实例
export const databaseService = new DatabaseService();
