export const ChatReplyIconSVG = ({ classes = 'h-3.5 w-3.5' }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classes}
    >
      <path
        d="M6.5 3.5L3 7L6.5 10.5M3 7H10.5C12.1569 7 13.5 8.34315 13.5 10V12.5"
        stroke="CurrentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
