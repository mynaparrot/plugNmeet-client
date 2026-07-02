import React, { ReactNode } from 'react';

const Tooltip = ({
  text,
  children,
}: {
  text?: string;
  children: ReactNode;
}) => {
  if (!text) return <>{children}</>;

  return (
    <div className="relative group inline-flex">
      {children}
      <div
        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
        hidden group-hover:block z-50
        w-max max-w-[260px]
        px-3 py-1.5
        text-xs text-dark-primary dark:text-dark-text
        bg-Gray-50 dark:bg-dark-secondary2
        rounded-md shadow-lg border border-gray-200 dark:border-Gray-700
        break-words"
      >
        {text}

        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-Gray-50 dark:bg-dark-secondary2 rotate-45 border-r border-b border-gray-200 dark:border-Gray-700" />
      </div>
    </div>
  );
};

export default Tooltip;
