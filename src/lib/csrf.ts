// CSRF token management
let csrfToken: string | null = null;

export const getCSRFToken = async () => {
  if (!csrfToken) {
    const response = await fetch('/api/csrf-token');
    const data: CSRFResponse = await response.json();
    csrfToken = data.token;
  }
  return csrfToken;
};

export const clearCSRFToken = () => {
  csrfToken = null;
};

export const addCSRFToken = async (options: RequestInit = {}): RequestInit => {
  const token = await getCSRFToken();
  return {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token,
    },
  };
};