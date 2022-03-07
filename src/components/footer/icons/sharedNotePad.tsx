import React from 'react';
import { Popover } from '@headlessui/react';

const SharedNotePad = () => {
  return (
    <Popover>
      {() => (
        <>
          <Popover.Button>
            <i className="pnm-notepad text-[12px] lg:text-[16px]" />
          </Popover.Button>

          <Popover.Panel>Items</Popover.Panel>
        </>
      )}
    </Popover>
  );
};

export default SharedNotePad;
