/** Provedores de IA — o mesmo catálogo do Weknow Ask. */
export type AiProvider = { id: string; label: string }

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'weknow', label: 'Weknow (padrão)' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'claude', label: 'Claude' },
]
