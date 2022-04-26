import { configureStore } from '@reduxjs/toolkit';
import activeSpeakersSlice from './slices/activeSpeakersSlice';
import participantSlice from './slices/participantSlice';
import sessionSlice from './slices/sessionSlice';
import bottomIconsSlice from './slices/bottomIconsActivitySlice';
import chatMessagesSlice from './slices/chatMessagesSlice';
import roomSettingsSlice from './slices/roomSettingsSlice';
import whiteboardSlice from './slices/whiteboard';
import externalMediaPlayerSlice from './slices/externalMediaPlayer';

declare const IS_PRODUCTION: boolean;

export const store = configureStore({
  reducer: {
    participants: participantSlice,
    activeSpeakers: activeSpeakersSlice,
    session: sessionSlice,
    bottomIconsActivity: bottomIconsSlice,
    chatMessages: chatMessagesSlice,
    roomSettings: roomSettingsSlice,
    whiteboard: whiteboardSlice,
    externalMediaPlayer: externalMediaPlayerSlice,
  },
  devTools: !IS_PRODUCTION,
});
