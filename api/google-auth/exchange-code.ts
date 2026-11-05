import { exchangeCode } from '../../server/google-auth/handlers';

/** Vercel function: POST /api/google-auth/exchange-code. */
export function POST(request: Request): Promise<Response> {
    return exchangeCode(request, process.env);
}
