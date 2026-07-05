export interface ProjectDataDeletionPort {
  deleteProjectData(projectId: string): Promise<void>;
}
