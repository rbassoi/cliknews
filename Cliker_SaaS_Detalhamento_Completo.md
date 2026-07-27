# ClikNews → SaaS Multi-Tenant — Detalhamento Completo
### Schema, código, infraestrutura e landing comercial

Este documento assume a arquitetura padrão do ClikNews (derivada de Mailtrain): `server/models/*.js` para acesso a dados, `server/routes/rest/*.js` para API REST, `server/lib/*.js` para infra (mysql, mongo, redis, mailers), `client/src` para o app React/Vue do usuário logado, e Zone-MTA embutido para envio. Ajuste os caminhos exatos conforme a estrutura real do seu fork, mas a lógica abaixo se aplica diretamente.

---

## 1. Schema de banco de dados (MySQL)

### 1.1 Novas tabelas

```sql
CREATE TABLE plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,        -- 'free', 'starter', 'business', 'enterprise'
  name VARCHAR(100) NOT NULL,
  max_contacts INT UNSIGNED NOT NULL,
  max_emails_per_month INT UNSIGNED NOT NULL,
  max_users INT UNSIGNED NOT NULL DEFAULT 1,
  max_sending_domains INT UNSIGNED NOT NULL DEFAULT 1,
  max_automations INT UNSIGNED NOT NULL DEFAULT 0,
  api_access TINYINT(1) NOT NULL DEFAULT 0,
  dedicated_ip TINYINT(1) NOT NULL DEFAULT 0,
  custom_dkim TINYINT(1) NOT NULL DEFAULT 0,
  price_monthly_cents INT UNSIGNED NOT NULL DEFAULT 0,
  price_yearly_cents INT UNSIGNED NOT NULL DEFAULT 0,
  overage_price_per_1000_cents INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('trial','active','past_due','suspended','canceled') NOT NULL DEFAULT 'trial',
  plan_id INT UNSIGNED NOT NULL,
  billing_cycle_start DATE,
  billing_cycle_end DATE,
  gateway_customer_id VARCHAR(100),        -- id do cliente no Stripe/Pagar.me/Asaas
  gateway_subscription_id VARCHAR(100),
  trial_ends_at DATETIME,
  ip_pool VARCHAR(50) NOT NULL DEFAULT 'shared',   -- 'shared' | 'dedicated'
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE account_usage (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id INT UNSIGNED NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  emails_sent INT UNSIGNED NOT NULL DEFAULT 0,
  contacts_count INT UNSIGNED NOT NULL DEFAULT 0,
  api_calls_count INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_account_period (account_id, period_start),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE api_keys (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id INT UNSIGNED NOT NULL,
  key_hash CHAR(64) NOT NULL,              -- sha256 da chave, nunca guardar em texto puro
  key_prefix VARCHAR(12) NOT NULL,         -- primeiros caracteres exibidos na UI
  scopes SET('read','campaigns','contacts','transactional') NOT NULL,
  last_used_at DATETIME,
  revoked_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE sending_domains (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id INT UNSIGNED NOT NULL,
  domain VARCHAR(255) NOT NULL,
  dkim_selector VARCHAR(50) NOT NULL,
  dkim_private_key TEXT NOT NULL,
  dkim_public_key TEXT NOT NULL,
  spf_verified TINYINT(1) NOT NULL DEFAULT 0,
  dkim_verified TINYINT(1) NOT NULL DEFAULT 0,
  dmarc_verified TINYINT(1) NOT NULL DEFAULT 0,
  verified_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_domain (account_id, domain),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE billing_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id INT UNSIGNED NOT NULL,
  event_type VARCHAR(50) NOT NULL,   -- 'invoice_paid','invoice_failed','subscription_canceled', etc
  gateway_event_id VARCHAR(150) NOT NULL UNIQUE,  -- idempotência do webhook
  payload JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
```

### 1.2 Migration retroativa nas tabelas existentes

Toda tabela hoje ligada a `namespace_id` recebe `account_id`:

```sql
ALTER TABLE lists ADD COLUMN account_id INT UNSIGNED NOT NULL AFTER id;
ALTER TABLE campaigns ADD COLUMN account_id INT UNSIGNED NOT NULL AFTER id;
ALTER TABLE templates ADD COLUMN account_id INT UNSIGNED NOT NULL AFTER id;
ALTER TABLE segments ADD COLUMN account_id INT UNSIGNED NOT NULL AFTER id;
ALTER TABLE send_configurations ADD COLUMN account_id INT UNSIGNED NOT NULL AFTER id;
ALTER TABLE users ADD COLUMN account_id INT UNSIGNED NOT NULL AFTER id;
ALTER TABLE namespaces ADD COLUMN account_id INT UNSIGNED NOT NULL AFTER id;

-- repetir para: automations, campaign_lists, subscriptions (se aplicável na sua fork),
-- reports, custom_fields, files, blacklist

-- índice em toda tabela para performance de filtro (isolamento é usado em toda query)
ALTER TABLE lists ADD INDEX idx_account (account_id);
ALTER TABLE campaigns ADD INDEX idx_account (account_id);
-- ... repetir para as demais
```

