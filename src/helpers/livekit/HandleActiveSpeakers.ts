import { Participant } from 'livekit-client';

import { IConnectLivekit } from './types';
import { store } from '../../store';
import {
  activeSpeakersSelector,
  addSpeaker,
  removeSpeakers,
  setAllSpeakers,
} from '../../store/slices/activeSpeakersSlice';
import { IActiveSpeaker } from '../../store/slices/interfaces/activeSpeakers';
import { sendAnalyticsByWebsocket } from '../websocket';
import {
  AnalyticsEvents,
  AnalyticsEventType,
} from '../proto/plugnmeet_analytics_pb';

const ACTIVE_SPEAKER_LIST_CHANGE_DURATION = 1000; // milliseconds
const ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION = 4000; // milliseconds

export default class HandleActiveSpeakers {
  private that: IConnectLivekit;
  private lastActiveWebcamChanged: number = Date.now();
  private activeSpeakers: Array<IActiveSpeaker> = [];
  private interval: any;
  private currentUserId: string | undefined = undefined;
  private currenUserLastTalked: number = 0;

  constructor(that: IConnectLivekit) {
    this.that = that;
    this.runInterval();
  }

  private getCurrentUserId() {
    if (this.currentUserId) {
      return this.currentUserId;
    }
    this.currentUserId =
      store.getState().session.currentUser?.userId ?? undefined;
    return this.currentUserId;
  }

  public activeSpeakersChanged = (participants: Participant[]) => {
    const currentUserId = this.getCurrentUserId();
    let currentUserTalked = false;
    this.activeSpeakers = [];

    if (participants.length) {
      const isPaginating = store.getState().session.isWebcamPaginating;
      const now = Date.now();

      participants.forEach((participant) => {
        // we won't update if user is paginating & viewing webcams from other pages.
        if (!isPaginating && this.that.videoSubscribersMap.size > 3) {
          // we'll wait little bit before changing
          const last =
            this.lastActiveWebcamChanged +
            ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION;
          if (now > last) {
            if (this.that.videoSubscribersMap.has(participant.identity)) {
              this.that.updateVideoSubscribers(participant);
              this.lastActiveWebcamChanged = now;
            }
          }
        }
        const speaker: IActiveSpeaker = {
          sid: participant.sid,
          userId: participant.identity,
          metadata: participant.metadata,
          name: participant?.name ?? '',
          isSpeaking: participant.isSpeaking,
          audioLevel: participant.audioLevel,
          lastSpokeAt: participant.lastSpokeAt?.getTime() ?? Date.now(),
        };
        store.dispatch(addSpeaker(speaker));
        this.activeSpeakers.push(speaker);

        if (currentUserId && participant.identity === currentUserId) {
          currentUserTalked = true;
          this.currenUserLastTalked =
            participant.lastSpokeAt?.getTime() ?? Date.now();

          // send analytics
          sendAnalyticsByWebsocket(
            AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED,
            AnalyticsEventType.USER,
            undefined,
            undefined,
            BigInt(1),
          );
        }
      });
    }

    if (!currentUserTalked && this.currenUserLastTalked > 0) {
      const cal = Date.now() - this.currenUserLastTalked;
      this.currenUserLastTalked = 0;
      // send analytics
      sendAnalyticsByWebsocket(
        AnalyticsEvents.ANALYTICS_EVENT_USER_TALKED_DURATION,
        AnalyticsEventType.USER,
        undefined,
        undefined,
        BigInt(cal),
      );
    }
  };

  private runInterval = () => {
    this.interval = setInterval(() => {
      if (!this.activeSpeakers.length) {
        const speakers = activeSpeakersSelector.selectAll(store.getState());
        if (speakers.length) {
          store.dispatch(removeSpeakers());
        }
      } else {
        store.dispatch(setAllSpeakers(this.activeSpeakers));
      }
    }, ACTIVE_SPEAKER_LIST_CHANGE_DURATION);
  };

  public onLivekitDisconnect = () => {
    clearInterval(this.interval);
  };
}
