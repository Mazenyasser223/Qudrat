// Global error handler for unhandled promise rejections and other errors

export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Check if it's a JSON parsing error from content scripts or browser extensions
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('not valid JSON') ||
         event.reason.message.includes('[object Object]') ||
         event.reason.message.includes('Unexpected token') ||
         event.reason.message.includes('SyntaxError')) &&
        (event.reason.stack && (event.reason.stack.includes('content.js') || 
                                event.reason.stack.includes('extension') ||
                                event.reason.stack.includes('chrome-extension') ||
                                event.reason.stack.includes('moz-extension')))) {
      // This is likely from a browser extension, suppress the error
      console.warn('Suppressed JSON parsing error from browser extension:', event.reason.message);
      event.preventDefault(); // Prevent the error from being logged to console
      return;
    }
    
    // For other errors, log them but don't crash the app
    console.error('Global error handler caught:', event.reason);
  });

  // Handle general JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global JavaScript error:', event.error);
    
    // Check if it's a JSON parsing error from content scripts or browser extensions
    if (event.error && event.error.message && 
        (event.error.message.includes('not valid JSON') ||
         event.error.message.includes('[object Object]') ||
         event.error.message.includes('Unexpected token') ||
         event.error.message.includes('SyntaxError')) &&
        (event.error.stack && (event.error.stack.includes('content.js') || 
                                event.error.stack.includes('extension') ||
                                event.error.stack.includes('chrome-extension') ||
                                event.error.stack.includes('moz-extension')))) {
      // This is likely from a browser extension, suppress the error
      console.warn('Suppressed JSON parsing error from browser extension:', event.error.message);
      event.preventDefault(); // Prevent the error from being logged to console
      return;
    }
  });

  // Handle console errors (for debugging)
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Check if it's a JSON parsing error from content scripts or browser extensions
    const errorMessage = args.join(' ');
    if ((errorMessage.includes('not valid JSON') || 
         errorMessage.includes('[object Object]') ||
         errorMessage.includes('Unexpected token') ||
         errorMessage.includes('SyntaxError')) && 
        (errorMessage.includes('content.js') || 
         errorMessage.includes('extension') ||
         errorMessage.includes('chrome-extension') ||
         errorMessage.includes('moz-extension'))) {
      // Suppress these errors as they're from browser extensions
      console.warn('Suppressed JSON parsing error from browser extension');
      return;
    }
    
    // Log other errors normally
    originalConsoleError.apply(console, args);
  };
};

// Initialize error handlers
setupGlobalErrorHandlers();
