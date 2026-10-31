"use client";

import { createContext, useContext } from "react";

export const HamburgerContext = createContext<{ toggleSidebar: () => void }>({
  toggleSidebar: () => {},
});

export const useHamburger = () => useContext(HamburgerContext);
