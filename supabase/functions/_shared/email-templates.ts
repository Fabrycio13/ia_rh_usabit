// Shared email HTML templates for Edge Functions
// Todas as EFs de email usam este template para consistência visual

interface EmailTemplateParams {
  title: string
  greetingName?: string
  contentHtml: string
  footerHtml?: string
  organizationName?: string
}

export function buildEmailHtml(params: EmailTemplateParams): string {
  const { title, greetingName, contentHtml } = params
  const greeting = greetingName
    ? `<h2 style="color: #2C58FD; font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;">Olá, ${greetingName}!</h2>`
    : ''

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #04070c; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
    <div style="background-color: #04070c; background-image: radial-gradient(circle at top right, #1a3597 0%, #04070c 100%); padding: 32px 16px; text-align: center; min-height: 100%;">
        <div style="max-width: 600px; width: 100%; margin: 0 auto; background: #0b111a; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px 24px; text-align: left; box-sizing: border-box;">

            <div style="text-align: center; margin-bottom: 32px;">
                <img src="cid:logo" alt="Usabit people" style="height: 32px; width: auto; display: block; margin: 0 auto;" />
            </div>

            <div style="background: linear-gradient(135deg, rgba(44, 88, 253, 0.15) 0%, transparent 100%); border-radius: 20px; padding: 2px; margin-bottom: 32px;">
                <div style="background: #0b111a; border-radius: 18px; padding: 32px;">
                    ${greeting}
                    ${contentHtml}
                </div>
            </div>
        </div>

        <div style="max-width: 600px; width: 100%; margin: 48px auto 0; padding: 0 24px 24px; box-sizing: border-box;">
            <img src="cid:logo" alt="Usabit people" style="height: 28px; width: auto; display: block; margin: 0 auto 16px;" />
            <p style="font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.5; margin: 0 0 28px; text-align: center;">
                Conectando talentos com inteligência — a junção entre humano e máquina
            </p>
            <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent); margin: 0 0 24px;"></div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.3); text-align: center; line-height: 1.8;">
                &copy; 2026 Usabit. Todos os direitos reservados.
                <span style="color: rgba(255,255,255,0.2); margin: 0 8px;">·</span>
                Powered by <strong style="color: rgba(255,255,255,0.45); font-weight: 700;">Usabit people</strong>
            </div>
        </div>
    </div>
</body>
</html>`.trim()
}
