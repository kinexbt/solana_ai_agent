export const fetchJson = async (url: string, options?: any) => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Log the actual content for debugging
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error(`Expected JSON but got ${contentType || 'unknown'}`);
    }

    return await response.json();
  } catch (error) {
    console.error('fetchJson error:', error);
    throw error;
  }
};
