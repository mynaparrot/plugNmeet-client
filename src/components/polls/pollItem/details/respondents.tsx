import React, { ReactElement, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/react';

import { getFormatedRespondents, PollDataWithOption } from '../../utils';

interface RespondentsProps {
  pollDataWithOption: PollDataWithOption;
}

const Respondents = ({ pollDataWithOption }: RespondentsProps) => {
  const { t } = useTranslation();

  const optionDisclosures = useMemo(() => {
    const elms: Array<ReactElement> = [];
    for (const key in pollDataWithOption.options) {
      const o = pollDataWithOption.options[key];
      const elm = (
        <Disclosure as="div" key={o.id}>
          {({ open }) => (
            <div className="bg-Gray-50 rounded-xl border border-gray-300 overflow-hidden w-[632px]">
              <DisclosureButton
                className={`flex items-center cursor-pointer justify-between gap-3 w-full pl-[14px] pr-2 bg-white h-9 rounded-xl  shadow-button-shadow transition-all duration-300 ${open ? 'border-b border-gray-300' : ''}`}
              >
                <span className="text-sm text-Gray-800">
                  {o.text} ({o.respondents.length})
                </span>
                <div className="right flex items-center gap-2">
                  <span className="text-xs text-Gray-700">
                    ({o.responsesPercentage + '%'})
                  </span>
                  <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className=""
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="17"
                      viewBox="0 0 16 17"
                      fill="none"
                    >
                      <path d="M12 6.5L8 10.5L4 6.5" fill="#7493B3" />
                      <path
                        d="M12 6.5L8 10.5L4 6.5H12Z"
                        stroke="#7493B3"
                        strokeWidth="1.67"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                </div>
              </DisclosureButton>

              <AnimatePresence>
                {open && (
                  <DisclosurePanel
                    static
                    as={motion.div}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="wrap relative rounded-xl overflow-auto">
                      <div className="inner flex">
                        {getFormatedRespondents(o.respondents)}
                      </div>
                    </div>
                  </DisclosurePanel>
                )}
              </AnimatePresence>
            </div>
          )}
        </Disclosure>
      );
      elms.push(elm);
    }
    return elms;
  }, [pollDataWithOption]);

  return (
    <div className="px-5 py-5">
      <p className="text-sm font-medium text-Gray-800 mb-4">
        {t('polls.total-responses', {
          count: pollDataWithOption.totalRespondents,
        })}
      </p>
      <div className="relative">
        <div className="wrap grid gap-3">{optionDisclosures}</div>
      </div>
    </div>
  );
};

export default Respondents;
