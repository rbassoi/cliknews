# Integração Cliker ↔ VoxBase (Account API v1)

Este documento responde ao checklist de integração enviado pelo VoxBase, item
por item. Todos os endpoints ficam sob `/api-v1`, autenticados por uma única
API Key de conta (header `Api-Key`), sem sessão de usuário.

**Base URL (produção):** `https://app.cliker.com.br/api-v1`

## 1. Credenciais

Gere uma API Key em **Configurações → API Keys** (ou `POST /rest/api-keys`
com sessão de admin) com os escopos:

```
campaigns, contacts
```

Uma única credencial cobre todos os endpoints abaixo — inclusive
`POST /api-v1/lists`, que agora existe na Account API. Não é mais necessário
guardar também um Personal Access Token da Legacy API.

Envie a key em todas as chamadas via header:

```
Api-Key: cn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 2. Criação de lista — `POST /api-v1/lists`

```json
// request
{
  "name": "Clientes VoxBase",
  "description": "opcional",
  "contact_email": "opcional",
  "homepage": "opcional"
}
// response 201
{ "id": 22 }
```

Só `name` é obrigatório. A lista é criada sem formulário público de inscrição
(`public_subscribe: false`) — ela é só para contatos importados via API.

## 3. Criação de campanha — `POST /api-v1/campaigns`

```json
// request
{
  "name": "Campanha de teste",
  "subject": "Olá [NOME]",
  "html": "<p>Oi [NOME], seu e-mail é [EMAIL]</p>",
  "text": "opcional — versão texto puro",
  "list_id": 22,
  "send_configuration_id": 1,
  "sender": { "name": "opcional", "email": "opcional" },
  "unsubscribe_url": "opcional",
  "click_tracking_disabled": false,
  "open_tracking_disabled": false,
  "idempotency_key": "opcional — ver abaixo"
}
// response 201
{ "id": 8 }
```

Campos obrigatórios: `name`, `subject`, `html`, `list_id` (ou `list_ids: [...]`
para múltiplas listas) e `send_configuration_id` (ver item 4).

### Evitando campanhas duplicadas — `idempotency_key`

Se essa chamada for repetida (retry por timeout, reenvio de fila/webhook do
lado do voxbase etc.), cada repetição criava uma campanha nova antes desta
mudança. Envie um `idempotency_key` estável (ex: o id da solicitação de envio
no voxbase) e chamadas repetidas com a mesma chave retornam o `id` da
campanha já criada em vez de criar outra. A chave é única por conta — é
seguro reusar o mesmo valor entre contas diferentes, mas não reuse a mesma
chave para duas campanhas realmente distintas na mesma conta.

### Sintaxe de merge tag

Campanhas criadas por esta API sempre usam a sintaxe `simple` (colchetes),
**não** `{{...}}` estilo Handlebars:

```
[EMAIL]     → sempre disponível, e-mail do contato
[<KEY>]     → qualquer campo customizado da lista, onde <KEY> é o campo
              "key" retornado por GET /api-v1/lists/:id/fields (ex: [NOME])
```

O mesmo `key` é usado nos três lugares — na tag do template, no nome da
propriedade JSON ao criar o contato (item 3 abaixo), e na resposta de
`GET /lists/:id/fields` — então a conversão automática do voxbase é direta:
`key` do campo = nome da variável no template = nome do campo no JSON.

### Agendamento — `POST /api-v1/campaigns/:id/send`

```json
// enviar agora (comportamento anterior, sem mudança)
{}

