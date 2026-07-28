export default function ImageSplit() {
    return (
        <div className="cn-container">
            <section
                id="recursos"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,5fr) minmax(0,7fr)',
                    gap: '28px clamp(24px,5vw,96px)',
                    alignItems: 'center',
                    padding: '56px 0 84px'
                }}
            >
                <div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20}}>
                        <span style={{width: 32, height: 1, background: 'var(--color-accent)', flex: 'none'}} />
                        <span style={{fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-accent)'}}>
                            Painel
                        </span>
                    </div>
                    <h2 style={{fontSize: 32, lineHeight: '42px', letterSpacing: '-0.012em', margin: 0}}>
                        Um painel, todos os números
                    </h2>
                    <p style={{fontSize: '15.5px', lineHeight: '28px', color: 'color-mix(in srgb, var(--color-text) 78%, transparent)', margin: '12px 0 0', maxWidth: '48ch'}}>
                        Acompanhe contatos, listas ativas e desempenho de campanhas em um dashboard único — sem
                        planilhas paralelas.
                    </p>
                </div>
                <figure style={{margin: 0}}>
                    <div
                        style={{
                            width: '100%',
                            aspectRatio: '1600 / 1261',
                            borderRadius: 12,
                            border: '1px solid var(--color-divider)',
                            background: 'linear-gradient(155deg, var(--color-surface), var(--color-bg))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--cn-text-faint)',
                            fontSize: 14,
                            fontWeight: 600
                        }}
                    >
                        Foto do painel do Cliker
                    </div>
                </figure>
            </section>
        </div>
    );
}
