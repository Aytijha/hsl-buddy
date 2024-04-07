import { create } from 'zustand';

interface useDemoModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export const useDemoModal = create<useDemoModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