// agendar para o futuro
{
  "send_at": "2026-08-25T14:00:00-03:00",
  "timezone": "America/Sao_Paulo"
}
```

- `send_at`: string ISO-8601 **com offset de fuso explícito** (`-03:00` ou
  `Z`) — é interpretada como um instante absoluto, sem cálculo adicional de
  fuso no servidor. Preencha com o valor que o usuário já configurou no
  voxbase (`data_agendamento`).
- `timezone`: opcional, string IANA (ex: `America/Sao_Paulo`), guardada só
  para exibição — não afeta o cálculo do horário de disparo.
- O Cliker guarda o valor e dispara sozinho no horário certo: o processo de
  envio já roda em background (checagem a cada 30s) e não precisa de nenhuma
  chamada adicional do voxbase além desta.
- Resposta: `{"status": 2}` (2 = agendada). Ver tabela de status no item 5.

## 4. Contatos — `POST /api-v1/contacts`

```json
// request
{
  "list_id": 22,
  "email": "cliente@exemplo.com",
  "NOME": "João da Silva",
  "CIDADE": "São Paulo"
}
// response 201
{ "id": 1 }
```

- `list_id` e `email` são obrigatórios.
- Qualquer outra propriedade no corpo é interpretada como o **key** de um
  campo customizado da lista (veja `GET /api-v1/lists/:id/fields` abaixo
  para descobrir quais keys existem em cada lista, e criar campos novos pela
  UI do Cliker se precisar de mais). Keys desconhecidas são ignoradas
  silenciosamente.
- Se o e-mail já existir na lista, o contato é **atualizado** (não dá erro
  de duplicidade).
- Campos de sistema opcionais: `tz` (fuso do contato), `status`
  (1=inscrito, 2=descadastrado — default é inscrito), `is_test`.

### Descobrir campos customizados — `GET /api-v1/lists/:id/fields`

```json
// response
{
  "data": [
    { "key": "NOME", "name": "Nome", "type": "text", "required": 0, "default_value": null, "group": null, "settings": "{}" },
    { "key": "CIDADE", "name": "Cidade", "type": "text", "required": 0, "default_value": null, "group": null, "settings": "{}" }
  ]
}
```

Chame isso uma vez por lista para montar o mapeamento
`atributo local do voxbase → key do Cliker` antes de importar contatos.

## 5. Send configurations — `GET /api-v1/send-configurations`

```json
{ "data": [ { "id": 1, "name": "System" } ] }
```

Se a lista vier vazia, é preciso criar pelo menos uma configuração de envio
pela UI do Cliker (Configurações → Configurações de Envio) antes de a
integração funcionar — isso não é feito via API. Use o `id` retornado como
`send_configuration_id` na criação de campanhas.

## 6. Status da campanha — `GET /api-v1/campaigns/:id`

```json
{
  "id": 8,
  "name": "VoxBase Test Campaign",
  "cid": "LfNUkDDQMs",
  "subject": "Hello [NOME]",
  "status": 3,
  "status_label": "sent",
  "scheduled": "2026-08-25T00:14:33.000Z",
  "delivered": 1,
  "opened": 0,
  "clicks": 0,
  "bounced": 0,
  "complained": 0,
  "unsubscribed": 0,
  "blacklisted": 0,
  "total": 1
}
```

### Tabela de status

| `status` | `status_label` | Significado |
|---|---|---|
| 1 | `idle` | criada, ainda não agendada/enviada |
| 2 | `scheduled` | agendada — aguardando o horário de `send_at` |
| 7 | `sending` | disparando agora |
| 3 | `sent` | concluída |
| 4 | `paused` | pausada manualmente |
| 8 | `pausing` | pausando (transição) |

O voxbase pode fazer polling neste endpoint (ex: a cada 1–5 min) para mover
a campanha local de "Agendada" para "Concluída" quando `status_label` virar
`"sent"`.

## 7. Estatísticas (abertura/clique/bounce)

Já incluído na resposta do item 6 acima — `opened`, `clicks`, `bounced`,
`complained`, `unsubscribed`, `blacklisted` e `total` (destinatários) vêm
juntos, sem custo extra de chamada. Não há endpoint separado nem detalhe por
destinatário (quem abriu, qual link foi clicado) disponível via API por
enquanto — isso fica para uma segunda etapa, se for necessário.

## 8. Webhooks

**Não implementado nesta primeira etapa.** O voxbase deve usar polling em
`GET /api-v1/campaigns/:id` (itens 6/7 acima) para acompanhar o progresso.
Notificação push (Cliker → voxbase a cada evento) fica para uma segunda
etapa, seguindo o padrão já usado para GupShup/Evolution no voxbase.

## Endpoints adicionais (já existentes, não fazem parte do checklist mas disponíveis)

| Method | Path | Scope | Descrição |
|---|---|---|---|
| GET | `/account` | `read` | Dados da conta (nome, status, plano, limites) |
| GET | `/lists` | `campaigns` | Lista todas as listas `{id, name, subscribers}` |
| GET | `/contacts` | `contacts` | Lista contatos da conta (`?limit=`, `?status=`) |
| GET | `/contacts/count` | `contacts` | Total de contatos da conta |
| GET | `/campaigns` | `campaigns` | Lista campanhas da conta (`?limit=`) |
| POST | `/transactional/send` | `transactional` | Envia um e-mail avulso (fora de campanha) |

## Exemplo de fluxo completo

```
1. POST /api-v1/lists                    → {id: 22}
2. GET  /api-v1/lists/22/fields          → [] (lista nova, sem campos ainda)
   (criar campos customizados pela UI do Cliker, se precisar de NOME/CIDADE/etc.)
3. GET  /api-v1/lists/22/fields          → [{key: "NOME", ...}, ...]
4. POST /api-v1/contacts                 → {list_id: 22, email: "...", NOME: "..."}
5. GET  /api-v1/send-configurations      → [{id: 1, name: "System"}]
6. POST /api-v1/campaigns                → {name, subject: "Olá [NOME]", html: "...[NOME]...[EMAIL]...", list_id: 22, send_configuration_id: 1}
7. POST /api-v1/campaigns/:id/send       → {send_at: "2026-08-25T14:00:00-03:00", timezone: "America/Sao_Paulo"}
8. GET  /api-v1/campaigns/:id            → poll até status_label === "sent"
```
