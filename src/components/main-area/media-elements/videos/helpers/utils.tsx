import React from 'react';
import { chunk } from 'lodash';

/*
 * For Mobile landscape mode,
 * 2 rows for any number
 */
export const setForMobileLandscape = (participantsToRender: JSX.Element[]) => {
  const length = participantsToRender.length;
  const elms: Array<JSX.Element> = [];

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
export const setForMobileAndTablet = (participantsToRender: JSX.Element[]) => {
  const length = participantsToRender.length;
  const elms: Array<JSX.Element> = [];

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
 * Upto 3 webcam, 1 row
 * From 4 to 10, 2 rows
 * More than 10, 3 rows
 */
export const setForPC = (participantsToRender: JSX.Element[]) => {
  const length = participantsToRender.length;
  const elms: Array<JSX.Element> = [];

  if (length < 4) {
    elms.push(
      <div key={0} className={`camera-row-0 total-items-${length}`}>
        {participantsToRender}
      </div>,
    );
  } else if (length >= 4 && length <= 10) {
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
