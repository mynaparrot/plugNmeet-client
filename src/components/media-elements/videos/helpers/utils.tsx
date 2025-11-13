import React, { ReactElement } from 'react';
import { chunk } from 'es-toolkit';
import { VideoParticipantProps } from '../videoParticipant';

/*
 * For Tablet devices, for both normal & vertical view.
 */
export const getElmsForTablet = (
  participants: ReactElement[],
  isVerticalView: boolean,
  isSidebarOpen: boolean,
) => {
  const n = participants.length;
  if (n === 0) {
    return [];
  }

  let chunkParts: ReactElement[][] = [];

  if (isVerticalView) {
    // Vertical Mode: always a single vertical column.
    chunkParts = chunk(participants, 1);
  } else {
    // Default Mode (Grid View)
    if (isSidebarOpen) {
      // With sidebar, max 6 participants.
      if (n <= 4) {
        // 1-4 participants: 2 rows
        chunkParts = chunk(participants, Math.ceil(n / 2));
      } else {
        // 5-6 participants: 3 rows
        chunkParts = chunk(participants, Math.ceil(n / 3));
      }
    } else {
      // No sidebar, up to 9 participants.
      if (n <= 2) {
        chunkParts = [participants];
      } else if (n <= 6) {
        chunkParts = chunk(participants, Math.ceil(n / 2));
      } else {
        // 7-9
        chunkParts = chunk(participants, Math.ceil(n / 3));
      }
    }
  }

  // Create elements from chunks
  const elms: Array<ReactElement> = [];
  for (let i = 0; i < chunkParts.length; i++) {
    const el = chunkParts[i];
    if (el.length) {
      elms.push(
        <div
          key={`camera-row-${i}`}
          className={`camera-row-${i} total-items-${n} inner-items-${el.length}`}
        >
          {el}
        </div>,
      );
    }
  }

  return elms;
};

/*
 * For Mobile devices, for both normal & vertical view.
 */
export const getElmsForMobile = (
  participants: ReactElement[],
  isPortrait: boolean,
  isVerticalView: boolean,
  isSidebarOpen: boolean,
) => {
  const n = participants.length;
  if (n === 0) {
    return [];
  }

  let chunkParts: ReactElement[][] = [];

  if (isVerticalView) {
    // Vertical Mode (Sidebar View)
    if (isPortrait) {
      // Portrait: single vertical column
      chunkParts = chunk(participants, 1);
    } else {
      // Landscape
      if (isSidebarOpen) {
        // Special Condition: single vertical column
        chunkParts = chunk(participants, 1);
      } else {
        // 2-row by 2-column grid
        chunkParts = chunk(participants, 2);
      }
    }
  } else {
    // Default Mode (Grid View)
    if (isSidebarOpen) {
      // With sidebar, max 4 participants.
      if (n <= 3) {
        // 1-3 participants: 1 row
        chunkParts = [participants];
      } else {
        // 4 participants: 2x2 grid
        chunkParts = chunk(participants, 2);
      }
    } else {
      // No sidebar, up to 6 participants.
      if (isPortrait) {
        // Portrait
        if (n <= 3) {
          chunkParts = [participants];
        } else {
          // 4-6 Participants: 3-row by 2-column grid
          chunkParts = chunk(participants, 2);
        }
      } else {
        // Landscape
        if (n <= 4) {
          chunkParts = [participants];
        } else {
          // 5-6 Participants: 2-row by 3-column grid
          chunkParts = chunk(participants, 3);
        }
      }
    }
  }

  // Create elements from chunks
  const elms: Array<ReactElement> = [];
  for (let i = 0; i < chunkParts.length; i++) {
    const el = chunkParts[i];
    if (el.length) {
      elms.push(
        <div
          key={`camera-row-${i}`}
          className={`camera-row-${i} total-items-${n} inner-items-${el.length}`}
        >
          {el}
        </div>,
      );
    }
  }

  return elms;
};

