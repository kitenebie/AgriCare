import { authInstance } from './firebase';

const edgeActions: Record<string, string> = {
  getServiceCatalog: 'service_catalog',
  getRelevantTechnicians: 'relevant_technicians',
  getEligibleTechnicians: 'eligible_technicians',
  createServiceRequest: 'create_service_request',
  acceptServiceRequest: 'accept_service_request',
  startFarmerProfileVerification: 'start_farmer_profile_verification',
  completeFarmerProfileVerification: 'complete_farmer_profile_verification',
  getIdentityPreview: 'get_identity_preview',
};

export async function callBackend<T = Record<string, unknown>>(name: string, data: Record<string, unknown> = {}): Promise<T> {
  const user = authInstance.currentUser;
  const projectId = authInstance.app.options.projectId;
  if (!user || !projectId) throw new Error('Sign in to continue.');

  const action = edgeActions[name];
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  if (action && (!baseUrl || !apiKey)) throw new Error('Service request backend is not configured.');
  const url = action
    ? `${baseUrl}/functions/v1/registration-email-otp`
    : `https://us-central1-${projectId}.cloudfunctions.net/${name}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      'Content-Type': 'application/json',
      ...(action ? { apikey: apiKey } : {}),
    },
    body: JSON.stringify(action ? { ...data, action } : data),
  });
  const result = await response.json().catch(() => ({})) as { error?: string; message?: string } & T;
  if (!response.ok) throw new Error(result.error || result.message || 'The request could not be completed.');
  return result;
}
