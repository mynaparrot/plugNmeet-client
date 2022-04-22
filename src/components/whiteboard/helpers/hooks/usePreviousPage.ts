import { useEffect, useRef } from 'react';

const usePreviousPage = (previousPage: number) => {
  const ref = useRef<number>();
  useEffect(() => {
    ref.current = previousPage;
  });
  return ref.current;
};

export default usePreviousPage;
