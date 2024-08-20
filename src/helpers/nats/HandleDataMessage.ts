import ConnectNats from './ConnectNats';
import { DataChannelMessage } from '../proto/plugnmeet_nats_msg_pb';
import { DataMsgBodyType } from '../proto/plugnmeet_datamessage_pb';
import { store } from '../../store';
import { updateRequestedWhiteboardData } from '../../store/slices/whiteboard';

export default class HandleDataMessage {
  private _that: ConnectNats;

  constructor(that: ConnectNats) {
    this._that = that;
  }

  public handleMessage(payload: DataChannelMessage) {
    switch (payload.type) {
      case DataMsgBodyType.INIT_WHITEBOARD:
        this.handleSendInitWhiteboard(payload);
        break;
      case DataMsgBodyType.USER_VISIBILITY_CHANGE:
        //handleUserVisibility(body);
        break;
      case DataMsgBodyType.EXTERNAL_MEDIA_PLAYER_EVENTS:
        //handleExternalMediaPlayerEvents(body);
        break;
      case DataMsgBodyType.POLL_CREATED:
      case DataMsgBodyType.POLL_CLOSED:
      case DataMsgBodyType.NEW_POLL_RESPONSE:
        //handlePollsNotifications(body);
        break;
      case DataMsgBodyType.JOIN_BREAKOUT_ROOM:
        //handleBreakoutRoomNotifications(body);
        break;
      case DataMsgBodyType.SPEECH_SUBTITLE_TEXT:
        //handleSpeechSubtitleText(body);
        break;
    }
  }

  private handleSendInitWhiteboard(payload: DataChannelMessage) {
    if (store.getState().whiteboard.requestedWhiteboardData.requested) {
      // already have one request
      return;
    }
    // we'll update the reducer only
    // component will take care for sending data
    store.dispatch(
      updateRequestedWhiteboardData({
        requested: true,
        sendTo: payload.fromUserId,
      }),
    );
  }
}
