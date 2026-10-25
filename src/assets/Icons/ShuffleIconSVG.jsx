// Slightly larger than sibling icons: sparse arrow strokes read smaller than solid glyphs
export const ShuffleIconSVG = ({ classes = 'w-auto h-[18px] 3xl:h-[22px]' }) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classes}
      aria-hidden="true"
    >
      <path
        d="m13 5 2 2-2 2M13 11l2 2-2 2M5 7h.987a2 2 0 0 1 1.8 1.1M15 13h-3.021a2 2 0 0 1-1.65-.9l-.18-.225M5 13h.987a2 2 0 0 0 1.65-.85l2.727-4.3a2 2 0 0 1 1.65-.85H15"
        stroke="CurrentColor"
        strokeWidth="1.67"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
