const features = [
    {
        title: 'Segmentação avançada',
        description: 'Crie segmentos por comportamento, campos customizados ou histórico de abertura/clique — sem depender de planilhas.'
    },
    {
        title: 'Automação de campanhas',
        description: 'Dispare campanhas recorrentes por RSS ou acionadas por evento (triggered), sem precisar reenviar manualmente.'
    },
    {
        title: 'Editor de templates arrasta-e-solta',
        description: 'Monte o e-mail visualmente (GrapesJS, Mosaico) ou direto no código, com preview em tempo real.'
    },
    {
        title: 'Relatórios detalhados',
        description: 'Abertura, cliques, descadastros e bounces por campanha, com exportação para análise externa.'
    },
    {
        title: 'Listas e contatos unificados',
        description: 'Veja todos os seus contatos across listas num único painel, com filtro por status de inscrição.'
    },
    {
        title: 'Importação simples',
        description: 'Suba um CSV, mapeie as colunas e pronto — sem escrever nenhuma linha de código.'
    }
];

export default function Features() {
    return (
        <section id="recursos">
            <div className="cn-container">
                <div style={{textAlign: 'center', maxWidth: 620, margin: '0 auto 48px'}}>
                    <h2 style={{fontSize: 32, fontWeight: 800}}>Tudo que você precisa para crescer por e-mail</h2>
                    <p style={{color: 'var(--cn-text-muted)', marginTop: 12, fontSize: 16}}>
                        O mesmo motor de envio que já roda suas campanhas hoje, com uma interface pensada para o dia a dia.
                    </p>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20}}>
                    {features.map(f => (
                        <div key={f.title} className="cn-card" style={{padding: '24px 22px'}}>
                            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>{f.title}</h3>
                            <p style={{fontSize: 14, color: 'var(--cn-text-muted)', lineHeight: 1.55, margin: 0}}>{f.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
