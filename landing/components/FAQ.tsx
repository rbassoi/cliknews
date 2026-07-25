const faqs = [
    {
        q: 'Consigo migrar de outra plataforma de e-mail marketing?',
        a: 'Sim. Você pode importar seus contatos via CSV com mapeamento de colunas — leva poucos minutos e não exige conhecimento técnico.'
    },
    {
        q: 'O ClikNews está em conformidade com a LGPD?',
        a: 'Sim. Contatos podem ser removidos ou anonimizados sob demanda, e o descadastro é automático em todo envio.'
    },
    {
        q: 'Quais formas de pagamento vocês aceitam?',
        a: 'Cartão de crédito, Pix e boleto para clientes no Brasil.'
    },
    {
        q: 'Existe suporte em português?',
        a: 'Sim, todo o suporte é feito em português, por um time que também é brasileiro.'
    },
    {
        q: 'Posso trocar de plano depois?',
        a: 'Sim, você pode fazer upgrade ou downgrade a qualquer momento — o valor é ajustado proporcionalmente no seu ciclo de cobrança.'
    }
];

export default function FAQ() {
    return (
        <section id="faq" style={{background: 'var(--cn-bg-subtle)'}}>
            <div className="cn-container" style={{maxWidth: 720}}>
                <div style={{textAlign: 'center', marginBottom: 40}}>
                    <h2 style={{fontSize: 32, fontWeight: 800}}>Perguntas frequentes</h2>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                    {faqs.map(item => (
                        <details key={item.q} className="cn-card" style={{padding: '18px 22px'}}>
                            <summary style={{fontWeight: 600, fontSize: 15, cursor: 'pointer'}}>{item.q}</summary>
                            <p style={{marginTop: 12, marginBottom: 0, color: 'var(--cn-text-muted)', fontSize: 14, lineHeight: 1.6}}>{item.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
