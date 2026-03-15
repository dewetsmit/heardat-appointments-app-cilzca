
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Audiologist } from '@/types';
import { getUsers } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface AppointmentContextType {
  selectedAudiologists: Audiologist[];
  setSelectedAudiologists: (audiologists: Audiologist[]) => void;
  toggleAudiologistSelection: (audiologist: Audiologist) => void;
  allAudiologists: Audiologist[];
  isLoadingAudiologists: boolean;
  reloadAudiologists: () => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export function AppointmentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedAudiologists, setSelectedAudiologists] = useState<Audiologist[]>([]);
  const [allAudiologists, setAllAudiologists] = useState<Audiologist[]>([]);
  const [isLoadingAudiologists, setIsLoadingAudiologists] = useState(false);

  const loadAudiologists = useCallback(async () => {
    console.log('[AppointmentContext] Loading audiologists for authenticated user');
    try {
      setIsLoadingAudiologists(true);

      // Call getUsers which fetches from AppointmentUsers endpoint
      const appointmentUsers = await getUsers();
      console.log('[AppointmentContext] AppointmentUsers API response:', appointmentUsers);

      // appointmentUsers is already the array from the API (appointmentusers)
      if (Array.isArray(appointmentUsers) && appointmentUsers.length > 0) {
        const mappedAudiologists: Audiologist[] = appointmentUsers.map((u: any) => ({
          id: u.UserID?.toString() || u.id,
          user_id: u.UserID?.toString() || u.id,
          full_name: `${u.FirstName || ''} ${u.LastName || ''}`.trim() || u.Name || u.FullName || 'Unknown',
          specialization: u.Specialization || '',
          is_active: u.Active === '1' || u.is_active === true,
        }));

        console.log('[AppointmentContext] Mapped appointment users:', mappedAudiologists.length);
        console.log('[AppointmentContext] First appointment user:', mappedAudiologists[0]);

        // Set all audiologists
        setAllAudiologists(mappedAudiologists);

        // Select ALL appointment users by default
        setSelectedAudiologists(mappedAudiologists);
        console.log('[AppointmentContext] All appointment users selected by default');
      } else {
        console.log('[AppointmentContext] No appointment users found in response');
        setAllAudiologists([]);
        setSelectedAudiologists([]);
      }
    } catch (error) {
      console.error('[AppointmentContext] Failed to load appointment users:', error);
      setAllAudiologists([]);
      setSelectedAudiologists([]);
    } finally {
      setIsLoadingAudiologists(false);
    }
  }, []);

  const reloadAudiologists = useCallback(async () => {
    if (!user) {
      console.log('[AppointmentContext] reloadAudiologists called but user is not authenticated');
      return;
    }
    await loadAudiologists();
  }, [user, loadAudiologists]);

  useEffect(() => {
    if (!user) {
      // User logged out — clear state
      console.log('[AppointmentContext] User not authenticated, clearing audiologists');
      setAllAudiologists([]);
      setSelectedAudiologists([]);
      return;
    }

    console.log('[AppointmentContext] User authenticated, loading audiologists');
    loadAudiologists();
  }, [user, loadAudiologists]);

  function toggleAudiologistSelection(audiologist: Audiologist) {
    console.log('[AppointmentContext] Toggling audiologist selection:', audiologist.id);
    setSelectedAudiologists((prev) => {
      const isSelected = prev.some((a) => a.id === audiologist.id);
      if (isSelected) {
        const newSelection = prev.filter((a) => a.id !== audiologist.id);
        console.log('[AppointmentContext] Deselected, new count:', newSelection.length);
        return newSelection;
      } else {
        const newSelection = [...prev, audiologist];
        console.log('[AppointmentContext] Selected, new count:', newSelection.length);
        return newSelection;
      }
    });
  }

  return (
    <AppointmentContext.Provider
      value={{
        selectedAudiologists,
        setSelectedAudiologists,
        toggleAudiologistSelection,
        allAudiologists,
        isLoadingAudiologists,
        reloadAudiologists,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return context;
}
