import { supabase } from '../../utils/supabase';
import { authInstance } from './firebase';

export const updateTechnicianQualifications = async (
  specializationIds: string[],
  subSpecializationIds: string[],
  token?: string,
) => {
  const firebaseToken = token || await authInstance.currentUser?.getIdToken();
  if (!firebaseToken) throw new Error('Sign in to continue.');

  const { data, error } = await supabase.functions.invoke('registration-email-otp', {
    body: { action: 'update_technician_qualifications', specializationIds, subSpecializationIds },
    headers: { Authorization: `Bearer ${firebaseToken}` },
  });
  if (error) {
    const detail = await error.context?.clone?.().json().catch(() => null);
    throw new Error(detail?.error || error.message || 'Could not save technician qualifications.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
};
