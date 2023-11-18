import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import activeSpeakersSlice from './slices/activeSpeakersSlice';
import participantSlice from './slices/participantSlice';
import sessionSlice from './slices/sessionSlice';
import bottomIconsSlice from './slices/bottomIconsActivitySlice';
import chatMessagesSlice from './slices/chatMessagesSlice';
import roomSettingsSlice from './slices/roomSettingsSlice';
import whiteboardSlice from './slices/whiteboard';
import externalMediaPlayerSlice from './slices/externalMediaPlayer';
import { pollsApi } from './services/pollsApi';
import breakoutRoomSlice from './slices/breakoutRoomSlice';
import { breakoutRoomApi } from './services/breakoutRoomApi';
import speechServicesSlice from './slices/speechServicesSlice';

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
    breakoutRoom: breakoutRoomSlice,
    [pollsApi.reducerPath]: pollsApi.reducer,
    [breakoutRoomApi.reducerPath]: breakoutRoomApi.reducer,
    speechServices: speechServicesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      pollsApi.middleware,
      breakoutRoomApi.middleware,
    ),
  devTools: !IS_PRODUCTION,
});

setupListeners(store.dispatch);
