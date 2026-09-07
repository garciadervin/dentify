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
          settings: Json;
          streak_count: number;
          last_active_at: string | null;
          avatar_color: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          student_id?: string | null;
          role?: 'student' | 'teacher' | 'admin';
          created_at?: string;
          updated_at?: string;
          settings?: Json;
          streak_count?: number;
          last_active_at?: string | null;
          avatar_color?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          student_id?: string | null;
          role?: 'student' | 'teacher' | 'admin';
          created_at?: string;
          updated_at?: string;
          settings?: Json;
          streak_count?: number;
          last_active_at?: string | null;
          avatar_color?: string | null;
        };
        Relationships: [];
      };
      specialties: {
        Row: {
          id: string;
          slug: string;
          name: string;
          order_index: number;
          icon: string;
          description: string | null;
          levels_count: number;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          order_index?: number;
          icon?: string;
          description?: string | null;
          levels_count?: number;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          order_index?: number;
          icon?: string;
          description?: string | null;
          levels_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'levels_specialty_id_fkey';
            columns: ['id'];
            referencedRelation: 'levels';
            referencedColumns: ['specialty_id'];
          },
        ];
      };
      levels: {
        Row: {
          id: string;
          specialty_id: string;
          level_number: number;
          title: string;
          description: string | null;
          xp_reward: number;
        };
        Insert: {
          id?: string;
          specialty_id: string;
          level_number: number;
          title?: string;
          description?: string | null;
          xp_reward?: number;
        };
        Update: {
          id?: string;
          specialty_id?: string;
          level_number?: number;
          title?: string;
          description?: string | null;
          xp_reward?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'levels_specialty_id_fkey';
            columns: ['specialty_id'];
            referencedRelation: 'specialties';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          id: string;
          specialty_id: string;
          level: number;
          question: string;
          options: Json | null;
          correct_index: number | null;
          explanation: string | null;
          created_at: string;
          question_type: 'mcq' | 'true_false' | 'fill_blank' | 'multi_select' | 'match' | 'order' | 'case';
          correct_indexes: number[] | null;
          pairs: Json | null;
          order_items: Json | null;
          case_id: string | null;
          hint: string | null;
          points: number;
          difficulty: number;
          tags: string[] | null;
        };
        Insert: {
          id?: string;
          specialty_id: string;
          level: number;
          question: string;
          options?: Json | null;
          correct_index?: number | null;
          explanation?: string | null;
          created_at?: string;
          question_type?: 'mcq' | 'true_false' | 'fill_blank' | 'multi_select' | 'match' | 'order' | 'case';
          correct_indexes?: number[] | null;
          pairs?: Json | null;
          order_items?: Json | null;
          case_id?: string | null;
          hint?: string | null;
          points?: number;
          difficulty?: number;
          tags?: string[] | null;
        };
        Update: {
          id?: string;
          specialty_id?: string;
          level?: number;
          question?: string;
          options?: Json | null;
          correct_index?: number | null;
          explanation?: string | null;
          created_at?: string;
          question_type?: 'mcq' | 'true_false' | 'fill_blank' | 'multi_select' | 'match' | 'order' | 'case';
          correct_indexes?: number[] | null;
          pairs?: Json | null;
          order_items?: Json | null;
          case_id?: string | null;
          hint?: string | null;
          points?: number;
          difficulty?: number;
          tags?: string[] | null;
        };
        Relationships: [];
      };
      clinical_cases: {
        Row: {
          id: string;
          text: string;
        };
        Insert: {
          id: string;
          text: string;
        };
        Update: {
          id?: string;
          text?: string;
        };
        Relationships: [];
      };
      answer_history: {
        Row: {
          profile_id: string;
          question_id: string;
          correct: boolean;
          answered_at: string;
        };
        Insert: {
          profile_id: string;
          question_id: string;
          correct: boolean;
          answered_at?: string;
        };
        Update: {
          profile_id?: string;
          question_id?: string;
          correct?: boolean;
          answered_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
      };
      pedagogical_progress: {
        Row: {
          id: string;
          profile_id: string;
          specialty_id: string;
          level: number;
          status: 'locked' | 'active' | 'completed';
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          specialty_id: string;
          level: number;
          status?: 'locked' | 'active' | 'completed';
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          specialty_id?: string;
          level?: number;
          status?: 'locked' | 'active' | 'completed';
          completed_at?: string | null;
        };
        Relationships: [];
      };
      diagnosis_sessions: {
        Row: {
          id: string;
          profile_id: string;
          image_url: string | null;
          detected_objects: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          image_url?: string | null;
          detected_objects?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          image_url?: string | null;
          detected_objects?: Json | null;
          created_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_manuals: {
        Args: {
          query_embedding: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          content: string;
          source_document: string | null;
          page_number: number | null;
          similarity: number;
        }[];
      };
      match_manuals_by_text: {
        Args: {
          search_query: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          title: string;
          content: string;
          source_document: string | null;
          page_number: number | null;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
