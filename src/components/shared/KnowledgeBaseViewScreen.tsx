/**
 * Knowledge Base Article Full View
 * Shows full article content with author info and views count
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Icon, Avatar } from '@/components/ui';
import { Collections } from '@/services/firebase';

interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
  views?: number;
  createdAt?: any;
}

export default function KnowledgeBaseViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchArticle = async () => {
      try {
        const doc = await firestore().collection(Collections.KNOWLEDGE_BASE).doc(id).get();
        if (doc.exists) {
          setArticle({ id: doc.id, ...doc.data() } as Article);
          // Increment views
          await firestore().collection(Collections.KNOWLEDGE_BASE).doc(id).update({
            views: firestore.FieldValue.increment(1),
          });
        }
      } catch (e) {
        console.warn('Error fetching article:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  const getRoleColor = (role?: string) => role === 'admin' ? '#1565C0' : role === 'technician' ? '#2E7D32' : '#E65100';
  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!article) return (
    <View style={s.center}>
      <Icon name="clipboard" size={48} color={Colors.textLight} />
      <Text style={s.emptyText}>Article not found</Text>
      <TouchableOpacity onPress={() => router.back()} style={s.backLink}>
        <Text style={s.backLinkText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name="chevron-right" size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Knowledge Base</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Category Badge */}
        <View style={s.catBadge}>
          <Text style={s.catText}>{article.category}</Text>
        </View>

        {/* Title */}
        <Text style={s.title}>{article.title}</Text>

        {/* Author & Meta */}
        <View style={s.metaRow}>
          {article.authorName && (
            <View style={s.authorRow}>
              <Avatar name={article.authorName} size={32} />
              <View style={{ marginLeft: 8 }}>
                <Text style={s.authorName}>{article.authorName}</Text>
                {article.authorRole && (
                  <View style={[s.roleBadge, { backgroundColor: getRoleColor(article.authorRole) + '15' }]}>
                    <Text style={[s.roleText, { color: getRoleColor(article.authorRole) }]}>{article.authorRole}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          <View style={s.statsRow}>
            {article.createdAt && <Text style={s.statText}>{formatDate(article.createdAt)}</Text>}
            <Text style={s.statText}>•</Text>
            <Icon name="search" size={12} color={Colors.textLight} />
            <Text style={s.statText}>{article.views || 0} views</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Article Content */}
        <Text style={s.articleContent}>{article.content}</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  emptyText: { fontSize: FontSize.md, color: Colors.textLight, marginTop: Spacing.lg },
  backLink: { marginTop: Spacing.lg },
  backLinkText: { color: Colors.primary, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '180deg' }] },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white, flex: 1, textAlign: 'center' },
  content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  catBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary + '15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  catText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: Spacing.md, lineHeight: 30 },
  metaRow: { marginTop: Spacing.lg },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorName: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 9, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  statText: { fontSize: 12, color: Colors.textLight },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xl },
  articleContent: { fontSize: FontSize.md, color: Colors.text, lineHeight: 26 },
});
