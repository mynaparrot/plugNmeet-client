import { useEffect, useRef } from 'react';

const usePreviousFileId = (currentFileId: string) => {
  const ref = useRef<string>();
  useEffect(() => {
    ref.current = currentFileId;
  });
  return ref.current;
};

export default usePreviousFileId;
