import { supabase } from '../../utils/supabase';

const post = async (action: string, email: string, extra: object = {}, token?: string) => {
  console.info(`[EmailOTP] ${action}: request started`);
  const { data, error } = await supabase.functions.invoke('registration-email-otp', {
    body: { action, email, ...extra },
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  if (error) {
    const detail = await error.context?.clone?.().json().catch(() => null);
    console.error(`[EmailOTP] ${action}: request failed`, detail?.error || error.message || error.name);
    throw new Error(detail?.error || error.message || 'Email verification request failed.');
  }
  if (data?.error) throw new Error(data.error);
  console.info(`[EmailOTP] ${action}: request succeeded`);
  return data;
};

export const sendRegistrationEmailOtp = (email: string) =>
  post('request', email);

export const verifyRegistrationEmailOtp = (email: string, code: string) =>
  post('verify', email, { code }).then(({ ticket }) => {
    if (!ticket) throw new Error('Email verification could not be completed.');
    return ticket as string;
  });

export const completeRegistrationEmailVerification = (email: string, token: string, ticket: string) => {
  console.info('[EmailOTP] complete ticket metadata', { length: ticket?.length || 0, hasToken: Boolean(token) });
  return post('complete', email, { ticket }, token);
};
