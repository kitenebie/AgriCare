import firestore from '@react-native-firebase/firestore';
import { Collections } from '@/services/firebase';

export const createEmailNotification = (
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
) => firestore().collection(Collections.NOTIFICATIONS).add({
  userId,
  type,
  title,
  body,
  read: false,
  data,
  createdAt: firestore.FieldValue.serverTimestamp(),
});
