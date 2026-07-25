import Link from 'next/link';
import {LOGIN_URL} from '@/lib/config';

export default function Header() {
    return (
        <header style={{borderBottom: '1px solid var(--cn-border)', background: 'var(--cn-bg-card)'}}>
            <div className="cn-container" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <div style={{width: 28, height: 28, borderRadius: 8, background: 'var(--cn-accent)'}} />
                    <span style={{fontWeight: 800, fontSize: 17}}>ClikNews</span>
                </div>

                <nav style={{display: 'flex', alignItems: 'center', gap: 28, fontSize: 14, fontWeight: 500}}>
                    <Link href="#recursos">Recursos</Link>
                    <Link href="#planos">Planos</Link>
                    <Link href="#faq">Perguntas frequentes</Link>
                </nav>

                <div style={{display: 'flex', gap: 10}}>
                    <a className="cn-btn cn-btn-outline" href={LOGIN_URL}>Entrar</a>
                    <a className="cn-btn cn-btn-primary" href={LOGIN_URL}>Começar grátis</a>
                </div>
            </div>
        </header>
    );
}
