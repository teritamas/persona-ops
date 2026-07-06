/**
 * SystemAction 定数と、対応するストリーミング用識別タグの定義
 */
export const SystemAction = {
  PersonasSaved: 'PERSONAS_SAVED',
  RequirementSaved: 'REQUIREMENT_SAVED',
  ProjectNameUpdated: 'PROJECT_NAME_UPDATED',
  ProposePersonaGeneration: 'PROPOSE_PERSONA_GENERATION',
  ProposeRequirementDefinition: 'PROPOSE_REQUIREMENT_DEFINITION',
  ProposeSimulation: 'PROPOSE_SIMULATION',
  ProposeRequirementApproval: 'PROPOSE_REQUIREMENT_APPROVAL',
  ProposePersonaApproval: 'PROPOSE_PERSONA_APPROVAL',
  ProposeRequirementSave: 'PROPOSE_REQUIREMENT_SAVE',
} as const;

export type SystemActionType = (typeof SystemAction)[keyof typeof SystemAction];

export const SYSTEM_ACTION_TAGS: Record<SystemActionType, string> = {
  [SystemAction.PersonasSaved]: '[SYSTEM_ACTION: PERSONAS_SAVED]',
  [SystemAction.RequirementSaved]: '[SYSTEM_ACTION: REQUIREMENT_SAVED]',
  [SystemAction.ProjectNameUpdated]: '[SYSTEM_ACTION: PROJECT_NAME_UPDATED]',
  [SystemAction.ProposePersonaGeneration]:
    '[SYSTEM_ACTION: PROPOSE_PERSONA_GENERATION]',
  [SystemAction.ProposeRequirementDefinition]:
    '[SYSTEM_ACTION: PROPOSE_REQUIREMENT_DEFINITION]',
  [SystemAction.ProposeSimulation]: '[SYSTEM_ACTION: PROPOSE_SIMULATION]',
  [SystemAction.ProposeRequirementApproval]:
    '[SYSTEM_ACTION: PROPOSE_REQUIREMENT_APPROVAL]',
  [SystemAction.ProposePersonaApproval]:
    '[SYSTEM_ACTION: PROPOSE_PERSONA_APPROVAL]',
  [SystemAction.ProposeRequirementSave]:
    '[SYSTEM_ACTION: PROPOSE_REQUIREMENT_SAVE]',
};
