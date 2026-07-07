import {
  SystemAction,
  SYSTEM_ACTION_TAGS,
  type SystemActionType,
} from '../../domain/system-action.js';

const TOOL_SYSTEM_ACTIONS: ReadonlyArray<{
  toolName: string;
  action: SystemActionType;
}> = [
  { toolName: 'save_personas_tool', action: SystemAction.PersonasSaved },
  { toolName: 'save_requirement_tool', action: SystemAction.RequirementSaved },
  {
    toolName: 'request_simulation_tool',
    action: SystemAction.SimulationRequested,
  },
  {
    toolName: 'approve_requirement_tool',
    action: SystemAction.RequirementApproved,
  },
  {
    toolName: 'update_project_name_tool',
    action: SystemAction.ProjectNameUpdated,
  },
];

export function buildSystemActionTagsForExecutedTools(
  executedTools: ReadonlySet<string>,
): string[] {
  return TOOL_SYSTEM_ACTIONS.filter(({ toolName }) =>
    executedTools.has(toolName),
  ).map(({ action }) => SYSTEM_ACTION_TAGS[action]);
}
