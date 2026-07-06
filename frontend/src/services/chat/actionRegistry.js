const personasSaved = require('./actions/personasSaved');
const requirementSaved = require('./actions/requirementSaved');
const projectNameUpdated = require('./actions/projectNameUpdated');
const proposePersona = require('./actions/proposePersona');
const proposeSimulation = require('./actions/proposeSimulation');
const proposeApproval = require('./actions/proposeApproval');

const actions = [
  personasSaved,
  requirementSaved,
  projectNameUpdated,
  proposePersona,
  proposeSimulation,
  proposeApproval
];

module.exports = {
  actions,
  findByTag(tag) {
    return actions.find(a => a.tag === tag);
  }
};
