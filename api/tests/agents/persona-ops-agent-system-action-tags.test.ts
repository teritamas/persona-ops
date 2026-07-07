import { describe, expect, it } from 'vitest';

import { buildSystemActionTagsForExecutedTools } from '../../src/agents/persona-ops-agent/system-action-tags.js';

describe('PersonaOps Agentの完了アクションタグ生成', () => {
  it('実行済みツールに応じた完了アクションタグを返す', () => {
    const tags = buildSystemActionTagsForExecutedTools(
      new Set([
        'save_personas_tool',
        'save_requirement_tool',
        'request_simulation_tool',
        'approve_requirement_tool',
        'update_project_name_tool',
      ]),
    );

    expect(tags).toEqual([
      '[SYSTEM_ACTION: PERSONAS_SAVED]',
      '[SYSTEM_ACTION: REQUIREMENT_SAVED]',
      '[SYSTEM_ACTION: SIMULATION_REQUESTED]',
      '[SYSTEM_ACTION: REQUIREMENT_APPROVED]',
      '[SYSTEM_ACTION: PROJECT_NAME_UPDATED]',
    ]);
  });

  it('未実行のツールに対応するタグは返さない', () => {
    const tags = buildSystemActionTagsForExecutedTools(
      new Set(['approve_requirement_tool']),
    );

    expect(tags).toEqual(['[SYSTEM_ACTION: REQUIREMENT_APPROVED]']);
  });
});
