// The logged-in app (client/ + server/) is a separate project/deploy from
// this landing site — see docs/saas-plan.md section 8.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100';
export const LOGIN_URL = `${APP_URL}/login`;
export const SIGNUP_URL = `${APP_URL}/signup`;
export const GITHUB_URL = 'https://github.com/rbassoi/cliker';
