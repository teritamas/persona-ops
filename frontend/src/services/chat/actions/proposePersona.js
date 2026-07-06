module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_PERSONA_GENERATION]',
  execute: () => ({
    role: 'proposal',
    proposal: {
      buttonText: 'ペルソナを自動生成する',
      inputText: 'ドキュメント情報を元にペルソナを自動生成してください。',
      style: 'orange'
    }
  })
};
