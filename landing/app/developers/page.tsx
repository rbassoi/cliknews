import type {Metadata} from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CodeBlock from '@/components/CodeBlock';
import DevDocsNav, {DocSection} from '@/components/DevDocsNav';
import {APP_URL, LOGIN_URL} from '@/lib/config';

export const metadata: Metadata = {
    title: 'Documentação da API — Cliker',
    description: 'Autentique, envie campanhas, gerencie contatos e dispare e-mails transacionais direto da API do Cliker.'
};

const API_BASE = `${APP_URL}/api-v1`;

const sections: DocSection[] = [
    {id: 'introducao', label: 'Introdução'},
    {id: 'autenticacao', label: 'Autenticação'},
    {id: 'limites-de-taxa', label: 'Limites de taxa'},
    {id: 'erros', label: 'Erros'},
    {id: 'conta', label: 'Conta'},
    {id: 'contatos', label: 'Contatos'},
    {id: 'campanhas', label: 'Campanhas'},
    {id: 'transacional', label: 'E-mail transacional'}
];

function Endpoint({method, path}: {method: 'GET' | 'POST'; path: string}) {
    const color = method === 'GET' ? 'oklch(0.5 0.15 150)' : 'var(--cn-accent)';
    return (
        <div style={{display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 12px'}}>
            <span
                style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                    color: 'white',
                    background: color,
                    borderRadius: 'var(--cn-radius-sm)',
                    padding: '3px 8px'
                }}
            >
                {method}
            </span>
            <code style={{fontSize: 14.5, fontWeight: 600}}>{path}</code>
        </div>
    );
}

function Scope({name}: {name: string}) {
    return <span className="cn-pill" style={{marginLeft: 8}}>escopo: {name}</span>;
}

function Section({id, title, children}: {id: string; title: string; children: React.ReactNode}) {
    return (
        <section id={id} style={{padding: '40px 0', borderBottom: '1px solid var(--cn-border)'}}>
            <h2 style={{fontSize: 24, fontWeight: 800, marginBottom: 16}}>{title}</h2>
            {children}
        </section>
    );
}

