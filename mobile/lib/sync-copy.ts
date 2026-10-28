export const syncCopy = {
  en: {
    title: "Sync recovery",
    intro:
      "Evidence queued on this device for your signed-in account. A queued record is not a confirmed server save.",
    loading: "Reading the device queue…",
    error:
      "The queue could not be read or updated. Reconnect and retry. If this continues, keep this device and contact support; do not clear app storage or re-enter the same evidence.",
    empty:
      "No records queued for this account on this device. Check source records to confirm saved evidence.",
    refresh: "Refresh queue",
    retry: "Retry uploads",
    busy: "Working…",
    offline: "Uploads require a connection. Your queued records remain on this device.",
    pending: "Awaiting upload",
    failed: "Upload failed — evidence retained",
    conflict: "Conflict — verify the source record before re-entering evidence",
    attempts: "Failed attempts",
    recorded: "Queued",
    reference: "Record reference",
    readOnly: "Inspector access is read-only. Upload retry is unavailable.",
    checks: "Daily check",
    temperature_logs: "Temperature reading",
    haccp_flow_runs: "HACCP workflow",
    goods_in_logs: "Delivery check",
    cleaning_completions: "Cleaning evidence",
    asset_events: "Equipment evidence",
  },
  de: {
    title: "Übertragung prüfen",
    intro:
      "Auf diesem Gerät gespeicherte Nachweise für Ihr angemeldetes Konto. Ein wartender Eintrag ist noch keine bestätigte Serverspeicherung.",
    loading: "Gerätespeicher wird gelesen…",
    error:
      "Die Warteschlange konnte nicht gelesen oder aktualisiert werden. Bitte Verbindung prüfen und erneut versuchen. Bei wiederholtem Fehler Gerät aufbewahren und Support kontaktieren; App-Daten nicht löschen und Nachweise nicht erneut erfassen.",
    empty:
      "Für dieses Konto warten auf diesem Gerät keine Einträge. Gespeicherte Nachweise in den Quelldatensätzen prüfen.",
    refresh: "Liste aktualisieren",
    retry: "Übertragung wiederholen",
    busy: "Wird bearbeitet…",
    offline:
      "Die Übertragung benötigt eine Verbindung. Wartende Einträge bleiben auf diesem Gerät.",
    pending: "Wartet auf Übertragung",
    failed: "Übertragung fehlgeschlagen — Nachweis bleibt erhalten",
    conflict: "Konflikt — Quelldatensatz vor erneuter Erfassung prüfen",
    attempts: "Fehlgeschlagene Versuche",
    recorded: "Gespeichert am",
    reference: "Eintragsreferenz",
    readOnly: "Prüferzugriff ist schreibgeschützt. Erneute Übertragung ist nicht verfügbar.",
    checks: "Tägliche Prüfung",
    temperature_logs: "Temperaturmessung",
    haccp_flow_runs: "HACCP-Ablauf",
    goods_in_logs: "Wareneingang",
    cleaning_completions: "Reinigungsnachweis",
    asset_events: "Gerätenachweis",
  },
} as const;
