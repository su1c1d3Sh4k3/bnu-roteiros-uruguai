-- Add scheduling/classification fields to tours table
-- These fields allow the AI to properly schedule tours in itineraries

-- tipo_passeio: Diurno, Noturno, or Dia Todo
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tipo_passeio TEXT DEFAULT 'Diurno';

-- disponibilidade: days of the week the tour is available (e.g., "todos os dias", "terça, quinta e sábado")
ALTER TABLE tours ADD COLUMN IF NOT EXISTS disponibilidade TEXT DEFAULT 'todos os dias';

-- horario_saida: departure time (e.g., "8h", "10h", "20h")
ALTER TABLE tours ADD COLUMN IF NOT EXISTS horario_saida TEXT DEFAULT '';

-- horario_retorno: return time (e.g., "12h30", "18h", "00h")
ALTER TABLE tours ADD COLUMN IF NOT EXISTS horario_retorno TEXT DEFAULT '';

-- Seed existing tours with correct scheduling data
UPDATE tours SET tipo_passeio = 'Diurno', disponibilidade = 'todos os dias', horario_saida = '8h', horario_retorno = '12h30' WHERE id = 'city_mvd';
UPDATE tours SET tipo_passeio = 'Dia Todo', disponibilidade = 'todos os dias', horario_saida = '8h', horario_retorno = '~18h' WHERE id = 'city_pde';
UPDATE tours SET tipo_passeio = 'Dia Todo', disponibilidade = 'terça, quinta e sábado', horario_saida = '8h', horario_retorno = '~18h' WHERE id = 'city_col';
UPDATE tours SET tipo_passeio = 'Diurno', disponibilidade = 'todos os dias', horario_saida = '10h', horario_retorno = '~15h' WHERE id = 'bouza';
UPDATE tours SET tipo_passeio = 'Diurno', disponibilidade = 'terça a domingo', horario_saida = '9h30', horario_retorno = '~15h' WHERE id = 'pizzorno';
UPDATE tours SET tipo_passeio = 'Diurno', disponibilidade = 'quarta a domingo', horario_saida = '9h30', horario_retorno = '~15h' WHERE id = 'deicas';
UPDATE tours SET tipo_passeio = 'Dia Todo', disponibilidade = 'terça a domingo', horario_saida = '9h30', horario_retorno = '~18h30' WHERE id = '2bodegas';
UPDATE tours SET tipo_passeio = 'Noturno', disponibilidade = 'quinta a domingo', horario_saida = '20h', horario_retorno = '00h' WHERE id = 'primuseum';
UPDATE tours SET tipo_passeio = 'Noturno', disponibilidade = 'segunda a sábado', horario_saida = '20h', horario_retorno = '00h' WHERE id = 'milongon';
UPDATE tours SET tipo_passeio = 'Diurno', disponibilidade = 'todos os dias', horario_saida = '9h', horario_retorno = '~13h' WHERE id = 'day_pde';
UPDATE tours SET tipo_passeio = 'Dia Todo', disponibilidade = 'quarta, sexta e domingo', horario_saida = '9h30', horario_retorno = '~17h30' WHERE id = 'garzon';
UPDATE tours SET tipo_passeio = 'Diurno', disponibilidade = 'todos os dias', horario_saida = '10h', horario_retorno = '~14h30' WHERE id = 'fripp';