/*
 * For PC,
 * This function dynamically calculates a balanced grid layout for webcams.
 */
export const getElmsForPc = (participants: ReactElement[]) => {
  const n = participants.length;
  if (n === 0) {
    return [];
  }

  // Determine the number of rows.
  let numRows: number;
  if (n <= 2) numRows = 1;
  else if (n <= 6) numRows = 2;
  else if (n <= 15) numRows = 3;
  else numRows = 4;

  // Calculate items per row and the remainder.
  const itemsPerRow = Math.floor(n / numRows);
  const remainder = n % numRows;

  const chunkParts: ReactElement[][] = [];
  let currentIndex = 0;

  for (let i = 0; i < numRows; i++) {
    // Distribute the remainder among the first rows.
    const rowSize = itemsPerRow + (i < remainder ? 1 : 0);
    const end = currentIndex + rowSize;
    chunkParts.push(participants.slice(currentIndex, end));
    currentIndex = end;
  }

  const elms: Array<ReactElement> = [];
  // each of the chunks will be a row
  for (let i = 0; i < chunkParts.length; i++) {
    const el = chunkParts[i];
    elms.push(
      <div
        key={`camera-row-${i}`}
        className={`camera-row-${i} total-items-${n} inner-items-${el.length}`}
      >
        {el}
      </div>,
    );
  }
  return elms;
};

/**
 * We'll have two webcams in each row for PC extended vertical view
 * @param participantsToRender
 */
export const getElmsForPCExtendedVerticalView = (
  participantsToRender: ReactElement[],
) => {
  const chunkParts = chunk(participantsToRender, 2);
  const elms: Array<ReactElement> = [];
  // each of the chunks will be a row
  for (let i = 0; i < chunkParts.length; i++) {
    const el = chunkParts[i];
    elms.push(
      <div
        key={`camera-row-${i}`}
        className={`camera-row-wrap camera-row-${i} order-2 total-items-${participantsToRender.length} inner-items-${el.length} grid grid-cols-2 gap-3 h-full`}
      >
        {el}
      </div>,
    );
  }
  return elms;
};

const sliceFirstLetterOfText = (name: any) =>
  name
    .split(/\s+/)
    .map((word: string[]) => word[0].toUpperCase())
    .join('');

export const formatNextPreButton = (
  remaining: ReactElement<VideoParticipantProps>[],
) => {
  const MAX_AVATARS_TO_SHOW = 2;
  const participantsToShow = remaining.slice(0, MAX_AVATARS_TO_SHOW);
  const remainingCount = remaining.length - participantsToShow.length;

  const shortNameElms = participantsToShow.map((p) => (
    <span
      key={`${p.key}-short`}
      className="inline-flex items-center justify-center order-1 pr-1 bg-[#003C59] rounded-[13px] border-2 border-Gray-900 w-10 h-10 -ml-2 overflow-hidden"
    >
      {sliceFirstLetterOfText(p.props.participant.name)}
    </span>
  ));

  const fullNameElms = participantsToShow.map((p, index) => (
    <span
      key={`${p.key}-full`}
      className="inline-block order-1 pr-1 capitalize"
    >
      {p.props.participant.name}
      {index < participantsToShow.length - 1 ? ', ' : ''}
    </span>
  ));

  if (remainingCount > 0) {
    shortNameElms.push(
      <span
        key="more-users-short"
        className="inline-flex items-center justify-center order-2 pr-1 bg-[rgba(0,102,153,1)] rounded-[13px] border-2 border-Gray-900 w-10 h-10 -ml-2 overflow-hidden"
      >
        {remainingCount}+
      </span>,
    );
    fullNameElms.push(
      <span key="more-users-full" className="inline-block order-2">
        and {remainingCount}+ others
      </span>,
    );
  }

  return (
    <>
      <div className="middle-area absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex text-base font-medium">
        {shortNameElms}
      </div>
      <div className="bottom-area flex flex-wrap text-sm font-medium">
        {fullNameElms}
      </div>
    </>
  );
};
