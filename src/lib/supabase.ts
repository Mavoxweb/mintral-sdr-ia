import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zearisdzdqbhljlxixbh.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplYXJpc2R6ZHFiaGxqbHhpeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTI4MzMsImV4cCI6MjA5NzEyODgzM30.ki3IHOALSwG-Afua2nKgkNejWZxCNioFFvgXF5UYeW4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
