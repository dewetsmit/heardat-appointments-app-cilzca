// Normalize the scalar, comma-separated, and assignment-list API representations.
export const getAssistantIds = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.flatMap(item => {
    if (item == null) return [];
    if (Array.isArray(item)) return getAssistantIds(item);
    if (typeof item === 'object') {
      const assignment = item as Record<string, unknown>;
      return getAssistantIds(assignment.AssistantList ?? assignment.UserIDAssignedAssistant ?? assignment.UserID ?? assignment.id);
    }
    return String(item).split(',').map(id => id.trim()).filter(id => id && id !== '0');
  }))];
};
