// lib/store.ts
import { create } from 'zustand';
import { AppConfigRow, AppRecord } from '@/types';

interface AppStore {
  // Configs
  configs: AppConfigRow[];
  configsLoading: boolean;
  setConfigs: (configs: AppConfigRow[]) => void;
  setConfigsLoading: (v: boolean) => void;
  addConfig: (config: AppConfigRow) => void;
  updateConfig: (id: string, config: Partial<AppConfigRow>) => void;
  removeConfig: (id: string) => void;

  // Records (per-config cache)
  recordsByConfig: Record<string, AppRecord[]>;
  recordsLoading: Record<string, boolean>;
  setRecords: (configId: string, records: AppRecord[]) => void;
  setRecordsLoading: (configId: string, v: boolean) => void;
  addRecord: (configId: string, record: AppRecord) => void;
  updateRecord: (configId: string, id: string, record: Partial<AppRecord>) => void;
  removeRecord: (configId: string, id: string) => void;

  // Modal state
  activeModal: 'create-config' | 'create-record' | 'edit-record' | null;
  modalData: Record<string, unknown>;
  openModal: (modal: AppStore['activeModal'], data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  configs: [],
  configsLoading: false,
  setConfigs: (configs) => set({ configs }),
  setConfigsLoading: (v) => set({ configsLoading: v }),
  addConfig: (config) => set((s) => ({ configs: [config, ...s.configs] })),
  updateConfig: (id, config) =>
    set((s) => ({
      configs: s.configs.map((c) => (c.id === id ? { ...c, ...config } : c)),
    })),
  removeConfig: (id) =>
    set((s) => ({ configs: s.configs.filter((c) => c.id !== id) })),

  recordsByConfig: {},
  recordsLoading: {},
  setRecords: (configId, records) =>
    set((s) => ({ recordsByConfig: { ...s.recordsByConfig, [configId]: records } })),
  setRecordsLoading: (configId, v) =>
    set((s) => ({ recordsLoading: { ...s.recordsLoading, [configId]: v } })),
  addRecord: (configId, record) =>
    set((s) => ({
      recordsByConfig: {
        ...s.recordsByConfig,
        [configId]: [record, ...(s.recordsByConfig[configId] ?? [])],
      },
    })),
  updateRecord: (configId, id, record) =>
    set((s) => ({
      recordsByConfig: {
        ...s.recordsByConfig,
        [configId]: (s.recordsByConfig[configId] ?? []).map((r) =>
          r.id === id ? { ...r, ...record } : r
        ),
      },
    })),
  removeRecord: (configId, id) =>
    set((s) => ({
      recordsByConfig: {
        ...s.recordsByConfig,
        [configId]: (s.recordsByConfig[configId] ?? []).filter((r) => r.id !== id),
      },
    })),

  activeModal: null,
  modalData: {},
  openModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: {} }),
}));
