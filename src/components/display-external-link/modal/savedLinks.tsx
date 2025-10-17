import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isArray } from 'es-toolkit/compat';

import FormattedInputField from '../../../helpers/ui/formattedInputField';
import { DB_STORE_NAMES, idbGet, idbStore } from '../../../helpers/libs/idb';
import { PlusCircleIconSVG } from '../../../assets/Icons/PlusCircleIconSVG';
import SavedLinkItem from './savedLinkItem';

const EXTERNAL_DISPLAY_LINK_URLS = 'externalDisplayLinkUrls';

interface ISavedLinksProps {
  link: string;
  setLink: React.Dispatch<React.SetStateAction<string>>;
}

const SavedLinks = ({ link, setLink }: ISavedLinksProps) => {
  const { t } = useTranslation();
  const [savedLinks, setSavedLinks] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [newUrlLink, setNewUrlLink] = useState<string>('');

  useEffect(() => {
    idbGet<string[]>(
      DB_STORE_NAMES.USER_SETTINGS,
      EXTERNAL_DISPLAY_LINK_URLS,
    ).then((urls) => {
      if (urls && isArray(urls)) {
        setSavedLinks(urls);
      }
    });
  }, []);

  const addLink = useCallback(async () => {
    if (!newUrlLink) {
      setErrorMsg(t('external-display-link-display.url-required'));
      return;
    }
    try {
      // oxlint-disable-next-line no-new
      new URL(newUrlLink);
    } catch (e) {
      console.error(e);
      setErrorMsg(t('external-display-link-display.link-invalid'));
      return;
    }
    setErrorMsg(undefined);

    setSavedLinks((prevUrls) => {
      const newUrls = new Set([newUrlLink, ...prevUrls]);
      const arr = Array.from(newUrls);
      idbStore(
        DB_STORE_NAMES.USER_SETTINGS,
        EXTERNAL_DISPLAY_LINK_URLS,
        arr,
      ).then();
      return arr;
    });
    setLink(newUrlLink);
    setNewUrlLink('');
  }, [t, setLink, newUrlLink]);

  const deleteLink = useCallback(
    async (urlToDelete: string) => {
      const newUrls = savedLinks.filter((url) => url !== urlToDelete);
      setSavedLinks(newUrls);
      await idbStore(
        DB_STORE_NAMES.USER_SETTINGS,
        EXTERNAL_DISPLAY_LINK_URLS,
        newUrls,
      );

      if (link === urlToDelete) {
        setLink('');
      }
    },
    [savedLinks, link, setLink],
  );

  const onLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (errorMsg) {
      setErrorMsg(undefined);
    }
    setNewUrlLink(e.currentTarget.value);
  };

  return (
    <>
      <div className="flex items-start gap-2 min-h-10">
        <div className="flex-auto">
          <FormattedInputField
            id="link"
            placeholder={t('external-display-link-display.url')}
            value={newUrlLink}
            onChange={onLinkChange}
          />
          <div className="text-xs py-2 text-Gray-800">
            {t('external-display-link-display.note')}
          </div>
        </div>
        <button
          className="h-10 w-10 3xl:h-11 3xl:w-11 bg-Gray-50 hover:bg-Gray-100 rounded-full flex justify-center items-center transition-all duration-300 shrink-0 cursor-pointer"
          type="button"
          onClick={addLink}
        >
          <PlusCircleIconSVG />
        </button>
      </div>
      {errorMsg && (
        <div className="error-msg text-xs text-red-600 py-1">{errorMsg}</div>
      )}

      {savedLinks.length > 0 && (
        <div className="max-h-40 overflow-y-auto scrollBar grid gap-2 mt-4">
          {savedLinks.map((url, i) => (
            <SavedLinkItem
              key={`url-${i}`}
              url={url}
              selectedUrl={link}
              onSelect={setLink}
              onDelete={deleteLink}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default SavedLinks;
