class PersonaService {
  getPersonaDetail(activeProject, pId) {
    const p = activeProject.personas.find(persona => persona.id === pId);
    return {
      p,
      activeProject,
      selectedPersonaId: p ? pId : null
    };
  }

  closePersonaDetail(activeProject) {
    return {
      activeProject,
      selectedPersonaId: null
    };
  }
}

module.exports = new PersonaService();
