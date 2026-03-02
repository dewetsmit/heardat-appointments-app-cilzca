
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Audiologist } from '@/types';
import { getHeardatCredentials, getUsers } from '@/utils/api';

interface AppointmentContextType {
  selectedAudiologists: Audiologist[];
  setSelectedAudiologists: (audiologists: Audiologist[]) => void;
  toggleAudiologistSelection: (audiologist: Audiologist) => void;
  allAudiologists: Audiologist[];
  isLoadingAudiologists: boolean;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export function AppointmentProvider({ children }: { children: React.ReactNode }) {
  const [selectedAudiologists, setSelectedAudiologists] = useState<Audiologist[]>([]);
  const [allAudiologists, setAllAudiologists] = useState<Audiologist[]>([]);
  const [isLoadingAudiologists, setIsLoadingAudiologists] = useState(false);

  // Load audiologists on mount
  useEffect(() => {
    const loadAudiologists = async () => {
      console.log('[AppointmentContext] Loading audiologists on mount');
      try {
        setIsLoadingAudiologists(true);

        // Call getUsers which fetches from AppointmentUsers endpoint
        const appointmentUsers = await getUsers();
        console.log('[AppointmentContext] AppointmentUsers API response:', appointmentUsers);

        // appointmentUsers is already the array from the API (appointmentusers)
        if (Array.isArray(appointmentUsers) && appointmentUsers.length > 0) {
          const mappedAudiologists: Audiologist[] = appointmentUsers.map((user: any) => ({
            id: user.UserID?.toString() || user.id,
            user_id: user.UserID?.toString() || user.id,
            full_name: `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.Name || user.FullName || 'Unknown',
            specialization: user.Specialization || '',
            is_active: user.Active === '1' || user.is_active === true,
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
    };

    loadAudiologists();
  }, []);

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
