export function parseJSON<T>(content: string): T {
  // Remove markdown code blocks (```json ... ```)
  const clean = content.replace(/```[\w]*/g, '').trim();

  try {
    return JSON.parse(clean) as T;
  } catch {
    // Tenta extrair array [...] ou objeto {...} do conteúdo limpo
    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    const objectMatch = clean.match(/\{[\s\S]*\}/);
    const jsonMatch = arrayMatch || objectMatch;
    if (!jsonMatch) {
      console.error('[parseJSON] AI response was not valid JSON (length:', clean.length, 'chars)');
      throw new Error("IA não retornou JSON válido.");
    }
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      console.error('[parseJSON] Extracted JSON fragment also invalid (length:', jsonMatch[0].length, 'chars)');
      throw new Error("IA não retornou JSON válido.");
    }
  }
}
