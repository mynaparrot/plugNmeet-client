import React from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import clsx from 'clsx';

export interface ITabItem {
  id: string | number;
  title: string;
  content: React.ReactNode;
}

interface ITabsProps {
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
}: ITabsProps) => {
  return (
    <TabGroup vertical={vertical} className="outline-hidden">
      <TabList className={clsx('flex', tabListCss)}>
        {items.map((item) => (
          <Tab
            key={item.id}
            className={({ selected }) => {
              return clsx(
                'w-full py-2 text-sm text-Gray-950 font-medium leading-5 border-b-4 border-solid transition ease-in outline-hidden cursor-pointer',
                selected ? 'border-Blue' : 'border-Blue/20',
              );
            }}
          >
            <div className="name relative inline-block">{item.title}</div>
          </Tab>
        ))}
      </TabList>
      <TabPanels className={clsx('relative', tabPanelsCss)}>
        {items.map((item) => (
          <TabPanel key={item.id} className="pt-2 xl:pt-5 outline-hidden">
            {item.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
};

export default Tabs;
