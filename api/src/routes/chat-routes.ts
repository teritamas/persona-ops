import type { FastifyInstance } from 'fastify';
import { InMemoryRunner, LlmAgent } from '@google/adk';

interface ChatMessage {
  role: 'user' | 'agent' | 'persona';
  text: string;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function chatRoutes(
  app: FastifyInstance,
  options: { defaultModel: string },
): Promise<void> {
  const { defaultModel } = options;

  app.post('/api/v1/chat/stream', async (request, reply) => {
    const { message, history, model, systemPrompt } = request.body as {
      message: string;
      history: ChatMessage[];
      model?: string;
      systemPrompt?: string;
    };

    const selectedModel = model || defaultModel;
    const instruction =
      systemPrompt || 'ユーザーの指示に従い、適切な応答を返してください。';

    // Create a prompt with context
    const formattedHistory = (history || [])
      .map((h) => `${h.role === 'user' ? 'User' : 'AI'}: ${h.text}`)
      .join('\n');

    const fullPrompt = formattedHistory
      ? `${formattedHistory}\nUser: ${message}\n`
      : message;

    // Set headers for streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    try {
      const agentRunner = new InMemoryRunner({
        agent: new LlmAgent({
          description: 'PersonaOps assistant',
          instruction,
          model: selectedModel,
          name: 'persona_ops_assistant',
        }),
        appName: 'persona_ops_ai',
      });

      const events = agentRunner.runEphemeral({
        newMessage: {
          parts: [{ text: fullPrompt }],
          role: 'user',
        },
        runConfig: {
          maxLlmCalls: 1,
        },
        userId: `stream-${Date.now()}`,
      });

      for await (const event of events) {
        const parts = event.content?.parts ?? [];
        for (const part of parts) {
          if (typeof part.text === 'string' && part.text.length > 0) {
            reply.raw.write(part.text);
          }
        }
      }
    } catch (error) {
      request.log.error({ err: error }, 'Streaming chat failed');
      reply.raw.write('\n[ERROR: Failed to generate response]');
    } finally {
      reply.raw.end();
    }
  });
}
