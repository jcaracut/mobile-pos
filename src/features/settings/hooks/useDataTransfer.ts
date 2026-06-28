import { useCallback, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { DataTransferService } from '../services/DataTransferService';
import type { ExportFormat, ImportResult } from '../types';

const MIME = {
  json: 'application/json',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

interface DataTransfer {
  busy: boolean;
  /** Writes a backup file and opens the share sheet. Resolves to the file name, or null if sharing is unsupported. */
  exportData: (format: ExportFormat) => Promise<string | null>;
  /** Prompts for a JSON backup and merges it in. Resolves to the result, or null if the user cancelled. */
  importData: () => Promise<ImportResult | null>;
}

export function useDataTransfer(): DataTransfer {
  const [busy, setBusy] = useState(false);

  const exportData = useCallback(async (format: ExportFormat): Promise<string | null> => {
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) return null;
      const bundle = await DataTransferService.exportBundle();
      const fileName = `tugkaran-backup-${timestamp()}.${format === 'excel' ? 'xlsx' : 'json'}`;

      const file = new File(Paths.cache, fileName);
      file.create({ overwrite: true });
      if (format === 'excel') {
        file.write(DataTransferService.toExcelBytes(bundle));
      } else {
        file.write(DataTransferService.serialize(bundle));
      }

      await Sharing.shareAsync(file.uri, { mimeType: MIME[format], dialogTitle: 'Export Tugkaran data' });
      return fileName;
    } finally {
      setBusy(false);
    }
  }, []);

  const importData = useCallback(async (): Promise<ImportResult | null> => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      copyToCacheDirectory: true,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return null;

    setBusy(true);
    try {
      const contents = await new File(asset.uri).text();
      const bundle = DataTransferService.parse(contents);
      return await DataTransferService.importBundle(bundle);
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, exportData, importData };
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
