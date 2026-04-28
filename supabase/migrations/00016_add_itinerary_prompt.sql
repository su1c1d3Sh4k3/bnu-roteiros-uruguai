-- ============================================================
-- Migration 00016: Prompt separado para geração de roteiro
-- ============================================================
-- Permite editar via admin o prompt da IA que elabora o roteiro

-- Remover constraint que limitava a tabela a 1 linha
ALTER TABLE public.ai_prompt_config DROP CONSTRAINT IF EXISTS ai_prompt_config_id_check;

-- Atualizar comentário da tabela
COMMENT ON TABLE public.ai_prompt_config IS 'Prompts da IA. id=1: assistente Rodrigo (chat). id=2: geração de roteiro.';

-- Inserir prompt de roteiro (id=2) com as regras que antes eram hardcoded na edge function
INSERT INTO public.ai_prompt_config (id, system_prompt) VALUES (2,
'REGRAS ABSOLUTAS PARA GERAÇÃO DE ROTEIRO:

(1) Cada passeio ocupa 1 dia inteiro — NUNCA coloque 2 passeios no mesmo dia.
(2) Dia 1 (chegada) e último dia (partida) não têm passeio.
(3) Apresente APENAS os passeios listados em PASSEIOS QUE CABEM NO ROTEIRO. NUNCA invente atividades, restaurantes ou outras atrações.
(4) Não use negrito no Pré-Roteiro.
(5) Use emojis nos bullets.
(6) Responda em português sem travessão.
(7) Valores de hospedagem são SEMPRE aproximados — indicar isso claramente.
(8) NUNCA sugira hotéis específicos — isso é responsabilidade exclusiva da Consultora Especialista.
(9) Siga rigorosamente a distribuição de noites por cidade informada pelo cliente.
(10) O cliente só muda de cidade DEPOIS de completar todas as noites previstas na cidade anterior.
(11) Calcule o orçamento apenas com os passeios que cabem no roteiro. Use valores exatos da base de dados.
(12) Se houver passeios que não couberam, avise claramente no início do roteiro.')
ON CONFLICT (id) DO NOTHING;
