module.exports = {
  tag: '[SYSTEM_ACTION: PROJECT_NAME_UPDATED]',
  execute: () => ({
    role: 'system',
    text: 'プロジェクト名を更新しました'
  })
};
