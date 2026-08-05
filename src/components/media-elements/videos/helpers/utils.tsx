import React, { ReactElement } from 'react';
import { chunk } from 'es-toolkit';
import { VideoParticipantProps } from '../videoParticipant';

/*
 * For Tablet devices in Landscape mode (Default Grid View & Vertical View).
 *
 * Layout reference (Default Grid View, non-vertical):
 *
 * Cams | No Sidebar    | With Sidebar
 * -----------------------------------------
 * 1    | 1 row         | 1 row
 * 2    | 1 row of 2    | 1 row of 2
 * 3    | 2+1           | 2+1
 * 4    | 2+2           | 2+2
 * 5    | 3+2           | 2+2+1
 * 6    | 3+3           | 2+2+2
 * 7    | 3+3+1         | - (exceeds 6 per-page limit)
 * 8    | 3+3+2         | -
 * 9    | 3+3+3         | -
 *
 * Vertical Mode: always a single vertical column (right strip).
 *
 * Rows are filled top-to-bottom; chunk() distributes evenly with the
 * last chunk receiving any remainder, matching the existing convention.
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
    chunkParts = [participants];
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
 * For Tablet devices in Portrait mode (Default Grid View & Vertical View).
 *
 * Tablet portrait has significantly more horizontal space than mobile
 * (~768px vs ~390px CSS px), allowing a 3-column grid and up to 9 webcams
 * instead of mobile's 2-column / 6-max ceiling.
 *
 * Layout reference (Default Grid View, non-vertical):
 *
 * Cams | No Sidebar (~768px)    | With Sidebar (~468px)
 * ---------------------------------------------------------
 * 1    | 1 row                  | 1 row
 * 2    | 1 row of 2             | 1 row of 2
 * 3    | 2+1                    | 2+1
 * 4    | 2+2                    | 2+2
 * 5    | 3+2                    | 2+2+1
 * 6    | 3+3                    | 2+2+2
 * 7    | 3+3+1                  | - (exceeds 6 per-page limit)
 * 8    | 3+3+2                  | -
 * 9    | 3+3+3                  | -
 *
 * Rows are filled top-to-bottom; chunk() distributes evenly with the
 * last chunk receiving any remainder, matching the existing convention
 * used across all layout helpers.
 */
