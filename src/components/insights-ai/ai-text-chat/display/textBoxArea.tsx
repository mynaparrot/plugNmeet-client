import React, { KeyboardEvent, useCallback, useRef, useState } from 'react';
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

  const sendMsg = useCallback(async () => {
    if (isAwaitingResponse || isEmpty(message)) return;

    const body = create(InsightsAITextChatContentSchema, {
      role: InsightsAITextChatRole.INSIGHTS_AI_TEXT_CHAT_ROLE_USER,
      text: message,
    });
    // Dispatch the user message immediately, this will set isAwaitingResponse to true
    // and instantly lock the UI.
    dispatch(addAiTextChatUserMessage(message));
    setMessage('');

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
    <div className="flex items-center justify-between border border-Gray-200 rounded-2xl 3xl:rounded-3xl p-1.5 w-full">
      <textarea
        name="message-textarea"
        id="message-textarea"
        className="flex-1 outline-hidden text-xs 3xl:text-sm text-Gray-600 font-normal h-10 mr-2 overflow-hidden"
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
