// A social login control (Google / Microsoft) is "armed" only when its OAuth client id is
// actually baked into the build. When absent or blank the provider is unconfigured, and the
// button must be HIDDEN rather than shipped as a permanently-dead greyed-out control
// (arm-or-hide doctrine; DEAD-SOCIAL-LOGIN-001). If a real id is later baked from SSM, the
// button reappears automatically — armed by config presence, not hardcoded on.
export function socialProviderEnabled(clientId) {
  return typeof clientId === 'string' && clientId.trim().length > 0;
}
