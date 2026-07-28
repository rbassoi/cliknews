import {SIGNUP_URL, GITHUB_URL} from '@/lib/config';

export default function Hero() {
    return (
        <div
            style={{
                background:
                    'radial-gradient(1200px 720px at 82% -160px, color-mix(in srgb, var(--color-accent-900) 75%, transparent), transparent 60%), ' +
                    'radial-gradient(1100px 800px at -10% 900px, color-mix(in srgb, black 30%, transparent), transparent 55%), ' +
                    'var(--color-bg)'
            }}
        >
            <div className="cn-container">
                <section
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,6fr) minmax(0,6fr)',
                        gap: 'clamp(32px,5vw,80px)',
                        alignItems: 'center',
                        padding: '88px 0 96px'
                    }}
                >
                    <div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16}}>
                            <span style={{width: 32, height: 1, background: 'var(--color-accent)', flex: 'none'}} />
                            <span style={{fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-accent)'}}>
                                E-mail marketing open source
                            </span>
                        </div>
                        <h1 style={{fontWeight: 500, fontSize: 'clamp(38px, 5vw, 64px)', lineHeight: 1.12, letterSpacing: '-0.015em', margin: 0}}>
                            <span style={{display: 'block'}}>E-mail marketing sem letra miúda.</span>
                            <span style={{display: 'block'}}>Seus contatos, sob seu controle.</span>
                        </h1>
                        <p style={{fontSize: 17, lineHeight: '28px', maxWidth: '52ch', margin: '20px 0 0', color: 'color-mix(in srgb, var(--color-text) 82%, transparent)'}}>
                            Cliker reúne contatos, listas, formulários e campanhas em um só painel — open source, sem
                            taxa por contato e sem prender seus dados.
                        </p>
                        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20}}>
                            <a className="btn btn-primary" href={SIGNUP_URL}>Começar grátis</a>
                            <a className="btn btn-ghost" href={GITHUB_URL} target="_blank" rel="noreferrer">Ver no GitHub</a>
                        </div>
                        <p style={{fontSize: 13, color: 'color-mix(in srgb, var(--color-text) 55%, transparent)', margin: '12px 0 0'}}>
                            Grátis para sempre até 500 contatos · Sem cartão de crédito
                        </p>
                    </div>
                    <div style={{position: 'relative'}}>
                        <div
                            style={{
                                position: 'absolute',
                                inset: -32,
                                background: 'radial-gradient(60% 60% at 60% 20%, color-mix(in srgb, var(--color-accent-800) 55%, transparent), transparent 70%)',
                                pointerEvents: 'none'
                            }}
                        />
                        <figure
                            style={{
                                position: 'relative',
                                margin: 0,
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                border: '1px solid var(--color-divider)',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.35)'
                            }}
                        >
                            <div
                                style={{
                                    width: '100%',
                                    aspectRatio: '4 / 3',
                                    background: 'linear-gradient(160deg, var(--color-accent-800), var(--color-accent) 65%, var(--color-accent-400))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'color-mix(in srgb, white 85%, transparent)',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    padding: 24
                                }}
                            >
                                Captura do painel do Cliker
                            </div>
                        </figure>
                    </div>
                </section>
            </div>
        </div>
    );
}
