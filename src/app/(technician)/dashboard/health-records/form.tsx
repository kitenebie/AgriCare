import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { AppTextInput as TextInput, AppText as Text } from '@/components/ui/FontScale';
import { modalAlert } from '@/components/ui/ModalAlert';
import firestore from '@react-native-firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { Icon, IconName } from '@/components/ui';
import { getSession } from '@/services/sessionService';
import { Collections } from '@/services/firebase';
import { getOrCreateChatRoom, sendMessage } from '@/services/chatService';
import { sendPushNotification } from '@/services/pushService';
import { logCrud } from '@/services/logService';

const RECORD_TYPES = [
  { value: 'checkup', label: 'Checkup', icon: 'clipboard' },
  { value: 'vaccination', label: 'Vaccination', icon: 'shield' },
  { value: 'treatment', label: 'Treatment', icon: 'heart' },
  { value: 'surgery', label: 'Surgery', icon: 'alert' },
  { value: 'deworming', label: 'Deworming', icon: 'bug' },
  { value: 'lab_test', label: 'Lab Test', icon: 'search' },
  { value: 'emergency', label: 'Emergency', icon: 'alert-circle' },
  { value: 'follow_up', label: 'Follow-up', icon: 'calendar' },
];

const STATUS_OPTIONS = ['resolved', 'ongoing', 'monitoring'];

const SYMPTOM_OPTIONS = [
  'Fever', 'Cough', 'Loss of Appetite', 'Limping', 'Diarrhea',
  'Lethargy', 'Swelling', 'Discharge', 'Weight Loss', 'Vomiting',
  'Difficulty Breathing', 'Skin Lesions',
];

const VACCINE_TYPES = [
  'FMD (Foot and Mouth Disease)', 'Hemorrhagic Septicemia', 'Blackleg',
  'Anthrax', 'Brucellosis', 'Rabies', 'Hog Cholera',
  'Newcastle Disease', 'Avian Influenza',
];

const FOLLOW_UP_TYPES = ['checkup', 'vaccination', 'monitoring', 'treatment_review'];

