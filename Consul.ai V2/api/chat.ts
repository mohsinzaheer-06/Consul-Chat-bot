import { validateChatRequest } from '../src/lib/chatValidation';
import { createStreamAccumulator } from '../src/lib/streamParser';
import {
  generateChatStream,
  generateFollowUpsFallback,
  mapGeminiError,
} from '../server/gemini';

const encoder = new TextEncoder();

function encodeSse(payload: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: Request): Promise<Response> {
  let rawText = '';
  try {
    rawText = await request.text();
  } catch {
    return Response.json(
      {
        code: 'BAD_REQUEST',
        message: 'Unable to read request body.',
        retryable: false,
      },
      { status: 400 }
    );
  }

  if (rawText.length > 100_000) {
    return Response.json(
      {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload is too large. Please shorten your message or start a new chat.',
        retryable: false,
      },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return Response.json(
      {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
        retryable: false,
      },
      { status: 400 }
    );
  }

  const validation = validateChatRequest(body);
  if (!validation.ok) {
    return Response.json(
      {
        code: 'VALIDATION_ERROR',
        message: validation.error,
        retryable: false,
      },
      { status: 400 }
    );
  }

  const abortController = new AbortController();
  if (request.signal) {
    if (request.signal.aborted) {
      abortController.abort();
    } else {
      request.signal.addEventListener('abort', () => abortController.abort(), {
        once: true,
      });
    }
  }

  const accumulator = createStreamAccumulator();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const { stream: geminiStream, model } = await generateChatStream({
          message: validation.data.message,
          history: validation.data.history,
          responseLength: validation.data.responseLength,
          requestedModel: validation.data.model,
          signal: abortController.signal,
        });

        controller.enqueue(encodeSse({ type: 'meta', model }));

        for await (const chunk of geminiStream) {
          if (abortController.signal.aborted) {
            break;
          }
          const chunkText = chunk.text ?? '';
          if (!chunkText) continue;

          const delta = accumulator.push(chunkText);
          if (delta) {
            controller.enqueue(encodeSse({ type: 'delta', text: delta }));
          }
        }

        if (!abortController.signal.aborted) {
          const finalized = accumulator.finalize();
          if (finalized.remainingDelta) {
            controller.enqueue(encodeSse({ type: 'delta', text: finalized.remainingDelta }));
          }

          let followUps = finalized.followUps;
          if (followUps.length === 0 && finalized.fullAnswer.length > 0) {
            followUps = await generateFollowUpsFallback({
              userMessage: validation.data.message,
              assistantAnswer: finalized.fullAnswer,
              requestedModel: model,
            });
          }

          controller.enqueue(encodeSse({ type: 'followups', questions: followUps }));
          controller.enqueue(encodeSse({ type: 'done' }));
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          const mapped = mapGeminiError(err);
          controller.enqueue(
            encodeSse({
              type: 'error',
              code: mapped.code,
              message: mapped.message,
              retryable: mapped.retryable,
            })
          );
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
