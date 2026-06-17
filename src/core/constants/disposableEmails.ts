// Lista de domínios de email descartáveis comuns usados por bots e spammers
// Última atualização: 2026-06-17

export const DISPOSABLE_EMAIL_DOMAINS: string[] = [
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
  'throwaway.email',
  'yopmail.com',
  'mailnator.com',
  'temp-mail.org',
  'fakeinbox.com',
  'trashmail.com',
  'dispostable.com',
  'sharklasers.com',
  'getairmail.com',
  'maildrop.cc',
  'mailcatch.com',
  'tempr.email',
  'tempinbox.com',
  'spamgourmet.com',
  'mohmal.com',
  'getnada.com',
  'tempail.com',
  'burnermail.io',
  'mintemail.com',
  'discard.email',
  'mytemp.email',
  'mailnesia.com',
  'emailondeck.com',
  'mailpoof.com',
  'filzmail.com',
  'tempemail.com',
  'mailtemp.info',
  'tempmailaddress.com',
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}
