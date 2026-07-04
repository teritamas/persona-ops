const { requestPrivateApi } = require('../clients/private-api');

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

  async updatePersonaPosition(projectId, personaId, x, y) {
    const response = await requestPrivateApi(
      `/api/v1/projects/${encodeURIComponent(projectId)}/personas/${encodeURIComponent(personaId)}/position`,
      {
        method: 'POST',
        body: { x, y }
      }
    );
    if (!response.ok) {
      throw new Error(response.message || 'Failed to update persona position');
    }
    return response.data;
  }
}

module.exports = new PersonaService();
