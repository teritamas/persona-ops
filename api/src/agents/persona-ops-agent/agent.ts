import { LlmAgent, InMemoryRunner } from '@google/adk';
import type { BaseTool } from '@google/adk';
import { PERSONA_OPS_AGENT_INSTRUCTION } from './instructions.js';

export function createPersonaOpsAgent(options: {
  model: string;
  tools: BaseTool[];
}) {
  const agent = new LlmAgent({
    name: 'persona_ops_agent',
    description: 'PersonaOps Assistant Agent that helps users define and update personas.',
    instruction: PERSONA_OPS_AGENT_INSTRUCTION,
    model: options.model,
    tools: options.tools,
  });

  const runner = new InMemoryRunner({
    agent,
    appName: 'persona_ops_ai',
  });

  return runner;
}
