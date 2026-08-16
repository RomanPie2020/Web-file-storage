import { useState } from 'react';
import type { DragEvent } from 'react';
import { uploadFile } from '../mutations';
import type { UploadItem } from '../types';

export function useFileUpload(roomId: string, parentId?: string) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  async function uploadFiles(list: FileList | null) {
    if (!list) return;
    const queue = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'queued' as const,
    }));
    setUploads((current) => [...current, ...queue]);
    for (let index = 0; index < queue.length; index += 3) {
      await Promise.all(
        queue.slice(index, index + 3).map(async (item) => {
          setUploads((current) =>
            current.map((x) => (x.id === item.id ? { ...x, status: 'uploading' } : x)),
          );
          try {
            await uploadFile(roomId, parentId, item.file);
            setUploads((current) =>
              current.map((x) => (x.id === item.id ? { ...x, status: 'success' } : x)),
            );
          } catch (error) {
            setUploads((current) =>
              current.map((x) =>
                x.id === item.id
                  ? {
                      ...x,
                      status: 'error',
                      error: error instanceof Error ? error.message : 'Upload failed',
                    }
                  : x,
              ),
            );
          }
        }),
      );
    }
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void uploadFiles(event.dataTransfer.files);
  }

  return { uploads, dragging, setDragging, uploadFiles, drop };
}
