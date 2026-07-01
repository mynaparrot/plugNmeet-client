import { createListenerMiddleware } from '@reduxjs/toolkit';

import {
  addReaction,
  removeReaction,
  REACTION_TTL_MS,
} from '../slices/reactionsSlice';

export const reactionsListener = createListenerMiddleware();

reactionsListener.startListening({
  actionCreator: addReaction,
  effect: async (action, listenerApi) => {
    await listenerApi.delay(REACTION_TTL_MS);
    listenerApi.dispatch(removeReaction(action.payload.id));
  },
});
