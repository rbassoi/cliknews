import {LOGIN_URL} from '@/lib/config';

export default function Hero() {
    return (
        <section style={{paddingTop: 96, paddingBottom: 96}}>
            <div className="cn-container" style={{textAlign: 'center', maxWidth: 780, margin: '0 auto'}}>
                <div className="cn-pill" style={{marginBottom: 20}}>Feito para o mercado brasileiro</div>
                <h1 style={{fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1}}>
                    E-mail marketing sem complicação, com Pix no checkout
                </h1>
                <p style={{fontSize: 18, color: 'var(--cn-text-muted)', marginTop: 20, lineHeight: 1.6}}>
                    Campanhas, segmentação, automação e relatórios num só lugar — com suporte em português e
                    conformidade com a LGPD desde o primeiro dia.
                </p>
                <div style={{display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32}}>
                    <a className="cn-btn cn-btn-primary" style={{padding: '14px 28px', fontSize: 15}} href={LOGIN_URL}>Começar grátis</a>
                    <a className="cn-btn cn-btn-outline" style={{padding: '14px 28px', fontSize: 15}} href="#planos">Ver planos</a>
                </div>
            </div>
        </section>
    );
}