Script de backfill (executar uma vez, criando uma `account` "legacy" para os dados já existentes antes de exigir `NOT NULL`):

```sql
INSERT INTO accounts (name, slug, status, plan_id) VALUES ('Legacy', 'legacy', 'active', (SELECT id FROM plans WHERE code='enterprise'));
SET @legacy_id = LAST_INSERT_ID();
UPDATE lists SET account_id = @legacy_id WHERE account_id IS NULL;
-- repetir para todas as tabelas antes de aplicar o NOT NULL
```

---

## 2. Camada de isolamento obrigatório (middleware de acesso a dados)

O ponto mais importante do projeto inteiro: **nenhum model pode ser consultado sem `account_id`**. Não confie em cada endpoint lembrar de filtrar.

Padrão recomendado em `server/models/`:

```js
// server/lib/tenant-scope.js
function requireAccountScope(query, accountId) {
  if (!accountId) {
    throw new Error('SECURITY: query executada sem account_id — bloqueado');
  }
  return query.andWhere('account_id', accountId);
}

module.exports = { requireAccountScope };
```

Todo model (`server/models/lists.js`, `campaigns.js`, etc.) passa a receber o `context` do request (que contém `req.account.id`, resolvido no middleware de autenticação) e usa `requireAccountScope` em toda query de leitura e escrita:

```js
// exemplo em server/models/lists.js
async function getById(context, id) {
  return await knex('lists')
    .where('id', id)
    .modify(requireAccountScope, context.accountId)
    .first();
}
```

**Teste automatizado obrigatório**: escreva um teste de integração que, para cada model, tenta buscar um recurso de uma conta A usando o `accountId` da conta B e espera `null`/erro. Rode isso no CI antes de qualquer deploy — é a rede de segurança contra vazamento entre clientes.

### 2.1 Middleware de resolução de conta (Express)

```js
// server/lib/middleware/resolve-account.js
async function resolveAccount(req, res, next) {
  const user = req.user; // já vem da sessão/autenticação existente
  if (!user) return res.status(401).end();

  const account = await accountsModel.getById(user.account_id);
  if (!account || account.status === 'suspended' || account.status === 'canceled') {
    return res.status(402).json({ error: 'account_inactive' });
  }
  req.account = account;
  next();
}
```

---

## 3. Enforcement de limites por plano

```js
// server/lib/plan-limits.js
async function checkContactLimit(account) {
  const plan = await plansModel.getById(account.plan_id);
  const currentCount = await contactsModel.countByAccount(account.id);
  if (currentCount >= plan.max_contacts) {
    throw new PlanLimitError('contacts', plan.max_contacts);
  }
}

async function checkEmailSendLimit(account, emailsToSend) {
  const plan = await plansModel.getById(account.plan_id);
  const usage = await usageModel.getCurrentPeriod(account.id);
  if (usage.emails_sent + emailsToSend > plan.max_emails_per_month) {
    if (plan.overage_price_per_1000_cents === 0) {
      throw new PlanLimitError('emails_per_month', plan.max_emails_per_month);
    }
    // planos com overage permitido: deixa passar e registra excedente para cobrança
    await usageModel.recordOverage(account.id, emailsToSend);
  }
}
```

Chamar `checkContactLimit` no controller de importação de contatos (`server/routes/rest/subscriptions.js` ou equivalente) e `checkEmailSendLimit` antes de enfileirar uma campanha para envio (`server/routes/rest/campaigns.js`, ação "send").

Job agendado (usar o sistema de filas já existente, ou `node-cron`):

```js
// roda de hora em hora
async function checkUsageAlerts() {
  const accounts = await accountsModel.listActive();
  for (const account of accounts) {
    const plan = await plansModel.getById(account.plan_id);
    const usage = await usageModel.getCurrentPeriod(account.id);
    const pct = usage.emails_sent / plan.max_emails_per_month;
    if (pct >= 0.8 && !usage.alert_80_sent) {
      await mailer.sendUsageAlert(account, pct);
      await usageModel.markAlertSent(account.id, '80');
    }
  }
}
```

---

## 4. Isolamento de envio (Zone-MTA)

