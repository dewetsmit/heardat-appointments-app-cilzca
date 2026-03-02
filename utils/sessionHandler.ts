
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'expo-router';

export function useSessionHandler() {
  const { setRedirectPath } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSessionExpired = () => {
    console.log('[SessionHandler] Session expired, saving current path:', pathname);
    // Save the current path before redirecting to auth
    setRedirectPath(pathname);
    // Redirect to auth screen
    router.replace('/auth');
  };

  return { handleSessionExpired };
}

// Helper function to check if an API error is a session expiration error
export function isSessionExpiredError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const lowerMessage = errorMessage.toLowerCase();
  
  return (
    lowerMessage.includes('session') && 
    (lowerMessage.includes('expired') || 
     lowerMessage.includes('invalid') || 
     lowerMessage.includes('unauthorized'))
  );
}
