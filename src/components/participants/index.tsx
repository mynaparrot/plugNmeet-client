import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useVirtual from 'react-cool-virtual';
import { createSelector } from '@reduxjs/toolkit';

import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import ParticipantComponent from './participant';
import { participantsSelector } from '../../store/slices/participantSlice';
import RemoveParticipantAlertModal, {
  IRemoveParticipantAlertModalData,
} from './removeParticipantAlertModal';
import { SearchIconSVG } from '../../assets/Icons/SearchIconSVG';
import { CloseIconSVG } from '../../assets/Icons/CloseIconSVG';
import { updateIsActiveParticipantsPanel } from '../../store/slices/bottomIconsActivitySlice';

const selectFilteredParticipants = createSelector(
  [
    participantsSelector.selectAll,
    (
      state: RootState,
      options: {
        isAdmin: boolean;
        search: string;
        allowViewOtherUsers: boolean;
        currentUserId: string | undefined;
      },
    ) => options,
  ],
  (participants, { isAdmin, search, allowViewOtherUsers, currentUserId }) => {
    let list = participants.filter(
      (p) =>
        p.name !== '' && p.userId !== 'RECORDER_BOT' && p.userId !== 'RTMP_BOT',
    );

    if (!isAdmin && !allowViewOtherUsers) {
      list = list.filter(
        (p) => p.metadata.isAdmin || p.userId === currentUserId,
      );
    }

    if (search) {
      list = list.filter((p) =>
        p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      );
    }

    if (isAdmin) {
      list.sort((a, b) =>
        a.metadata.waitForApproval === b.metadata.waitForApproval
          ? 0
          : a.metadata.waitForApproval
            ? -1
            : 1,
      );
    }
    return list;
  },
);

const ParticipantsComponent = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchParticipant, setSearchParticipant] = useState<string>('');
  const [removeParticipantData, setRemoveParticipantData] =
    useState<IRemoveParticipantAlertModalData>();

  const session = store.getState().session;
  const currentUser = session.currentUser;
  const currentIsAdmin = !!currentUser?.metadata?.isAdmin;
  const currentUserUserId = currentUser?.userId;
  const allowViewOtherUsers =
    !!session.currentRoom.metadata?.roomFeatures?.allowViewOtherUsersList;

  const participants = useAppSelector((state) =>
    selectFilteredParticipants(state, {
      isAdmin: currentIsAdmin,
      search: searchParticipant,
      allowViewOtherUsers,
      currentUserId: currentUserUserId,
    }),
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
    dispatch(updateIsActiveParticipantsPanel(false));
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
    <div className="relative z-10 w-full bg-Gray-25 border-l border-Gray-200 h-full">
      <div
        className="hidden md:inline-block absolute z-50 right-3 3xl:right-5 top-[10px] 3xl:top-[18px] text-Gray-600 cursor-pointer"
        onClick={closePanel}
      >
        <CloseIconSVG />
      </div>
      <div className="inner-wrapper relative z-20 w-full">
        <div className="top flex items-center h-10 3xl:h-14 px-3 3xl:px-5">
          <p className="text-sm 3xl:text-base text-Gray-950 font-medium leading-tight">
            {t('left-panel.participants', {
              total: participants.length,
            })}
          </p>
        </div>
        <div className="search-participants-wrap h-[55px] 3xl:h-[76px] flex items-center px-3 3xl:px-5 border-y border-Gray-200">
          <div className="w-full relative">
            <div className="search-icon text-Gray-600 absolute top-1/2 -translate-y-1/2 left-3 3xl:left-4 pointer-events-none">
              <SearchIconSVG />
            </div>
            <input
              type="text"
              name="search-participants"
              id="search-participants"
              placeholder="Search for Participant"
              className="text-Gray-950 placeholder:text-Gray-600 h-9 3xl:h-11 rounded-lg 3xl:rounded-[15px] bg-white border border-Gray-200 w-full pl-8 3xl:pl-10 outline-hidden text-xs 3xl:text-sm"
              onChange={(e) => setSearchParticipant(e.target.value)}
            />
          </div>
        </div>

        <div
          ref={outerRef as any}
          className="scrollBar overflow-auto h-[calc(100vh-240px)] 3xl:h-[calc(100vh-275px)]"
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
