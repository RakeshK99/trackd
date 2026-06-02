// Single owner for applications state: one fetch, one realtime subscription,
// many consumers via React context. Solves duplicate-channel crashes when
// multiple screens mount the hook and gives every screen O(1) updates.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import type { Application } from './types';
import type { AppStatus } from '@/theme/tokens';

interface Ctx {
  apps: Application[];
  loading: boolean;
  /** Merge a row into local state without a refetch (optimistic / post-insert). */
  upsertLocal: (row: Application) => void;
  /** Remove a row from local state immediately (optimistic delete). */
  removeLocal: (id: string) => void;
}

const ApplicationsCtx = createContext<Ctx | undefined>(undefined);

export function ApplicationsProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: ReactNode;
}) {
  const [byId, setById] = useState<Record<string, Application>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setById({});
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);

    supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('last_activity', { ascending: false })
      .then(({ data }) => {
        if (!mounted) return;
        const map: Record<string, Application> = {};
        for (const a of (data ?? []) as Application[]) map[a.id] = a;
        setById(map);
        setLoading(false);
      });

    const channel = supabase
      .channel(`applications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setById((prev) => {
            const next = { ...prev };
            if (payload.eventType === 'DELETE') {
              delete next[(payload.old as Application).id];
            } else {
              const row = payload.new as Application;
              if (row.archived) delete next[row.id];
              else next[row.id] = row;
            }
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const apps = useMemo(
    () => Object.values(byId).sort((a, b) => b.last_activity.localeCompare(a.last_activity)),
    [byId],
  );

  const value = useMemo<Ctx>(
    () => ({
      apps,
      loading,
      upsertLocal: (row) => setById((prev) => ({ ...prev, [row.id]: row })),
      removeLocal: (id) =>
        setById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        }),
    }),
    [apps, loading],
  );

  return <ApplicationsCtx.Provider value={value}>{children}</ApplicationsCtx.Provider>;
}

export function useApplications(): Ctx {
  const ctx = useContext(ApplicationsCtx);
  if (!ctx) throw new Error('useApplications outside ApplicationsProvider');
  return ctx;
}

// =====================================================================
// Mutations
// =====================================================================
export async function createApplication(input: {
  user_id: string;
  company: string;
  role: string;
  status: AppStatus;
  salary_range?: string | null;
  applied_date?: string | null;
  job_url?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      user_id: input.user_id,
      company: input.company.trim(),
      role: input.role.trim(),
      status: input.status,
      salary_range: input.salary_range ?? null,
      applied_date: input.applied_date ?? null,
      job_url: input.job_url ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  return { data: data as Application | null, error };
}

export async function updateApplication(id: string, patch: Partial<Application>) {
  const { data, error } = await supabase
    .from('applications')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return { data: data as Application | null, error };
}

export async function archiveApplication(id: string) {
  return supabase.from('applications').update({ archived: true }).eq('id', id);
}

export async function deleteApplication(id: string) {
  return supabase.from('applications').delete().eq('id', id);
}
