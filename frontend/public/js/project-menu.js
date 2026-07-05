globalThis.toggleProjectMenu = function toggleProjectMenu() {
  document.getElementById('project-dropdown')?.classList.toggle('hidden');
};

globalThis.switchProject = function switchProject(projectId) {
  document.cookie =
    'selectedPersonaId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  window.location.href = `/${projectId}`;
};

globalThis.createProject = async function createProject() {
  const response = await fetch('/action/project/create', { method: 'POST' });
  window.location.href =
    response.headers.get('hx-redirect') ?? window.location.href;
};

globalThis.renameProject = async function renameProject(
  event,
  projectId,
  currentName,
) {
  event.preventDefault();
  event.stopPropagation();
  const newName = window.prompt(
    '新しいプロジェクト名を入力してください',
    currentName,
  );
  if (!newName || newName.trim() === '' || newName === currentName) {
    return;
  }
  const response = await fetch('/action/project/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, name: newName.trim() }),
  });
  if (response.ok) {
    window.location.href = `/${projectId}`;
  }
};

globalThis.deleteProject = async function deleteProject(event, projectId) {
  event.preventDefault();
  event.stopPropagation();
  if (!window.confirm('このプロジェクトを削除しますか？\n（復元できません）')) {
    return;
  }
  const response = await fetch('/action/project/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  if (response.ok) {
    window.location.href = '/';
  }
};

document.addEventListener('click', (event) => {
  const container = document.getElementById('project-menu-container');
  if (container && !container.contains(event.target)) {
    document.getElementById('project-dropdown')?.classList.add('hidden');
  }
});
