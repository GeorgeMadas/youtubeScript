"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SearchHistoryContextType {
  searchHistory: string[];
  addSearch: (search: string) => void;
  clearHistory: () => void;
}

const SearchHistoryContext = createContext<SearchHistoryContextType>({
  searchHistory: [],
  addSearch: () => {},
  clearHistory: () => {},
});

export function SearchHistoryProvider({ children }: { children: ReactNode }) {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history from localStorage on initial render
  useEffect(() => {
    const savedHistory = localStorage.getItem("searchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const addSearch = (search: string) => {
    // Add new search to beginning of array, remove duplicates
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== search);
      return [search, ...filtered].slice(0, 10); // Keep only 10 most recent searches
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("searchHistory");
  };

  return (
    <SearchHistoryContext.Provider value={{ searchHistory, addSearch, clearHistory }}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export const useSearchHistory = () => useContext(SearchHistoryContext); 