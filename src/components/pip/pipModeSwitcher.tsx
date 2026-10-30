import React from 'react';
import { useTranslation } from 'react-i18next';

import { Camera } from '../../assets/Icons/Camera';
import { ChatIconSVG } from '../../assets/Icons/ChatIconSVG';
import { PipContent, usePip } from './pipProvider';

const MODES: { mode: PipContent; icon: React.ReactNode }[] = [
  { mode: 'chat', icon: <ChatIconSVG /> },
  { mode: 'webcam', icon: <Camera classes="" /> },
];

/**
 * Chat / Webcam switch shown in both PiP views. It only asks the shared window
 * for another content mode, so it never opens a second window. It floats over
 * the top-left corner, which is why both views reserve a band at the top.
 * It is rendered by the always-mounted chat view, not by the webcam strip, so
 * it stays available when the strip unmounts.
 */
const PipModeSwitcher = () => {
  const { t } = useTranslation();
  const { content, openPip } = usePip();

  return (
    <div className="pip-mode-switcher" role="group" aria-label={t('pip.switcher.label').toString()}>
      {MODES.map(({ mode, icon }) => {
        const label = t(`pip.switcher.${mode}`).toString();

        return (
          <button
            key={mode}
            type="button"
            className="pip-mode-button"
            aria-label={label}
            aria-pressed={content === mode}
            title={label}
            onClick={() => openPip(mode)}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
};

export default PipModeSwitcher;
