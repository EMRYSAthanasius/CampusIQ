import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function useHeartbeat(materialId: string | undefined, intervalSeconds: number = 60) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!materialId) return;

    const ping = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (user && !authError) {
          // Fix: The column in the database is 'seconds_spent', not 'total_seconds_spent'
          const { data: progress } = await supabase
            .from('user_progress')
            .select('seconds_spent')
            .eq('user_id', user.id)
            .eq('material_id', materialId)
            .single();

          const currentSeconds = progress?.seconds_spent || 0;
          const newSeconds = currentSeconds + intervalSeconds;

          const { error } = await supabase
            .from('user_progress')
            .upsert({ 
              user_id: user.id, 
              material_id: materialId, 
              seconds_spent: newSeconds,
              last_accessed_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,material_id'
            });
            
          if (error) {
            console.error('Heartbeat sync failed:', error);
          }
        }
      }
    };

    timerRef.current = setInterval(ping, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [materialId, supabase, intervalSeconds]);
}
