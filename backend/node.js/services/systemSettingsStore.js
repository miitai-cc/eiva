export function createSystemSettingsStore(db) {
  const upsertSetting = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);
  const selectSetting = db.prepare(`
    SELECT key, value, updated_at AS updatedAt
    FROM system_settings
    WHERE key = ?
  `);
  const selectSettings = db.prepare(`
    SELECT key, value, updated_at AS updatedAt
    FROM system_settings
    ORDER BY key ASC
  `);

  return {
    set(key, value, updatedAt = new Date().toISOString()) {
      upsertSetting.run({
        key,
        value: JSON.stringify(value),
        updatedAt
      });
      return this.get(key);
    },

    get(key) {
      const row = selectSetting.get(key);
      if (!row) return null;

      return {
        key: row.key,
        value: parseJson(row.value),
        updatedAt: row.updatedAt
      };
    },

    list() {
      return selectSettings.all().map((row) => ({
        key: row.key,
        value: parseJson(row.value),
        updatedAt: row.updatedAt
      }));
    }
  };
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
