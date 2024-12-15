import React from 'react';
import { chunk } from 'es-toolkit';
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
export const setForPC = (participantsToRender: React.JSX.Element[]) => {
  const length = participantsToRender.length;
  const elms: Array<React.JSX.Element> = [];

  if (length <= 4) {
    const c = chunk(participantsToRender, 2);
    console.log(c);
    for (let i = 0; i < c.length; i++) {
      const el = c[i];
      elms.push(
        <div
          key={i}
          className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
        >
          {el}
        </div>,
      );
    }
  } else if (length >= 5 && length <= 9) {
    let c: React.JSX.Element[][] = [];
    if (length === 7) {
      // 3 + 2 + 2
      c.push(participantsToRender.slice(0, 3));
      c = concat(c, chunk(participantsToRender.slice(3), 2));
    } else {
      c = chunk(participantsToRender, 3);
    }
    for (let i = 0; i < c.length; i++) {
      const el = c[i];
      elms.push(
        <div
          key={i}
          className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
        >
          {el}
        </div>,
      );
    }
  } else {
    let c: React.JSX.Element[][] = [];
    switch (length) {
      case 10:
        // 4 + 3 + 3
        c.push(participantsToRender.slice(0, 4));
        c = concat(c, chunk(participantsToRender.slice(4), 3));
        break;
      case 11:
      case 12:
        c = chunk(participantsToRender, 4);
        break;
      case 13:
        // 5 + 4 + 4
        c.push(participantsToRender.slice(0, 5));
        c = concat(c, chunk(participantsToRender.slice(5), 4));
        break;
      case 14:
      case 15:
        c = chunk(participantsToRender, 5);
        break;
      case 16:
        // 4 + 4 + 4 + 4
        c = chunk(participantsToRender, 4);
        break;
      case 17:
        // 5 + 4 + 4 + 4
        c.push(participantsToRender.slice(0, 5));
        c = concat(c, chunk(participantsToRender.slice(5), 4));
        break;
      case 18:
        // 5 + 5 + 4 + 4
        c = concat(c, chunk(participantsToRender.slice(0, 10), 5));
        c = concat(c, chunk(participantsToRender.slice(10), 4));
        break;
      case 19:
        // 5 + 5 + 5 + 4
        c = concat(c, chunk(participantsToRender.slice(0, 15), 5));
        c.push(participantsToRender.slice(14));
        break;
      case 20:
        // 5 + 5 + 5 + 5
        c = chunk(participantsToRender, 5);
        break;
      case 21:
        // 6 + 5 + 5 + 5
        c.push(participantsToRender.slice(0, 6));
        c = concat(c, chunk(participantsToRender.slice(6), 5));
        break;
      case 22:
        // 6 + 6 + 5 + 5
        c = concat(c, chunk(participantsToRender.slice(0, 12), 6));
        c = concat(c, chunk(participantsToRender.slice(12), 5));
        break;
      case 23:
        // 6 + 6 + 6 + 5
        c = concat(c, chunk(participantsToRender.slice(0, 18), 6));
        c.push(participantsToRender.slice(18));
        break;
      default:
        // 6 + 6 + 6 + 6
        c = chunk(participantsToRender, 6);
        break;
    }

    for (let i = 0; i < c.length; i++) {
      const el = c[i];
      elms.push(
        <div
          key={i}
          className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
        >
          {el}
        </div>,
      );
    }
  }
  return elms;
};
