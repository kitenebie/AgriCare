import { Icon, IconName } from "@/components/ui";
import {
  BorderRadius,
  Colors,
  FontSize,
  Shadow,
  Spacing,
} from "@/constants/theme";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { getSession } from "@/services/sessionService";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { modalAlert } from '@/components/ui/ModalAlert';

const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 10;
const COL_W = Math.floor((SCREEN_W - 48 - GRID_GAP * 2) / 3);

// All med- icons available
const MED_ICONS: { name: IconName; label: string }[] = [
  { name: "med-stethoscope", label: "Stethoscope" },
  { name: "med-syringe", label: "Syringe" },
  { name: "med-pill", label: "Pill" },
  { name: "med-pills", label: "Pills" },
  { name: "med-pill-bottle", label: "Bottle" },
  { name: "med-thermometer", label: "Thermometer" },
  { name: "med-heart", label: "Heart" },
  { name: "med-scan-heart", label: "Heart Scan" },
  { name: "med-bandage", label: "Bandage" },
  { name: "med-bone-fracture", label: "Bone" },
  { name: "med-microscope", label: "Microscope" },
  { name: "med-dna", label: "DNA" },
  { name: "med-vial", label: "Vial" },
  { name: "med-test-tube", label: "Test Tube" },
  { name: "med-pipette", label: "Pipette" },
  { name: "med-activity", label: "Activity" },
  { name: "med-clipboard", label: "Clipboard" },
  { name: "med-first-aid-kit", label: "First Aid" },
  { name: "med-bottle", label: "Flask" },
  { name: "med-x-ray", label: "X-Ray" },
  { name: "med-ribbon", label: "Ribbon" },
  { name: "med-sheild-check", label: "Shield" },
  { name: "med-atom", label: "Atom" },
  { name: "med-worm", label: "Parasite" },
  { name: "med-haart-shake", label: "Handshake" },
  { name: "med-cow", label: "Cow" },
  { name: "med-piggy-bank", label: "Livestock" },
  { name: "med-tablet", label: "Tablet" },
];

// Name suggestions based on selected icon
const SUGGESTIONS: Record<string, string[]> = {
  "med-stethoscope": ["General Checkup", "Consultation", "Diagnosis"],
  "med-syringe": ["Injection", "Vaccination", "Booster Shot"],
  "med-pill": ["Medication", "Deworming", "Supplement"],
  "med-pills": ["Multi-Vitamin", "Antibiotics", "Pain Relief"],
  "med-thermometer": ["Fever Check", "Temperature Monitor", "Heat Detection"],
  "med-heart": ["Heart Check", "Blood Pressure", "Cardiac Exam"],
  "med-bandage": ["Wound Care", "Injury Treatment", "Dressing Change"],
  "med-bone-fracture": ["Fracture Treatment", "Splint", "Bone Check"],
  "med-microscope": ["Lab Test", "Blood Work", "Fecal Exam"],
  "med-dna": ["Artificial Insemination", "Breeding", "Genetic Test"],
  "med-vial": ["Blood Sample", "Serum Test", "Culture"],
  "med-test-tube": ["Urinalysis", "Lab Analysis", "Sample Collection"],
  "med-activity": ["Monitoring", "Health Track", "Activity Check"],
  "med-worm": ["Deworming", "Parasite Control", "Fecal Float"],
  "med-cow": ["Cattle Service", "Hoof Trim", "Pregnancy Check"],
  "med-piggy-bank": ["Swine Service", "Castration", "Iron Shot"],
  "med-haart-shake": ["Follow-up", "Referral", "Second Opinion"],
  "med-scan-heart": ["Ultrasound", "Cardiac Scan", "Echo"],
  "med-x-ray": ["X-Ray", "Imaging", "Radiograph"],
};

const DEFAULT_SUGGESTIONS = [
  "Custom Service",
  "Emergency",
  "Other Treatment",
  "Consultation",
  "Follow-up Visit",
  "Preventive Care",
];

export default function CustomServiceScreen() {
  const [selectedIcon, setSelectedIcon] = useState<IconName | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [step, setStep] = useState(1); // 1=pick icon, 2=name it
  const [saving, setSaving] = useState(false);

  const suggestions = selectedIcon
    ? SUGGESTIONS[selectedIcon] || DEFAULT_SUGGESTIONS
    : DEFAULT_SUGGESTIONS;

  const handleConfirm = async () => {
    if (!serviceName.trim()) return;
    setSaving(true);
    try {
      const session = await getSession();
      if (!session) return;
      await firestore().collection('customServices').add({
        name: serviceName.trim(),
        iconName: selectedIcon || 'med-clipboard',
        ownerId: session.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      router.back();
    } catch (e: any) {
      modalAlert('Error', e.message);
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 2) setStep(1);
            else router.back();
          }}
          style={s.backBtn}
        >
          <Icon
            name="chevron-right"
            size={20}
            color={Colors.white}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {step === 1 ? "Select Icon" : "Name Service"}
        </Text>
        <Text style={s.stepBadge}>Step {step}/2</Text>
      </View>

      {/* Step 1: Icon Grid */}
      {step === 1 && (
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.desc}>Choose an icon that represents service</Text>
          <View style={s.grid}>
            {MED_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon.name}
                style={[
                  s.gridItem,
                  selectedIcon === icon.name && s.gridItemActive,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedIcon(icon.name)}
              >
                <View
                  style={[
                    s.iconCircle,
                    selectedIcon === icon.name && s.iconCircleActive,
                  ]}
                >
                  <Icon
                    name={icon.name}
                    size={24}
                    color={
                      selectedIcon === icon.name ? Colors.white : Colors.primary
                    }
                  />
                </View>
                <Text
                  style={[
                    s.gridLabel,
                    selectedIcon === icon.name && {
                      color: Colors.primary,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {icon.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: 100 }} />
          {selectedIcon && (
            <View style={s.floatingBtn}>
              <TouchableOpacity style={s.nextBtn} onPress={() => setStep(2)}>
                <Text style={s.nextBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Step 2: Name the service */}
      {step === 2 && (
        <ScrollView
          style={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.selectedPreview}>
            <View style={s.previewIcon}>
              <Icon name={selectedIcon!} size={32} color={Colors.primary} />
            </View>
            <Text style={s.previewLabel}>Selected Icon</Text>
          </View>

          <Text style={s.label}>Service Name</Text>
          <TextInput
            style={s.input}
            value={serviceName}
            onChangeText={setServiceName}
            placeholder="Enter service name..."
            placeholderTextColor={Colors.textLight}
            autoFocus
          />

          <Text style={s.suggestTitle}>Suggestions</Text>
          <View style={s.suggestRow}>
            {suggestions.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  s.suggestChip,
                  serviceName === name && s.suggestChipActive,
                ]}
                onPress={() => setServiceName(name)}
              >
                <Text
                  style={[
                    s.suggestText,
                    serviceName === name && s.suggestTextActive,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[s.confirmBtn, !serviceName.trim() && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={!serviceName.trim()}
          >
            <Text style={s.confirmBtnText}>Use This Service</Text>
          </TouchableOpacity>
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  stepBadge: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "flex-start",
  },
  gridItem: {
    width: COL_W,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  gridItemActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleActive: { backgroundColor: Colors.primary },
  gridLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },
  // Floating next
  floatingBtn: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    alignItems: "center",
    ...Shadow.medium,
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  // Step 2
  selectedPreview: { alignItems: "center", marginBottom: Spacing.xl },
  previewIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: FontSize.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  suggestTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  suggestText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  suggestTextActive: { color: Colors.white, fontWeight: "700" },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.xxl,
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
});
