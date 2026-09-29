/** Supabase database contract synchronized from the linked public schema on 2026-09-29. */
export type AdminRole = "superadmin" | "editor" | "viewer";
export type ContactSubmissionStatus = "new" | "in_progress" | "closed" | "spam";
export type ContentKind = "blog" | "news";
export type ContentStatus = "draft" | "published" | "archived";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      admin_users: {
        Row: { user_id: string; role: AdminRole; is_active: boolean; created_at: string; updated_at: string };
        Insert: { user_id: string; role?: AdminRole; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: { user_id?: string; role?: AdminRole; is_active?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      contact_submissions: {
        Row: { id: string; name: string; email: string; phone: string | null; message: string | null; status: ContactSubmissionStatus; source_path: string; idempotency_key: string; submitted_at: string; updated_at: string; assigned_to: string | null };
        Insert: { id?: string; name: string; email: string; phone?: string | null; message?: string | null; status?: ContactSubmissionStatus; source_path: string; idempotency_key: string; submitted_at?: string; updated_at?: string; assigned_to?: string | null };
        Update: { id?: string; name?: string; email?: string; phone?: string | null; message?: string | null; status?: ContactSubmissionStatus; source_path?: string; idempotency_key?: string; submitted_at?: string; updated_at?: string; assigned_to?: string | null };
        Relationships: [];
      };
      contact_notes: {
        Row: { id: string; submission_id: string; author_id: string; body: string; created_at: string; updated_at: string };
        Insert: { id?: string; submission_id: string; author_id: string; body: string; created_at?: string; updated_at?: string };
        Update: { id?: string; submission_id?: string; author_id?: string; body?: string; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "contact_notes_submission_id_fkey"; columns: ["submission_id"]; isOneToOne: false; referencedRelation: "contact_submissions"; referencedColumns: ["id"] }];
      };
      content_posts: {
        Row: { id: string; kind: ContentKind; slug: string; title: string; summary: string; body: string; cover_image_path: string | null; cover_alt: string | null; status: ContentStatus; published_at: string | null; author_id: string; approved_by: string | null; approved_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; kind: ContentKind; slug: string; title: string; summary: string; body: string; cover_image_path?: string | null; cover_alt?: string | null; status?: ContentStatus; published_at?: string | null; author_id: string; approved_by?: string | null; approved_at?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; kind?: ContentKind; slug?: string; title?: string; summary?: string; body?: string; cover_image_path?: string | null; cover_alt?: string | null; status?: ContentStatus; published_at?: string | null; author_id?: string; approved_by?: string | null; approved_at?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      admin_audit_log: {
        Row: { id: number; actor_id: string | null; action: string; resource_type: string; resource_id: string | null; metadata: Json; created_at: string };
        Insert: { id?: never; actor_id?: string | null; action: string; resource_type: string; resource_id?: string | null; metadata?: Json; created_at?: string };
        Update: { id?: never; actor_id?: string | null; action?: string; resource_type?: string; resource_id?: string | null; metadata?: Json; created_at?: string };
        Relationships: [];
      };
      analytics_daily: {
        Row: { event_date: string; path: string; page_views: number; updated_at: string };
        Insert: { event_date: string; path: string; page_views?: number; updated_at?: string };
        Update: { event_date?: string; path?: string; page_views?: number; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: { record_page_view: { Args: { p_path: string; p_event_date: string }; Returns: undefined } };
    Enums: { admin_role: AdminRole; contact_submission_status: ContactSubmissionStatus; content_kind: ContentKind; content_status: ContentStatus };
    CompositeTypes: Record<never, never>;
  };
};
