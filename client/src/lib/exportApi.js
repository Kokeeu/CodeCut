async function readError(response, fallback) {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body);
    return parsed.error || fallback;
  } catch {
    return body || fallback;
  }
}

export async function createExportJob(formData, signal) {
  const response = await fetch('/api/trim', { method: 'POST', body: formData, signal });
  if (!response.ok) {
    throw new Error(await readError(response, `Request failed (${response.status})`));
  }
  const result = await response.json();
  if (!result.jobId) throw new Error('The server did not return an export job ID.');
  return result.jobId;
}

export async function cancelExportJob(jobId) {
  const response = await fetch(`/api/trim/${jobId}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new Error(await readError(response, `Cancel failed (${response.status})`));
  }
}

export async function downloadExport(jobId) {
  const response = await fetch(`/api/trim/download/${jobId}`);
  if (!response.ok) {
    throw new Error(await readError(response, `Download failed (${response.status})`));
  }
  return response.blob();
}

export function subscribeToExport(jobId, onMessage, onConnectionError) {
  const eventSource = new EventSource(`/api/trim/progress/${jobId}`);
  eventSource.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch {
      onConnectionError(new Error('The server sent an invalid progress update.'));
    }
  };
  eventSource.onerror = () => {
    if (eventSource.readyState !== EventSource.CLOSED) {
      onConnectionError(new Error('Connection lost'));
    }
  };
  return () => eventSource.close();
}

export function saveExportBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
