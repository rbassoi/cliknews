import {SIGNUP_URL} from '@/lib/config';

export default function GetStarted() {
    return (
        <div className="cn-container">
            <section id="comecar" style={{padding: '70px 0 56px'}}>
                <h3 style={{fontSize: 24, margin: 0}}>Comece a usar o Cliker</h3>
                <p style={{fontSize: '15.5px', lineHeight: '28px', color: 'color-mix(in srgb, var(--color-text) 78%, transparent)', margin: '8px 0 0', maxWidth: '58ch'}}>
                    Crie sua primeira lista em minutos. Sem cartão de crédito, sem contrato.
                </p>
                <form action={SIGNUP_URL} method="get" style={{display: 'flex', gap: 8, alignItems: 'stretch', maxWidth: 480, marginTop: 20}}>
                    <input className="input" type="email" name="email" placeholder="voce@empresa.com" aria-label="Endereço de e-mail" style={{flex: 1, minHeight: 36}} />
                    <button type="submit" className="btn btn-primary" style={{minHeight: 36}}>Criar conta</button>
                </form>
            </section>
        </div>
    );
}
