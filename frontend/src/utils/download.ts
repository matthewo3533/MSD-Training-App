/**
 * Downloads a file from the API with authentication headers
 * @param url - The API endpoint URL (relative, will be prefixed with /api)
 * @param filename - The filename for the downloaded file (optional)
 */
export const downloadFile = async (url: string, filename?: string) => {
  try {
    const token = localStorage.getItem('token');
    
    // Use fetch with authentication header
    const response = await fetch(`${window.location.origin}/api${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      const errorMessage = error.error || 'Download failed';
      const errorDetails = error.details ? `: ${error.details}` : '';
      console.error('Download error response:', error);
      throw new Error(`${errorMessage}${errorDetails}`);
    }

    // Get the filename from Content-Disposition header or use provided filename
    const contentDisposition = response.headers.get('Content-Disposition');
    let finalFilename = filename;
    
    if (!finalFilename && contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        finalFilename = filenameMatch[1];
      }
    }

    // Get the blob data
    const blob = await response.blob();

    // Create a temporary URL and trigger download
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = finalFilename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error: any) {
    console.error('Download error:', error);
    alert(error.message || 'Failed to download file');
  }
};

