import type {
  SettingsData,
  UpdateSettingsResponse,
  BackupResponse,
  RestoreResponse,
} from "../../../shared/types/settings";

type SettingsDesktopApi = {
  settings: {
    get: () => Promise<SettingsData>;

    update: (
      settings: SettingsData
    ) => Promise<SettingsData>;

    reset: () => Promise<SettingsData>;

    selectLogo: () => Promise<{
      canceled: boolean;
      filePath: string | null;
    }>;

    getLogoData: () => Promise<string | null>;
  };
};

function getSettingsApi(): SettingsDesktopApi["settings"] {
  const api =
    window.desktopAPI as typeof window.desktopAPI &
      SettingsDesktopApi;

  if (!api.settings) {
    throw new Error(
      "Settings API is not available."
    );
  }

  return api.settings;
}

export async function getSettings(): Promise<SettingsData> {
  return getSettingsApi().get();
}

export async function updateSettings(
  settings: SettingsData
): Promise<SettingsData> {
  return getSettingsApi().update(
    settings
  );
}

export async function resetSettings(): Promise<SettingsData> {
  return getSettingsApi().reset();
}

export async function selectLogo(): Promise<{
  canceled: boolean;
  filePath: string | null;
}> {
  return getSettingsApi().selectLogo();
}

export async function getLogoData(): Promise<string | null> {
  return getSettingsApi().getLogoData();
}

export async function backupDatabase(): Promise<BackupResponse> {
  return {
    success: false,
    error:
      "Database backup is not connected yet.",
  };
}

export async function restoreDatabase(): Promise<RestoreResponse> {
  return {
    success: false,
    error:
      "Database restore is not connected yet.",
  };
}

export type {
  UpdateSettingsResponse,
};