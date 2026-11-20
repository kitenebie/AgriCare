import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '@/components/ui/FontScale';
import { Icon, type IconName } from '@/components/ui';
import { BorderRadius, Colors, FontSize, Spacing } from '@/constants/theme';
import { catalog } from '../../../functions/shared/technicianServiceMatching';

interface Props {
  specializationIds: string[];
  subSpecializationIds: string[];
  onChange: (specializationIds: string[], subSpecializationIds: string[]) => void;
}

export default function TechnicianQualificationPicker({ specializationIds, subSpecializationIds, onChange }: Props) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleSpecialization = (id: string) => {
    const subs = catalog.subSpecializations.filter(item => item.specializationId === id).map(item => item.id);
    if (specializationIds.includes(id)) {
      onChange(specializationIds.filter(value => value !== id), subSpecializationIds.filter(value => !subs.includes(value)));
      setExpandedIds(values => values.filter(value => value !== id));
    } else {
      onChange([...specializationIds, id], subSpecializationIds);
      setExpandedIds(values => [...new Set([...values, id])]);
    }
  };

  const toggleSubSpecialization = (id: string) => onChange(
    specializationIds,
    subSpecializationIds.includes(id) ? subSpecializationIds.filter(value => value !== id) : [...subSpecializationIds, id]
  );

  return (
    <View>
      <Text style={s.hint}>Choose each animal category, then select the exact services you are qualified to provide.</Text>
      {catalog.specializations.map(specialization => {
        const selected = specializationIds.includes(specialization.id);
        const subs = catalog.subSpecializations.filter(item => item.specializationId === specialization.id);
        const count = subs.filter(item => subSpecializationIds.includes(item.id)).length;
        const expanded = expandedIds.includes(specialization.id);
        return (
          <View key={specialization.id} style={[s.card, selected && s.cardSelected]}>
            <View style={s.headerRow}>
              <TouchableOpacity
                style={s.categoryButton}
                onPress={() => toggleSpecialization(specialization.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={specialization.name}
                activeOpacity={0.8}
              >
                <View style={[s.checkbox, count === subs.length && count > 0 && s.checkboxChecked, count > 0 && count < subs.length && s.checkboxPartial]}>
                  {count === subs.length && count > 0 ? <Icon name="check" size={15} color={Colors.white} /> : count > 0 ? <Text style={s.partialMark}>−</Text> : selected ? <Icon name="check" size={15} color={Colors.primary} /> : null}
                </View>
                <Icon name={(catalog.animalTypes.find(type => type.id === specialization.animalTypeId)?.iconName || 'paw') as IconName} size={21} color={Colors.primary} />
                <View style={s.categoryCopy}>
                  <Text style={s.categoryTitle}>{specialization.name}</Text>
                  <Text style={s.countText}>{count} of {subs.length} services selected</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.expandButton}
                onPress={() => setExpandedIds(values => expanded ? values.filter(value => value !== specialization.id) : [...values, specialization.id])}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${specialization.name}`}
              >
                <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {selected && expanded && <View style={s.subList}>
              <TouchableOpacity
                style={s.selectAll}
                onPress={() => {
                  const allSelected = count === subs.length;
                  const next = subSpecializationIds.filter(id => !subs.some(item => item.id === id));
                  onChange(specializationIds, allSelected ? next : [...next, ...subs.map(item => item.id)]);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${count === subs.length ? 'Clear' : 'Select all'} ${specialization.name} services`}
              >
                <Text style={s.selectAllText}>{count === subs.length ? 'Clear All' : 'Select All'}</Text>
              </TouchableOpacity>
              {subs.map(item => {
                const checked = subSpecializationIds.includes(item.id);
                return <TouchableOpacity
                  key={item.id}
                  style={s.subOption}
                  onPress={() => toggleSubSpecialization(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={item.name}
                  activeOpacity={0.8}
                >
                  <View style={[s.subCheckbox, checked && s.checkboxChecked]}>{checked && <Icon name="check" size={14} color={Colors.white} />}</View>
                  <Text style={s.subText}>{item.name}</Text>
                </TouchableOpacity>;
              })}
            </View>}
          </View>
        );
      })}
      <View style={s.summary}>
        <Text style={s.summaryTitle}>Selected qualifications ({subSpecializationIds.length})</Text>
        {specializationIds.length === 0 || subSpecializationIds.length === 0
          ? <Text style={s.summaryEmpty}>Select at least one service under each animal category.</Text>
          : specializationIds.map(id => {
            const category = catalog.specializations.find(item => item.id === id);
            const selected = catalog.subSpecializations.filter(item => item.specializationId === id && subSpecializationIds.includes(item.id));
            return <Text key={id} style={s.summaryText}>{category?.name}: {selected.length ? selected.map(item => item.name).join(', ') : 'Choose at least one service'}</Text>;
          })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hint: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  card: { borderWidth: 1, borderColor: '#D7E4DC', borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, backgroundColor: Colors.white, overflow: 'hidden' },
  cardSelected: { borderColor: Colors.primary },
  headerRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingLeft: Spacing.sm },
  categoryButton: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkboxPartial: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  partialMark: { color: Colors.white, fontSize: 16, fontWeight: '800', lineHeight: 18 },
  categoryCopy: { flex: 1, paddingVertical: 8 },
  categoryTitle: { color: Colors.text, fontWeight: '700', fontSize: FontSize.sm },
  countText: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  expandButton: { width: 48, height: 52, alignItems: 'center', justifyContent: 'center' },
  subList: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  selectAll: { minHeight: 40, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 8 },
  selectAllText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
  subOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  subCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' },
  subText: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  summary: { borderRadius: BorderRadius.lg, backgroundColor: '#F0F9F4', padding: Spacing.md, marginTop: Spacing.sm },
  summaryTitle: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '800', marginBottom: 6 },
  summaryText: { color: Colors.text, fontSize: FontSize.xs, lineHeight: 18, marginTop: 3 },
  summaryEmpty: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
});
