
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Backend URL is configured in app.json under expo.extra.backendUrl
 * It is set automatically when the backend is deployed
 */
export const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || "";

/**
 * Heardat API configuration
 */
export const HEARDAT_API_URL = "https://www.heardatonline.co.za/api";

/**
 * Check if backend is properly configured
 */
export const isBackendConfigured = (): boolean => {
  return !!BACKEND_URL && BACKEND_URL.length > 0;
};

/**
 * Platform-specific storage
 */
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      deleteItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    }
  : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      deleteItem: (key: string) => SecureStore.deleteItemAsync(key),
    };

/**
 * Get Heardat session credentials from storage
 */
export const getHeardatCredentials = async (): Promise<{
  sessionKey: string | null;
  userKey: string | null;
  companyKey: string | null;
  userId: string | null;
}> => {
  try {
    const currentUserStr = await storage.getItem("CurrentUser");
    const sessionKey = await storage.getItem("session_key");
    const userKey = await storage.getItem("UserKey");
    
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      return {
        sessionKey: sessionKey || currentUser.SessionKey || null,
        userKey: userKey || currentUser.UserKey || null,
        companyKey: currentUser.CompanyKey || null,
        userId: currentUser.UserID || null,
      };
    }
    
    return {
      sessionKey,
      userKey,
      companyKey: null,
      userId: null,
    };
  } catch (error) {
    console.error("[API] Error retrieving Heardat credentials:", error);
    return {
      sessionKey: null,
      userKey: null,
      companyKey: null,
      userId: null,
    };
  }
};

/**
 * Get bearer token from platform-specific storage (for internal backend)
 */
export const getBearerToken = async (): Promise<string | null> => {
  try {
    const credentials = await getHeardatCredentials();
    // Use session key as bearer token
    return credentials.sessionKey;
  } catch (error) {
    console.error("[API] Error retrieving bearer token:", error);
    return null;
  }
};

/**
 * Generic API call helper with error handling
 *
 * @param endpoint - API endpoint path (e.g., '/users', '/auth/login')
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response
 * @throws Error if backend is not configured or request fails
 */
export const apiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  if (!isBackendConfigured()) {
    throw new Error("Backend URL not configured. Please rebuild the app.");
  }

  const url = `${BACKEND_URL}${endpoint}`;
  console.log("[API] Calling:", url, options?.method || "GET");

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[API] Error response:", response.status, text);
      throw new Error(`API error: ${response.status} - ${text}`);
    }

    const data = await response.json();
    console.log("[API] Success:", data);
    return data;
  } catch (error) {
    console.error("[API] Request failed:", error);
    throw error;
  }
};

/**
 * Heardat API call helper
 * Automatically adds session credentials to query parameters
 */
export const heardatApiCall = async <T = any>(
  endpoint: string,
  additionalParams?: Record<string, string>
): Promise<T> => {
  const credentials = await getHeardatCredentials();
  
  if (!credentials.sessionKey || !credentials.userKey) {
    throw new Error("Authentication required. Please sign in.");
  }
  
  // Build query parameters with credentials
  const params = new URLSearchParams({
    Sessionkey: credentials.sessionKey,
    Userkey: credentials.userKey,
    Key: credentials.userKey,
    ...(credentials.companyKey && { Companykey: credentials.companyKey }),
    ...(credentials.userId && { UserID: credentials.userId }),
    ...additionalParams,
  });
  
  const url = `${HEARDAT_API_URL}/${endpoint}?${params.toString()}`;
  console.log("[Heardat API] Calling:", endpoint);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error("[Heardat API] Error response:", response.status, text);
      throw new Error(`Heardat API error: ${response.status}`);
    }
    
    const responseText = await response.text();
    const data = JSON.parse(responseText);
    console.log("[Heardat API] Success");
    return data;
  } catch (error) {
    console.error("[Heardat API] Request failed:", error);
    throw error;
  }
};

/**
 * GET request helper
 */
export const apiGet = async <T = any>(endpoint: string): Promise<T> => {
  return apiCall<T>(endpoint, { method: "GET" });
};

/**
 * POST request helper
 */
export const apiPost = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * PUT request helper
 */
export const apiPut = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * PATCH request helper
 */
export const apiPatch = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * DELETE request helper
 * Always sends a body to avoid FST_ERR_CTP_EMPTY_JSON_BODY errors
 */
export const apiDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return apiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated API call helper
 * Automatically retrieves bearer token from storage and adds to Authorization header
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON response
 * @throws Error if token not found or request fails
 */
export const authenticatedApiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  const token = await getBearerToken();

  if (!token) {
    throw new Error("Authentication token not found. Please sign in.");
  }

  return apiCall<T>(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Authenticated GET request
 */
export const authenticatedGet = async <T = any>(endpoint: string): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, { method: "GET" });
};

/**
 * Authenticated POST request
 */
export const authenticatedPost = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated PUT request
 */
export const authenticatedPut = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated PATCH request
 */
export const authenticatedPatch = async <T = any>(
  endpoint: string,
  data: any
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

/**
 * Authenticated DELETE request
 * Always sends a body to avoid FST_ERR_CTP_EMPTY_JSON_BODY errors
 */
export const authenticatedDelete = async <T = any>(endpoint: string, data: any = {}): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
};

/**
 * Legacy helper function for backward compatibility
 * @deprecated Use authenticatedApiCall instead
 */
export const apiRequest = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  return authenticatedApiCall<T>(endpoint, options);
};

/**
 * Legacy helper function to get auth header
 * @deprecated Token is now automatically retrieved from storage
 */
export const getAuthHeader = (token?: string) => {
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};
