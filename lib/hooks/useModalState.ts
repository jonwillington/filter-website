import { useState, useCallback, useMemo } from 'react';

// All modals managed by this hook
export type ModalName =
  | 'login'
  | 'search'
  | 'explore'
  | 'filterPreferences'
  | 'settings'
  | 'unsupportedCountry'
  | 'mobileCityGuide';

type ModalState = Record<ModalName, boolean>;

const initialState: ModalState = {
  login: false,
  search: false,
  explore: false,
  filterPreferences: false,
  settings: false,
  unsupportedCountry: false,
  mobileCityGuide: false,
};

/**
 * Consolidated modal state management.
 * Reduces 7 useState calls to 1, preventing cascading re-renders
 * when modals are opened/closed.
 */
export function useModalState() {
  const [modals, setModals] = useState<ModalState>(initialState);

  // Open a specific modal (closes all others to prevent stacking)
  const openModal = useCallback((name: ModalName) => {
    setModals({
      ...initialState,
      [name]: true,
    });
  }, []);

  // Close a specific modal
  const closeModal = useCallback((name: ModalName) => {
    setModals((prev) => ({
      ...prev,
      [name]: false,
    }));
  }, []);

  // Toggle a specific modal
  const toggleModal = useCallback((name: ModalName) => {
    setModals((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }, []);

  // Close all modals
  const closeAll = useCallback(() => {
    setModals(initialState);
  }, []);

  // Check if any modal is open
  const isAnyOpen = useMemo(
    () => Object.values(modals).some(Boolean),
    [modals]
  );

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAll,
    isAnyOpen,
  };
}
