// Archivo generado por scripts/gen-db-types.mts — no editar a mano.
// Regenerar con: npm run db:types

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_admins: {
        Row: {
          profile_id: string
          created_at: string
        }
        Insert: {
          profile_id: string
          created_at?: string
        }
        Update: {
          profile_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_admins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: number
          group_id: string | null
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: never
          group_id?: string | null
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: never
          group_id?: string | null
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          profile_id: string
          role: Database["public"]["Enums"]["group_role"]
          joined_at: string
        }
        Insert: {
          group_id: string
          profile_id: string
          role?: Database["public"]["Enums"]["group_role"]
          joined_at?: string
        }
        Update: {
          group_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["group_role"]
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          timezone: string
          default_players_per_team: number
          voting_window_hours: number
          ranking_min_matches: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          timezone?: string
          default_players_per_team?: number
          voting_window_hours?: number
          ranking_min_matches?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          timezone?: string
          default_players_per_team?: number
          voting_window_hours?: number
          ranking_min_matches?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          id: string
          group_id: string
          token: string
          role: Database["public"]["Enums"]["group_role"]
          player_id: string | null
          max_uses: number | null
          use_count: number
          expires_at: string | null
          revoked_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          token?: string
          role?: Database["public"]["Enums"]["group_role"]
          player_id?: string | null
          max_uses?: number | null
          use_count?: number
          expires_at?: string | null
          revoked_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          token?: string
          role?: Database["public"]["Enums"]["group_role"]
          player_id?: string | null
          max_uses?: number | null
          use_count?: number
          expires_at?: string | null
          revoked_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_player_fkey"
            columns: ["player_id", "group_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      match_events: {
        Row: {
          id: string
          match_id: string
          group_id: string
          team_id: string
          player_id: string | null
          event_type: Database["public"]["Enums"]["match_event_type"]
          minute: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          group_id: string
          team_id: string
          player_id?: string | null
          event_type: Database["public"]["Enums"]["match_event_type"]
          minute?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          group_id?: string
          team_id?: string
          player_id?: string | null
          event_type?: Database["public"]["Enums"]["match_event_type"]
          minute?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_fkey"
            columns: ["match_id", "group_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "match_events_member_fkey"
            columns: ["match_id", "player_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "match_events_team_fkey"
            columns: ["team_id", "match_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "match_id"]
          },
        ]
      }
      match_participants: {
        Row: {
          match_id: string
          group_id: string
          player_id: string
          status: Database["public"]["Enums"]["participant_status"]
          sort_order: number
          created_at: string
        }
        Insert: {
          match_id: string
          group_id: string
          player_id: string
          status?: Database["public"]["Enums"]["participant_status"]
          sort_order?: number
          created_at?: string
        }
        Update: {
          match_id?: string
          group_id?: string
          player_id?: string
          status?: Database["public"]["Enums"]["participant_status"]
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_fkey"
            columns: ["match_id", "group_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "match_participants_player_fkey"
            columns: ["player_id", "group_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      match_ratings: {
        Row: {
          id: string
          match_id: string
          group_id: string
          rater_player_id: string
          rater_profile_id: string
          rated_player_id: string
          score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          group_id: string
          rater_player_id: string
          rater_profile_id: string
          rated_player_id: string
          score: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          group_id?: string
          rater_player_id?: string
          rater_profile_id?: string
          rated_player_id?: string
          score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_ratings_match_fkey"
            columns: ["match_id", "group_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "match_ratings_rated_fkey"
            columns: ["match_id", "rated_player_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "match_ratings_rater_fkey"
            columns: ["match_id", "rater_player_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "match_ratings_rater_profile_id_fkey"
            columns: ["rater_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          id: string
          group_id: string
          scheduled_at: string
          venue: string | null
          players_per_team: number
          status: Database["public"]["Enums"]["match_status"]
          notes: string | null
          finished_at: string | null
          voting_closes_at: string | null
          mvp_player_id: string | null
          mvp_source: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          scheduled_at: string
          venue?: string | null
          players_per_team: number
          status?: Database["public"]["Enums"]["match_status"]
          notes?: string | null
          finished_at?: string | null
          voting_closes_at?: string | null
          mvp_player_id?: string | null
          mvp_source?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          scheduled_at?: string
          venue?: string | null
          players_per_team?: number
          status?: Database["public"]["Enums"]["match_status"]
          notes?: string | null
          finished_at?: string | null
          voting_closes_at?: string | null
          mvp_player_id?: string | null
          mvp_source?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_mvp_fkey"
            columns: ["mvp_player_id", "group_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      player_aliases: {
        Row: {
          id: string
          group_id: string
          player_id: string
          alias: string
          alias_normalized: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          player_id: string
          alias: string
          alias_normalized?: never
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          player_id?: string
          alias?: string
          alias_normalized?: never
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_aliases_player_fkey"
            columns: ["player_id", "group_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      player_positions: {
        Row: {
          player_id: string
          group_id: string
          position: Database["public"]["Enums"]["player_position"]
          priority: number
        }
        Insert: {
          player_id: string
          group_id: string
          position: Database["public"]["Enums"]["player_position"]
          priority: number
        }
        Update: {
          player_id?: string
          group_id?: string
          position?: Database["public"]["Enums"]["player_position"]
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_positions_player_fkey"
            columns: ["player_id", "group_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      player_skill_history: {
        Row: {
          group_id: string
          player_id: string
          match_id: string
          skill: number
          confidence: number
          performance: number | null
          engine_version: string
          computed_at: string
        }
        Insert: {
          group_id: string
          player_id: string
          match_id: string
          skill: number
          confidence: number
          performance?: number | null
          engine_version: string
          computed_at?: string
        }
        Update: {
          group_id?: string
          player_id?: string
          match_id?: string
          skill?: number
          confidence?: number
          performance?: number | null
          engine_version?: string
          computed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_skill_history_match_fkey"
            columns: ["match_id", "group_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "player_skill_history_player_fkey"
            columns: ["player_id", "group_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      players: {
        Row: {
          id: string
          group_id: string
          profile_id: string | null
          nickname: string
          nickname_normalized: string | null
          full_name: string | null
          avatar_url: string | null
          dominant_foot: Database["public"]["Enums"]["dominant_foot"] | null
          base_rating: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          profile_id?: string | null
          nickname: string
          nickname_normalized?: never
          full_name?: string | null
          avatar_url?: string | null
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"] | null
          base_rating?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          profile_id?: string | null
          nickname?: string
          nickname_normalized?: never
          full_name?: string | null
          avatar_url?: string | null
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"] | null
          base_rating?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_member_fkey"
            columns: ["group_id", "profile_id"]
            isOneToOne: true
            referencedRelation: "group_members"
            referencedColumns: ["group_id", "profile_id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          id: string
          group_id: string
          name: string
          starts_on: string
          ends_on: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          starts_on: string
          ends_on?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          starts_on?: string
          ends_on?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      team_constraints: {
        Row: {
          id: string
          group_id: string
          player_a: string
          player_b: string
          kind: Database["public"]["Enums"]["team_constraint_kind"]
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          player_a: string
          player_b: string
          kind: Database["public"]["Enums"]["team_constraint_kind"]
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          player_a?: string
          player_b?: string
          kind?: Database["public"]["Enums"]["team_constraint_kind"]
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_constraints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_constraints_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_constraints_player_a_fkey"
            columns: ["player_a", "group_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "team_constraints_player_b_fkey"
            columns: ["player_b", "group_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      team_members: {
        Row: {
          match_id: string
          team_id: string
          group_id: string
          player_id: string
        }
        Insert: {
          match_id: string
          team_id: string
          group_id: string
          player_id: string
        }
        Update: {
          match_id?: string
          team_id?: string
          group_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_match_fkey"
            columns: ["match_id", "group_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "team_members_participant_fkey"
            columns: ["match_id", "player_id"]
            isOneToOne: true
            referencedRelation: "match_participants"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "team_members_team_fkey"
            columns: ["team_id", "match_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id", "match_id"]
          },
        ]
      }
      teams: {
        Row: {
          id: string
          match_id: string
          group_id: string
          side: Database["public"]["Enums"]["team_side"]
          name: string
          score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          group_id: string
          side: Database["public"]["Enums"]["team_side"]
          name: string
          score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          group_id?: string
          side?: Database["public"]["Enums"]["team_side"]
          name?: string
          score?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_match_fkey"
            columns: ["match_id", "group_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
    }
    Views: {
      player_match_lines: {
        Row: {
          match_id: string | null
          group_id: string | null
          player_id: string | null
          team_id: string | null
          side: Database["public"]["Enums"]["team_side"] | null
          scheduled_at: string | null
          goals_for: number | null
          goals_against: number | null
          result: string | null
          goals: number | null
          assists: number | null
          own_goals: number | null
          is_mvp: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: {
          p_token: string
        }
        Returns: {
          group_id: string | null
          group_slug: string | null
          player_id: string | null
          needs_player: boolean | null
        }[]
      }
      claim_player: {
        Args: {
          p_player_id: string
        }
        Returns: string
      }
      create_group: {
        Args: {
          p_name: string
          p_description?: string
          p_players_per_team?: number
          p_player_nickname?: string
        }
        Returns: Database["public"]["Tables"]["groups"]["Row"]
      }
      create_match: {
        Args: {
          p_group_id: string
          p_scheduled_at: string
          p_players_per_team: number
          p_venue?: string
          p_notes?: string
          p_participants?: Json
        }
        Returns: string
      }
      create_own_player: {
        Args: {
          p_group_id: string
          p_nickname: string
          p_primary_position?: Database["public"]["Enums"]["player_position"]
          p_secondary_position?: Database["public"]["Enums"]["player_position"]
          p_dominant_foot?: Database["public"]["Enums"]["dominant_foot"]
        }
        Returns: string
      }
      finalize_match_voting: {
        Args: {
          p_match_id: string
        }
        Returns: string
      }
      get_head_to_head: {
        Args: {
          p_group_id: string
          p_player_a: string
          p_player_b: string
        }
        Returns: {
          together_matches: number | null
          together_wins: number | null
          together_draws: number | null
          together_losses: number | null
          against_matches: number | null
          a_wins: number | null
          b_wins: number | null
          draws: number | null
        }[]
      }
      get_invitation_preview: {
        Args: {
          p_token: string
        }
        Returns: {
          group_name: string | null
          group_slug: string | null
          role: Database["public"]["Enums"]["group_role"] | null
          player_nickname: string | null
          inviter_name: string | null
          status: string | null
          is_member: boolean | null
        }[]
      }
      get_player_stats: {
        Args: {
          p_group_id: string
          p_from?: string
          p_to?: string
        }
        Returns: {
          player_id: string | null
          matches: number | null
          wins: number | null
          draws: number | null
          losses: number | null
          goals: number | null
          assists: number | null
          own_goals: number | null
          mvps: number | null
        }[]
      }
      get_rating_aggregates: {
        Args: {
          p_group_id: string
          p_match_id?: string
        }
        Returns: {
          match_id: string | null
          player_id: string | null
          votes: number | null
          raw_average: number | null
          adjusted_average: number | null
        }[]
      }
      get_voting_progress: {
        Args: {
          p_match_id: string
        }
        Returns: {
          eligible_voters: number | null
          voters: number | null
          closes_at: string | null
          is_open: boolean | null
        }[]
      }
      is_app_admin: {
        Args: never
        Returns: boolean
      }
      is_group_admin: {
        Args: {
          p_group_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: {
          p_group_id: string
        }
        Returns: boolean
      }
      is_own_player: {
        Args: {
          p_player_id: string
        }
        Returns: boolean
      }
      normalize_name: {
        Args: {
          p_value: string
        }
        Returns: string
      }
      record_match_result: {
        Args: {
          p_match_id: string
          p_score_a: number
          p_score_b: number
          p_events?: Json
          p_mvp_player_id?: string
          p_notes?: string
        }
        Returns: undefined
      }
      replace_skill_history: {
        Args: {
          p_group_id: string
          p_engine_version: string
          p_rows: Json
        }
        Returns: number
      }
      save_player: {
        Args: {
          p_group_id: string
          p_nickname: string
          p_player_id?: string
          p_full_name?: string
          p_dominant_foot?: Database["public"]["Enums"]["dominant_foot"]
          p_base_rating?: number
          p_primary_position?: Database["public"]["Enums"]["player_position"]
          p_secondary_position?: Database["public"]["Enums"]["player_position"]
        }
        Returns: string
      }
      set_match_participants: {
        Args: {
          p_match_id: string
          p_participants: Json
        }
        Returns: undefined
      }
      set_match_teams: {
        Args: {
          p_match_id: string
          p_team_a: string[]
          p_team_b: string[]
          p_name_a?: string
          p_name_b?: string
        }
        Returns: undefined
      }
      set_my_attendance: {
        Args: {
          p_match_id: string
          p_going: boolean
        }
        Returns: Database["public"]["Enums"]["participant_status"]
      }
      shares_group_with: {
        Args: {
          p_profile_id: string
        }
        Returns: boolean
      }
      slugify: {
        Args: {
          p_value: string
        }
        Returns: string
      }
      start_new_season: {
        Args: {
          p_group_id: string
          p_name: string
          p_starts_on: string
        }
        Returns: string
      }
      submit_match_ratings: {
        Args: {
          p_match_id: string
          p_ratings: Json
        }
        Returns: number
      }
    }
    Enums: {
      dominant_foot: "right" | "left" | "both"
      group_role: "admin" | "player"
      match_event_type: "goal" | "own_goal" | "assist"
      match_status: "scheduled" | "in_progress" | "finished" | "cancelled"
      participant_status: "confirmed" | "reserve" | "dropped"
      player_position: "goalkeeper" | "defender" | "midfielder" | "forward"
      team_constraint_kind: "together" | "apart"
      team_side: "a" | "b"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
export type FunctionArgs<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]["Args"]
export type FunctionReturns<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]["Returns"]

export const Constants = {
  public: {
    Enums: {
      dominant_foot: ["right", "left", "both"],
      group_role: ["admin", "player"],
      match_event_type: ["goal", "own_goal", "assist"],
      match_status: ["scheduled", "in_progress", "finished", "cancelled"],
      participant_status: ["confirmed", "reserve", "dropped"],
      player_position: ["goalkeeper", "defender", "midfielder", "forward"],
      team_constraint_kind: ["together", "apart"],
      team_side: ["a", "b"],
    },
  },
} as const
