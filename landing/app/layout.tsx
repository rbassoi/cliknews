import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';

const inter = Inter({subsets: ['latin'], variable: '--font-inter'});

export const metadata: Metadata = {
    title: 'ClikNews — E-mail marketing sem complicação',
    description: 'Campanhas, automação e relatórios de e-mail marketing em uma plataforma brasileira, com Pix e suporte em português.'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="pt-BR">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
