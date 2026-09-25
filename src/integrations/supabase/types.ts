export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      candidatos: {
        Row: {
          area: string | null
          carta_apresentacao: string | null
          complemento_situacao_dte: string | null
          consultor_responsavel: string | null
          created_at: string | null
          cv_candidato: string | null
          data_cv_dte: string | null
          descricao_pcd: string | null
          distribuicao: string | null
          email: string | null
          email_contato: string | null
          empresas_alvo: string | null
          empresas_restritas: string | null
          faixa_salarial: string | null
          forms_preenchido: string | null
          id: string
          idade: string | null
          idioma: string | null
          inicio_programa: string | null
          lgpd: string | null
          link_relatorio: string | null
          linkedin: string | null
          local_residencia: string | null
          mobilidade: string | null
          nivel_cargo: string | null
          nome: string
          nome_completo: string | null
          nome_normalizado: string
          observacao: string | null
          parceiro: string | null
          pcd: string | null
          posicoes_alvo: string | null
          pretensao_salarial: string | null
          programa: string | null
          referral_id: string | null
          reuniao_status: string | null
          segmento_alvo: string | null
          situacao_dte: string | null
          status: string | null
          status_dte: string | null
          status_orbit: string | null
          status_programa: string | null
          talent: string | null
          telefone: string | null
          termino_programa: string | null
          ultima_empresa: string | null
          ultima_posicao: string | null
          ultimo_salario: string | null
          ultimo_segmento: string | null
        }
        Insert: {
          area?: string | null
          carta_apresentacao?: string | null
          complemento_situacao_dte?: string | null
          consultor_responsavel?: string | null
          created_at?: string | null
          cv_candidato?: string | null
          data_cv_dte?: string | null
          descricao_pcd?: string | null
          distribuicao?: string | null
          email?: string | null
          email_contato?: string | null
          empresas_alvo?: string | null
          empresas_restritas?: string | null
          faixa_salarial?: string | null
          forms_preenchido?: string | null
          id?: string
          idade?: string | null
          idioma?: string | null
          inicio_programa?: string | null
          lgpd?: string | null
          link_relatorio?: string | null
          linkedin?: string | null
          local_residencia?: string | null
          mobilidade?: string | null
          nivel_cargo?: string | null
          nome: string
          nome_completo?: string | null
          nome_normalizado: string
          observacao?: string | null
          parceiro?: string | null
          pcd?: string | null
          posicoes_alvo?: string | null
          pretensao_salarial?: string | null
          programa?: string | null
          referral_id?: string | null
          reuniao_status?: string | null
          segmento_alvo?: string | null
          situacao_dte?: string | null
          status?: string | null
          status_dte?: string | null
          status_orbit?: string | null
          status_programa?: string | null
          talent?: string | null
          telefone?: string | null
          termino_programa?: string | null
          ultima_empresa?: string | null
          ultima_posicao?: string | null
          ultimo_salario?: string | null
          ultimo_segmento?: string | null
        }
        Update: {
          area?: string | null
          carta_apresentacao?: string | null
          complemento_situacao_dte?: string | null
          consultor_responsavel?: string | null
          created_at?: string | null
          cv_candidato?: string | null
          data_cv_dte?: string | null
          descricao_pcd?: string | null
          distribuicao?: string | null
          email?: string | null
          email_contato?: string | null
          empresas_alvo?: string | null
          empresas_restritas?: string | null
          faixa_salarial?: string | null
          forms_preenchido?: string | null
          id?: string
          idade?: string | null
          idioma?: string | null
          inicio_programa?: string | null
          lgpd?: string | null
          link_relatorio?: string | null
          linkedin?: string | null
          local_residencia?: string | null
          mobilidade?: string | null
          nivel_cargo?: string | null
          nome?: string
          nome_completo?: string | null
          nome_normalizado?: string
          observacao?: string | null
          parceiro?: string | null
          pcd?: string | null
          posicoes_alvo?: string | null
          pretensao_salarial?: string | null
          programa?: string | null
          referral_id?: string | null
          reuniao_status?: string | null
          segmento_alvo?: string | null
          situacao_dte?: string | null
          status?: string | null
          status_dte?: string | null
          status_orbit?: string | null
          status_programa?: string | null
          talent?: string | null
          telefone?: string | null
          termino_programa?: string | null
          ultima_empresa?: string | null
          ultima_posicao?: string | null
          ultimo_salario?: string | null
          ultimo_segmento?: string | null
        }
        Relationships: []
      }
      conectores: {
        Row: {
          ativo: boolean
          created_at: string | null
          email: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          email: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      indicacoes: {
        Row: {
          acao_tipo: string | null
          candidato_id: string | null
          created_at: string | null
          data_acao: string
          data_retorno: string | null
          empresa: string
          follow_up: string | null
          formato: string | null
          id: string
          indicacao_contato: string | null
          jobhunter: string | null
          linkedin_candidato: string | null
          observacoes: string | null
          origem: string | null
          resultado: string | null
          vaga: string
          vaga_link: string | null
        }
        Insert: {
          acao_tipo?: string | null
          candidato_id?: string | null
          created_at?: string | null
          data_acao?: string
          data_retorno?: string | null
          empresa: string
          follow_up?: string | null
          formato?: string | null
          id?: string
          indicacao_contato?: string | null
          jobhunter?: string | null
          linkedin_candidato?: string | null
          observacoes?: string | null
          origem?: string | null
          resultado?: string | null
          vaga: string
          vaga_link?: string | null
        }
        Update: {
          acao_tipo?: string | null
          candidato_id?: string | null
          created_at?: string | null
          data_acao?: string
          data_retorno?: string | null
          empresa?: string
          follow_up?: string | null
          formato?: string | null
          id?: string
          indicacao_contato?: string | null
          jobhunter?: string | null
          linkedin_candidato?: string | null
          observacoes?: string | null
          origem?: string | null
          resultado?: string | null
          vaga?: string
          vaga_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicacoes_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          nome_consultor: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome_consultor?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome_consultor?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_consultor_nome: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
