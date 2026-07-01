import React from 'react';

const PdfIcon = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10.5 20H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7.5L20 7.5V20a2 2 0 0 1-2 2h-4" />
      <path d="M14 12v6" />
      <path d="M11 18h2.5" />
      <path d="M9 15.5a1.5 1.5 0 0 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </svg>
  );
};

export default PdfIcon;
