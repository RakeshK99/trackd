// Global activity feed: every status change / recruiter email / ghost flag
// across all of the user's applications, with an unread badge tracked via a
// "last seen" timestamp persisted in AsyncStorage.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { TimelineEvent } from './types';

const LAST_SEEN_KEY = 'trackd.activity.lastSeen';

export interface ActivityItem extends TimelineEvent {
  company: string | null;
  role: string | null;
}

interface Ctx {
  items: ActivityItem[];
  unread: number;
  markAllSeen: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ActivityCtx = createContext<Ctx | undefined>(undefined);

export function ActivityProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: ReactNode;
}) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [lastSeen, setLastSeen] = useState<string>('1970-01-01T00:00:00Z');

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('timeline_events')
      .select('*, applications(company, role)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    const mapped: ActivityItem[] = (data ?? []).map((row: any) => ({
      ...row,
      company: row.applications?.company ?? null,
      role: row.applications?.role ?? null,
    }));
    setItems(mapped);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(LAST_SEEN_KEY).then((v) => v && setLastSeen(v));
    fetchItems();

    const channel = supabase
      .channel(`timeline:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'timeline_events', filter: `user_id=eq.${userId}` },
        () => fetchItems(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchItems]);

  const markAllSeen = useCallback(async () => {
    const now = new Date().toISOString();
    setLastSeen(now);
    await AsyncStorage.setItem(LAST_SEEN_KEY, now);
  }, []);

  const unread = useMemo(
    () => items.filter((i) => i.created_at > lastSeen).length,
    [items, lastSeen],
  );

  const value = useMemo<Ctx>(
    () => ({ items, unread, markAllSeen, refresh: fetchItems }),
    [items, unread, markAllSeen, fetchItems],
  );

  return <ActivityCtx.Provider value={value}>{children}</ActivityCtx.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityCtx);
  if (!ctx) throw new Error('useActivity outside ActivityProvider');
  return ctx;
}

export function activityText(item: ActivityItem): { title: string; detail?: string } {
  const company = item.company ?? 'An application';
  switch (item.event_type) {
    case 'email_received':
      return {
        title: `${company} → ${labelize(item.new_status)}`,
        detail: item.email_subject ? `Recruiter email · ${item.email_subject}` : 'Recruiter email',
      };
    case 'status_change':
      return { title: `${company} moved to ${labelize(item.new_status)}`, detail: item.old_status ? `from ${labelize(item.old_status)}` : undefined };
    case 'ghost_flagged':
      return { title: `${company} went quiet`, detail: 'No response for 14+ days' };
    case 'note_added':
      return { title: `Note added to ${company}` };
    case 'created':
      return { title: `${company} added` };
    default:
      return { title: `${company} updated` };
  }
}

function labelize(s: string | null) {
  if (!s) return '—';
  return s.replace('_', ' ');
}
