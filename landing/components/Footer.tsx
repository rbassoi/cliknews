export default function Footer() {
    return (
        <footer style={{borderTop: '1px solid var(--cn-border)', padding: '40px 0'}}>
            <div className="cn-container" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <div style={{width: 22, height: 22, borderRadius: 6, background: 'var(--cn-accent)'}} />
                    <span style={{fontWeight: 700, fontSize: 14}}>Cliker</span>
                    <span style={{fontSize: 13, color: 'var(--cn-text-faint)'}}>© {new Date().getFullYear()}</span>
                </div>

                <div style={{display: 'flex', gap: 20, fontSize: 13, color: 'var(--cn-text-muted)'}}>
                    <a href="/privacidade">Política de privacidade</a>
                    <a href="/termos">Termos de uso</a>
                </div>
            </div>
        </footer>
    );
}
