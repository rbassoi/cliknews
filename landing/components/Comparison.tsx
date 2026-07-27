const rows = [
    {feature: 'Suporte em português', cliker: true, outros: false},
    {feature: 'Pix no checkout', cliker: true, outros: false},
    {feature: 'Editor de e-mail arrasta-e-solta', cliker: true, outros: true},
    {feature: 'Conformidade com a LGPD nativa', cliker: true, outros: false},
    {feature: 'API e webhooks', cliker: true, outros: true}
];

function Check({on}: {on: boolean}) {
    return (
        <span style={{color: on ? 'var(--cn-positive)' : 'var(--cn-text-faint)', fontWeight: 700}}>
            {on ? '✓' : '—'}
        </span>
    );
}

export default function Comparison() {
    return (
        <section>
            <div className="cn-container" style={{maxWidth: 720}}>
                <div style={{textAlign: 'center', marginBottom: 40}}>
                    <h2 style={{fontSize: 32, fontWeight: 800}}>Por que trocar</h2>
                    <p style={{color: 'var(--cn-text-muted)', marginTop: 12, fontSize: 16}}>
                        Comparado às plataformas internacionais mais conhecidas do mercado.
                    </p>
                </div>

                <div className="cn-card" style={{overflow: 'hidden'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '14px 20px', background: 'var(--cn-bg-subtle)', fontSize: 12, fontWeight: 700, color: 'var(--cn-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em'}}>
                        <div></div>
                        <div style={{textAlign: 'center'}}>Cliker</div>
                        <div style={{textAlign: 'center'}}>Outras plataformas</div>
                    </div>
                    {rows.map(r => (
                        <div key={r.feature} style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '16px 20px', borderTop: '1px solid var(--cn-border)', fontSize: 14, alignItems: 'center'}}>
                            <div>{r.feature}</div>
                            <div style={{textAlign: 'center'}}><Check on={r.cliker} /></div>
                            <div style={{textAlign: 'center'}}><Check on={r.outros} /></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
