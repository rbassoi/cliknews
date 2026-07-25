import {getPlans, formatBRL, formatNumber} from '@/lib/plans';
import {LOGIN_URL} from '@/lib/config';

export default async function PlansTable() {
    const plans = await getPlans();

    if (plans.length === 0) {
        return (
            <section id="planos">
                <div className="cn-container" style={{textAlign: 'center'}}>
                    <h2 style={{fontSize: 32, fontWeight: 800, marginBottom: 12}}>Planos</h2>
                    <p style={{color: 'var(--cn-text-muted)'}}>
                        Não foi possível carregar os planos agora. Tente novamente em instantes.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section id="planos" style={{background: 'var(--cn-bg-subtle)'}}>
            <div className="cn-container">
                <div style={{textAlign: 'center', maxWidth: 620, margin: '0 auto 48px'}}>
                    <h2 style={{fontSize: 32, fontWeight: 800}}>Planos para cada fase do seu negócio</h2>
                    <p style={{color: 'var(--cn-text-muted)', marginTop: 12, fontSize: 16}}>
                        Preços sincronizados direto com o sistema de cobrança — o que você vê aqui é o que você paga.
                    </p>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: `repeat(${plans.length}, 1fr)`, gap: 20}}>
                    {plans.map((plan, idx) => {
                        const highlighted = idx === plans.length - 2; // second-to-last ("Business"-ish) reads as the recommended tier
                        return (
                            <div
                                key={plan.code}
                                className="cn-card"
                                style={{
                                    padding: '28px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 16,
                                    borderColor: highlighted ? 'var(--cn-accent)' : undefined,
                                    borderWidth: highlighted ? 2 : 1,
                                    position: 'relative'
                                }}
                            >
                                {highlighted && (
                                    <div className="cn-pill" style={{position: 'absolute', top: -12, left: 24}}>Mais popular</div>
                                )}

                                <div>
                                    <div style={{fontSize: 15, fontWeight: 700}}>{plan.name}</div>
                                    <div style={{marginTop: 8}}>
                                        <span style={{fontSize: 30, fontWeight: 800}}>
                                            {plan.price_monthly === 0 ? 'Grátis' : formatBRL(plan.price_monthly)}
                                        </span>
                                        {plan.price_monthly > 0 && <span style={{fontSize: 13, color: 'var(--cn-text-muted)'}}>/mês</span>}
                                    </div>
                                </div>

                                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5}}>
                                    <li>Até {formatNumber(plan.max_contacts)} contatos</li>
                                    <li>{formatNumber(plan.max_emails_per_month)} e-mails/mês</li>
                                    <li>Até {plan.max_users} usuário{plan.max_users > 1 ? 's' : ''}</li>
                                    {plan.features.api_access && <li>Acesso à API</li>}
                                    {plan.features.custom_dkim && <li>Domínio e DKIM próprios</li>}
                                    {plan.features.dedicated_ip && <li>IP dedicado</li>}
                                </ul>

                                <a
                                    className={highlighted ? 'cn-btn cn-btn-primary' : 'cn-btn cn-btn-outline'}
                                    style={{justifyContent: 'center', marginTop: 'auto'}}
                                    href={LOGIN_URL}
                                >
                                    Começar com {plan.name}
                                </a>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
