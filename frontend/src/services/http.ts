// http.ts — gestion robuste des réponses API

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function readApiResponse<T = unknown>(response: Response): Promise<T> {
  // Tente de lire le corps JSON dans tous les cas
  let body: unknown;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    // Réponse non-JSON (ex: 204 No Content, HTML d'erreur nginx…)
    try {
      body = await response.text();
    } catch {
      body = null;
    }
  }

  // Si la réponse est en erreur, on lance une exception avec les détails
  if (!response.ok) {
    // Essaie d'extraire un message lisible depuis le corps
    let message = `Erreur HTTP ${response.status}`;
    if (body && typeof body === 'object' && body !== null) {
      const b = body as Record<string, unknown>;
      if (typeof b['detail'] === 'string') message = b['detail'];
      else if (typeof b['message'] === 'string') message = b['message'];
    } else if (typeof body === 'string' && body.length > 0 && body.length < 200) {
      message = body;
    }
    throw new ApiError(response.status, message, body);
  }

  // 204 No Content — pas de corps
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return body as T;
}