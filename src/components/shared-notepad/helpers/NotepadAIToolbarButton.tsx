import { useComponentsContext } from '@blocknote/react';
import { useTranslation } from 'react-i18next';

import { AiIconSVG } from '../../../assets/Icons/AiIconSVG';

const NotepadAIToolbarButton = ({ onClick }: { onClick: () => void }) => {
  const Components = useComponentsContext();
  const { t } = useTranslation();

  if (!Components) {
    return null;
  }

  const Button = Components.FormattingToolbar.Button;
  return (
    <Button
      icon={<AiIconSVG classes="h-4 w-4" />}
      label="AI"
      mainTooltip={t('insights.notepad-ai.title')}
      onClick={onClick}
    />
  );
};

export default NotepadAIToolbarButton;
