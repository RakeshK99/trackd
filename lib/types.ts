import type { AppStatus } from '@/theme/tokens';

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  status: AppStatus;
  salary_range: string | null;
  job_url: string | null;
  notes: string | null;
  last_activity: string;
  applied_date: string | null;
  archived: boolean;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  application_id: string;
  user_id: string;
  event_type:
    | 'status_change'
    | 'email_received'
    | 'note_added'
    | 'manual_edit'
    | 'ghost_flagged'
    | 'created';
  old_status: AppStatus | null;
  new_status: AppStatus | null;
  email_subject: string | null;
  email_from: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface TrackdUser {
  id: string;
  email: string;
  display_name: string | null;
  trackd_email: string | null;
  plan: 'free' | 'pro';
  active_app_count: number;
  onboarded: boolean;
  agentmail_inbox_id: string | null;
}
