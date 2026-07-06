module.exports = {
  tag: '[SYSTEM_ACTION: PROPOSE_PERSONA_APPROVAL]',
  execute: () => ({
    role: 'proposal',
    proposal: {
      buttonText: 'この内容でペルソナを作成する',
      inputText: '提示されたペルソナの作成（保存）を承認します。保存してください。',
      style: 'orange'
    }
  })
};
