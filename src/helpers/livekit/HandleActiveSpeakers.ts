import { Participant } from 'livekit-client';

import { IConnectLivekit } from './ConnectLivekit';
import { store } from '../../store';
import {
  activeSpeakersSelector,
  addManySpeakers,
  addSpeaker,
  removeSpeakers,
} from '../../store/slices/activeSpeakersSlice';
import { IActiveSpeaker } from '../../store/slices/interfaces/activeSpeakers';

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
    if (participants.length) {
      const isPaginating = store.getState().session.isWebcamPaginating;
      const now = Date.now();

      participants.forEach((participant) => {
        // we won't update if user is paginating & viewing webcams from other pages.
        if (!isPaginating && this.that.videoSubscribersMap.size > 2) {
          // we'll wait little bit before changing
          const last = this.lastActiveWebcamChanged + 1000 * 4;
          if (now > last) {
            if (this.that.videoSubscribersMap.has(participant.sid)) {
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
    } else {
      this.activeSpeakers = [];
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
        store.dispatch(addManySpeakers(this.activeSpeakers));
      }
    }, 1500);
  };

  public onLivekitDisconnect = () => {
    clearInterval(this.interval);
  };
}
