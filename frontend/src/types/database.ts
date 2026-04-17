export interface Profile {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: string;
  nome: string;
  emoji: string;
  description: string;
  sort_order: number;
}

export interface Tour {
  id: string;
  nome: string;
  valor_por_pessoa: number;
  emoji: string;
  description: string;
  dias_min: number;
  cidade_base: string;
  image_url: string;
  ativo: boolean;
  sort_order: number;
}

export interface HotelStyle {
  id: string;
  label: string;
  description: string;
  emoji: string;
  stars: string;
  sort_order: number;
}

export interface TravelProfile {
  id: string;
  label: string;
  emoji: string;
  sort_order: number;
}

export interface BudgetRange {
  id: string;
  label: string;
  min_value: number | null;
  max_value: number | null;
  sort_order: number;
}

export interface Itinerary {
  id: string;
  user_id: string;
  status: 'draft' | 'generated' | 'sent_to_consultant';
  generated_result: string | null;
  consultant_response: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItineraryAnswers {
  id: string;
  itinerary_id: string;
  nome: string;
  whatsapp: string;
  email: string;
  perfil: string;
  adultos: number;
  criancas: number;
  datas_definidas: boolean | null;
  data_ida: string;
  data_volta: string;
  dias_total: number | null;
  cidades: Record<string, number | string>;
  hotel_estrelas: string;
  hotel_opcao: string;
  hotel_nome: string;
  passeios: string[];
  ocasiao_especial: string;
  ocasiao_detalhe: string;
  ocasiao_data: string;
  orcamento: string;
  extras: string;
  current_step: number;
}

export interface ChatMessage {
  id: string;
  itinerary_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface WizardAnswers {
  nome?: string;
  whatsapp?: string;
  email?: string;
  perfil?: string;
  adultos?: number;
  criancas?: number;
  datas_definidas?: boolean;
  data_ida?: string;
  data_volta?: string;
  dias_total?: number;
  cidades?: Record<string, number | string>;
  hotel_estrelas?: string;
  hotel_opcao?: string;
  hotel_nome?: string;
  passeios?: string[];
  ocasiao_especial?: string;
  ocasiao_detalhe?: string;
  ocasiao_data?: string;
  orcamento?: string;
  extras?: string;
  [key: string]: unknown;
}
