'use client';

import {useEffect, useState} from 'react';

export type DocSection = {id: string; label: string};

export default function DevDocsNav({sections}: {sections: DocSection[]}) {
    const [activeId, setActiveId] = useState(sections[0]?.id);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                const visible = entries.filter(e => e.isIntersecting);
                if (visible.length > 0) {
                    setActiveId(visible[0].target.id);
                }
            },
            {rootMargin: '-15% 0px -70% 0px'}
        );

        for (const section of sections) {
            const el = document.getElementById(section.id);
            if (el) {
                observer.observe(el);
            }
        }

        return () => observer.disconnect();
    }, [sections]);

    return (
        <nav
            style={{
                position: 'sticky',
                top: 96,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                fontSize: 13.5,
                alignSelf: 'start'
            }}
        >
            {sections.map(section => {
                const isActive = section.id === activeId;
                return (
                    <a
                        key={section.id}
                        href={`#${section.id}`}
                        style={{
                            padding: '7px 12px',
                            borderRadius: 'var(--cn-radius-sm)',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'var(--cn-accent-text)' : 'var(--cn-text-muted)',
                            background: isActive ? 'var(--cn-accent-tint-light)' : 'transparent',
                            borderLeft: isActive ? '2px solid var(--cn-accent)' : '2px solid transparent',
                            marginLeft: -2
                        }}
                    >
                        {section.label}
                    </a>
                );
            })}
        </nav>
    );
}
