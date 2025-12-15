import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useVirtual from 'react-cool-virtual';

import ParticipantComponent from './participant';
import RemoveParticipantAlertModal, {
  IRemoveParticipantAlertModalData,
} from './removeParticipantAlertModal';
import { SearchIconSVG } from '../../assets/Icons/SearchIconSVG';
import { CloseIconSVG } from '../../assets/Icons/CloseIconSVG';

import { store, useAppDispatch, useAppSelector } from '../../store';
import { selectVisibleParticipants } from '../../store/slices/participantSlice';
import { setActiveSidePanel } from '../../store/slices/bottomIconsActivitySlice';

const ParticipantsComponent = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchParticipant, setSearchParticipant] = useState<string>('');
  const [removeParticipantData, setRemoveParticipantData] =
    useState<IRemoveParticipantAlertModalData>();

  const {
    currentUser,
    currentIsAdmin,
    currentUserUserId,
    allowViewOtherUsers,
  } = useMemo(() => {
    const session = store.getState().session;
    const currentUser = session.currentUser;
    return {
      currentUser,
      currentIsAdmin: !!currentUser?.metadata?.isAdmin,
      currentUserUserId: currentUser?.userId,
      allowViewOtherUsers:
        !!session.currentRoom.metadata?.roomFeatures?.allowViewOtherUsersList,
    };
  }, []);

  const participants = useAppSelector((state) =>
    selectVisibleParticipants(
      state,
      currentIsAdmin,
      searchParticipant,
      allowViewOtherUsers,
      currentUserUserId,
    ),
  );

  const { outerRef, innerRef, items } = useVirtual({
    itemCount: participants.length,
  });

  const onOpenRemoveParticipantAlert = useCallback(
    (name: string, user_id: string, type: string) => {
      setRemoveParticipantData({
        name,
        userId: user_id,
        removeType: type,
      });
    },
    [],
  );

  const onCloseAlertModal = () => {
    setRemoveParticipantData(undefined);
  };

  const closePanel = () => {
    dispatch(setActiveSidePanel(null));
  };

  const renderParticipant = useCallback(
    (index: number) => {
      if (!participants.length || typeof participants[index] === 'undefined') {
        return null;
      }
      const participant = participants[index];
      const isRemoteParticipant = currentUser?.userId !== participant.userId;

      return (
        <ParticipantComponent
          key={participant.userId}
          participant={participant}
          isRemoteParticipant={isRemoteParticipant}
          openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
          currentUser={currentUser}
        />
      );
    },
    [participants, currentUser, onOpenRemoveParticipantAlert],
  );

  return (
    <div className="relative z-10 w-full bg-Gray-25 dark:bg-dark-primary border-l border-Gray-200 dark:border-Gray-800 h-full">
      <div
        className="inline-block absolute z-50 right-3 3xl:right-5 top-[10px] text-Gray-600 dark:text-white cursor-pointer"
        onClick={closePanel}
      >
        <CloseIconSVG />
      </div>
      <div className="inner-wrapper relative z-20 w-full">
        <div className="top flex items-center h-10 px-3 3xl:px-5">
          <p className="text-sm text-Gray-950 dark:text-white font-medium leading-tight">
            {t('left-panel.participants', {
              total: participants.length,
            })}
          </p>
        </div>
        <div className="search-participants-wrap h-[55px] flex items-center px-3 3xl:px-5 border-y border-Gray-200 dark:border-Gray-800">
          <div className="w-full relative">
            <div className="search-icon text-Gray-600 dark:text-white absolute top-1/2 -translate-y-1/2 left-3 3xl:left-4 pointer-events-none">
              <SearchIconSVG />
            </div>
            <input
              type="text"
              name="search-participants"
              id="search-participants"
              placeholder="Search for Participant"
              className="text-Gray-950 dark:text-white placeholder:text-Gray-600 dark:placeholder:text-white h-9 rounded-lg 3xl:rounded-[15px] bg-white dark:bg-dark-primary border border-Gray-200 dark:border-Gray-800 w-full pl-8 3xl:pl-10 outline-hidden text-xs 3xl:text-sm"
              onChange={(e) => setSearchParticipant(e.target.value)}
            />
          </div>
        </div>

        <div
          ref={outerRef as any}
          className="scrollBar overflow-auto h-[calc(100vh-240px)]"
        >
          <div
            className="all-participants-wrap px-2 xl:px-3 3xl:px-5"
            ref={innerRef as any}
          >
            {items.map(({ index, measureRef }) => (
              <li
                key={index}
                ref={measureRef}
                className="w-full list-none min-h-[40px] 3xl:min-h-[60px] py-1 flex items-center"
              >
                {renderParticipant(index)}
              </li>
            ))}
          </div>
        </div>
      </div>

      {removeParticipantData && (
        <RemoveParticipantAlertModal
          name={removeParticipantData.name}
          userId={removeParticipantData.userId}
          removeType={removeParticipantData.removeType}
          closeAlertModal={onCloseAlertModal}
        />
      )}
    </div>
  );
};

export default ParticipantsComponent;
