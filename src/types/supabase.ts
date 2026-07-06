export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          is_platform_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          is_platform_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          is_platform_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          organization_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          created_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'owner' | 'admin' | 'member'
          invited_by: string | null
          token: string
          status: 'pending' | 'accepted' | 'revoked'
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role: 'owner' | 'admin' | 'member'
          invited_by?: string | null
          token: string
          status?: 'pending' | 'accepted' | 'revoked'
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'owner' | 'admin' | 'member'
          invited_by?: string | null
          token?: string
          status?: 'pending' | 'accepted' | 'revoked'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      repositories: {
        Row: {
          id: string
          project_id: string
          repo_name: string
          repo_url: string
          default_branch: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          repo_name: string
          repo_url: string
          default_branch?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          repo_name?: string
          repo_url?: string
          default_branch?: string
          created_at?: string
          updated_at?: string
        }
      }
      repository_indexes: {
        Row: {
          id: string
          repo_id: string
          branch: string
          commit_sha: string
          status: 'pending' | 'indexing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: string
          branch: string
          commit_sha: string
          status: 'pending' | 'indexing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: string
          branch?: string
          commit_sha?: string
          status?: 'pending' | 'indexing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      repository_files: {
        Row: {
          id: string
          repo_id: string
          file_path: string
          file_size: number
          content: string
          language: string | null
          hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: string
          file_path: string
          file_size: number
          content: string
          language?: string | null
          hash: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: string
          file_path?: string
          file_size?: number
          content?: string
          language?: string | null
          hash?: string
          created_at?: string
          updated_at?: string
        }
      }
      embeddings: {
        Row: {
          id: string
          repo_id: string
          file_path: string
          chunk_index: number
          chunk_content: string
          embedding: string // VECTOR(1536) represented as string format in ts
          created_at: string
        }
        Insert: {
          id?: string
          repo_id: string
          file_path: string
          chunk_index: number
          chunk_content: string
          embedding: string
          created_at?: string
        }
        Update: {
          id?: string
          repo_id?: string
          file_path?: string
          chunk_index?: number
          chunk_content?: string
          embedding?: string
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          repo_id: string | null
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          repo_id?: string | null
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          repo_id?: string | null
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_role: 'user' | 'assistant' | 'system'
          content: string
          citations: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_role: 'user' | 'assistant' | 'system'
          content: string
          citations?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_role?: 'user' | 'assistant' | 'system'
          content?: string
          citations?: Json | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          project_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      document_versions: {
        Row: {
          id: string
          document_id: string
          version: number
          content: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          version: number
          content: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          version?: number
          content?: string
          created_by?: string | null
          created_at?: string
        }
      }
      pull_requests: {
        Row: {
          id: string
          repo_id: string
          github_pr_number: number
          title: string
          status: 'open' | 'closed' | 'merged'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: string
          github_pr_number: number
          title: string
          status: 'open' | 'closed' | 'merged'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: string
          github_pr_number?: number
          title?: string
          status?: 'open' | 'closed' | 'merged'
          created_at?: string
          updated_at?: string
        }
      }
      code_reviews: {
        Row: {
          id: string
          pr_id: string
          reviewer_id: string | null
          status: 'pending' | 'completed' | 'approved' | 'rejected'
          summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pr_id: string
          reviewer_id?: string | null
          status: 'pending' | 'completed' | 'approved' | 'rejected'
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pr_id?: string
          reviewer_id?: string | null
          status?: 'pending' | 'completed' | 'approved' | 'rejected'
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      review_comments: {
        Row: {
          id: string
          review_id: string
          file_path: string
          line_number: number | null
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          file_path: string
          line_number?: number | null
          comment: string
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          file_path?: string
          line_number?: number | null
          comment?: string
          created_at?: string
        }
      }
      analysis_jobs: {
        Row: {
          id: string
          repo_id: string
          job_type: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          progress: number
          error_message: string | null
          step_status: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          repo_id: string
          job_type: string
          status: 'pending' | 'running' | 'completed' | 'failed'
          progress?: number
          error_message?: string | null
          step_status?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          repo_id?: string
          job_type?: string
          status?: 'pending' | 'running' | 'completed' | 'failed'
          progress?: number
          error_message?: string | null
          step_status?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      security_reports: {
        Row: {
          id: string
          repo_id: string
          findings: Json
          severity_counts: Json
          created_at: string
        }
        Insert: {
          id?: string
          repo_id: string
          findings: Json
          severity_counts: Json
          created_at?: string
        }
        Update: {
          id?: string
          repo_id?: string
          findings?: Json
          severity_counts?: Json
          created_at?: string
        }
      }
      tech_debt_reports: {
        Row: {
          id: string
          repo_id: string
          issues: Json
          estimated_days: number
          created_at: string
        }
        Insert: {
          id?: string
          repo_id: string
          issues: Json
          estimated_days?: number
          created_at?: string
        }
        Update: {
          id?: string
          repo_id?: string
          issues?: Json
          estimated_days?: number
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          provider: 'razorpay' | 'stripe'
          provider_subscription_id: string
          provider_customer_id: string
          plan_id: string
          status: string
          current_period_start: string
          current_period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          provider?: 'razorpay' | 'stripe'
          provider_subscription_id: string
          provider_customer_id: string
          plan_id: string
          status: string
          current_period_start: string
          current_period_end: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          provider?: 'razorpay' | 'stripe'
          provider_subscription_id?: string
          provider_customer_id?: string
          plan_id?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          organization_id: string
          provider: 'razorpay' | 'stripe'
          provider_invoice_id: string
          amount_due: number
          amount_paid: number
          status: string
          invoice_pdf: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          provider?: 'razorpay' | 'stripe'
          provider_invoice_id: string
          amount_due: number
          amount_paid: number
          status: string
          invoice_pdf?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          provider?: 'razorpay' | 'stripe'
          provider_invoice_id?: string
          amount_due?: number
          amount_paid?: number
          status?: string
          invoice_pdf?: string | null
          created_at?: string
        }
      }
      usage_records: {
        Row: {
          id: string
          organization_id: string
          metric: 'tokens' | 'repositories' | 'members'
          quantity: number
          recorded_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          metric: 'tokens' | 'repositories' | 'members'
          quantity: number
          recorded_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          metric?: 'tokens' | 'repositories' | 'members'
          quantity?: number
          recorded_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          organization_id: string
          name: string
          prefix: string
          hashed_key: string
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          prefix: string
          hashed_key: string
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          prefix?: string
          hashed_key?: string
          created_at?: string
          expires_at?: string | null
        }
      }
      git_connections: {
        Row: {
          id: string
          organization_id: string
          github_app_installation_id: string | null
          encrypted_oauth_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          github_app_installation_id?: string | null
          encrypted_oauth_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          github_app_installation_id?: string | null
          encrypted_oauth_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_provider_configs: {
        Row: {
          id: string
          organization_id: string
          provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'groq' | 'openrouter' | 'ollama'
          encrypted_api_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'groq' | 'openrouter' | 'ollama'
          encrypted_api_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          provider?: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'groq' | 'openrouter' | 'ollama'
          encrypted_api_key?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          created_at?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_job_completion: boolean
          email_billing: boolean
          email_invites: boolean
          in_app_job_completion: boolean
          in_app_billing: boolean
          in_app_invites: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_job_completion?: boolean
          email_billing?: boolean
          email_invites?: boolean
          in_app_job_completion?: boolean
          in_app_billing?: boolean
          in_app_invites?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_job_completion?: boolean
          email_billing?: boolean
          email_invites?: boolean
          in_app_job_completion?: boolean
          in_app_billing?: boolean
          in_app_invites?: boolean
          created_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          organization_id: string
          created_by: string | null
          subject: string
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          created_by?: string | null
          subject: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string | null
          subject?: string
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          created_at?: string
          updated_at?: string
        }
      }
      ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          sender_id: string | null
          sender_role: 'user' | 'agent'
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          sender_id?: string | null
          sender_role: 'user' | 'agent'
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          sender_id?: string | null
          sender_role?: 'user' | 'agent'
          message?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string
        }
      }
      feature_flags: {
        Row: {
          id: string
          name: string
          description: string | null
          is_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          organization_id: string
          general_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          general_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          general_settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      agent_tasks: {
        Row: {
          id: string
          user_id: string
          repo_id: string
          prompt: string
          branch_name: string | null
          status: 'Ingestion' | 'PromptAnalysis' | 'CodeIntelligence' | 'CodeGeneration' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Failed'
          task_list: Json | null
          affected_files: Json | null
          code_diff: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          repo_id: string
          prompt: string
          branch_name?: string | null
          status?: 'Ingestion' | 'PromptAnalysis' | 'CodeIntelligence' | 'CodeGeneration' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Failed'
          task_list?: Json | null
          affected_files?: Json | null
          code_diff?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          repo_id?: string
          prompt?: string
          branch_name?: string | null
          status?: 'Ingestion' | 'PromptAnalysis' | 'CodeIntelligence' | 'CodeGeneration' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Failed'
          task_list?: Json | null
          affected_files?: Json | null
          code_diff?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_member: {
        Args: {
          org_id: string
        }
        Returns: boolean
      }
      get_org_role: {
        Args: {
          org_id: string
        }
        Returns: string
      }
      match_embeddings: {
        Args: {
          p_repo_id: string
          p_query_embedding: string
          p_match_count?: number
        }
        Returns: {
          id: string
          file_path: string
          chunk_index: number
          chunk_content: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
