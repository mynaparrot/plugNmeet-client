import React, { ReactNode, useId } from 'react';

const Tooltip = ({
  text,
  children,
}: {
  text?: string;
  children: ReactNode;
}) => {
  const id = useId();

  if (!text) return <>{children}</>;

  return (
    <div className="relative group inline-flex">
      <span
        tabIndex={0}
        aria-describedby={id}
        className="inline-flex focus-visible:outline-hidden"
      >
        {children}
      </span>
      <div
        id={id}
        role="tooltip"
        className="absolute bottom-full mb-2 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2
        hidden group-hover:block group-focus-visible:block z-50
        w-max max-w-[260px]
        px-3 py-1.5
        text-xs text-dark-primary dark:text-dark-text
        bg-Gray-50 dark:bg-dark-secondary2
        rounded-md shadow-lg border border-gray-200 dark:border-Gray-700
        break-words"
      >
        {text}

        <div className="absolute start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 top-full w-2 h-2 bg-Gray-50 dark:bg-dark-secondary2 rotate-45 border-r border-b border-gray-200 dark:border-Gray-700" />
      </div>
    </div>
  );
};

export default Tooltip;
