import type { FastifyInstance } from 'fastify';
import type { AgentRunner } from '../infra/ai/adk-ai-agent.js';

interface ChatMessage {
  role: 'user' | 'agent' | 'persona';
  text: string;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function chatRoutes(
  app: FastifyInstance,
  options: { defaultModel: string; personaOpsAgent: any }, // using any to avoid direct type coupling if runner export is not easy, or we can use the AgentRunner type
): Promise<void> {
  const { personaOpsAgent } = options;

  app.post('/api/v1/chat/stream', async (request, reply) => {
    const { message, history, projectId, existingPersonas } = request.body as {
      message: string;
      history: ChatMessage[];
      projectId?: string;
      existingPersonas?: any[];
    };

    // プロジェクトごとにコンテキストを保持するため、sessionId に projectId を使用する
    // 指定がない場合はデフォルトのセッションにフォールバックする
    const sessionId = projectId || 'default-chat-session';

    // ツール呼び出し時のコンテキストとして、エージェントのプロンプト（System Note）に projectId と既存のペルソナ情報を追加する
    const existingPersonasContext = existingPersonas && existingPersonas.length > 0 
      ? `\n\n[Current Personas]: ${JSON.stringify(existingPersonas.map(p => ({ name: p.name, role: p.role })))}`
      : '';
      
    const fullPrompt = projectId 
      ? `[System Note: The current projectId is "${projectId}". Use this ID implicitly when saving personas.${existingPersonasContext}]\n\n${message}`
      : message;

    // Set headers for streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    try {
      // @ts-ignore
      const events = personaOpsAgent.runEphemeral({
        newMessage: {
          parts: [{ text: fullPrompt }],
          role: 'user',
        },
        runConfig: {
          maxLlmCalls: 5, // Allow multiple calls for tool execution
        },
        userId: sessionId, // This tells the agent to use this session's memory
      });

      for await (const event of events) {
        if (event.content?.parts) {
          for (const part of event.content.parts) {
            if (part.text) {
              reply.raw.write(part.text);
            }
          }
        }
      }
    } catch (error) {
      app.log.error({ err: error }, 'Chat stream error');
      reply.raw.write(
        '\n[Error] I apologize, but an error occurred while processing your request.',
      );
    } finally {
      reply.raw.end();
    }
  });
}