### 4.1 Pools de IP por tier

O Zone-MTA suporta múltiplos "sending zones". Configurar em `zone-mta/config/sender.toml` (ou equivalente na sua fork):

```toml
[zones.shared]
  # usado por contas Free/Starter
  interfaces = ["shared-ip-1", "shared-ip-2"]

[zones.dedicated]
  # usado por contas Business/Enterprise com IP dedicado
  # uma "zone" por conta é criada dinamicamente quando dedicated_ip=true
```

No momento do enfileiramento da campanha, o roteamento decide a zona:

```js
// server/lib/mailer-routing.js
function getZoneForAccount(account) {
  if (account.ip_pool === 'dedicated') {
    return `dedicated-${account.id}`;
  }
  return 'shared';
}
```

Contas com `dedicated_ip=true` no plano exigem provisionamento de um IP real de saída (novo endereço na interface de rede do servidor de envio) — isso é trabalho de infra, não só de código, e deve ser semi-automatizado com um script que registra o novo IP no Zone-MTA e atualiza rDNS/PTR.

### 4.2 DKIM e domínio por conta

Hoje o DKIM é global (`Administration/Send Configurations`). Passa a ser por `sending_domains`:

- Ao cadastrar um domínio, gerar par de chaves DKIM (`openssl` via Node `crypto`) e salvar em `sending_domains`.
- Exibir na UI o registro TXT que o cliente precisa colocar no DNS: `selector._domainkey.dominio.com`.
- Job de verificação periódica (`dns.resolveTxt`) que checa SPF/DKIM/DMARC e atualiza `spf_verified`, `dkim_verified`, `dmarc_verified`.
- Bloquear envio de campanha se o domínio de remetente escolhido não estiver com DKIM verificado.

### 4.3 Filas com prioridade

Usando Redis + Bull/BullMQ (o Redis já está no stack):

```js
const highPriorityQueue = new Queue('campaign-send-high', { connection: redisConfig });
const normalQueue = new Queue('campaign-send-normal', { connection: redisConfig });

function enqueueCampaign(account, campaign) {
  const queue = account.ip_pool === 'dedicated' ? highPriorityQueue : normalQueue;
  return queue.add('send', { campaignId: campaign.id, accountId: account.id });
}
```

Workers separados por fila garantem que uma fila cheia de uma conta Free não atrasa envio de uma conta Enterprise.

### 4.4 Suppression list por conta

```sql
CREATE TABLE suppression_list (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id INT UNSIGNED NOT NULL,
  email VARCHAR(255) NOT NULL,
  reason ENUM('bounce','spam_complaint','unsubscribe','manual') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_email (account_id, email)
);
```

Checar essa tabela antes de todo envio, sempre filtrando por `account_id` — um bounce na lista do cliente A nunca deve suprimir um contato do cliente B.

---

## 5. Billing

### 5.1 Gateways recomendados

- **Stripe**: cartão internacional, assinaturas recorrentes, webhooks maduros, biblioteca oficial `stripe` npm.
- **Pagar.me ou Asaas**: Pix e boleto, essencial para o mercado brasileiro de SaaS (cliente brasileiro espera Pix). Rodar os dois em paralelo, escolhendo o gateway por moeda/localização do cliente no cadastro.
- Você já tem um piloto de stablecoin (LiberPay/Polygon) no ClikCount — pode oferecer como terceira opção de pagamento, mas não como único meio, já que a maioria dos clientes de e-mail marketing no Brasil não vai querer lidar com cripto para pagar assinatura.

### 5.2 Webhook handler (Stripe como exemplo)

```js
// server/routes/webhooks/stripe.js
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // idempotência: já processamos esse evento?
  const existing = await billingEventsModel.getByGatewayEventId(event.id);
  if (existing) return res.status(200).end();

  switch (event.type) {
    case 'invoice.paid':
      await accountsModel.setStatus(event.data.object.customer, 'active');
      break;
    case 'invoice.payment_failed':
      await accountsModel.setStatus(event.data.object.customer, 'past_due');
      await mailer.sendPaymentFailedNotice(event.data.object.customer);
      break;
    case 'customer.subscription.deleted':
      await accountsModel.setStatus(event.data.object.customer, 'canceled');
      await mailer.sendCanceledNotice(event.data.object.customer);
      break;
  }

  await billingEventsModel.record(event);
  res.status(200).end();
});
```

### 5.3 Self-service signup

Novo endpoint público (fora da autenticação existente):

