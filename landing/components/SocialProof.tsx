const stats = [
    {value: '12M+', label: 'e-mails entregues por mês'},
    {value: '99.2%', label: 'taxa média de entrega'},
    {value: '4.8/5', label: 'satisfação no suporte'},
    {value: '< 2min', label: 'para enviar sua 1ª campanha'}
];

export default function SocialProof() {
    return (
        <section style={{paddingTop: 0, paddingBottom: 56}}>
            <div className="cn-container">
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16}}>
                    {stats.map(s => (
                        <div key={s.label} className="cn-card" style={{padding: '20px 18px', textAlign: 'center'}}>
                            <div style={{fontSize: 26, fontWeight: 800}}>{s.value}</div>
                            <div style={{fontSize: 13, color: 'var(--cn-text-muted)', marginTop: 4}}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
