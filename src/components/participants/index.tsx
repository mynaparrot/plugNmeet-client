import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useVirtual from 'react-cool-virtual';

import { store, useAppDispatch, useAppSelector } from '../../store';
import ParticipantComponent from './participant';
import { participantsSelector } from '../../store/slices/participantSlice';
import { IParticipant } from '../../store/slices/interfaces/participant';
import RemoveParticipantAlertModal, {
  IRemoveParticipantAlertModalData,
} from './removeParticipantAlertModal';
import { SearchIconSVG } from '../../assets/Icons/SearchIconSVG';
import { CloseIconSVG } from '../../assets/Icons/CloseIconSVG';
import { updateIsActiveParticipantsPanel } from '../../store/slices/bottomIconsActivitySlice';

const ParticipantsComponent = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const totalParticipants = useAppSelector(participantsSelector.selectTotal);
  // const screenHeight = useAppSelector(
  //   (state) => state.bottomIconsActivity.screenHeight,
  // );
  const [participants, setParticipants] = useState<IParticipant[]>([]);
  const { outerRef, innerRef, items } = useVirtual({
    itemCount: participants.length,
  });

  const [searchParticipant, setSearchParticipant] = useState<string>('');
  const [removeParticipantData, setRemoveParticipantData] =
    useState<IRemoveParticipantAlertModalData>();

  const session = store.getState().session;
  const currentUserUserId = session.currentUser?.userId;
  const allow_view_other_users_list =
    session.currentRoom.metadata?.roomFeatures?.allowViewOtherUsersList ??
    false;
  const currentIsAdmin = session.currentUser?.metadata?.isAdmin ?? false;

  const updateParticipantsList = useCallback(
    (searchParticipant: string = '') => {
      const participants = participantsSelector.selectAll(store.getState());
      if (!participants.length) {
        return;
      }
      let list = participants.filter(
        (p) =>
          p.name !== '' &&
          p.userId !== 'RECORDER_BOT' &&
          p.userId !== 'RTMP_BOT',
      );
      if (searchParticipant !== '') {
        list = list.filter((p) =>
          p.name
            .toLocaleLowerCase()
            .match(searchParticipant.toLocaleLowerCase()),
        );
      }
      if (currentIsAdmin) {
        list.sort((a, b) =>
          a.metadata.waitForApproval === b.metadata.waitForApproval
            ? 0
            : a.metadata.waitForApproval
              ? -1
              : 1,
        );
      }
      setParticipants(list);
    },
    //eslint-disable-next-line
    [],
  );

  // we'll only update users' list when number change
  // otherwise in every other event this will rerender
  useEffect(() => {
    if (!totalParticipants) {
      return;
    }
    updateParticipantsList(searchParticipant);
    //eslint-disable-next-line
  }, [totalParticipants, searchParticipant]);

  const onAfterApprovalUpdateList = useCallback(() => {
    // otherwise, sorting value won't be valid because
    // waiting for approval users will be on top
    updateParticipantsList(searchParticipant);
    //eslint-disable-next-line
  }, [searchParticipant]);

  const onOpenRemoveParticipantAlert = (
    name: string,
    user_id: string,
    type: string,
  ) => {
    setRemoveParticipantData({
      name,
      userId: user_id,
      removeType: type,
    });
  };

  const onCloseAlertModal = () => {
    setRemoveParticipantData(undefined);
  };

  const closePanel = () => {
    dispatch(updateIsActiveParticipantsPanel(false));
  };

  const renderParticipant = (index) => {
    if (!participants.length || typeof participants[index] === 'undefined') {
      return null;
    }
    const participant = participants[index];
    const isRemoteParticipant = currentUserUserId !== participant.userId;
    if (!currentIsAdmin && !allow_view_other_users_list) {
      if (
        !participant.metadata.isAdmin &&
        currentUserUserId !== participant.userId
      ) {
        return null;
      }
    }

    return (
      <ParticipantComponent
        key={participant.sid}
        participant={participant}
        isRemoteParticipant={isRemoteParticipant}
        openRemoveParticipantAlert={onOpenRemoveParticipantAlert}
        onAfterApprovalUpdateList={onAfterApprovalUpdateList}
      />
    );
  };

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
          // style={{ height: screenHeight - 276, overflow: 'auto' }}
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

      {removeParticipantData ? (
        <RemoveParticipantAlertModal
          name={removeParticipantData.name}
          userId={removeParticipantData.userId}
          removeType={removeParticipantData.removeType}
          closeAlertModal={onCloseAlertModal}
        />
      ) : null}
    </div>
  );
};

export default ParticipantsComponent;
