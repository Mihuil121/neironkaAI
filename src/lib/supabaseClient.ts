import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fcaotgomdkvxuloostyd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYW90Z29tZGt2eHVsb29zdHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MDAxNjgsImV4cCI6MjA2NzM3NjE2OH0.C2aHMdKRlZRwxYMviAtgYHpYrZaBTyoqexfjybhL_Us";

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 