```js
// server/routes/public/signup.js
router.post('/signup', async (req, res) => {
  const { companyName, email, password, planCode } = req.body;

  const plan = await plansModel.getByCode(planCode || 'free');
  const trialDays = plan.code === 'free' ? null : 14;

  await db.transaction(async (trx) => {
    const accountId = await accountsModel.create(trx, {
      name: companyName,
      slug: slugify(companyName),
      plan_id: plan.id,
      status: trialDays ? 'trial' : 'active',
      trial_ends_at: trialDays ? addDays(new Date(), trialDays) : null,
    });

    const namespaceId = await namespacesModel.createDefault(trx, accountId);
    await usersModel.create(trx, { accountId, email, password: hashPassword(password), role: 'admin', namespaceId });

    if (plan.code !== 'free') {
      const customer = await stripe.customers.create({ email, name: companyName });
      await accountsModel.setGatewayCustomerId(trx, accountId, customer.id);
    }
  });

  res.status(201).json({ success: true });
});
```

### 5.4 Upgrade/downgrade

```js
async function changePlan(account, newPlanCode) {
  const newPlan = await plansModel.getByCode(newPlanCode);
  const currentContacts = await contactsModel.countByAccount(account.id);

  if (currentContacts > newPlan.max_contacts) {
    throw new PlanChangeBlockedError(
      `Conta tem ${currentContacts} contatos, acima do limite de ${newPlan.max_contacts} do plano ${newPlanCode}`
    );
  }

  await stripe.subscriptions.update(account.gateway_subscription_id, {
    items: [{ id: currentItemId, price: newPlan.stripe_price_id }],
    proration_behavior: 'create_prorations',
  });

  await accountsModel.setPlan(account.id, newPlan.id);
}
```

---

## 6. API pública multi-tenant

```sql
-- já criada na seção 1: api_keys
```

Middleware de autenticação por API key:

```js
// server/lib/middleware/api-key-auth.js
async function apiKeyAuth(req, res, next) {
  const rawKey = req.headers['api-key'];
  if (!rawKey) return res.status(401).json({ error: 'missing_api_key' });

  const hash = sha256(rawKey);
  const keyRecord = await apiKeysModel.getByHash(hash);
  if (!keyRecord || keyRecord.revoked_at) return res.status(401).json({ error: 'invalid_api_key' });

  const account = await accountsModel.getById(keyRecord.account_id);
  if (account.status !== 'active' && account.status !== 'trial') {
    return res.status(402).json({ error: 'account_inactive' });
  }

  req.account = account;
  req.apiScopes = keyRecord.scopes;
  await apiKeysModel.touchLastUsed(keyRecord.id);
  next();
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiScopes.includes(scope)) return res.status(403).json({ error: 'insufficient_scope' });
    next();
  };
}
```

Rate limiting por plano (usando `rate-limiter-flexible` com Redis):

```js
const rateLimiters = {
  free: new RateLimiterRedis({ storeClient: redis, points: 60, duration: 60 }),      // 60 req/min
  business: new RateLimiterRedis({ storeClient: redis, points: 600, duration: 60 }), // 600 req/min
};

async function apiRateLimit(req, res, next) {
  const plan = await plansModel.getById(req.account.plan_id);
  const limiter = rateLimiters[plan.code] || rateLimiters.free;
  try {
    await limiter.consume(req.account.id);
    next();
  } catch {
    res.status(429).json({ error: 'rate_limit_exceeded' });
  }
}
```

Separar rotas: `/api/v1/campaigns/*` (marketing, sujeito a limite mensal e reputação de pool compartilhado) vs `/api/v1/transactional/*` (endpoint transacional, tratado com prioridade e billing por volume separado, como a Brevo faz).

---

## 7. Frontend do app (client)

Novas telas dentro do client existente (React/Vue conforme sua stack atual):

- `client/src/billing/PlanComparison.jsx` — tabela comparativa de planos
- `client/src/billing/UsageDashboard.jsx` — barra de progresso de contatos/e-mails usados no mês, com aviso quando > 80%
- `client/src/billing/InvoiceHistory.jsx` — histórico de faturas (puxando do Stripe via endpoint interno)
- `client/src/billing/PaymentMethod.jsx` — trocar cartão / dados de Pix
- `client/src/settings/SendingDomains.jsx` — wizard de cadastro de domínio com instruções de DNS (SPF/DKIM/DMARC) e status de verificação em tempo real
- `client/src/settings/ApiKeys.jsx` — gerar/revogar chaves de API, com seleção de escopos

---

## 8. Landing page comercial (novo projeto separado)

A landing comercial **não deve morar dentro do client logado**. Ela é um site de marketing público, com necessidades diferentes (SEO, velocidade de carregamento, CMS para o time de marketing editar sem deploy, formulário de captura de lead).

