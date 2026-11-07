# Formaturas Solidárias — sistema de inscrições

Sistema web do projeto Formaturas Solidárias (Itaquaquecetuba): inscrição de formandos e
acompanhantes, ingresso solidário (1 kg de alimento por pessoa, entregue no dia) e painéis para
comissão, direção e administração.

**Stack:** Cloudflare Workers + D1 (SQLite) + Hono (JSX server-side). Custo zero no plano free.

## Perfis

- **Aluno (público, sem senha):** entra pelo link da escola (`/e/<slug>`), busca o nome na lista,
  informa acompanhantes (até 3) e recebe a confirmação com os kg da família.
- **Comissão (`/painel`):** gerencia inscrições da própria escola, registra convidados extras
  (aprovados verbalmente pela direção), inclui aluno fora da lista, lança o total de kg após o evento.
- **Direção (`/painel`):** mesmos números, somente leitura.
- **Admin (`/admin`):** escolas, importação de listas, acessos, configurações e auditoria.

## Desenvolvimento local

```bash
npm install
npm run db:local          # aplica as migrações no D1 local
npm run seed:local        # gera scripts/seed-local.sql com dados de teste
npx wrangler d1 execute formatura-solidaria --local --file scripts/seed-local.sql
npm run dev               # http://localhost:8787
```

Logins de teste (senha `formatura123`): `admin@local.teste`, `comissao@local.teste`,
`direcao@local.teste`.

## Deploy (Cloudflare)

```bash
npx wrangler login
npx wrangler d1 create formatura-solidaria   # copie o database_id para o wrangler.jsonc
npm run db:remote
npx wrangler secret put SESSION_SECRET       # valor longo e aleatório
npm run deploy
```

Primeiro admin (troque e-mail/senha — o hash é gerado com `node scripts/hash-senha.mjs <senha>`):

```bash
npx wrangler d1 execute formatura-solidaria --remote --command "INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES ('Nome', 'email@exemplo.com', '<hash>', 'admin')"
```
