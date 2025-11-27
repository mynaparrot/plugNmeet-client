import { ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';

import { useAppSelector } from '../../../../store';
import {
  AIMessage,
  MyMessage,
} from '../../../chat/messages/message/messageTypes';

const FinalMessages = () => {
  const { t } = useTranslation();
  const finalMessages = useAppSelector(
    (state) => state.insightsAiTextChat.finalMessages,
  );
  const [formatedData, setFormatedData] = useState<ReactElement[]>([]);

  useEffect(() => {
    if (!finalMessages.length) {
      setFormatedData([]);
      return;
    }

    const render = async () => {
      const elements: ReactElement[] = [];
      for (const msg of finalMessages) {
        const parsedMessage = await marked.parse(msg.parts.join(''));

        if (msg.role === 'model') {
          elements.push(
            <div key={msg.id} className="wrapper flex gap-2 3xl:gap-3 my-4">
              <AIMessage
                name={t('insights.ai-text-chat.name')}
                message={parsedMessage}
                isStreaming={false}
                sentAt={msg.createdAt}
              />
            </div>,
          );
        } else {
          elements.push(
            <div key={msg.id} className="wrapper flex gap-2 3xl:gap-3 my-4">
              <MyMessage message={parsedMessage} sentAt={msg.createdAt} />
            </div>,
          );
        }
      }
      setFormatedData(elements);
    };

    render().then();
  }, [t, finalMessages]);

  return <>{formatedData}</>;
};

export default FinalMessages;
