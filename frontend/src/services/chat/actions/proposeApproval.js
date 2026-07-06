module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_REQUIREMENT_APPROVAL]',
  execute: (activeProject) => {
    const draft = activeProject?.requirements?.find(r => r.status === 'draft');
    const requirementTitle = draft ? `「${draft.title}」を` : '要件を';
    return {
      role: 'proposal',
      proposal: {
        buttonText: `${requirementTitle}承認（確定）する`,
        inputText: `${requirementTitle}要件定義を承認状態に確定してください。`,
        style: 'blue'
      }
    };
  }
};
