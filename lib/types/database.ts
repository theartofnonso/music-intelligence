// TypeScript types for database schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      songs: {
        Row: {
          id: string;
          title: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          created_at?: string;
        };
      };
      song_versions: {
        Row: {
          id: string;
          song_id: string;
          label: string;
          audio_url: string;
          duration_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          label: string;
          audio_url: string;
          duration_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          song_id?: string;
          label?: string;
          audio_url?: string;
          duration_ms?: number;
          created_at?: string;
        };
      };
      listening_sessions: {
        Row: {
          id: string;
          song_version_id: string;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          song_version_id: string;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          song_version_id?: string;
          started_at?: string;
          completed_at?: string | null;
        };
      };
      listening_events: {
        Row: {
          id: number;
          session_id: string;
          t_ms: number;
          wall_ts: string;
          kind: string;
          payload: Json | null;
          client_event_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          t_ms: number;
          wall_ts: string;
          kind: string;
          payload?: Json | null;
          client_event_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          t_ms?: number;
          wall_ts?: string;
          kind?: string;
          payload?: Json | null;
          client_event_id?: string | null;
          created_at?: string;
        };
      };
      timeline_stats: {
        Row: {
          song_version_id: string;
          bin_s: number;
          plays_at_risk: number;
          skips: number;
          replays: number;
          reactions: number;
          focus_visible: number;
          focus_total: number;
        };
        Insert: {
          song_version_id: string;
          bin_s: number;
          plays_at_risk?: number;
          skips?: number;
          replays?: number;
          reactions?: number;
          focus_visible?: number;
          focus_total?: number;
        };
        Update: {
          song_version_id?: string;
          bin_s?: number;
          plays_at_risk?: number;
          skips?: number;
          replays?: number;
          reactions?: number;
          focus_visible?: number;
          focus_total?: number;
        };
      };
      engagement_fingerprints: {
        Row: {
          song_version_id: string;
          version: number;
          features: Json;
          computed_at: string;
        };
        Insert: {
          song_version_id: string;
          version?: number;
          features: Json;
          computed_at?: string;
        };
        Update: {
          song_version_id?: string;
          version?: number;
          features?: Json;
          computed_at?: string;
        };
      };
    };
  };
}

