-- Nomes sem parênteses; o Homero tem duas formaturas (16/12 e 17/12), cada uma com o seu link.
UPDATE escolas SET nome = 'E.E. Profª Lacy Lenski Lopes' WHERE slug = 'ee-lacy';
UPDATE escolas SET nome = 'Homero Fernando Milano', slug = 'homero-fernando-milano-16-12'
  WHERE slug = 'homero-fernando-milano-vila-zeferina';
UPDATE escolas SET slug = 'homero-fernando-milano-17-12' WHERE slug = 'homero-fernando-milano';
