export function parseJSON<T>(content: string): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[parseJSON] Raw AI response (not JSON):', content);
      throw new Error("IA não retornou JSON válido.");
    }
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      console.error('[parseJSON] Extracted JSON match also invalid:', jsonMatch[0], '| full content:', content);
      throw new Error("IA não retornou JSON válido.");
    }
  }
}
