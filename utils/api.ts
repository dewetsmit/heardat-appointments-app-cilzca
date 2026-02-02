
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
  companyId: string | null;
  branchId: string | null;
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
        companyId: currentUser.CompanyID || null,
        branchId: currentUser.BranchID || null,
      };
    }
    
    return {
      sessionKey,
      userKey,
      companyKey: null,
      userId: null,
      companyId: null,
      branchId: null,
    };
  } catch (error) {
    console.error("[API] Error retrieving Heardat credentials:", error);
    return {
      sessionKey: null,
      userKey: null,
      companyKey: null,
      userId: null,
      companyId: null,
      branchId: null,
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
  additionalParams?: Record<string, string>,
  method: string = 'GET'
): Promise<T> => {
  const credentials = await getHeardatCredentials();
  
  if (!credentials.sessionKey || !credentials.userKey) {
    throw new Error("Authentication required. Please sign in.");
  }
  
  // Build query parameters with credentials
  const params = new URLSearchParams({
    Sessionkey: credentials.sessionKey,
    Userkey: credentials.userKey,
    ...(credentials.companyKey && { Companykey: credentials.companyKey }),
    ...additionalParams,
  });
  
  const url = `${HEARDAT_API_URL}/${endpoint}?${params.toString()}`;
  console.log("[Heardat API] Calling:", endpoint, method);
  
  try {
    const response = await fetch(url, {
      method: method,
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
 * Create a new appointment in Heardat API
 * Based on the Angular implementation
 * 
 * @param appointmentFormData - Appointment form data object
 * @returns Promise with created appointment data
 */
export const createNewAppointment = async (
  appointmentFormData: Record<string, any>
): Promise<any> => {
  try {
    console.log('[API] Creating new appointment with data:', appointmentFormData);
    
    // Get current user credentials
    const credentials = await getHeardatCredentials();
    
    if (!credentials.userId) {
      throw new Error("User ID not found. Please sign in again.");
    }
    
    // Build params object, filtering out empty values
    const params: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(appointmentFormData)) {
      if (value !== "" && value !== null && value !== undefined) {
        params[key] = value ? value.toString() : "";
      }
    }
    
    // Remove DateEndAppointment if it's 0 or empty
    if (
      Object.prototype.hasOwnProperty.call(params, "DateEndAppointment") &&
      (params["DateEndAppointment"] === "0" || params["DateEndAppointment"] === "")
    ) {
      delete params["DateEndAppointment"];
    }
    
    // Add UserID from current user
    params["UserID"] = credentials.userId;
    
    console.log('[API] Appointment params after processing:', params);
    
    // Call Heardat API with POST method and params as query string
    const data = await heardatApiCall('Appointments', params, 'POST');
    
    console.log('[API] Appointment created successfully');
    return data;
  } catch (error) {
    console.error('[API] Failed to create appointment:', error);
    throw error;
  }
};

/**
 * Get appointments for a user (current or searched user)
 * Based on the Angular getAppointmentsForUser method
 * 
 * @param startDate - Optional start date in YYYY-MM-DD format
 * @param endDate - Optional end date in YYYY-MM-DD format
 * @param searchUser - Optional user object with CompanyID, BranchID, UserID
 * @returns Promise with appointments data
 */
export const getAppointmentsForUser = async (
  startDate?: string,
  endDate?: string,
  searchUser?: {
    CompanyID?: string;
    BranchID?: string;
    UserID?: string;
  }
): Promise<any> => {
  try {
    console.log('[API] Getting appointments for user', { startDate, endDate, searchUser });
    
    // Get current user credentials if no searchUser provided
    const credentials = await getHeardatCredentials();
    
    // Build request parameters
    const params: Record<string, string> = {
      CompanyID: searchUser?.CompanyID || credentials.companyId || "0",
      BranchID: searchUser?.BranchID || credentials.branchId || "0",
      UserIDAssigned: searchUser?.UserID?.toString() || credentials.userId || "0",
      Deleted: "0",
    };
    
    // Add date parameters if provided
    if (startDate) {
      params.DateAppointmentStart = startDate;
    }
    if (endDate) {
      params.DateAppointmentEnd = endDate;
    }
    
    console.log('[API] Appointments request params:', params);
    
    // Call Heardat API
    const data = await heardatApiCall('Appointments', params);
    
    console.log('[API] Appointments fetched successfully');
    return data;
  } catch (error) {
    console.error('[API] Failed to get appointments for user:', error);
    throw error;
  }
};

/**
 * Generic function to get appointments for a user
 * Can be used for current user or searched/selected users
 * 
 * @param startDate - Optional start date in YYYY-MM-DD format
 * @param endDate - Optional end date in YYYY-MM-DD format
 * @param searchUser - Optional user object with CompanyID, BranchID, UserID
 * @returns Promise with appointments data
 */
export const getUserAppointments = async (
  startDate?: string,
  endDate?: string,
  searchUser?: {
    CompanyID?: string;
    BranchID?: string;
    UserID?: string;
  }
): Promise<any> => {
  return getAppointmentsForUser(startDate, endDate, searchUser);
};

/**
 * Get all clients/patients from Heardat API
 * 
 * @param branchId - Branch ID to filter by
 * @param search - Search term for filtering clients
 * @returns Promise with clients data
 */
export const getAllPatients = async (
  branchId: string,
  search: string = ''
): Promise<any> => {
  try {
    console.log('[API] Getting all patients', { branchId, search });
    
    const credentials = await getHeardatCredentials();
    
    const params: Record<string, string> = {
      Deleted: "0",
      Active: "1",
      BranchID: branchId,
      UserID: credentials.userId || "0",
      Search: search,
    };
    
    console.log('[API] Patients request params:', params);
    
    const data = await heardatApiCall('Patients', params);
    
    console.log('[API] Patients fetched successfully');
    return data;
  } catch (error) {
    console.error('[API] Failed to get patients:', error);
    throw error;
  }
};

/**
 * Get a specific client/patient by ID from Heardat API
 * 
 * @param patientId - Patient ID to fetch
 * @returns Promise with patient data
 */
export const getSelectedPatient = async (patientId: string): Promise<any> => {
  try {
    console.log('[API] Getting selected patient', { patientId });
    
    const params: Record<string, string> = {
      PatientsID: patientId,
    };
    
    console.log('[API] Selected patient request params:', params);
    
    const data = await heardatApiCall('Patients', params);
    
    console.log('[API] Selected patient fetched successfully');
    return data;
  } catch (error) {
    console.error('[API] Failed to get selected patient:', error);
    throw error;
  }
};

/**
 * Get all branches from Heardat API
 * 
 * @returns Promise with branches data
 */
export const getBranches = async (): Promise<any> => {
  try {
    console.log('[API] Getting branches');
    
    const params: Record<string, string> = {
      Deleted: "0",
      Active: "1",
    };
    
    console.log('[API] Branches request params:', params);
    
    const data = await heardatApiCall('Branch', params);
    
    console.log('[API] Branches fetched successfully');
    return data;
  } catch (error) {
    console.error('[API] Failed to get branches:', error);
    throw error;
  }
};

/**
 * Get all appointment procedures from Heardat API
 * 
 * @returns Promise with procedures data
 */
export const getAppointmentProcedures = async (): Promise<any> => {
  try {
    console.log('[API] Getting appointment procedures');
    
    const params: Record<string, string> = {
      Deleted: "0",
      Active: "1"
    };
    
    console.log('[API] Procedures request params:', params);
    
    const data = await heardatApiCall('Procedures', params);
    
    console.log('[API] Procedures fetched successfully');
    return data;
  } catch (error) {
    console.error('[API] Failed to get procedures:', error);
    throw error;
  }
};

/**
 * Format date to YYYY-MM-DD format for API calls
 */
export const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format time to HH:MM format for API calls
 */
export const formatTimeForAPI = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
