import { useEffect, useRef } from 'react';

const useStorePreviousInt = (previousInt: number) => {
  const ref = useRef<number>();
  useEffect(() => {
    ref.current = previousInt;
  });
  return ref.current;
};

export default useStorePreviousInt;
