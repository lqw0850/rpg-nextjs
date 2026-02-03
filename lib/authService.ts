import { supabase } from './supabase/supabaseClient';

export class AuthService {
  /**
   * 邮箱登录
   * @param email 邮箱地址
   * @param password 密码
   * @returns 登录结果
   */
  public async loginWithEmail(email: string, password: string) {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  /**
   * 邮箱注册
   * @param email 邮箱地址
   * @param password 密码
   * @returns 注册结果
   */
  public async signUpWithEmail(email: string, password: string) {
    return await supabase.auth.signUp({
      email,
      password
    });
  }

  /**
   * 退出登录
   * @returns 退出结果
   */
  public async logout() {
    return await supabase.auth.signOut();
  }

  /**
   * 获取当前用户
   * @returns 当前用户信息
   */
  public getCurrentUser() {
    return supabase.auth.getUser();
  }

  /**
   * 监听用户认证状态变化
   * @param callback 状态变化回调
   * @returns 取消监听函数
   */
  public onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

// 导出单例实例
export const authService = new AuthService();
