import { apiRequest } from '../../lib/api';
import type { MutationVariables } from './types';

export function executeMutation({ url, method, body }: MutationVariables) {
  return apiRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function uploadFile(roomId: string, parentId: string | undefined, file: File) {
  const body = new FormData();
  body.append('file', file);
  return apiRequest(`/data-rooms/${roomId}/files${parentId ? `?folderId=${parentId}` : ''}`, {
    method: 'POST',
    body,
  });
}
