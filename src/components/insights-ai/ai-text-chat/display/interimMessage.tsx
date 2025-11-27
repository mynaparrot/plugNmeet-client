import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';

import { useAppSelector } from '../../../../store';
import { AIMessage } from '../../../chat/messages/message/messageTypes';

const InterimMessage = () => {
  const { t } = useTranslation();
  const interimMessage = useAppSelector(
    (state) => state.insightsAiTextChat.interimMessage,
  );
  const [formattedText, setFormattedText] = useState<string>('');

  useEffect(() => {
    if (!interimMessage) {
      setFormattedText('');
      return;
    }

    const render = async () => {
      const parsed = await marked.parse(interimMessage.parts.join(''));
      setFormattedText(parsed);
    };

    render().then();
  }, [interimMessage]);

  if (!interimMessage) {
    return null;
  }

  return (
    <div key={interimMessage.id} className="wrapper flex gap-2 3xl:gap-3 my-4">
      <AIMessage
        name={t('insights.ai-text-chat.name')}
        message={formattedText}
        isStreaming={true}
        sentAt={interimMessage.createdAt}
      />
    </div>
  );
};

export default InterimMessage;
