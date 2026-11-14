import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LayoutActionsContextType {
  actions: ReactNode | null;
  setActions: (actions: ReactNode | null) => void;
}

const LayoutActionsContext = createContext<LayoutActionsContextType>({
  actions: null,
  setActions: () => {},
});

export const LayoutActionsProvider = ({ children }: { children: ReactNode }) => {
  const [actions, setActions] = useState<ReactNode | null>(null);
  return (
    <LayoutActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </LayoutActionsContext.Provider>
  );
};

export const useLayoutActions = () => useContext(LayoutActionsContext);
