// Centralized configuration for the project
export const config = {
  // Get the project path from environment variable, default to /microcement for Docker deployment
  projectPath: process.env.PROJECT_PATH || '/microcement',
  
  // Utility function to get the full path with project prefix
  getPath: (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${config.projectPath}${cleanPath}`;
  },
  
  // Utility function to get API paths - include the full path with basePath
  getApiPath: (endpoint: string): string => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    // Include the full path with basePath for API routes
    return `${config.projectPath}/api${cleanEndpoint}`;
  },
  
  // Check if we're running in a subdirectory
  isSubdirectory: (): boolean => {
    return config.projectPath !== '';
  }
};

// Console logging to verify PROJECT_PATH is being passed
console.log('🔧 PROJECT_PATH environment variable:', process.env.PROJECT_PATH);
console.log('🔧 Config projectPath value:', config.projectPath);
console.log('🔧 Is subdirectory:', config.isSubdirectory());
console.log('🔧 Frontend should call (API path):', config.getApiPath('/upload-image'));
console.log('🔧 Upload page path:', config.getPath('/upload'));

// Export commonly used paths
export const paths = {
  upload: config.getApiPath('/upload-image'),
  home: config.getPath('/'),
  uploadPage: config.getPath('/upload'),
} as const; 