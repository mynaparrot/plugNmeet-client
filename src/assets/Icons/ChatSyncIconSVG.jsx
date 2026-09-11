export const ChatSyncIconSVG = ({ spinning = false }) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-auto h-4 3xl:h-5 ${spinning ? 'animate-spin' : ''}`}
    >
      <path
        d="M16.875 10C16.875 13.7969 13.7969 16.875 10 16.875C7.43121 16.875 5.16192 15.4791 3.93433 13.4093M3.125 10C3.125 6.20308 6.20308 3.125 10 3.125C12.5688 3.125 14.8381 4.52087 16.0657 6.5907M3.93433 3.125V6.5907H7.39998M16.0657 16.875V13.4093H12.6"
        stroke="CurrentColor"
        strokeWidth="1.67"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
