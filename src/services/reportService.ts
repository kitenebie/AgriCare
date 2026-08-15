/**
 * Report Service — handles forum post and reply violation reports
 * Saves report to Firestore and notifies all admin users via FCM + in-app notification
 */

import firestore from '@react-native-firebase/firestore';
import { Collections } from './firebase';
import { sendPushNotification } from './pushService';

// ─── Report a Forum Post ───
export const reportForumPost = async (params: {
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  postId: string;
  postTitle: string;
  postContent: string;
  authorId: string;
  authorName: string;
}) => {
  const { reporterId, reporterName, reporterRole, postId, postTitle, postContent, authorId, authorName } = params;

  // 1. Save report to Firestore
  const reportRef = await firestore().collection('reports').add({
    type: 'forum_post',
    reporterId,
    reporterName,
    reporterRole,
    reportedUserId: authorId,
    reportedUserName: authorName,
    postId,
    postTitle,
    postContent: postContent.substring(0, 500),
    status: 'pending', // pending | reviewed | resolved | dismissed
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // 2. Notify all admins
  await notifyAdmins({
    title: '🚩 Forum Post Reported',
    body: `${reporterName} (${reporterRole}) reported a post by ${authorName}:\n"${postTitle}"`,
    data: { type: 'report_forum_post', reportId: reportRef.id, postId },
  });

  return reportRef.id;
};

// ─── Report a Forum Reply ───
export const reportForumReply = async (params: {
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  replyContent: string;
  replyAuthorId: string;
  replyAuthorName: string;
  postId: string;
  postTitle: string;
}) => {
  const { reporterId, reporterName, reporterRole, replyContent, replyAuthorId, replyAuthorName, postId, postTitle } = params;

  // 1. Save report to Firestore
  const reportRef = await firestore().collection('reports').add({
    type: 'forum_reply',
    reporterId,
    reporterName,
    reporterRole,
    reportedUserId: replyAuthorId,
    reportedUserName: replyAuthorName,
    postId,
    postTitle,
    replyContent: replyContent.substring(0, 500),
    status: 'pending', // pending | reviewed | resolved | dismissed
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // 2. Notify all admins
  await notifyAdmins({
    title: '🚩 Forum Reply Reported',
    body: `${reporterName} (${reporterRole}) reported a reply by ${replyAuthorName} on "${postTitle}":\n"${replyContent.substring(0, 80)}${replyContent.length > 80 ? '...' : ''}"`,
    data: { type: 'report_forum_reply', reportId: reportRef.id, postId },
  });

  return reportRef.id;
};

// ─── Notify all admins (shared helper) ───
const notifyAdmins = async (notification: { title: string; body: string; data: Record<string, string> }) => {
  try {
    const adminSnapshot = await firestore()
      .collection(Collections.USERS)
      .where('role', '==', 'admin')
      .get();

    const promises = adminSnapshot.docs.map(async (adminDoc) => {
      const adminId = adminDoc.id;

      // In-app notification
      await firestore().collection(Collections.NOTIFICATIONS).add({
        userId: adminId,
        type: notification.data.type,
        title: notification.title,
        body: notification.body,
        read: false,
        data: notification.data,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      // FCM push
      await sendPushNotification(adminId, {
        title: notification.title,
        body: notification.body.substring(0, 200),
        data: notification.data,
      });
    });

    await Promise.all(promises);
  } catch (e) {
    console.warn('Failed to notify admins:', e);
  }
};
