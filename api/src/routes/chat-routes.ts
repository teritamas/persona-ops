import type { FastifyInstance } from 'fastify';

import type { PersonaOpsChatService } from '../application/persona-ops-chat-service.js';

const chatBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'projectId'],
  properties: {
    projectId: { type: 'string', minLength: 1 },
    message: { type: 'string', minLength: 1 },
    history: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['role', 'text'],
        properties: {
          role: { type: 'string', enum: ['user', 'agent', 'persona'] },
          text: { type: 'string' },
        },
      },
    },
  },
} as const;

// eslint-disable-next-line @typescript-eslint/require-await
export async function chatRoutes(
  app: FastifyInstance,
  options: { personaOpsChatService: PersonaOpsChatService },
): Promise<void> {
  app.post(
    '/api/v1/chat/stream',
    { schema: { body: chatBodySchema } },
    async (request, reply) => {
      const body = request.body as {
        projectId: string;
        message: string;
        history?: Array<{
          role: 'user' | 'agent' | 'persona';
          text: string;
        }>;
      };

      let stream: AsyncIterable<string>;
      try {
        stream = await options.personaOpsChatService.stream({
          projectId: body.projectId,
          message: body.message,
          history: body.history ?? [],
        });
      } catch (error) {
        request.log.error({ err: error }, 'PersonaOps chat setup failed');
        return reply
          .status(502)
          .send({ error: 'Failed to prepare chat response' });
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      try {
        for await (const text of stream) {
          reply.raw.write(text);
        }
      } catch (error) {
        request.log.error({ err: error }, 'PersonaOps chat failed');
        reply.raw.write('\n[ERROR: Failed to generate response]');
      } finally {
        reply.raw.end();
      }
    },
  );
}
