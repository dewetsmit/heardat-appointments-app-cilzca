
import React, { createContext, useContext, useState } from 'react';
import { Audiologist } from '@/types';

interface AppointmentContextType {
  selectedAudiologists: Audiologist[];
  setSelectedAudiologists: (audiologists: Audiologist[]) => void;
  toggleAudiologistSelection: (audiologist: Audiologist) => void;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export function AppointmentProvider({ children }: { children: React.ReactNode }) {
  const [selectedAudiologists, setSelectedAudiologists] = useState<Audiologist[]>([]);

  function toggleAudiologistSelection(audiologist: Audiologist) {
    console.log('Toggling audiologist selection:', audiologist.id);
    setSelectedAudiologists((prev) => {
      const isSelected = prev.some((a) => a.id === audiologist.id);
      if (isSelected) {
        return prev.filter((a) => a.id !== audiologist.id);
      } else {
        return [...prev, audiologist];
      }
    });
  }

  return (
    <AppointmentContext.Provider
      value={{
        selectedAudiologists,
        setSelectedAudiologists,
        toggleAudiologistSelection,
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
