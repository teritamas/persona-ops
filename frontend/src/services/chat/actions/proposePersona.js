module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_PERSONA_GENERATION]',
  execute: () => ({
    role: 'proposal',
    proposal: {
      buttonText: 'ペルソナを自動生成する',
      inputText: '会話履歴からペルソナを生成してください。',
      style: 'orange'
    }
  })
};
