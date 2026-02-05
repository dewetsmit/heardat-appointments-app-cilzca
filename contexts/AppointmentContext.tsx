
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Audiologist } from '@/types';
import { heardatApiCall } from '@/utils/api';

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

        const params = {
          Deleted: '0',
          Active: '1',
        };

        const data = await heardatApiCall('Users', params);
        console.log('[AppointmentContext] Audiologists API raw response:', data);

        // Parse the response if it's a string
        let parsedData = data;
        if (typeof data === 'string') {
          parsedData = JSON.parse(data);
        }

        console.log('[AppointmentContext] Parsed audiologists data:', parsedData);

        // Check if we have a users array in the response
        if (parsedData && parsedData.users && Array.isArray(parsedData.users)) {
          const mappedAudiologists: Audiologist[] = parsedData.users.map((user: any) => ({
            id: user.UserID?.toString() || user.id,
            user_id: user.UserID?.toString() || user.id,
            full_name: user.Name || user.FullName || 'Unknown',
            specialization: user.Specialization || '',
            is_active: user.Active === '1' || user.is_active === true,
          }));
          
          console.log('[AppointmentContext] Audiologists loaded:', mappedAudiologists.length);
          setAllAudiologists(mappedAudiologists);
          setSelectedAudiologists(mappedAudiologists);
        } else if (Array.isArray(parsedData)) {
          // Fallback: if data is directly an array
          console.log('[AppointmentContext] Data is array, mapping directly');
          const mappedAudiologists: Audiologist[] = parsedData.map((user: any) => ({
            id: user.UserID?.toString() || user.id,
            user_id: user.UserID?.toString() || user.id,
            full_name: user.Name || user.FullName || 'Unknown',
            specialization: user.Specialization || '',
            is_active: user.Active === '1' || user.is_active === true,
          }));
          
          console.log('[AppointmentContext] Audiologists loaded:', mappedAudiologists.length);
          setAllAudiologists(mappedAudiologists);
          setSelectedAudiologists(mappedAudiologists);
        } else {
          console.log('[AppointmentContext] No audiologists data in response');
          setAllAudiologists([]);
          setSelectedAudiologists([]);
        }
      } catch (error) {
        console.error('[AppointmentContext] Failed to load audiologists:', error);
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
