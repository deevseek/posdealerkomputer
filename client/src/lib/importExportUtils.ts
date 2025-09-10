export interface ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    message: string;
    field?: string;
  }>;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates if the selected file is a valid Excel file
 */
export const validateExcelFile = (file: File): FileValidationResult => {
  // Check file size (5MB limit)
  const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeInBytes) {
    return {
      isValid: false,
      error: "File size must be less than 5MB"
    };
  }

  // Check file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ];

  const validExtensions = ['.xlsx', '.xls'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: "Only Excel files (.xlsx, .xls) are allowed"
    };
  }

  return { isValid: true };
};

/**
 * Downloads a template file from the server
 */
export const downloadTemplate = async (templateUrl: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(templateUrl, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Template download error:', error);
    throw new Error('Failed to download template file');
  }
};

/**
 * Uploads an Excel file for import
 */
export const uploadExcelFile = async (file: File, uploadUrl: string): Promise<ImportResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
    }

    const result: ImportResult = await response.json();
    return result;
  } catch (error) {
    console.error('File upload error:', error);
    throw error instanceof Error ? error : new Error('Failed to upload file');
  }
};

/**
 * Formats file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gets the appropriate icon color based on import result
 */
export const getImportResultColor = (result: ImportResult): string => {
  if (result.errorCount === 0) return 'text-green-600';
  if (result.successCount > 0) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * Generates a summary message for import results
 */
export const getImportSummaryMessage = (result: ImportResult): string => {
  if (result.errorCount === 0) {
    return `Successfully imported all ${result.successCount} records`;
  } else if (result.successCount > 0) {
    return `Imported ${result.successCount} records with ${result.errorCount} errors`;
  } else {
    return `Import failed: ${result.errorCount} errors found`;
  }
};