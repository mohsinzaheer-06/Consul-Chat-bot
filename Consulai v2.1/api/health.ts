import { resolveEligibleModel } from '../src/lib/chatValidation';
import { isApiKeyConfigured } from '../server/gemini';

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    configured: isApiKeyConfigured(),
    defaultModel: resolveEligibleModel(undefined, process.env.GEMINI_MODEL),
  });
}
