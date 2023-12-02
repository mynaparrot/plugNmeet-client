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

  elms.push(
    <div
      key={0}
      className={`camera-row-0 grid gap-2 justify-items-center total-items-${length} ${
        length < 4 ? 'grid-rows-1' : ''
      } ${length == 1 ? 'grid-cols-1' : ''} ${
        length == 2 ? 'grid-cols-2' : ''
      } ${length == 3 ? 'grid-cols-3' : ''} ${
        length == 4 ? 'grid-cols-2' : ''
      } ${length == 4 ? 'grid-rows-2' : ''} ${
        length == 5 ? 'grid-cols-3' : ''
      } ${length == 6 ? 'grid-cols-3' : ''} ${
        length == 7 ? 'grid-cols-4' : ''
      } ${length == 8 ? 'grid-cols-4' : ''} ${
        length == 9 ? 'grid-cols-5' : ''
      } ${length == 10 ? 'grid-cols-5' : ''} ${
        length == 11 ? 'grid-cols-4' : ''
      } ${length == 11 ? 'grid-rows-3' : ''} ${
        length == 12 ? 'grid-cols-4' : ''
      } ${length == 12 ? 'grid-rows-3' : ''} ${
        length == 13 ? 'grid-rows-3' : ''
      } ${length == 13 ? 'grid-cols-5' : ''} ${
        length == 14 ? 'grid-cols-5' : ''
      } ${length == 14 ? 'grid-rows-3' : ''} ${
        length == 15 ? 'grid-cols-5' : ''
      } ${length == 15 ? 'grid-rows-3' : ''} ${
        length == 16 ? 'grid-cols-6' : ''
      } ${length == 16 ? 'grid-rows-3' : ''} ${
        length == 17 ? 'grid-cols-6' : ''
      } ${length == 17 ? 'grid-rows-3' : ''} ${
        length == 18 ? 'grid-cols-6' : ''
      } ${length == 18 ? 'grid-rows-3' : ''} ${
        length == 19 ? 'grid-cols-7' : ''
      } ${length == 19 ? 'grid-rows-3' : ''} ${
        length == 20 ? 'grid-cols-7' : ''
      } ${length == 20 ? 'grid-rows-3' : ''} ${
        length == 21 ? 'grid-cols-7' : ''
      } ${length == 21 ? 'grid-rows-3' : ''} ${
        length == 22 ? 'grid-cols-8' : ''
      } ${length == 22 ? 'grid-rows-3' : ''} ${
        length == 23 ? 'grid-cols-8' : ''
      } ${length == 23 ? 'grid-rows-3' : ''} ${
        length == 24 ? 'grid-cols-8' : ''
      } ${length == 24 ? 'grid-rows-3' : ''}`}
    >
      {participantsToRender}
    </div>,
  );

  // if (length < 4) {
  //   elms.push(
  //     <div key={0} className={`camera-row-0 total-items-${length}`}>
  //       {participantsToRender}
  //     </div>,
  //   );
  // } else if (length >= 4 && length <= 10) {
  //   const c = chunk(participantsToRender, Math.ceil(length / 2));
  //   c.forEach((el, i) => {
  //     elms.push(
  //       <div
  //         key={i}
  //         className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
  //       >
  //         {el}
  //       </div>,
  //     );
  //   });
  // } else {
  //   const c = chunk(participantsToRender, Math.ceil(length / 3));
  //   c.forEach((el, i) => {
  //     elms.push(
  //       <div
  //         key={i}
  //         className={`camera-row-${i} total-items-${length} inner-items-${el.length}`}
  //       >
  //         {el}
  //       </div>,
  //     );
  //   });
  // }
  return elms;
};
