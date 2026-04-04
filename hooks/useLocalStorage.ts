
import React, { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item && item !== 'undefined') {
        // Remove surrounding quotes if they exist
        const cleanedItem = item.replace(/^"|"$/g, '');
        try {
          const parsed = JSON.parse(cleanedItem);
          // Merge with initialValue so new fields added later get their defaults
          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed) &&
            initialValue !== null &&
            typeof initialValue === 'object' &&
            !Array.isArray(initialValue)
          ) {
            return { ...initialValue, ...parsed } as T;
          }
          return parsed;
        } catch (e) {
          // If JSON.parse fails, return the cleaned string directly
          return cleanedItem as unknown as T;
        }
      }
      return initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prevValue => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (storageError) {
          console.error(storageError);
        }
        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
          window.localStorage.setItem(key, JSON.stringify(initialValue));
      }
    } catch (error) {
      console.error("Could not initialize local storage key:", key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, initialValue]);

  return [storedValue, setValue];
}