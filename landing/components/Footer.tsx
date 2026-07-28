import {GITHUB_URL} from '@/lib/config';

export default function Footer() {
    return (
        <div className="cn-container">
            <footer style={{padding: '32px 0', fontSize: 13, color: 'color-mix(in srgb, var(--color-text) 55%, transparent)'}}>
                © {new Date().getFullYear()} Cliker. <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{fontSize: 13}}>Fonte no GitHub</a>
            </footer>
        </div>
    );
}
