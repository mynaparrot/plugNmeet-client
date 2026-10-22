import React, { useCallback, useEffect, useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
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

const Tabs = ({ items, vertical = false, tabListCss, tabPanelsCss, uniqueKey }: ITabsProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (uniqueKey) {
      const lastTab = sessionStorage.getItem(uniqueKey);
      if (lastTab) {
        setSelectedIndex(Number(lastTab));
      }
    }
  }, [uniqueKey]);

  const onChange = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      if (uniqueKey) {
        sessionStorage.setItem(uniqueKey, String(index));
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
            className={({ selected, focus }) => {
              return clsx(
                'w-full py-2 px-2 text-sm text-Gray-950 dark:text-white font-medium leading-5 border-b-4 border-solid transition ease-in outline-hidden cursor-pointer',
                selected ? 'border-Blue' : 'border-Blue/20',
                focus ? 'ring-2 ring-offset-2 ring-Blue' : 'ring-0 ring-offset-0',
              );
            }}
          >
            <div className="name relative inline-block">{item.title}</div>
          </Tab>
        ))}
      </TabList>
      <TabPanels className={clsx('relative', tabPanelsCss)}>
        {items.map((item) => (
          // HeadlessUI unmounts the content of the unselected panels, so this
          // animation replays each time a panel is selected.
          <TabPanel key={item.id} className="pt-2 xl:pt-5 outline-hidden panel-in">
            {item.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
};

export default Tabs;
