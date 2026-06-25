import React from 'react';

const ToolbarBar = (props) => {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <rect x="4" y="4" width="16" height="4" rx="1"></rect>
      <path d="M4 8v11a1 1 0 0 0 1 1h14a1 0 0 0 1 -1v-11"></path>
      <line x1="7" y1="12" x2="17" y2="12"></line>
    </svg>
  );
};

export default ToolbarBar;
