async updateTaskDetails(id: string, taskData: Partial<Task>): Promise<Task> {
  const { data } = await api.patch(`/tasks/${id}`, taskData);
  return data;
} 