### 8.1 Stack recomendada

- **Next.js (App Router) com SSG/ISR**, ou Astro se quiser algo ainda mais leve para conteúdo estático — ambos geram HTML pré-renderizado, essencial para SEO de página comercial.
- Deploy separado do app principal (ex: Vercel, ou dentro do mesmo docker-compose como um serviço `landing` independente, atrás do mesmo reverse proxy).
- Domínio dedicado: `www.suamarca.com` (institucional) apontando para a landing, enquanto `app.suamarca.com` continua sendo o client atual (trusted endpoint).

### 8.2 Estrutura de conteúdo (seções da home)

1. **Hero**: proposta de valor em uma frase + CTA "Começar grátis" (leva ao signup) + CTA secundário "Ver planos"
2. **Prova social**: logos de clientes (se houver) ou números (ex: "X milhões de e-mails entregues")
3. **Features principais**: segmentação, automação, editor de templates (MJML), relatórios — puxar do que o ClikNews já faz bem
4. **Tabela de planos** (Free / Starter / Business / Enterprise) — mesma fonte de dados da tabela `plans` do banco, renderizada via API pública `/api/public/plans` para nunca ficar dessincronizada do que está realmente configurado no sistema de billing
5. **Comparação com concorrentes** (opcional, mas a Brevo faz isso — "por que trocar")
6. **FAQ** (perguntas sobre migração de outra plataforma, LGPD, suporte em português)
7. **Rodapé** com links institucionais, política de privacidade, termos de uso

### 8.3 Formulário de signup na landing

O botão "Começar grátis" da landing chama diretamente o endpoint público `/signup` descrito na seção 5.3 do app principal (via CORS liberado só para o domínio da landing), redirecionando o usuário para `app.suamarca.com` já autenticado após o cadastro (usar um token de onboarding de uso único, não a senha em texto).

### 8.4 Endpoint público de planos (para manter landing e billing sincronizados)

```js
// server/routes/public/plans.js
router.get('/api/public/plans', async (req, res) => {
  const plans = await plansModel.listActive(); // apenas is_active=1
  res.json(plans.map(p => ({
    code: p.code,
    name: p.name,
    price_monthly: p.price_monthly_cents / 100,
    price_yearly: p.price_yearly_cents / 100,
    max_contacts: p.max_contacts,
    max_emails_per_month: p.max_emails_per_month,
    features: {
      api_access: p.api_access,
      dedicated_ip: p.dedicated_ip,
      custom_dkim: p.custom_dkim,
    }
  })));
});
```

Isso evita o problema clássico de landing pages de SaaS: tabela de preço "hardcoded" no marketing site que fica desatualizada em relação ao que o sistema de billing realmente cobra.

### 8.5 SEO e performance

- Meta tags dinâmicas por página (Next.js `generateMetadata`)
- Sitemap.xml e robots.txt
- Core Web Vitals: imagens otimizadas (`next/image`), fontes com `font-display: swap`
- Blog opcional em `/blog` para SEO de conteúdo (conteúdo em português sobre e-mail marketing, deliverability, LGPD — aproveitar sua experiência editorial do Clikdata Drops)

### 8.6 Infra (docker-compose)

```yaml
services:
  landing:
    build: ./landing
    environment:
      - NEXT_PUBLIC_APP_URL=https://app.suamarca.com
      - NEXT_PUBLIC_SIGNUP_API=https://app.suamarca.com/api/public
    ports:
      - "3005:3000"
```

Nginx/reverse proxy: `www.suamarca.com` → serviço `landing`; `app.suamarca.com` → serviço `cliknews` (trusted); manter `sbox-` e endpoint público de listas como já estão hoje.

---

## 9. Ordem de execução recomendada

1. Criar tabelas `plans`, `accounts`, backfill de `account_id`, camada de isolamento com testes de segurança
2. Middleware de enforcement de limites (contatos e e-mails) + job de alertas de uso
3. Integração de billing (Stripe + Pagar.me/Asaas) com self-service signup e webhooks
4. Isolamento de envio: domínios/DKIM por conta, filas com prioridade, suppression list por conta
5. IP pools dedicados para planos altos (é o item mais dependente de infra física/rede)
6. API pública com chaves e rate limiting por plano
7. Frontend de billing e configurações no client
8. Landing comercial (pode ser desenvolvida em paralelo, por outra pessoa/time, já que depende só do endpoint público de planos e do endpoint de signup)

Os itens 1 e 2 são pré-requisito de tudo — não avance para billing antes de ter certeza de que o isolamento entre contas está correto e testado.
