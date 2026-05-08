-- Fix: migration 00017 used wrong ID 'day_pde' instead of 'daytour_pde'
-- This corrects the scheduling fields for Day Tour Punta del Este
UPDATE tours SET
  tipo_passeio = 'Diurno',
  disponibilidade = 'todos os dias',
  horario_saida = '9h',
  horario_retorno = '~13h'
WHERE id = 'daytour_pde';
