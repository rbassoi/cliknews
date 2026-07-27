'use client';

import {useState} from 'react';

export default function CodeBlock({code, label}: {code: string; label?: string}) {
    const [copied, setCopied] = useState(false);

    async function onCopy() {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            // Clipboard access denied (e.g. insecure context) — nothing to fall back to.
        }
    }

    return (
        <div
            style={{
                background: 'oklch(0.24 0.02 250)',
                border: '1px solid oklch(0.32 0.02 250)',
                borderRadius: 'var(--cn-radius-lg)',
                overflow: 'hidden'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    borderBottom: '1px solid oklch(0.32 0.02 250)'
                }}
            >
                <span style={{fontSize: 12, fontWeight: 600, color: 'oklch(0.7 0.02 250)', letterSpacing: '0.02em'}}>
                    {label || 'Exemplo'}
                </span>
                <button
                    onClick={onCopy}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: copied ? 'oklch(0.75 0.15 150)' : 'oklch(0.7 0.02 250)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 8px'
                    }}
                >
                    {copied ? 'Copiado!' : 'Copiar'}
                </button>
            </div>
            <pre
                style={{
                    margin: 0,
                    padding: '16px',
                    overflowX: 'auto',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'oklch(0.92 0.01 250)',
                    fontFamily: "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
                }}
            >
                <code>{code}</code>
            </pre>
        </div>
    );
}
