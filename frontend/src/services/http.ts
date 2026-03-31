export async function readApiResponse(response: Response): Promise<unknown> {
  const raw = await response.text();
  let data: unknown = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const dataObj = data as Record<string, unknown> | null;
    const detailMessage =
      typeof dataObj?.detail === 'string'
        ? dataObj.detail
        : Array.isArray(dataObj?.detail) &&
            (dataObj.detail[0] as Record<string, unknown>)?.msg
          ? String((dataObj.detail[0] as Record<string, unknown>).msg)
          : null;

    const fallback =
      raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')
        ? "La réponse de l'API est HTML. Vérifiez que `npm run api` est lancé et que le proxy `/api` est actif."
        : `Erreur HTTP ${response.status}`;

    throw new Error(
      (dataObj as Record<string, string> | null)?.message || detailMessage || fallback,
    );
  }

  if (data === null) {
    throw new Error('Réponse API invalide: JSON attendu.');
  }

  return data;
}