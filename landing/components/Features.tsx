const rows = [
    {
        n: '01',
        title: 'Contatos & Listas',
        body: 'Organize contatos em listas e segmentos, importe sua base existente e mantenha tudo sincronizado em um só painel.'
    },
    {
        n: '02',
        title: 'Campanhas & Automação',
        body: 'Monte campanhas com modelos reutilizáveis, agende envios e acompanhe taxas de abertura em tempo real.'
    },
    {
        n: '03',
        title: 'Formulários & Canais',
        body: 'Capture novos contatos com formulários incorporáveis e envie por múltiplos canais além do e-mail.'
    }
];

const rowGrid = {
    display: 'grid',
    gridTemplateColumns: 'minmax(64px,160px) minmax(0,420px) minmax(0,1fr)',
    gap: '28px clamp(24px,4vw,72px)',
    alignItems: 'baseline' as const,
    padding: '42px 0'
};

const divider = {
    height: 1,
    background: 'linear-gradient(to right, transparent, var(--color-neutral-700) 48px calc(100% - 48px), transparent)'
};

export default function Features() {
    return (
        <div className="cn-container">
            <section id="produto" style={{padding: '98px 0 70px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20}}>
                    <span style={{width: 32, height: 1, background: 'var(--color-accent)', flex: 'none'}} />
                    <span style={{fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-accent)'}}>
                        O que o Cliker faz
                    </span>
                </div>

                {rows.map((r, i) => (
                    <div key={r.n}>
                        <div style={rowGrid}>
                            <p style={{fontSize: 15, color: 'var(--color-accent)', margin: 0}}>{r.n}</p>
                            <h2 style={{fontSize: 24, letterSpacing: '-0.01em', margin: 0}}>{r.title}</h2>
                            <p style={{fontSize: '15.5px', lineHeight: '28px', margin: 0, maxWidth: '52ch', color: 'color-mix(in srgb, var(--color-text) 78%, transparent)'}}>
                                {r.body}
                            </p>
                        </div>
                        {i < rows.length - 1 && <div style={divider} />}
                    </div>
                ))}
            </section>
        </div>
    );
}
