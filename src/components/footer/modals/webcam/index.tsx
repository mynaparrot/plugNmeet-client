import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '../../../../store';
import { updateShowVideoShareModal } from '../../../../store/slices/bottomIconsActivitySlice';
import { getInputMediaDevices } from '../../../../helpers/utils';
import WebcamSettings from './webcamSettings';
import { addVideoDevices } from '../../../../store/slices/roomSettingsSlice';
import Modal from '../../../../helpers/ui/modal';
import Dropdown from '../../../../helpers/ui/dropdown';
import ActionButton from '../../../../helpers/ui/actionButton';
import { IMediaDevice } from '../../../../store/slices/interfaces/roomSettings';

interface IShareWebcamModal {
  onSelectedDevice: (deviceId: string) => void;
  displayWebcamSelection: boolean;
  selectedDeviceId: string;
  /** Pre-enumerated list (e.g. landing already asked permission) — avoids a second getUserMedia on first open. */
  initialDevices?: IMediaDevice[];
}

const ShareWebcamModal = ({
  onSelectedDevice,
  displayWebcamSelection,
  selectedDeviceId,
  initialDevices,
}: IShareWebcamModal) => {
  const showVideoShareModal = useAppSelector(
    (state) => state.bottomIconsActivity.showVideoShareModal,
  );
  const [selectedWebcam, setSelectWebcam] = useState<string>(selectedDeviceId);
  const [devices, setDevices] = useState<IMediaDevice[]>(() =>
    initialDevices ? [...initialDevices] : [],
  );
  const [loading, setLoading] = useState(!initialDevices?.length);
  const [loadError, setLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const selectedIdRef = useRef(selectedDeviceId);
  selectedIdRef.current = selectedDeviceId;
  const selectedWebcamRef = useRef(selectedWebcam);
  selectedWebcamRef.current = selectedWebcam;

  const applyDevices = useCallback(
    (list: IMediaDevice[]) => {
      setDevices(list);
      dispatch(addVideoDevices(list));
      // Prefer the prop (landing/footer selection), fall back to the user's
      // in-modal pick so a Refresh never discards what is on screen.
      const current = selectedIdRef.current || selectedWebcamRef.current;
      if (current && list.some((d) => d.id === current)) {
        setSelectWebcam(current);
      } else if (list.length > 0) {
        // Cameras have no monitor/loopback trap like mics: auto-picking the
        // first camera preserves the landing "Enable mic+cam" flow, where
        // enableMediaDevices('both') pre-selects the camera and the preview
        // must appear immediately without a second explicit pick.
        setSelectWebcam(list[0].id);
      } else {
        setSelectWebcam('');
      }
    },
    [dispatch],
  );

  // Parent may commit a selection while the modal is open (e.g. device
  // switch from another menu) — follow it unless the user just picked.
  useEffect(() => {
    if (selectedDeviceId && selectedDeviceId !== selectedWebcamRef.current) {
      setSelectWebcam(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const initialDevicesRef = useRef(initialDevices);
  useEffect(() => {
    // Use pre-enumerated devices on first open only (no extra getUserMedia).
    // Refresh button re-enumerates from hardware.
    const seed = refreshKey === 0 ? initialDevicesRef.current : undefined;
    if (seed && seed.length) {
      applyDevices(seed);
      setLoading(false);
      return;
    }
    let disposed = false;
    const getDeviceWebcams = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const inputDevices = await getInputMediaDevices('video');
        if (disposed) {
          return;
        }
        if (!inputDevices.video.length) {
          setDevices([]);
          setLoadError(true);
          return;
        }
        applyDevices(inputDevices.video);
      } catch (e) {
        console.warn('failed to load webcams', e);
        if (!disposed) {
          setLoadError(true);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };
    getDeviceWebcams().then();
    return () => {
      disposed = true;
    };
    //eslint-disable-next-line
  }, [refreshKey]);

  const shareWebcam = async () => {
    if (!selectedWebcam) {
      return;
    }
    dispatch(updateShowVideoShareModal(false));
    onSelectedDevice(selectedWebcam);
  };

  // Closing without sharing commits nothing: the caller's active published
  // state is left untouched (cancelling a background-config open must not
  // tear down a live camera).
  const onClose = () => {
    dispatch(updateShowVideoShareModal(false));
  };

  const refreshing = loading && devices.length > 0;
  const showEmptyError = !loading && (loadError || devices.length === 0);

  return (
    showVideoShareModal && (
      <Modal
        show={showVideoShareModal}
        onClose={onClose}
        title={t('footer.modal.select-webcam')}
        customClass="ChooseBackgroud"
        renderButtons={() => (
          <div className="flex items-center justify-end gap-3">
            <button
              className="secondary-button h-9 w-36 flex items-center justify-center cursor-pointer text-sm font-semibold bg-white hover:bg-Blue border border-[#0088CC] rounded-[15px] text-Gray-950 hover:text-white transition-all duration-300 shadow-button-shadow disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
              type="button"
              onClick={onClose}
            >
              {t('cancel')}
            </button>
            <ActionButton onClick={shareWebcam} disabled={!selectedWebcam}>
              {t('share')}
            </ActionButton>
          </div>
        )}
      >
        {loading && devices.length === 0 ? (
          <div className="grid gap-3" aria-live="polite">
            <div className="h-64 3xl:h-80 animate-pulse rounded-lg bg-Gray-100 dark:bg-Gray-800" />
            <p className="text-xs text-Gray-500 dark:text-Gray-400">
              {t('footer.modal.cam-loading')}
            </p>
          </div>
        ) : showEmptyError ? (
          <div className="grid gap-2">
            <p className="text-sm text-Red-500" role="alert">
              {t('footer.modal.cam-not-found')}
            </p>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="h-9 w-max rounded-[10px] border border-Gray-300 dark:border-Gray-700 px-3 text-xs font-semibold text-Gray-800 dark:text-white hover:bg-Gray-50 dark:hover:bg-Gray-700 focus-ring cursor-pointer"
            >
              {t('footer.modal.mic-retry')}
            </button>
          </div>
        ) : (
          <>
            {displayWebcamSelection && (
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-Gray-500 dark:text-Gray-400">
                  {t('footer.modal.select-webcam')}
                </span>
                <button
                  type="button"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-Blue2-600 dark:text-Blue2-400 hover:underline focus-ring rounded cursor-pointer disabled:cursor-wait disabled:opacity-70"
                >
                  {refreshing && (
                    <span
                      className="h-3 w-3 animate-spin rounded-full border-2 border-Blue2-400 border-t-transparent"
                      aria-hidden="true"
                    />
                  )}
                  {t('footer.modal.mic-refresh')}
                </button>
              </div>
            )}
            {displayWebcamSelection && devices.length > 1 && (
              <div className="webcam-dropdown mb-4">
                <Dropdown
                  id="webcam"
                  value={selectedWebcam}
                  onChange={setSelectWebcam}
                  options={devices.map((d) => ({
                    value: d.id,
                    text: d.label || t('footer.modal.cam-unknown-label'),
                  }))}
                />
              </div>
            )}
            {!selectedWebcam ? (
              <p
                className="text-xs text-Gray-500 dark:text-Gray-400 mb-2"
                role="note"
              >
                {t('footer.modal.cam-choose-prompt')}
              </p>
            ) : null}
            <div className="w-full">
              <WebcamSettings
                deviceId={selectedWebcam}
                onRetry={() => setRefreshKey((k) => k + 1)}
              />
            </div>
          </>
        )}
      </Modal>
    )
  );
};

export default ShareWebcamModal;
