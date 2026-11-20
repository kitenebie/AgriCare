import { authInstance } from './firebase';

export async function callBackend<T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  const user = authInstance.currentUser;
  const projectId = authInstance.app.options.projectId;
  if (!user || !projectId) throw new Error('Sign in to continue.');

  const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({})) as { error?: string; message?: string } & T;
  if (!response.ok) throw new Error(result.error || result.message || 'The request could not be completed.');
  return result;
}
