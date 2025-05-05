import React, { useMemo, useState } from 'react';
import { differenceWith } from 'es-toolkit';
import { useTranslation } from 'react-i18next';

import {
  getFormatedRespondents,
  PollDataWithOption,
  Respondents,
} from '../../utils';
import { store, useAppSelector } from '../../../../store';
import { participantsSelector } from '../../../../store/slices/participantSlice';

interface NotRespondentsProps {
  pollDataWithOption: PollDataWithOption;
}

const NotRespondents = ({ pollDataWithOption }: NotRespondentsProps) => {
  const { t } = useTranslation();
  const [notResNum, setNotResNum] = useState<number>();
  const totalParticipants = useAppSelector(participantsSelector.selectTotal);

  const render = useMemo(() => {
    if (!totalParticipants) {
      return [];
    }
    const participants = participantsSelector.selectAll(store.getState());
    const notRespondents: Respondents[] = differenceWith(
      participants,
      pollDataWithOption.allRespondents,
      (a, b) => a.userId === b.userId,
    ).map((p) => ({ userId: p.userId, name: p.name }));

    setNotResNum(notRespondents.length);
    return getFormatedRespondents(notRespondents);
  }, [totalParticipants, pollDataWithOption]);

  return (
    <div className="px-5 py-5">
      <p className="text-sm font-medium text-Gray-800 mb-3">
        {t('polls.not-respondents-total', {
          count: notResNum,
        })}
      </p>
      <div className="wrap grid grid-cols-4 gap-2 py-2 relative overflow-hidden rounded-xl bg-Gray-50 border border-gray-300">
        {render}
        <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-1/4"></div>
        <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-1/2"></div>
        <div className="line absolute h-full w-[1px] bg-Gray-300 top-0 left-3/4"></div>
      </div>
    </div>
  );
};

export default NotRespondents;
