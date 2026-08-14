import i18n from '../../../helpers/i18n';

const NotepadAIDisabledNotice = () => {
  return (
    <div className="w-full rounded-lg border border-Gray-100 bg-white p-3 text-sm text-Gray-600 shadow-xl dark:border-Gray-800 dark:bg-dark-primary dark:text-Gray-300">
      {i18n.t('insights.notepad-ai.disabled-message')}
    </div>
  );
};

export default NotepadAIDisabledNotice;
