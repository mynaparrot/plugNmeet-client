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

const ACTIVE_SPEAKER_LIST_CHANGE_DURATION = 1000; // milliseconds
const ACTIVE_SPEAKER_VIDEO_REARRANGE_DURATION = 4000; // milliseconds

export default class HandleActiveSpeakers {
  private that: IConnectLivekit;
  private lastActiveWebcamChanged: number = Date.now();
  private activeSpeakers: Array<IActiveSpeaker> = [];
  private interval: any;

  constructor(that: IConnectLivekit) {
    this.that = that;
    this.runInterval();
  }

  public activeSpeakersChanged = (participants: Participant[]) => {
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
      });
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