export default function HealthRecordFormScreen() {
  const params = useLocalSearchParams<{
    animalId?: string;
    animalName?: string;
    farmerId?: string;
    farmerName?: string;
    serviceType?: string;
    animalPhoto?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uid, setUid] = useState('');
  const [techName, setTechName] = useState('');

  // Form fields
  const [recordType, setRecordType] = useState('checkup');
  const [diagnosis, setDiagnosis] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [treatment, setTreatment] = useState('');
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [weight, setWeight] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('resolved');

  // Vaccination-specific
  const [vaccineType, setVaccineType] = useState('');
  const [vaccineBatch, setVaccineBatch] = useState('');

  // Follow-up
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  const [followUpType, setFollowUpType] = useState('checkup');
  const [followUpInterval, setFollowUpInterval] = useState('7');

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (!session) { setLoading(false); return; }
      setUid(session.uid);
      setTechName(session.displayName || 'Technician');

      if (params.serviceType) {
        const typeMap: Record<string, string> = {
          'Health Check': 'checkup',
          'Vaccination': 'vaccination',
          'Treatment': 'treatment',
          'De-worming': 'deworming',
          'Artificial Insemination': 'checkup',
          'Surgery': 'surgery',
        };
        setRecordType(typeMap[params.serviceType] || 'checkup');
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSubmit = async () => {
    if (!params.animalId) {
      modalAlert('Error', 'No animal selected.');
      return;
    }
    if (!diagnosis.trim() && recordType !== 'vaccination') {
      modalAlert('Error', 'Please enter a diagnosis.');
      return;
    }

    setSubmitting(true);
    try {
      const now = firestore.FieldValue.serverTimestamp();

      const healthRecord: any = {
        animalId: params.animalId,
        animalName: params.animalName || 'Animal',
        recordType,
        date: now,
        diagnosis: diagnosis.trim(),
        symptoms: selectedSymptoms,
        treatment: treatment.trim(),
        medication: medication.trim(),
        dosage: dosage.trim(),
        weight: weight ? parseFloat(weight) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        technicianId: uid,
        technicianName: techName,
        requiresFollowUp,
        followUpType: requiresFollowUp ? followUpType : null,
        followUpInterval: requiresFollowUp ? parseInt(followUpInterval) || 7 : null,
        notes: notes.trim(),
        status,
        attachments: [],
        farmerId: params.farmerId || '',
        farmerName: params.farmerName || '',
        createdAt: now,
        updatedAt: now,
      };

      if (recordType === 'vaccination') {
        healthRecord.vaccineType = vaccineType;
        healthRecord.vaccineBatch = vaccineBatch.trim();
      }

      if (requiresFollowUp) {
        const followDate = new Date();
        followDate.setDate(followDate.getDate() + (parseInt(followUpInterval) || 7));
        healthRecord.nextFollowUp = firestore.Timestamp.fromDate(followDate);
      }

      // Save health record
      const docRef = await firestore().collection('healthRecords').add(healthRecord);

      // Create reminder if follow-up required
      if (requiresFollowUp) {
        const followDate = new Date();
        followDate.setDate(followDate.getDate() + (parseInt(followUpInterval) || 7));
        await firestore().collection('healthReminders').add({
          healthRecordId: docRef.id,
          animalId: params.animalId,
          animalName: params.animalName,
          farmerId: params.farmerId || '',
          farmerName: params.farmerName || '',
          technicianId: uid,
          technicianName: techName,
          reminderType: followUpType === 'vaccination' ? 'vaccination_due' : 'follow_up',
          title: `Follow-up: ${params.animalName} - ${recordType}`,
          description: `${followUpType} scheduled. Previous: ${diagnosis || recordType}`,
          scheduledDate: firestore.Timestamp.fromDate(followDate),
          priority: status === 'ongoing' ? 'high' : 'medium',
          status: 'pending',
          notificationSent: false,
          reminderBefore: 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      // ─── TASK #1: Notify both technician & farmer + send chat summary ───
      const farmerId = params.farmerId || '';
      const farmerName = params.farmerName || 'Farmer';

      // Build health record summary for chat
      const summaryLines = [
        `📋 Health Record Summary`,
        `━━━━━━━━━━━━━━━━━━━━━`,
        `🐄 Animal: ${params.animalName}`,
        `📝 Type: ${recordType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
      ];
      if (diagnosis.trim()) summaryLines.push(`🔍 Diagnosis: ${diagnosis.trim()}`);
      if (selectedSymptoms.length > 0) summaryLines.push(`⚠️ Symptoms: ${selectedSymptoms.join(', ')}`);
      if (treatment.trim()) summaryLines.push(`💊 Treatment: ${treatment.trim()}`);
      if (medication.trim()) summaryLines.push(`💉 Medication: ${medication.trim()}${dosage.trim() ? ` (${dosage.trim()})` : ''}`);
      if (weight) summaryLines.push(`⚖️ Weight: ${weight} kg`);
      if (temperature) summaryLines.push(`🌡️ Temperature: ${temperature}°C`);
      if (recordType === 'vaccination' && vaccineType) summaryLines.push(`🛡️ Vaccine: ${vaccineType}`);
      summaryLines.push(`📊 Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`);
      if (requiresFollowUp) summaryLines.push(`📅 Follow-up: ${followUpType} in ${followUpInterval} days`);
      if (notes.trim()) summaryLines.push(`📌 Notes: ${notes.trim()}`);
      summaryLines.push(`━━━━━━━━━━━━━━━━━━━━━`);
      summaryLines.push(`✅ Record saved by ${techName}`);

      const summaryText = summaryLines.join('\n');

      // Send chat message (technician → farmer)
      if (farmerId) {
        const chatId = await getOrCreateChatRoom(uid, farmerId);
        await sendMessage(chatId, uid, summaryText);
      }

      // Create notification for FARMER
      if (farmerId) {
        await firestore().collection(Collections.NOTIFICATIONS).add({
          userId: farmerId,
          type: 'health_record_created',
          title: '📋 New Health Record',
          body: `${techName} created a ${recordType} record for ${params.animalName}. Diagnosis: ${diagnosis.trim() || 'N/A'}`,
          read: false,
          data: { healthRecordId: docRef.id, technicianId: uid },
          createdAt: now,
        });

        // FCM push to farmer
        await sendPushNotification(farmerId, {
          title: '📋 New Health Record',
          body: `${techName} created a ${recordType} record for ${params.animalName}.`,
          data: { type: 'health_record', healthRecordId: docRef.id },
        });
      }

      // Create notification for TECHNICIAN (self — for record keeping)
      await firestore().collection(Collections.NOTIFICATIONS).add({
        userId: uid,
        type: 'health_record_created',
        title: '📋 Record Saved',
        body: `${recordType.replace('_', ' ')} record for ${params.animalName} (${farmerName}) saved successfully.`,
        read: false,
        data: { healthRecordId: docRef.id, farmerId },
        createdAt: now,
      });

      // FCM push to technician (self)
      await sendPushNotification(uid, {
        title: '📋 Record Saved',
        body: `Your ${recordType} record for ${params.animalName} has been saved.`,
        data: { type: 'health_record', healthRecordId: docRef.id },
      });

      // Log activity
      await logCrud('Health Record Created', `${recordType} for ${params.animalName}`, 'healthRecords', docRef.id, {
        old: {},
        new: { recordType, animalName: params.animalName, diagnosis, status },
      });

      modalAlert('Success', 'Health record saved and notifications sent!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      modalAlert('Error', e.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Icon name={'chevron-right' as IconName} size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Health Record</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Animal Info Banner */}
        <View style={s.animalBanner}>
          {params.animalPhoto ? (
            <Image source={{ uri: params.animalPhoto }} style={s.animalImage} contentFit="cover" />
          ) : (
            <View style={s.animalIconBox}>
              <Icon name={'paw' as IconName} size={28} color={Colors.primary} />
            </View>
          )}
          <View style={s.animalBannerInfo}>
            <Text style={s.animalBannerName}>{params.animalName || 'Animal'}</Text>
            <Text style={s.animalBannerOwner}>Owner: {params.farmerName || 'Farmer'}</Text>
            {params.serviceType ? (
              <Text style={s.animalBannerService}>Service: {params.serviceType}</Text>
            ) : null}
          </View>
        </View>

        {/* Record Type */}
        <Text style={s.sectionTitle}>Record Type *</Text>
        <View style={s.chipGrid}>
          {RECORD_TYPES.map(rt => (
            <TouchableOpacity
              key={rt.value}
              style={[s.typeChip, recordType === rt.value && s.typeChipActive]}
              onPress={() => setRecordType(rt.value)}
            >
              <Icon name={rt.icon as IconName} size={16} color={recordType === rt.value ? Colors.white : Colors.primary} />
              <Text style={[s.typeChipText, recordType === rt.value && s.typeChipTextActive]}>{rt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Vaccination Fields */}
        {recordType === 'vaccination' && (
          <>
            <Text style={s.sectionTitle}>Vaccine Type</Text>
            <View style={s.chipGrid}>
              {VACCINE_TYPES.map(vt => (
                <TouchableOpacity
                  key={vt}
                  style={[s.smallChip, vaccineType === vt && s.smallChipActive]}
                  onPress={() => setVaccineType(vt)}
                >
                  <Text style={[s.smallChipText, vaccineType === vt && s.smallChipTextActive]}>{vt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.sectionTitle}>Batch / Lot No.</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. LOT-2026-0801"
              value={vaccineBatch}
              onChangeText={setVaccineBatch}
              placeholderTextColor={Colors.textLight}
            />
          </>
        )}

        {/* Diagnosis */}
        <Text style={s.sectionTitle}>Diagnosis {recordType !== 'vaccination' ? '*' : ''}</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="e.g. Bovine Respiratory Disease"
          value={diagnosis}
          onChangeText={setDiagnosis}
          multiline
          numberOfLines={2}
          placeholderTextColor={Colors.textLight}
        />

        {/* Symptoms */}
        <Text style={s.sectionTitle}>Symptoms</Text>
        <View style={s.chipGrid}>
          {SYMPTOM_OPTIONS.map(sym => (
            <TouchableOpacity
              key={sym}
              style={[s.smallChip, selectedSymptoms.includes(sym) && s.smallChipActive]}
              onPress={() => toggleSymptom(sym)}
            >
              <Text style={[s.smallChipText, selectedSymptoms.includes(sym) && s.smallChipTextActive]}>{sym}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Treatment */}
        <Text style={s.sectionTitle}>Treatment</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="e.g. Administered Oxytetracycline 20mg/kg"
          value={treatment}
          onChangeText={setTreatment}
          multiline
          numberOfLines={2}
          placeholderTextColor={Colors.textLight}
        />

        {/* Medication + Dosage */}
        <View style={s.row}>
          <View style={s.halfField}>
            <Text style={s.fieldLabel}>Medication</Text>
            <TextInput style={s.input} placeholder="e.g. Amoxicillin" value={medication} onChangeText={setMedication} placeholderTextColor={Colors.textLight} />
          </View>
          <View style={s.halfField}>
            <Text style={s.fieldLabel}>Dosage</Text>
            <TextInput style={s.input} placeholder="e.g. 5ml IM" value={dosage} onChangeText={setDosage} placeholderTextColor={Colors.textLight} />
          </View>
        </View>

        {/* Weight + Temperature */}
        <View style={s.row}>
          <View style={s.halfField}>
            <Text style={s.fieldLabel}>Weight (kg)</Text>
            <TextInput style={s.input} placeholder="e.g. 350" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholderTextColor={Colors.textLight} />
          </View>
          <View style={s.halfField}>
            <Text style={s.fieldLabel}>Temperature (°C)</Text>
            <TextInput style={s.input} placeholder="e.g. 39.5" value={temperature} onChangeText={setTemperature} keyboardType="numeric" placeholderTextColor={Colors.textLight} />
          </View>
        </View>

        {/* Status */}
        <Text style={s.sectionTitle}>Status</Text>
        <View style={s.statusRow}>
          {STATUS_OPTIONS.map(st => (
            <TouchableOpacity
              key={st}
              style={[s.statusChip, status === st && s.statusChipActive]}
              onPress={() => setStatus(st)}
            >
              <Text style={[s.statusChipText, status === st && s.statusChipTextActive]}>{st}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Follow-up Toggle */}
        <View style={s.followUpRow}>
          <View>
            <Text style={s.sectionTitle}>Requires Follow-up?</Text>
            <Text style={s.followUpHint}>Creates a calendar reminder</Text>
          </View>
          <Switch
            value={requiresFollowUp}
            onValueChange={setRequiresFollowUp}
            trackColor={{ true: Colors.primary, false: Colors.border }}
            thumbColor={Colors.white}
          />
        </View>

        {requiresFollowUp && (
          <View style={s.followUpSection}>
            <Text style={s.fieldLabel}>Follow-up Type</Text>
            <View style={s.chipGrid}>
              {FOLLOW_UP_TYPES.map(ft => (
                <TouchableOpacity
                  key={ft}
                  style={[s.smallChip, followUpType === ft && s.smallChipActive]}
                  onPress={() => setFollowUpType(ft)}
                >
                  <Text style={[s.smallChipText, followUpType === ft && s.smallChipTextActive]}>
                    {ft.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[s.fieldLabel, { marginTop: Spacing.md }]}>Days until follow-up</Text>
            <TextInput
              style={s.input}
              placeholder="7"
              value={followUpInterval}
              onChangeText={setFollowUpInterval}
              keyboardType="numeric"
              placeholderTextColor={Colors.textLight}
            />
          </View>
        )}

        {/* Notes */}
        <Text style={s.sectionTitle}>Additional Notes</Text>
        <TextInput
          style={[s.input, s.textArea]}
          placeholder="Additional observations..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.textLight}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Icon name={'check' as IconName} size={20} color={Colors.white} />
              <Text style={s.submitText}>Save Health Record</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg, paddingBottom: Spacing.xl,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sectionTitle: {
    fontSize: FontSize.md, fontWeight: '700', color: Colors.text,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  animalBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.md,
    ...Shadow.medium, borderLeftWidth: 4, borderLeftColor: Colors.primary,
  },
  animalImage: { width: 60, height: 60, borderRadius: 12 },
  animalIconBox: {
    width: 60, height: 60, borderRadius: 12,
    backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center',
  },
  animalBannerInfo: { flex: 1 },
  animalBannerName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  animalBannerOwner: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  animalBannerService: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.white,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  typeChipTextActive: { color: Colors.white },
  smallChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.white,
  },
  smallChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  smallChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  smallChipTextActive: { color: Colors.white, fontWeight: '600' },
  input: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    fontSize: FontSize.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  halfField: { flex: 1 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs },
  statusRow: { flexDirection: 'row', gap: Spacing.sm },
  statusChip: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center',
  },
  statusChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: 'capitalize', fontWeight: '500' },
  statusChipTextActive: { color: Colors.white, fontWeight: '700' },
  followUpRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: Spacing.lg,
  },
  followUpHint: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  followUpSection: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginTop: Spacing.md, ...Shadow.light,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, marginTop: Spacing.xxl,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.white },
});
