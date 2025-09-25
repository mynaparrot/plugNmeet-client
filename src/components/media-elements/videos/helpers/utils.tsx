import React, { ReactElement } from 'react';
import { chunk, memoize } from 'es-toolkit';

/*
 * For Mobile landscape mode,
 * 2 rows for any number
 */
export const setForMobileLandscape = (participantsToRender: ReactElement[]) => {
  const length = participantsToRender.length;
  const elms: Array<ReactElement> = [];

  if (length <= 3) {
    elms.push(
      <div key={0} className={`camera-row-0 total-items-${length}`}>
        {participantsToRender}
      </div>,
    );
  } else {
    const c = chunk(participantsToRender, Math.ceil(length / 2));
    c.forEach((el, i) => {
      elms.push(
        <div
          className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
        >
          {el}
        </div>,
      );
    });
  }
  return elms;
};

/*
 * For Mobile & Tablet in normal mode,
 * Upto 3 webcam, 1 row
 * From 4 webcam,  2 rows
 * More than 4, 3 rows
 */
export const setForMobileAndTablet = (participantsToRender: ReactElement[]) => {
  const length = participantsToRender.length;
  const elms: Array<ReactElement> = [];

  if (length <= 3) {
    elms.push(
      <div key={0} className={`camera-row-0 total-items-${length}`}>
        {participantsToRender}
      </div>,
    );
  } else if (length > 3 && length <= 4) {
    const c = chunk(participantsToRender, Math.ceil(length / 2));
    c.forEach((el, i) => {
      elms.push(
        <div
          className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
        >
          {el}
        </div>,
      );
    });
  } else {
    const c = chunk(participantsToRender, Math.ceil(length / 3));
    c.forEach((el, i) => {
      elms.push(
        <div
          className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
        >
          {el}
        </div>,
      );
    });
  }
  return elms;
};

/*
 * For PC,
 * This function dynamically calculates a balanced grid layout for webcams.
 * General rules:
 * - 1-2 webcams: 1 row
 * - 3-6 webcams: 2 rows
 * - 7-15 webcams: 3 rows
 * - 16+ webcams: 4 rows
 * Webcams will fillup from top to bottom
 * for example numbers like 7 (3-2-2 layout); 10 (4-3-3 layout); 17 (5-4-4-4 layout)
 */
const setForPC = (participants: ReactElement[]) => {
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
 * We'll have two webcams in each row
 * @param participantsToRender
 */
const setForPCExtendedVerticalView = (participantsToRender: ReactElement[]) => {
  const chunkParts = chunk(participantsToRender, 2);
  const elms: Array<ReactElement> = [];
  // each of the chunks will be a row
  for (let i = 0; i < chunkParts.length; i++) {
    const el = chunkParts[i];
    elms.push(
      <div
        key={`camera-row-${i}`}
        className={`camera-row-wrap camera-row-${i} order-2 total-items-${length} inner-items-${el.length} grid grid-cols-2 gap-3 h-full`}
      >
        {el}
      </div>,
    );
  }
  return elms;
};

export const getElmsForPc = memoize(setForPC);
export const getElmsForPCExtendedVerticalView = memoize(
  setForPCExtendedVerticalView,
);