export const getElmsForTabletPortrait = (
  participants: ReactElement[],
  isSidebarOpen: boolean,
  isVerticalView: boolean,
) => {
  const n = participants.length;
  if (n === 0) {
    return [];
  }

  let chunkParts: ReactElement[][] = [];

  if (isVerticalView) {
    // Vertical Mode: single column for the bottom bar.
    // CSS (vertical-bottom-layout) re-flows tiles into a horizontal flex row.
    chunkParts = [participants];
  } else if (isSidebarOpen) {
    // With sidebar: max 6 participants, max 2 columns.
    // Available width ~468px → 2 columns at ~220px each is comfortable.
    if (n <= 2) {
      // 1-2 participants: single row
      chunkParts = [participants];
    } else if (n <= 4) {
      // 3-4 participants: 2 rows
      chunkParts = chunk(participants, Math.ceil(n / 2));
    } else {
      // 5-6 participants: 3 rows
      chunkParts = chunk(participants, Math.ceil(n / 3));
    }
  } else {
    // No sidebar: up to 9 participants, up to 3 columns.
    // Available width ~768px → 3 columns at ~240px each is comfortable.
    if (n <= 2) {
      // 1-2 participants: single row
      chunkParts = [participants];
    } else if (n <= 6) {
      // 3-6 participants: 2 rows, max 3 columns
      chunkParts = chunk(participants, Math.ceil(n / 2));
    } else {
      // 7-9 participants: 3 rows, max 3 columns
      chunkParts = chunk(participants, Math.ceil(n / 3));
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
/*
 * Mobile layout reference (Default Grid View, non-vertical):
 *
 * Cams | Sidebar   | Portrait   | Landscape
 * -------------------------------------------
 * 1    | 1 row     | 1 row      | 1 row
 * 2    | 2 rows    | 2 rows     | 1 row of 2
 * 3    | 2+1       | 2+1        | 2+1
 * 4    | 2x2       | 2+2        | 2+2
 * 5    | -         | 2+2+1      | 2+2+1
 * 6    | -         | 2+2+2      | 2+2+2
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
    // Vertical Mode: single column for bottom bar (portrait) or right strip (landscape).
    chunkParts = [participants];
  } else {
    // Default Mode (Grid View)
    if (isSidebarOpen) {
      // With sidebar, max 4 participants.
      if (n <= 2) {
        // 1-2 participants: each in own row
        chunkParts = chunk(participants, 1);
      } else {
        // 4 participants: 2x2 grid
        chunkParts = chunk(participants, 2);
      }
    } else {
      // No sidebar, up to 6 participants.
      if (isPortrait) {
        // Portrait
        if (n <= 2) {
          // 1-2 participants: each in own row
          chunkParts = chunk(participants, 1);
        } else {
          // 4-6 Participants: 3-row by 2-column grid
          chunkParts = chunk(participants, 2);
        }
      } else {
        // Landscape
        if (n <= 2) {
          chunkParts = [participants];
        } else {
          // 3+ Participants: max 2 per row
          chunkParts = chunk(participants, 2);
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
 * For PC (Default Grid View & Vertical View).
 *
 * Dynamically calculates a balanced grid layout with rows filled
 * top-to-bottom: remainder items are distributed to the top rows first
 * (e.g., 13 webcams → 5+4+4, not 4+4+5).
 *
 * Layout reference (Default Grid View, non-vertical):
 *
 * Cams  | Rows | Distribution
 * ---------------------------
 * 1-2   | 1    | single row
 * 3-6   | 2    | top-fill (e.g., 5: 3+2, 4: 2+2, 3: 2+1)
 * 7-15  | 3    | top-fill (e.g., 13: 5+4+4, 7: 3+2+2)
 * 16-24 | 4    | top-fill (e.g., 24: 6+6+6+6, 17: 5+4+4+4)
 *
 * Vertical Mode: always a single vertical column (left/right strip).
 */
export const getElmsForPc = (
  participants: ReactElement[],
  isVertical: boolean,
) => {
  const n = participants.length;
  if (n === 0) {
    return [];
  }

  let chunkParts: ReactElement[][] = [];

  if (isVertical) {
    chunkParts = [participants];
  } else {
    // Determine the number of rows.
    let numRows: number;
    if (n <= 2) numRows = 1;
    else if (n <= 6) numRows = 2;
    else if (n <= 15) numRows = 3;
    else numRows = 4;

    // Calculate items per row and the remainder.
    const itemsPerRow = Math.floor(n / numRows);
    const remainder = n % numRows;

    let currentIndex = 0;

    for (let i = 0; i < numRows; i++) {
      // Distribute the remainder among the first rows.
      const rowSize = itemsPerRow + (i < remainder ? 1 : 0);
      const end = currentIndex + rowSize;
      chunkParts.push(participants.slice(currentIndex, end));
      currentIndex = end;
    }
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

/*
 * For PC Extended Vertical View (wider right strip, 416px).
 *
 * Always arranges webcams in rows of 2 in a vertical column.
 *
 * Layout reference:
 *
 * Cams | Rows
 * -----------
 * 1-2  | 1 row of 2
 * 3-4  | 2 rows of 2
 * 5-6  | 3 rows of 2
 * ...  | ceil(n/2) rows, 2 per row
 *
 * Used when the user toggles the extended vertical cam view
 * (isEnabledExtendedVerticalCamView = true).
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

const sliceFirstLetterOfText = (name?: string) =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

const getParticipantKey = (
  participantElement: ReactElement<VideoParticipantProps>,
  suffix: string,
) => {
  const participant = participantElement.props.participant;

  return `${
    participant.identity ??
    participantElement.key ??
    participant.name ??
    'participant'
  }-${suffix}`;
};

export const formatNextPreButton = (
  remaining: ReactElement<VideoParticipantProps>[],
) => {
  const MAX_AVATARS_TO_SHOW = 2;
  const participantsToShow = remaining.slice(0, MAX_AVATARS_TO_SHOW);
  const remainingCount = remaining.length - participantsToShow.length;

  const shortNameElms = participantsToShow.map((p) => (
    <span
      key={getParticipantKey(p, 'short')}
      className="inline-flex items-center justify-center order-1 pe-1 bg-[#003C59] rounded-[13px] border-2 border-Gray-900 w-8 md:w-10 h-8 md:h-10 -ms-2 overflow-hidden"
    >
      {sliceFirstLetterOfText(p.props.participant.name)}
    </span>
  ));

  const fullNameElms = participantsToShow.map((p, index) => (
    <span
      key={getParticipantKey(p, 'full')}
      className="inline-block order-1 pe-1 capitalize"
    >
      {p.props.participant.name}
      {index < participantsToShow.length - 1 ? ', ' : ''}
    </span>
  ));

  if (remainingCount > 0) {
    shortNameElms.push(
      <span
        key="more-users-short"
        className="inline-flex items-center justify-center order-2 pe-1 bg-[rgba(0,102,153,1)] rounded-[13px] border-2 border-Gray-900 w-8 md:w-10 h-8 md:h-10 -ms-2 overflow-hidden"
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
      <div className="middle-area flex text-xs md:text-base font-medium">
        {shortNameElms}
      </div>
      <div className="bottom-area flex flex-wrap text-sm font-medium absolute bottom-4 start-4">
        {fullNameElms}
      </div>
    </>
  );
};

export const getTotalWebcamPages = (
  totalItems: number,
  perPage: number,
  isRecorder?: boolean,
) => {
  if (totalItems <= perPage) return 1;
  if (isRecorder) return 1;

  const firstPageParticipantCapacity = perPage - 1;
  const middlePageParticipantCapacity = perPage - 2;

  if (totalItems <= firstPageParticipantCapacity) {
    return 1;
  }

  const remainingAfterFirstPage = totalItems - firstPageParticipantCapacity;

  return 1 + Math.ceil(remainingAfterFirstPage / middlePageParticipantCapacity);
};
