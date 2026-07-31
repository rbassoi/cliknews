import {LOGIN_URL, SIGNUP_URL} from '@/lib/config';

export default function Header() {
    return (
        <nav
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                padding: '12px clamp(20px, 5vw, 72px)',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                background: 'color-mix(in srgb, var(--color-bg) 84%, transparent)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderBottom: '1px solid var(--color-divider)'
            }}
        >
            <span style={{display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 17, color: 'var(--color-text)'}}>
                <img src="/cliker-icon.png" alt="Cliker" style={{width: 24, height: 24, borderRadius: 4, display: 'block'}} />
                cliker
            </span>
            <a href="#produto" style={{fontSize: 14}}>Produto</a>
            <a href="#recursos" style={{fontSize: 14}}>Recursos</a>
            <a href="#comecar" style={{fontSize: 14}}>Começar</a>
            <div style={{flex: 1}} />
            <a href={LOGIN_URL} style={{fontSize: 14}}>Entrar</a>
            <a className="btn btn-primary" href={SIGNUP_URL}>Começar agora</a>
        </nav>
    );
}
