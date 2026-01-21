
import React, { createContext, useContext, useState } from 'react';

interface AppointmentContextType {
  selectedAudiologistIds: string[];
  setSelectedAudiologistIds: (ids: string[]) => void;
  toggleAudiologistSelection: (id: string) => void;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export function AppointmentProvider({ children }: { children: React.ReactNode }) {
  const [selectedAudiologistIds, setSelectedAudiologistIds] = useState<string[]>([]);

  function toggleAudiologistSelection(id: string) {
    console.log('Toggling audiologist selection:', id);
    setSelectedAudiologistIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((audiologistId) => audiologistId !== id);
      } else {
        return [...prev, id];
      }
    });
  }

  return (
    <AppointmentContext.Provider
      value={{
        selectedAudiologistIds,
        setSelectedAudiologistIds,
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
