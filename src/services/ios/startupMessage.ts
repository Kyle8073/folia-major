// This message must be available even if loading the main translation bundle fails.
export function startupFailureMessage(language: string): string {
    if (/^zh(?:-|$)/i.test(language)) return /(?:TW|HK|Hant)/i.test(language)
        ? 'Folia 無法啟動，請重新開啟應用程式。' : 'Folia 无法启动，请重新打开应用。';
    if (/^(id|in)(?:-|$)/i.test(language)) return 'Folia tidak dapat dimulai. Silakan buka kembali aplikasi.';
    return 'Folia could not start. Please reopen the app.';
}
