import { createClient } from '@supabase/supabase-js';

// 管理员身份工厂：用于执行需要管理员权限的操作
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 创建Supabase服务端客户端实例（使用服务密钥，可绕过RLS）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
