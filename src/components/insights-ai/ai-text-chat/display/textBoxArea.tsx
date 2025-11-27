import React, { KeyboardEvent, useCallback, useRef, useState } from 'react';
import { isEmpty } from 'es-toolkit/compat';
import { useTranslation } from 'react-i18next';
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  CommonResponseSchema,
  InsightsAITextChatContentSchema,
  InsightsAITextChatRole,
} from 'plugnmeet-protocol-js';

import SendIconSVG from '../../../../assets/Icons/SendIconSVG';
import { useAutosizeTextArea } from '../../../chat/text-box/useAutosizeTextArea';
import { useAppDispatch } from '../../../../store';
import { addAiTextChatUserMessage } from '../../../../store/slices/insightsAiTextChatSlice';
import sendAPIRequest from '../../../../helpers/api/plugNmeetAPI';

const TextBoxArea = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [message, setMessage] = useState<string>('');
  useAutosizeTextArea(textAreaRef.current, message);
  const [isLocked, setIsLocked] = useState(false);

  const sendMsg = useCallback(async () => {
    setIsLocked(true);

    const body = create(InsightsAITextChatContentSchema, {
      role: InsightsAITextChatRole.INSIGHTS_AI_TEXT_CHAT_ROLE_USER,
      text: message,
    });

    const r = await sendAPIRequest(
      'insights/ai/textChat/execute',
      toBinary(InsightsAITextChatContentSchema, body),
      false,
      'application/protobuf',
      'arraybuffer',
    );

    const res = fromBinary(CommonResponseSchema, new Uint8Array(r));
    if (!res.status) {
      setIsLocked(false);
      return;
    }

    dispatch(addAiTextChatUserMessage(message));
    setMessage('');
    setIsLocked(false);
  }, [dispatch, message]);

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

  return (
    <div className="flex items-center justify-between border border-Gray-200 rounded-2xl 3xl:rounded-3xl p-1.5 w-full">
      <textarea
        name="message-textarea"
        id="message-textarea"
        className="flex-1 outline-hidden text-xs 3xl:text-sm text-Gray-600 font-normal h-10 mr-2 overflow-hidden"
        value={message}
        onChange={handleChange}
        disabled={isLocked}
        placeholder={t('insights.ai-text-chat.chat-box-placeholder')}
        onKeyDown={onEnterPress}
        ref={textAreaRef}
        rows={1}
      />
      <button
        disabled={isLocked}
        onClick={sendMsg}
        className={`w-7 3xl:w-9 h-7 3xl:h-9 flex items-center justify-center rounded-full transition-all duration-300 hover:bg-[#00A1F2] hover:border-[#08C] ${isEmpty(message) ? 'bg-[#00A1F2]/30 border border-[#08C]/30' : 'bg-[#00A1F2] border border-[#08C]'} ${!isLocked && !isEmpty(message) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      >
        <SendIconSVG />
      </button>
    </div>
  );
};

export default TextBoxArea;
