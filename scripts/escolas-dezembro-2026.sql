-- Escolas e datas das formaturas de dezembro de 2026 (todas às 18h).
-- Rodar DEPOIS da migração 0002. Não apaga nada: a Ervin Horvath só fica oculta (status 'encerrada').

-- Lacy: nome completo e data; mantém o endereço /e/ee-lacy, que pode já ter sido divulgado.
UPDATE escolas SET nome = 'E.E. Profª Lacy Lenski Lopes (Poá)', data_cerimonia = '2026-12-08',
  hora_cerimonia = '18:00', prazo_inscricao = NULL, status = 'ativa'
WHERE slug = 'ee-lacy';

-- Ervin Horvath não está na lista desta edição: sai do site, os dados continuam guardados.
UPDATE escolas SET status = 'encerrada' WHERE slug = 'ee-ervin-horvath';

INSERT INTO escolas (nome, slug, data_cerimonia, hora_cerimonia)
SELECT 'Homero Fernando Milano (Vila Zeferina)', 'homero-fernando-milano-vila-zeferina', '2026-12-16', '18:00'
WHERE NOT EXISTS (SELECT 1 FROM escolas WHERE slug = 'homero-fernando-milano-vila-zeferina');

INSERT INTO escolas (nome, slug, data_cerimonia, hora_cerimonia)
SELECT 'Homero Fernando Milano', 'homero-fernando-milano', '2026-12-17', '18:00'
WHERE NOT EXISTS (SELECT 1 FROM escolas WHERE slug = 'homero-fernando-milano');
