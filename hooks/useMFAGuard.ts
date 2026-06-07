// MFA guard dezactivat — redirect forțat eliminat.
// MFA rămâne disponibil voluntar via view 'setup-mfa'.
// Reactivează redirect-ul când toți adminii au factor MFA configurat.

export function useMFAGuard(_activeRoleContext: any | null) {
    return { mfaChecked: true };
}
