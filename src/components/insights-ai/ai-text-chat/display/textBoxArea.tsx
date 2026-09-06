import React, { KeyboardEvent, useCallback, useRef, useState } from 'react';
import { isEmpty } from 'es-toolkit/compat';
import { useTranslation } from 'react-i18next';

import SendIconSVG from '../../../../assets/Icons/SendIconSVG';
import { useAutosizeTextArea } from '../../../chat/text-box/useAutosizeTextArea';

interface TextBoxAreaProps {
  onSend: (text: string) => void;
  isAwaitingResponse: boolean;
}

const TextBoxArea = ({ onSend, isAwaitingResponse }: TextBoxAreaProps) => {
  const { t } = useTranslation();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [message, setMessage] = useState<string>('');
  useAutosizeTextArea(textAreaRef.current, message);

  const sendMsg = useCallback(() => {
    if (isAwaitingResponse || isEmpty(message)) return;

    // The hook owns the request lifecycle and error handling; this component
    // is purely presentational.
    onSend(message);
    setMessage('');
  }, [isAwaitingResponse, message, onSend]);

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(evt.target?.value);
    },
    [],
  );

  const onEnterPress = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
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
        dir="auto"
        name="message-textarea"
        id="message-textarea"
        className="flex-1 outline-hidden text-xs 3xl:text-sm text-Gray-600 dark:text-dark-text placeholder:dark:text-dark-text  font-normal h-10 mr-2 overflow-hidden px-2"
        value={message}
        onChange={handleChange}
        readOnly={isAwaitingResponse}
        placeholder={placeholderText}
        onKeyDown={onEnterPress}
        ref={textAreaRef}
        rows={1}
      />
      <button
        disabled={isSendButtonDisabled}
        onClick={sendMsg}
        aria-label="Send message"
        className={`focus-ring w-7 3xl:w-9 h-7 3xl:h-9 flex items-center justify-center rounded-full transition-all duration-300 hover:bg-[#00A1F2] hover:border-[#08C] ${
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
