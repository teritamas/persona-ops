const personasSaved = require('./actions/personasSaved');
const requirementSaved = require('./actions/requirementSaved');
const projectNameUpdated = require('./actions/projectNameUpdated');
const proposePersona = require('./actions/proposePersona');
const proposePersonaApproval = require('./actions/proposePersonaApproval');
const proposeRequirementSave = require('./actions/proposeRequirementSave');
const proposeSimulation = require('./actions/proposeSimulation');
const proposeApproval = require('./actions/proposeApproval');

const actions = [
  personasSaved,
  requirementSaved,
  projectNameUpdated,
  proposePersona,
  proposePersonaApproval,
  proposeRequirementSave,
  proposeSimulation,
  proposeApproval
];

module.exports = {
  actions,
  findByTag(tag) {
    return actions.find(a => a.tag === tag);
  }
};
