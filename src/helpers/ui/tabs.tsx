import React, { useCallback, useEffect, useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';

export interface ITabItem {
  id: string | number;
  title: string;
  content: React.ReactNode;
}

interface ITabsProps {
  uniqueKey: string;
  items: ITabItem[];
  vertical?: boolean;
  tabListCss?: string;
  tabPanelsCss?: string;
}

const Tabs = ({
  items,
  vertical = false,
  tabListCss,
  tabPanelsCss,
  uniqueKey,
}: ITabsProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (uniqueKey) {
      const lastTab = localStorage.getItem(uniqueKey);
      if (lastTab) {
        setSelectedIndex(Number(lastTab));
      }
    }
  }, [uniqueKey]);

  const onChange = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      if (uniqueKey) {
        localStorage.setItem(uniqueKey, String(index));
      }
    },
    [uniqueKey],
  );

  return (
    <TabGroup
      selectedIndex={selectedIndex}
      onChange={onChange}
      vertical={vertical}
      className="outline-hidden"
    >
      <TabList className={clsx('tablist relative flex', tabListCss)}>
        {items.map((item) => (
          <Tab
            key={item.id}
            className={({ selected }) => {
              return clsx(
                'w-full py-2 px-2 text-sm text-Gray-950 dark:text-white font-medium leading-5 border-b-4 border-solid transition ease-in outline-hidden cursor-pointer',
                selected ? 'border-Blue' : 'border-Blue/20',
              );
            }}
          >
            <div className="name relative inline-block">{item.title}</div>
          </Tab>
        ))}
      </TabList>
      <TabPanels className={clsx('relative', tabPanelsCss)}>
        <AnimatePresence mode="wait">
          {items.map((item) => (
            <TabPanel
              key={item.id}
              as={motion.div}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="pt-2 xl:pt-5 outline-hidden"
            >
              {item.content}
            </TabPanel>
          ))}
        </AnimatePresence>
      </TabPanels>
    </TabGroup>
  );
};

export default Tabs;