export default function DevelopersPage() {
    return (
        <>
            <Header />
            <main>
                <div style={{padding: '56px 0 0'}}>
                    <div className="cn-container">
                        <span className="cn-pill">API v1</span>
                        <h1 style={{fontSize: 40, fontWeight: 800, marginTop: 16, maxWidth: 700}}>
                            Documentação da API
                        </h1>
                        <p style={{color: 'var(--cn-text-muted)', fontSize: 17, marginTop: 12, maxWidth: 620}}>
                            Gerencie contatos, dispare campanhas e envie e-mails transacionais direto do seu código.
                            Toda a API é organizada por conta, autenticada por chave, e segue os mesmos limites do seu plano.
                        </p>
                    </div>
                </div>

                <div className="cn-container" style={{display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56, alignItems: 'start', paddingTop: 40}}>
                    <DevDocsNav sections={sections} />

                    <div style={{minWidth: 0, maxWidth: 720}}>
                        <Section id="introducao" title="Introdução">
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7}}>
                                A API do Cliker usa URLs previsíveis orientadas a recursos, corpos e respostas em JSON, e códigos de status HTTP
                                padrão. Toda chamada é escopada à sua conta — você nunca vê dados de outra conta, e uma chave de API só
                                enxerga o que os escopos dela permitem.
                            </p>
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7, marginTop: 12}}>
                                A URL base para todas as chamadas é:
                            </p>
                            <CodeBlock label="Base URL" code={API_BASE} />
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7, marginTop: 20}}>
                                <strong>Como começar:</strong> gere uma chave em{' '}
                                <a href={`${APP_URL}/api-keys`} style={{color: 'var(--cn-accent-text)', fontWeight: 600}}>
                                    {APP_URL}/api-keys
                                </a>{' '}
                                (é preciso estar logado — <a href={LOGIN_URL} style={{color: 'var(--cn-accent-text)', fontWeight: 600}}>entre na sua conta</a> primeiro),
                                escolha os escopos que essa chave vai usar, e faça sua primeira chamada:
                            </p>
                            <CodeBlock
                                label="cURL"
                                code={`curl ${API_BASE}/account \\\n  -H "Api-Key: cn_sua_chave_aqui"`}
                            />
                        </Section>

                        <Section id="autenticacao" title="Autenticação">
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7}}>
                                Envie sua chave de API no header <code>Api-Key</code> em toda requisição. Chaves são específicas da sua conta
                                (não de um usuário) e podem ser revogadas a qualquer momento em{' '}
                                <a href={`${APP_URL}/api-keys`} style={{color: 'var(--cn-accent-text)', fontWeight: 600}}>Configurações → Chaves de API</a>.
                            </p>
                            <CodeBlock
                                label="Header de autenticação"
                                code={'Api-Key: cn_0a9cd8d838ad847ce88aa08eff07e4e89b4e56fe1982a82c'}
                            />
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7, marginTop: 16}}>
                                Cada chave tem um ou mais escopos, definidos na criação:
                            </p>
                            <ul style={{color: 'var(--cn-text-secondary)', lineHeight: 1.9, paddingLeft: 20}}>
                                <li><code>read</code> — informações da conta</li>
                                <li><code>contacts</code> — listar e criar contatos</li>
                                <li><code>campaigns</code> — listar e disparar campanhas</li>
                                <li><code>transactional</code> — enviar e-mails transacionais avulsos</li>
                            </ul>
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7, marginTop: 12}}>
                                Uma chamada sem a chave retorna <code>401 missing_api_key</code>; com uma chave inválida, <code>401 invalid_api_key</code>;
                                sem o escopo necessário, <code>403 insufficient_scope</code>.
                            </p>
                        </Section>

                        <Section id="limites-de-taxa" title="Limites de taxa">
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7}}>
                                Cada plano tem um limite de requisições por minuto, aplicado por conta (não por chave — todas as chaves da
                                mesma conta dividem o mesmo limite). Ultrapassar o limite retorna <code>429 rate_limit_exceeded</code>.
                            </p>
                            <div style={{overflowX: 'auto', marginTop: 16}}>
                                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 14}}>
                                    <thead>
                                        <tr style={{textAlign: 'left', color: 'var(--cn-text-faint)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em'}}>
                                            <th style={{padding: '8px 0', borderBottom: '1px solid var(--cn-border)'}}>Plano</th>
                                            <th style={{padding: '8px 0', borderBottom: '1px solid var(--cn-border)'}}>Requisições / minuto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            ['Grátis', '60'],
                                            ['Starter', '180'],
                                            ['Business', '600'],
                                            ['Enterprise', '2.000']
                                        ].map(([plan, limit]) => (
                                            <tr key={plan}>
                                                <td style={{padding: '10px 0', borderBottom: '1px solid var(--cn-border-subtle)', fontWeight: 600}}>{plan}</td>
                                                <td style={{padding: '10px 0', borderBottom: '1px solid var(--cn-border-subtle)', color: 'var(--cn-text-muted)'}}>{limit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>

                        <Section id="erros" title="Erros">
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7}}>
                                Erros sempre retornam JSON com um código de status HTTP apropriado:
                            </p>
                            <CodeBlock
                                label="Resposta de erro"
                                code={JSON.stringify({error: 'mensagem descrevendo o problema', data: []}, null, 2)}
                            />
                            <div style={{overflowX: 'auto', marginTop: 16}}>
                                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 14}}>
                                    <thead>
                                        <tr style={{textAlign: 'left', color: 'var(--cn-text-faint)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.03em'}}>
                                            <th style={{padding: '8px 0', borderBottom: '1px solid var(--cn-border)'}}>Código</th>
                                            <th style={{padding: '8px 0', borderBottom: '1px solid var(--cn-border)'}}>Significado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            ['400', 'Parâmetro obrigatório ausente ou inválido'],
                                            ['401', 'Chave de API ausente ou inválida'],
                                            ['402', 'Limite do plano atingido (contatos ou envios/mês)'],
                                            ['403', 'Chave sem o escopo necessário para esse endpoint'],
                                            ['404', 'Recurso não encontrado (ou pertence a outra conta)'],
                                            ['409', 'Ação inválida para o estado atual do recurso'],
                                            ['429', 'Limite de requisições por minuto excedido']
                                        ].map(([code, meaning]) => (
                                            <tr key={code}>
                                                <td style={{padding: '10px 0', borderBottom: '1px solid var(--cn-border-subtle)', fontWeight: 700, fontFamily: 'monospace'}}>{code}</td>
                                                <td style={{padding: '10px 0', borderBottom: '1px solid var(--cn-border-subtle)', color: 'var(--cn-text-muted)'}}>{meaning}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>

                        <Section id="conta" title="Conta">
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7}}>
                                Retorna informações básicas da conta dona da chave usada — nome, status, plano e limites atuais.
                            </p>

                            <Endpoint method="GET" path="/account" />
                            <Scope name="read" />
                            <CodeBlock
                                label="cURL"
                                code={`curl ${API_BASE}/account \\\n  -H "Api-Key: cn_sua_chave_aqui"`}
                            />
                            <CodeBlock
                                label="Resposta 200"
                                code={JSON.stringify({
                                    name: 'Minha Empresa',
                                    status: 'active',
                                    plan_code: 'business',
                                    max_contacts: 50000,
                                    max_emails_per_month: 200000
                                }, null, 2)}
                            />
                        </Section>

                        <Section id="contatos" title="Contatos">
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7}}>
                                Contatos vivem dentro de uma lista específica — ao criar um contato pela API, informe a qual lista ele pertence.
                                A listagem, porém, é unificada: retorna contatos de todas as listas que a conta possui, sem duplicar por e-mail.
                            </p>

                            <Endpoint method="GET" path="/contacts" />
                            <Scope name="contacts" />
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7, marginTop: 4}}>
                                Parâmetros opcionais: <code>status</code> (1=inscrito, 2=descadastrado, 3=bounce, 4=reclamação) e{' '}
                                <code>limit</code> (padrão 100, máximo 500).
                            </p>
                            <CodeBlock
                                label="cURL"
                                code={`curl "${API_BASE}/contacts?status=1&limit=50" \\\n  -H "Api-Key: cn_sua_chave_aqui"`}
                            />
                            <CodeBlock
                                label="Resposta 200"
                                code={JSON.stringify({
                                    data: [
                                        {email: 'ana@exemplo.com.br', status: 1, lists: ['Newsletter'], created: '2026-06-01T12:00:00.000Z'}
                                    ]
                                }, null, 2)}
                            />

                            <Endpoint method="POST" path="/contacts" />
                            <Scope name="contacts" />
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7, marginTop: 4}}>
                                Cria (ou atualiza, se o e-mail já existir na lista) um contato. Campos além de <code>email</code> dependem
                                dos campos customizados configurados na lista de destino — o exemplo abaixo assume campos "first_name"/"last_name".
                            </p>
                            <CodeBlock
                                label="cURL"
                                code={`curl -X POST ${API_BASE}/contacts \\\n  -H "Api-Key: cn_sua_chave_aqui" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "list_id": 12,\n    "email": "ana@exemplo.com.br",\n    "first_name": "Ana"\n  }'`}
                            />
                            <CodeBlock label="Resposta 201" code={JSON.stringify({id: 4831}, null, 2)} />
                        </Section>

                        <Section id="campanhas" title="Campanhas">
                            <Endpoint method="GET" path="/campaigns" />
                            <Scope name="campaigns" />
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7, marginTop: 4}}>
                                Parâmetro opcional: <code>limit</code> (padrão 50, máximo 200).
                            </p>
                            <CodeBlock
                                label="cURL"
                                code={`curl ${API_BASE}/campaigns \\\n  -H "Api-Key: cn_sua_chave_aqui"`}
                            />
                            <CodeBlock
                                label="Resposta 200"
                                code={JSON.stringify({
                                    data: [
                                        {id: 88, name: 'Newsletter de julho', cid: 'cmp-xyz', status: 1, scheduled: null, created: '2026-06-01T12:00:00.000Z'}
                                    ]
                                }, null, 2)}
                            />

                            <Endpoint method="POST" path="/campaigns/:id/send" />
                            <Scope name="campaigns" />
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7, marginTop: 4}}>
                                Agenda o envio imediato de uma campanha existente (criada pela interface). Só funciona se ela estiver em um
                                estado que permita iniciar o envio — do contrário retorna <code>409</code>.
                            </p>
                            <CodeBlock
                                label="cURL"
                                code={`curl -X POST ${API_BASE}/campaigns/88/send \\\n  -H "Api-Key: cn_sua_chave_aqui"`}
                            />
                            <CodeBlock label="Resposta 200" code={JSON.stringify({status: 5}, null, 2)} />
                        </Section>

                        <Section id="transacional" title="E-mail transacional">
                            <p style={{color: 'var(--cn-text-secondary)', lineHeight: 1.7}}>
                                Envia um e-mail avulso (recibo, confirmação, redefinição de senha) fora do fluxo de campanhas e listas —
                                não passa por inscrição/descadastro. Requer o id de uma configuração de envio já existente na sua conta.
                            </p>

                            <Endpoint method="POST" path="/transactional/send" />
                            <Scope name="transactional" />
                            <CodeBlock
                                label="cURL"
                                code={`curl -X POST ${API_BASE}/transactional/send \\\n  -H "Api-Key: cn_sua_chave_aqui" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "send_configuration_id": 3,\n    "to": "cliente@exemplo.com.br",\n    "subject": "Seu pedido foi confirmado",\n    "html": "<p>Obrigado pela compra!</p>"\n  }'`}
                            />
                            <CodeBlock label="Resposta 202" code={JSON.stringify({queued: true}, null, 2)} />
                        </Section>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
