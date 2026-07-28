const stats = [
    {value: '100%', label: 'Seus dados, seu servidor'},
    {value: '6', label: 'Canais de envio integrados'},
    {value: 'R$0', label: 'Taxa por contato'},
    {value: 'Tempo real', label: 'Aberturas e cliques'}
];

export default function StatBand() {
    return (
        <section style={{padding: '70px 0', background: '#2F816DEB'}}>
            <div
                className="cn-container"
                style={{display: 'grid', gridTemplateColumns: 'repeat(4, auto)', justifyContent: 'space-between', gap: '40px 28px'}}
            >
                {stats.map(s => (
                    <div key={s.label}>
                        <p style={{fontSize: 'clamp(36px, 3.6vw, 52px)', lineHeight: '56px', margin: 0, color: 'var(--color-text)'}}>{s.value}</p>
                        <p style={{fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 64%, transparent)', margin: '4px 0 0'}}>
                            {s.label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
