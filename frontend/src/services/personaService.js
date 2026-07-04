const { state, getActiveProject } = require('./dummy_data/store');

class PersonaService {
  getPersonaDetail(pId) {
    const activeProject = getActiveProject();
    const p = activeProject.personas.find(persona => persona.id === pId);
    if (p) {
      state.selectedPersonaId = pId;
    }
    return {
      p,
      activeProject,
      simulationDone: state.simulationDone,
      selectedPersonaId: state.selectedPersonaId
    };
  }

  closePersonaDetail() {
    state.selectedPersonaId = null;
    const activeProject = getActiveProject();
    return {
      activeProject,
      simulationDone: state.simulationDone,
      selectedPersonaId: state.selectedPersonaId
    };
  }
}

module.exports = new PersonaService();
