import { useEffect, useRef } from 'react';

const useStorePreviousString = (previousString: string) => {
  const ref = useRef<string>();
  useEffect(() => {
    ref.current = previousString;
  });
  return ref.current;
};

export default useStorePreviousString;
