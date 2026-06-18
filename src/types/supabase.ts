export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          student_id: string | null;
          role: 'student' | 'teacher' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          student_id?: string | null;
          role?: 'student' | 'teacher' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          student_id?: string | null;
          role?: 'student' | 'teacher' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      clinical_manuals: {
        Row: {
          id: string;
          title: string;
          content: string;
          source_document: string | null;
          page_number: number | null;
          embedding: number[] | null;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          source_document?: string | null;
          page_number?: number | null;
          embedding?: number[] | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          source_document?: string | null;
          page_number?: number | null;
          embedding?: number[] | null;
        };
      };
      pedagogical_progress: {
        Row: {
          id: string;
          profile_id: string;
          specialty: string;
          level: number;
          status: 'locked' | 'active' | 'completed';
          score: number;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          specialty: string;
          level: number;
          status?: 'locked' | 'active' | 'completed';
          score?: number;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          specialty?: string;
          level?: number;
          status?: 'locked' | 'active' | 'completed';
          score?: number;
          completed_at?: string | null;
        };
      };
      diagnosis_sessions: {
        Row: {
          id: string;
          profile_id: string;
          image_url: string | null;
          detected_objects: Json | null;
          clinical_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          image_url?: string | null;
          detected_objects?: Json | null;
          clinical_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          image_url?: string | null;
          detected_objects?: Json | null;
          clinical_notes?: string | null;
          created_at?: string;
        };
      };
      ai_conversations: {
        Row: {
          id: string;
          profile_id: string;
          messages: Json;
          started_at: string;
          last_updated: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          messages: Json;
          started_at?: string;
          last_updated?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          messages?: Json;
          started_at?: string;
          last_updated?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          requirement_type: string;
          requirement_value: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon: string;
          requirement_type: string;
          requirement_value: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon?: string;
          requirement_type?: string;
          requirement_value?: number;
          created_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          profile_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
