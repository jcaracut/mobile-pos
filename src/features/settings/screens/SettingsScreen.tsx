import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius, fontSize } from '@theme/index';
import { useDataTransfer } from '../hooks/useDataTransfer';
import { ActionButton } from '../components/atoms/ActionButton';
import type { ExportFormat, ImportResult } from '../types';

export function SettingsScreen() {
  const { busy, exportData, importData } = useDataTransfer();

  async function handleExport(format: ExportFormat) {
    try {
      const fileName = await exportData(format);
      if (fileName === null) {
        Alert.alert('Sharing unavailable', 'This device cannot share files.');
      }
    } catch (e) {
      Alert.alert('Export failed', errorMessage(e));
    }
  }

  function handleImport() {
    Alert.alert(
      'Import data',
      'Records are matched by id: existing records are updated and new ones are added. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose file', onPress: runImport },
      ]
    );
  }

  async function runImport() {
    try {
      const result = await importData();
      if (result !== null) Alert.alert('Import complete', summary(result));
    } catch (e) {
      Alert.alert('Import failed', errorMessage(e));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export data</Text>
          <Text style={styles.cardSubtitle}>
            Save a backup of all products, inventory, customers, and orders.
          </Text>
          <View style={styles.actions}>
            <ActionButton
              icon="📄"
              label="Export as JSON"
              description="Full backup — can be re-imported"
              variant="primary"
              disabled={busy}
              onPress={() => handleExport('json')}
            />
            <ActionButton
              icon="📊"
              label="Export as Excel"
              description="Spreadsheet for viewing only"
              disabled={busy}
              onPress={() => handleExport('excel')}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import data</Text>
          <Text style={styles.cardSubtitle}>
            Restore from a JSON backup exported by Tugkaran. Excel files cannot be imported.
          </Text>
          <View style={styles.actions}>
            <ActionButton
              icon="📥"
              label="Import from JSON"
              description="Merge a backup into this device"
              disabled={busy}
              onPress={handleImport}
            />
          </View>
        </View>
      </ScrollView>

      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.overlayText}>Working…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function summary(result: ImportResult): string {
  return `Added ${result.totalCreated} record${plural(result.totalCreated)} and updated ${result.totalUpdated}.`;
}

function plural(n: number): string {
  return n === 1 ? '' : 's';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md },
  heading: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },

  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
  cardSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  actions: { gap: spacing.sm },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(61, 40, 23, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: { marginTop: spacing.sm, color: colors.textOnPrimary, fontWeight: '600' },
});
