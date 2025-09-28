import React, { useMemo } from 'react';
import { differenceWith } from 'es-toolkit';
import { useTranslation } from 'react-i18next';

import {
  getFormatedRespondents,
  PollDataWithOption,
  Respondents,
} from '../../utils';
import { useAppSelector } from '../../../../store';
import { selectBasicParticipants } from '../../../../store/slices/participantSlice';

interface NotRespondentsProps {
  pollDataWithOption: PollDataWithOption;
}

const NotRespondents = ({ pollDataWithOption }: NotRespondentsProps) => {
  const { t } = useTranslation();
  const participants = useAppSelector(selectBasicParticipants);

  const { formattedNotRespondents, notRespondentsCount } = useMemo(() => {
    const notRespondentsList: Respondents[] = differenceWith(
      participants,
      pollDataWithOption.allRespondents,
      (a, b) => a.userId === b.userId,
    ).map((p) => ({ userId: p.userId, name: p.name }));

    return {
      formattedNotRespondents: getFormatedRespondents(notRespondentsList),
      notRespondentsCount: notRespondentsList.length,
    };
  }, [participants, pollDataWithOption]);

  return (
    <div className="px-5 py-5">
      <p className="text-sm font-medium text-Gray-800 mb-3">
        {t('polls.not-respondents-total', {
          count: notRespondentsCount,
        })}
      </p>
      <div className="wrap relative rounded-xl bg-Gray-50 border border-gray-300 overflow-auto">
        <div className="inner flex">{formattedNotRespondents}</div>
      </div>
    </div>
  );
};

export default NotRespondents;
