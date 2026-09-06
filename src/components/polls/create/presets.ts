// Pure data module: pre-defined quick type presets (one-click option sets).
export type PollPresetOption = { i18nKey: string } | { literal: string };

export interface PollQuickTypePreset {
  id: string;
  optionKeys: PollPresetOption[];
}

export const POLL_QUICK_TYPES: PollQuickTypePreset[] = [
  {
    id: 'yes-no',
    optionKeys: [
      { i18nKey: 'polls.option-yes' },
      { i18nKey: 'polls.option-no' },
    ],
  },
  {
    id: 'yes-no-maybe',
    optionKeys: [
      { i18nKey: 'polls.option-yes' },
      { i18nKey: 'polls.option-no' },
      { i18nKey: 'polls.option-maybe' },
    ],
  },
  {
    id: 'true-false',
    optionKeys: [
      { i18nKey: 'polls.option-true' },
      { i18nKey: 'polls.option-false' },
    ],
  },
  {
    id: 'agree-disagree',
    optionKeys: [
      { i18nKey: 'polls.option-agree' },
      { i18nKey: 'polls.option-disagree' },
    ],
  },
  {
    id: 'a-b-c-d',
    optionKeys: [
      { literal: 'A' },
      { literal: 'B' },
      { literal: 'C' },
      { literal: 'D' },
    ],
  },
  {
    id: '1-5',
    optionKeys: [
      { literal: '1' },
      { literal: '2' },
      { literal: '3' },
      { literal: '4' },
      { literal: '5' },
    ],
  },
];

// Resolve a preset's entries to display texts; t() applies to i18n keys only.
export const presetOptionTexts = (
  preset: PollQuickTypePreset,
  t: (key: string) => string,
): string[] =>
  preset.optionKeys.map((key) =>
    'literal' in key ? key.literal : t(key.i18nKey),
  );
