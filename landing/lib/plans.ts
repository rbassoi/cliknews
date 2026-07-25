export type Plan = {
    code: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    max_contacts: number;
    max_emails_per_month: number;
    max_users: number;
    max_sending_domains: number;
    max_automations: number;
    features: {
        api_access: boolean;
        dedicated_ip: boolean;
        custom_dkim: boolean;
    };
};

// Server Component fetch — runs on the Next.js server, not in the browser,
// so this never needs CORS. The app's own public-plans endpoint
// (server/routes/public-plans.js) still sets permissive CORS in case a
// future client-side widget wants to hit it directly from the browser.
const PLANS_API_URL = process.env.PLANS_API_URL || 'http://localhost:3104/api/public/plans';

export async function getPlans(): Promise<Plan[]> {
    try {
        const res = await fetch(PLANS_API_URL, {next: {revalidate: 300}});

        if (!res.ok) {
            throw new Error(`Plans API responded with ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error('Failed to fetch plans from', PLANS_API_URL, err);
        return [];
    }
}

export function formatBRL(value: number): string {
    return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL', maximumFractionDigits: 0}).format(value);
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
}
