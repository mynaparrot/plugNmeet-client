import React from 'react';
import { chunk, memoize } from 'es-toolkit';
import { concat } from 'es-toolkit/compat';

/*
 * For Mobile landscape mode,
 * 2 rows for any number
 */
export const setForMobileLandscape = (
  participantsToRender: React.JSX.Element[],
) => {
  const length = participantsToRender.length;
  const elms: Array<React.JSX.Element> = [];

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
          key={i}
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
export const setForMobileAndTablet = (
  participantsToRender: React.JSX.Element[],
) => {
  const length = participantsToRender.length;
  const elms: Array<React.JSX.Element> = [];

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
          key={i}
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
          key={i}
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
 * up to 4 webcams, 2 rows
 * up to 15 webcams, 3 rows
 * More than 15, 4 rows
 */
const setForPC = (participantsToRender: React.JSX.Element[]) => {
  const length = participantsToRender.length;
  let chunkParts: React.JSX.Element[][] = [];

  switch (length) {
    case 1:
    case 2:
      chunkParts.push(participantsToRender);
      break;
    case 3:
    case 4:
      // 2 rows
      chunkParts = chunk(participantsToRender, 2);
      break;
    case 5:
    case 6:
    case 8:
    case 9:
      // 3 rows
      chunkParts = chunk(participantsToRender, 3);
      break;
    case 7:
      // 3 + 2 + 2
      chunkParts.push(participantsToRender.slice(0, 3));
      chunkParts = concat(chunkParts, chunk(participantsToRender.slice(3), 2));
      break;
    case 10:
      // 4 + 3 + 3
      chunkParts.push(participantsToRender.slice(0, 4));
      chunkParts = concat(chunkParts, chunk(participantsToRender.slice(4), 3));
      break;
    case 11:
    case 12:
      // 3 rows
      chunkParts = chunk(participantsToRender, 4);
      break;
    case 13:
      // 5 + 4 + 4
      chunkParts.push(participantsToRender.slice(0, 5));
      chunkParts = concat(chunkParts, chunk(participantsToRender.slice(5), 4));
      break;
    case 14:
    case 15:
      // 3 rows
      chunkParts = chunk(participantsToRender, 5);
      break;
    case 16:
      // 4 + 4 + 4 + 4
      chunkParts = chunk(participantsToRender, 4);
      break;
    case 17:
      // 5 + 4 + 4 + 4
      chunkParts.push(participantsToRender.slice(0, 5));
      chunkParts = concat(chunkParts, chunk(participantsToRender.slice(5), 4));
      break;
    case 18:
      // 5 + 5 + 4 + 4
      chunkParts = concat(
        chunk(participantsToRender.slice(0, 10), 5),
        chunk(participantsToRender.slice(10), 4),
      );
      break;
    case 19:
      // 5 + 5 + 5 + 4
      chunkParts = chunk(participantsToRender.slice(0, 15), 5);
      chunkParts.push(participantsToRender.slice(14));
      break;
    case 20:
      // 5 + 5 + 5 + 5
      chunkParts = chunk(participantsToRender, 5);
      break;
    case 21:
      // 6 + 5 + 5 + 5
      chunkParts.push(participantsToRender.slice(0, 6));
      chunkParts = concat(chunkParts, chunk(participantsToRender.slice(6), 5));
      break;
    case 22:
      // 6 + 6 + 5 + 5
      chunkParts = concat(
        chunk(participantsToRender.slice(0, 12), 6),
        chunk(participantsToRender.slice(12), 5),
      );
      break;
    case 23:
      // 6 + 6 + 6 + 5
      chunkParts = chunk(participantsToRender.slice(0, 18), 6);
      chunkParts.push(participantsToRender.slice(18));
      break;
    default:
      // 6 + 6 + 6 + 6
      chunkParts = chunk(participantsToRender, 6);
      break;
  }

  const elms: Array<React.JSX.Element> = [];
  // each of the chunks will be a row
  for (let i = 0; i < chunkParts.length; i++) {
    const el = chunkParts[i];
    elms.push(
      <div
        key={`camera-row-${i}`}
        className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
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
const setForPCExtendedVerticalView = (
  participantsToRender: React.JSX.Element[],
) => {
  const chunkParts = chunk(participantsToRender, 2);
  const elms: Array<React.JSX.Element> = [];
  // each of the chunks will be a row
  for (let i = 0; i < chunkParts.length; i++) {
    const el = chunkParts[i];
    elms.push(
      <div
        key={`camera-row-${i}`}
        className={`camera-row-${i} total-items-${length} inner-items-${el.length} flex flex-col justify-center gap-3`}
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
