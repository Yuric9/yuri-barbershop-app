# Yuri Barbershop — Sistema de gestão

Painel administrativo da **Yuri Barbershop**: agenda, caixa, clientes com cartão
fidelidade, equipe e comissões, serviços, produtos com estoque, relatórios
financeiros e remarketing pelo WhatsApp.

O sistema é **exclusivo da administração**: sem login, só a tela de acesso é exibida.

## Funcionalidades

| Tela | O que faz |
| --- | --- |
| **Início** | Faturamento do dia, atendimentos concluídos, ticket médio, saldo do mês, próximos atendimentos e gráfico dos últimos 7 dias. |
| **Agenda** | Visão por dia ou 7 dias, filtros por status. Novo agendamento com vários serviços, escolha de profissional e horários livres calculados pelo servidor. Confirmar, finalizar (com forma de pagamento) e cancelar. |
| **Caixa** | Entradas e saídas do dia (sempre na data de hoje) e **atendimento avulso** (cliente sem agendamento, já com comissão). |
| **Clientes** | Busca, ficha do cliente, edição, **cartão fidelidade** (8 atendimentos pagos = 1 cortesia) com ajuste manual e importação de contatos (celular, CSV ou VCF). |
| **Remarketing** | Listas automáticas (pós-atendimento, retorno, aniversariantes, fidelidade, indicação) com mensagem pronta no WhatsApp e acompanhamento de respostas/retornos. |
| **Serviços** | Preço, duração e ativação. |
| **Produtos** | Estoque, fotos e **venda no balcão** (baixa o estoque e lança no caixa). |
| **Equipe** | Colaboradores, comissão padrão, comissão por serviço e ganhos do mês. |
| **Relatórios** | Resultado mensal e anual, gráfico por mês, entradas por forma de pagamento, lançamento de dias anteriores ou de um mês fechado, edição e exclusão de lançamentos. |

## Tecnologias

- **Next.js 16 + React 19**, executado pelo [vinext](https://github.com/cloudflare/vinext) (Vite) em um **Cloudflare Worker**
- **Cloudflare D1** (SQLite) com **Drizzle ORM** e migrações em `drizzle/`
- **Cloudflare R2** para as fotos dos produtos
- **Zod** para validar os dados recebidos pela API
- CSS próprio (um único design system em `app/globals.css`)

## Estrutura do projeto

```
app/
  page.tsx               Tela inicial: login ou painel (conforme a sessão)
  layout.tsx             HTML base e metadados
  globals.css            Design system (tokens, componentes, telas, responsivo)
  api/                   Rotas da API, uma pasta por recurso
    appointments/        Agenda (lista, criação, disponibilidade, status)
    clients/             Clientes (cadastro, importação, fidelidade)
    collaborators/       Equipe e comissões
    transactions/        Lançamentos financeiros
    products/, product-orders/, services/, walk-ins/, dashboard/, ...
components/
  ui/                    Componentes genéricos (botão, campo, modal, avisos...)
  admin/                 Painel: estrutura, telas (sections/) e modais
  auth/                  Tela de login
lib/
  domain/                Regras de negócio puras (datas, agenda, fidelidade,
                         dinheiro, finanças, telefone) — testadas em tests/
  server/                Código só do servidor: sessão, senhas, validação,
                         acesso ao banco por assunto (agenda, clientes...)
  client/                Comunicação do painel com a API (cache e ações)
db/                      Schema do banco (Drizzle)
drizzle/                 Migrações SQL
worker/index.ts          Entrada do Worker (bindings e cabeçalhos de segurança)
tests/                   Testes unitários (*.test.ts) e de integração (*.test.mjs)
```

### Como as camadas conversam

```
Tela (components/admin/sections)
  └─ useApi / useAction  (lib/client)          → fetch para /api/...
       └─ Rota (app/api/.../route.ts)
            ├─ adminRoute: exige admin, bloqueia outros sites, trata erros
            ├─ readBody + Zod: valida os dados
            └─ lib/server/*  →  lib/domain/* (regras)  +  db (Drizzle/D1)
```

## Regras de negócio importantes

- **Fuso horário:** toda data do negócio usa `America/Sao_Paulo` (`lib/domain/dates.ts`).
- **Horário de funcionamento:** seg–sex 18h–20h30, sábado 8h–20h30, domingo 8h–12h, em faixas de 30 min (`lib/domain/schedule.ts`).
- **Reserva de horário:** cada agendamento reserva faixas na tabela `appointment_slots`, que tem índice único — dois agendamentos nunca ocupam o mesmo horário do mesmo profissional, mesmo se forem feitos ao mesmo tempo.
- **Finalizar atendimento** lança a entrada no caixa e calcula a comissão (percentual do serviço ou o padrão do colaborador). Só é possível finalizar atendimentos de hoje ou de dias anteriores, e o mesmo atendimento não é finalizado duas vezes.
- **Cortesia** (cartão fidelidade) só é aceita quando o cliente tem benefício disponível; nada é lançado no caixa.
- **Valores** são guardados em centavos (inteiros).

## Segurança

- Senhas com PBKDF2-SHA256 (100.000 iterações, salt aleatório). Hashes antigos são atualizados automaticamente no próximo login.
- Sessão em cookie `httpOnly`; o banco guarda apenas o hash do token.
- Limite de tentativas de login (8 erros em 15 minutos bloqueiam por 15 minutos).
- Todas as rotas da API exigem administrador e rejeitam escritas vindas de outros sites.
- Imagens só são servidas para chaves geradas pelo próprio sistema.
- Cabeçalhos de segurança (CSP, HSTS, X-Frame-Options...) em todas as respostas.

## Como rodar localmente

Pré-requisitos: Node.js 22.18 ou superior.

```bash
npm ci

# Senha do administrador para desenvolvimento (arquivo ignorado pelo git):
npm run admin:hash-password          # copie o hash gerado
echo 'ADMIN_PASSWORD_HASH="<hash>"' > .dev.vars

npm run dev                          # http://localhost:5173
```

O e-mail do administrador fica em `ADMIN_EMAIL` (`wrangler.jsonc`). Para criar as
tabelas no banco local, aplique as migrações da pasta `drizzle/` com o
`wrangler d1 migrations apply --local`.

## Testes e qualidade

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test:unit   # regras de negócio (rápido)
npm test            # unitários + build + testes de integração do Worker
```

O GitHub Actions (`.github/workflows/qa.yml`) roda lint, tipos e testes em cada push e pull request para `main`.

## Implantação (Cloudflare)

O projeto usa o Worker `yuri-barbershop-app`, o banco D1 `yuri-barbershop-db` e o
bucket R2 `imagens-de-barbearia-yuri`.

1. Configure o segredo do administrador: `npx wrangler secret put ADMIN_PASSWORD_HASH` (gere o valor com `npm run admin:hash-password`).
2. `npm run cloudflare:migrate` — aplica as migrações no banco remoto.
3. `npm run cloudflare:check` — valida o build.
4. Implante pelo fluxo conectado ao GitHub na Cloudflare (ou `npm run cloudflare:deploy`).

Nunca grave senhas ou tokens no código ou no `wrangler.jsonc`.

> Os segredos `MP_*` da antiga integração com o Mercado Pago não são mais usados
> e podem ser removidos do painel da Cloudflare.
