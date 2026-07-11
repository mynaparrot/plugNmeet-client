import React, {
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { isEmpty } from 'es-toolkit/compat';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  InsightsAITextChatContentSchema,
  InsightsAITextChatRole,
} from 'plugnmeet-protocol-js';

import SendIconSVG from '../../../../assets/Icons/SendIconSVG';
import { useAutosizeTextArea } from '../../../chat/text-box/useAutosizeTextArea';
import { useAppDispatch, useAppSelector } from '../../../../store';
import {
  addAiTextChatUserMessage,
  clearIsAwaitingResponse,
} from '../../../../store/slices/insightsAiTextChatSlice';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';

const TextBoxArea = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isAwaitingResponse = useAppSelector(
    (state) => state.insightsAiTextChat.isAwaitingResponse,
  );

  const [message, setMessage] = useState<string>('');
  useAutosizeTextArea(textAreaRef.current, message);

  // This effect now manages the entire timeout lifecycle.
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    // If we start waiting for a response, set a 30-second timeout.
    if (isAwaitingResponse) {
      timeoutId = setTimeout(() => {
        dispatch(clearIsAwaitingResponse());
        toast(t('insights.ai-text-chat.response-timed-out'), {
          type: 'error',
        });
      }, 30000); // 30 seconds
    }

    // The cleanup function will run when the component unmounts,
    // or when `isAwaitingResponse` changes again.
    return () => {
      // If a response arrives in time (isAwaitingResponse becomes false),
      // this cleanup will run and clear the timeout before it can fire.
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAwaitingResponse, dispatch, t]);

  const sendMsg = useCallback(async () => {
    if (isAwaitingResponse || isEmpty(message)) return;

    const body = create(InsightsAITextChatContentSchema, {
      role: InsightsAITextChatRole.INSIGHTS_AI_TEXT_CHAT_ROLE_USER,
      text: message,
    });
    // Dispatch the user message immediately, this will set isAwaitingResponse to true
    // and instantly lock the UI and will trigger the useEffect above to start the timeout.
    dispatch(addAiTextChatUserMessage(message));
    setMessage('');

    try {
      const r = await sendAPIRequest(
        'insights/ai/textChat/execute',
        toBinary(InsightsAITextChatContentSchema, body),
        false,
        'application/protobuf',
        'arraybuffer',
      );

      const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
      if (!res.status) {
        toast(t(res.msg), {
          type: 'error',
        });
        // If the API call fails, clear the waiting state.
        // This will trigger the useEffect cleanup, cancelling the timeout.
        dispatch(clearIsAwaitingResponse());
      }
      // On success, we do nothing. The WebSocket listener is now responsible
      // for eventually calling `clearIsAwaitingResponse`.
    } catch (error) {
      console.error(error);
      toast(t('insights.ai-text-chat.response-timed-out'), {
        type: 'error',
      });
      // Also clear on network errors.
      dispatch(clearIsAwaitingResponse());
    }
  }, [t, dispatch, message, isAwaitingResponse]);

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(evt.target?.value);
    },
    [],
  );

  const onEnterPress = useCallback(
    async (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await sendMsg();
      }
    },
    [sendMsg],
  );

  const placeholderText = isAwaitingResponse
    ? t('insights.ai-text-chat.responding-placeholder')
    : t('insights.ai-text-chat.chat-box-placeholder');

  const isSendButtonDisabled = isAwaitingResponse || isEmpty(message);

  return (
    <div className="flex items-center justify-between border border-Gray-200 dark:border-Gray-800 rounded-2xl 3xl:rounded-3xl p-1.5 w-full">
      <textarea
        name="message-textarea"
        id="message-textarea"
        className="flex-1 outline-hidden text-xs 3xl:text-sm text-Gray-600 dark:text-dark-text placeholder:dark:text-dark-text  font-normal h-10 mr-2 overflow-hidden px-2"
        value={message}
        onChange={handleChange}
        disabled={isAwaitingResponse}
        placeholder={placeholderText}
        onKeyDown={onEnterPress}
        ref={textAreaRef}
        rows={1}
      />
      <button
        disabled={isSendButtonDisabled}
        onClick={sendMsg}
        className={`w-7 3xl:w-9 h-7 3xl:h-9 flex items-center justify-center rounded-full transition-all duration-300 hover:bg-[#00A1F2] hover:border-[#08C] ${
          isSendButtonDisabled
            ? 'bg-[#00A1F2]/30 border border-[#08C]/30 cursor-not-allowed'
            : 'bg-[#00A1F2] border border-[#08C] cursor-pointer'
        }`}
      >
        <SendIconSVG />
      </button>
    </div>
  );
};

export default TextBoxArea;
