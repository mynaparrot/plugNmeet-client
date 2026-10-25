import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Modal from '../../helpers/ui/modal';
import RadioOptions, { type IRadioOption } from '../../helpers/ui/radioOptions';
import { store, useAppSelector } from '../../store';
import { participantsSelector } from '../../store/slices/participantSlice';
import { selectPublicChatMessages } from '../../store/slices/chatMessagesSlice';
import { getNatsConn } from '../../helpers/nats';
import { downloadTextFile } from '../../helpers/utils';
import { buildPublicChatTxt, countExportablePublicMessages } from './helpers/chatExport';
import { buildParticipantsCsv, countExportableParticipants } from './helpers/participantsCsv';
import { buildPollsTxt, loadPollExportEntries } from './helpers/pollsExport';

type ExportItem = 'chat' | 'participants' | 'polls';

interface IExportHubProps {
  show: boolean;
  onClose(): void;
}

const ExportHub = ({ show, onClose }: IExportHubProps) => {
  const { t } = useTranslation();

  const [selectedItem, setSelectedItem] = useState<ExportItem>();
  const [notice, setNotice] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  const publicMessages = useAppSelector(selectPublicChatMessages);
  const participants = useAppSelector(participantsSelector.selectAll);

  const isE2EEChat = useMemo(() => {
    const conn = getNatsConn();
    return !!conn?.enableE2EE || !!conn?.enableE2EEChat;
  }, []);

  const chatCount = useMemo(() => countExportablePublicMessages(publicMessages), [publicMessages]);
  const participantsCount = useMemo(
    () => countExportableParticipants(participants),
    [participants],
  );

  const options = useMemo(() => {
    const list: IRadioOption[] = [
      {
        id: 'export-hub-chat',
        value: 'chat',
        label: t('export-hub.chat-title'),
        disabled: chatCount === 0,
        helpText:
          chatCount === 0
            ? t('export-hub.chat-empty')
            : `${t('export-hub.chat-help', { total: chatCount })}${
                isE2EEChat ? ` ${t('export-hub.chat-e2ee-warning')}` : ''
              }`,
      },
      {
        id: 'export-hub-participants',
        value: 'participants',
        label: t('export-hub.participants-title'),
        disabled: participantsCount === 0,
        helpText:
          participantsCount === 0
            ? t('export-hub.participants-empty')
            : t('export-hub.participants-help', { total: participantsCount }),
      },
      {
        id: 'export-hub-polls',
        value: 'polls',
        label: t('export-hub.polls-title'),
        helpText: t('export-hub.polls-help'),
      },
    ];

    return list;
  }, [chatCount, participantsCount, isE2EEChat, t]);

  const closeModal = useCallback(() => {
    setSelectedItem(undefined);
    setNotice(undefined);
    setIsBusy(false);
    onClose();
  }, [onClose]);

  const handleExport = async () => {
    if (!selectedItem) {
      return;
    }

    setIsBusy(true);
    setNotice(undefined);
    try {
      switch (selectedItem) {
        case 'chat': {
          const messages = selectPublicChatMessages(store.getState());
          if (countExportablePublicMessages(messages) === 0) {
            setNotice(t('export-hub.chat-empty'));
            return;
          }
          downloadTextFile(
            buildPublicChatTxt(messages),
            `public-chat-${Date.now()}.txt`,
            'text/plain;charset=utf-8',
          );
          closeModal();
          return;
        }
        case 'participants': {
          const current = participantsSelector.selectAll(store.getState());
          if (countExportableParticipants(current) === 0) {
            setNotice(t('export-hub.participants-empty'));
            return;
          }
          downloadTextFile(
            buildParticipantsCsv(current),
            `participants-${Date.now()}.csv`,
            'text/csv;charset=utf-8',
          );
          closeModal();
          return;
        }
        case 'polls': {
          const polls = await loadPollExportEntries();
          if (polls.length === 0) {
            setNotice(t('export-hub.polls-empty'));
            return;
          }
          downloadTextFile(
            buildPollsTxt(polls),
            `poll-results-${Date.now()}.txt`,
            'text/plain;charset=utf-8',
          );
          closeModal();
          return;
        }
      }
    } catch {
      setNotice(t('export-hub.export-failed'));
    } finally {
      setIsBusy(false);
    }
  };

  const renderButtons = () => {
    const selectedOption = options.find((option) => option.value === selectedItem);
    const canExport = !!selectedOption && !selectedOption.disabled && !isBusy;

    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={!canExport}
          className="primary-button h-10 px-5 w-32 flex items-center justify-center text-sm 3xl:text-base font-semibold bg-Blue hover:bg-white border border-[#0088CC] rounded-[15px] text-white hover:text-Gray-950 transition-all duration-300 shadow-button-shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            void handleExport();
          }}
        >
          {t('export-hub.export-button')}
        </button>
        <button
          type="button"
          className="h-10 px-5 w-32 flex items-center justify-center rounded-[15px] text-sm 3xl:text-base font-medium 3xl:font-semibold text-Gray-950 dark:text-white bg-white dark:bg-dark-secondary border border-Gray-300 dark:border-Gray-700 transition-all duration-300 shadow-button-shadow cursor-pointer"
          onClick={closeModal}
        >
          {t('cancel')}
        </button>
      </div>
    );
  };

  return (
    <Modal
      show={show}
      onClose={closeModal}
      title={t('export-hub.title')}
      maxWidth="max-w-2xl"
      renderButtons={renderButtons}
    >
      <p className="text-sm text-Gray-900 dark:text-white">{t('export-hub.description')}</p>
      <RadioOptions
        options={options}
        name="export-hub-items"
        checked={selectedItem}
        onChange={(value) => setSelectedItem(value as ExportItem)}
      />
      {notice && <p className="mt-4 text-xs text-Red-400">{notice}</p>}
    </Modal>
  );
};

export default ExportHub;
