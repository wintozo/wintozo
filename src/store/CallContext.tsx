import { createContext, useContext, useState, ReactNode } from "react";

interface CallContextType {
  callTarget: string | null;
  callMode: 'audio' | 'video' | null;
  showCallModal: boolean;
  openCall: (target: string, mode: 'audio' | 'video') => void;
  closeCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const [callTarget, setCallTarget] = useState<string | null>(null);
  const [callMode, setCallMode] = useState<'audio' | 'video' | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);

  const openCall = (target: string, mode: 'audio' | 'video') => {
    setCallTarget(target);
    setCallMode(mode);
    setShowCallModal(true);
  };

  const closeCall = () => {
    setCallTarget(null);
    setCallMode(null);
    setShowCallModal(false);
  };

  return (
    <CallContext.Provider value={{ callTarget, callMode, showCallModal, openCall, closeCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCallStore() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallStore must be used within CallProvider');
  }
  return context;
}
