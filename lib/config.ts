// Centralized configuration for the project
export const config = {
  uploadedUrl: '/uploads',
  getPath: (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath;
  },
  getApiPath: (endpoint: string): string => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `/api${cleanEndpoint}`;
  },
  isSubdirectory: (): boolean => false,
};

export const paths = {
  upload: config.getApiPath('/upload-image'),
  home: config.getPath('/'),
  uploadPage: config.getPath('/upload'),
} as const; 