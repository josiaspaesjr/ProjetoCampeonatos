# Deploy — Vercel + Supabase cloud + Asaas

O app está pronto para produção: `npm run build` passa, todas as rotas são
dinâmicas e os modos dev (PGlite, gateway simulado, organizador fixo) se
desligam sozinhos quando as variáveis de produção existem.

## 1. Supabase cloud (banco + auth) — ~5 min

```bash
# no seu terminal (fluxo de login abre o navegador)
npx supabase login

# cria o projeto (anote a senha do banco!)
npx supabase projects create bjjcamp --region sa-east-1

# aplica o schema no banco de produção
DATABASE_URL='postgresql://postgres.<ref>:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres' \
  npx drizzle-kit migrate
```

Alternativa sem CLI: crie o projeto em [supabase.com](https://supabase.com)
(região São Paulo), copie a connection string em *Settings → Database* e rode
só o `drizzle-kit migrate`.

**Importante (auth):** em *Authentication → Sign In / Up → Email*, desative
"Confirm email" por enquanto — o fluxo de cadastro atual assume sessão
imediata. Reative quando implementarmos a tela de confirmação.

## 2. Variáveis de ambiente na Vercel

O projeto já está linkado (`.vercel/`). Configure via CLI ou dashboard:

```bash
vercel env add DATABASE_URL production            # connection string do passo 1
vercel env add NEXT_PUBLIC_SUPABASE_URL production        # Settings → API → URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production   # Settings → API → anon key
vercel env add NEXT_PUBLIC_APP_URL production             # https://SEU-DOMINIO.vercel.app
```

Pagamentos reais (pode ficar para depois — sem isso o checkout usa o simulador):

```bash
vercel env add ASAAS_API_KEY production           # sandbox.asaas.com → Integrações
vercel env add ASAAS_BASE_URL production          # https://api-sandbox.asaas.com/v3
vercel env add ASAAS_WEBHOOK_TOKEN production     # um segredo que você escolhe
```

## 3. Deploy

```bash
vercel --prod
```

## 4. Webhook do Asaas (quando ativar pagamentos)

No painel Asaas → *Integrações → Webhooks*:
- URL: `https://SEU-DOMINIO/api/webhooks/asaas`
- Token de acesso: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- Eventos: cobranças (received, confirmed, overdue, refunded)

## Checklist pós-deploy

- [ ] Criar conta em `/entrar` e acessar `/organizador`
- [ ] Criar evento de teste, publicar, inscrever um atleta com Pix sandbox
- [ ] Pagar o Pix no sandbox e conferir a confirmação via webhook
- [ ] Conferir QR de check-in em "Minhas inscrições" (usa NEXT_PUBLIC_APP_URL)

## O que segue em aberto para produção séria

- Estorno automático no gateway ao reembolsar (hoje só marca no sistema)
- Adapter Stripe (eventos em USD/EUR)
- E-mail transacional de confirmação de inscrição (Resend)
- Restringir quem pode virar organizador (hoje qualquer conta logada)
- Tela de confirmação de e-mail para reativar "Confirm email" no Supabase
