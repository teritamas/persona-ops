/**
 * SystemAction 定数と、対応するストリーミング用識別タグの定義
 */
export const SystemAction = {
  PersonasSaved: 'PERSONAS_SAVED',
  RequirementSaved: 'REQUIREMENT_SAVED',
  ProjectNameUpdated: 'PROJECT_NAME_UPDATED',
} as const;

export type SystemActionType = (typeof SystemAction)[keyof typeof SystemAction];

export const SYSTEM_ACTION_TAGS: Record<SystemActionType, string> = {
  [SystemAction.PersonasSaved]: '[SYSTEM_ACTION: PERSONAS_SAVED]',
  [SystemAction.RequirementSaved]: '[SYSTEM_ACTION: REQUIREMENT_SAVED]',
  [SystemAction.ProjectNameUpdated]: '[SYSTEM_ACTION: PROJECT_NAME_UPDATED]',
};
