import React, { createContext, useState } from 'react';

export const SegmentContext = createContext();

export const SegmentProvider = ({ children }) => {
  const [segmentData, setSegmentData] = useState(null);

  return (
    <SegmentContext.Provider value={{ segmentData, setSegmentData }}>
      {children}
    </SegmentContext.Provider>
  );
};
