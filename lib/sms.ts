export function buildSmsLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  // iOS requires "&body=", every other platform expects "?body=".
  const isIOS =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? "&" : "?";
  return `sms:${digits}${separator}body=${encodeURIComponent(message)}`;
}
