import { createContext, useContext, useState, ReactNode } from "react";

type CallContextType = {
  callTarget: string | null;
  showCallModal: boolean;
  openCall: (target: string, type: 'audio' | 'video') => void;
  closeCall: () => void;
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const [callTarget, setCallTarget] = useState<string | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);

  const openCall = (target: string, type: 'audio' | 'video') => {
    setCallTarget(target);
    setShowCallModal(true);
  };

  const closeCall = () => {
    setCallTarget(null);
    setShowCallModal(false);
  };

  return (
    <CallContext.Provider value={{ callTarget, showCallModal, openCall, closeCall }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCallStore() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCallStore must be used within a CallProvider");
  }
  return context;
}
