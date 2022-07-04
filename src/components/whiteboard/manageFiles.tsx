import React, { useState, useEffect } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { createSelector } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';

import UploadFilesUI from './uploadFilesUI';
import { IWhiteboardOfficeFile } from '../../store/slices/interfaces/whiteboard';
import { RootState, useAppDispatch, useAppSelector } from '../../store';
import { sleep } from '../../helpers/utils';
import { broadcastWhiteboardOfficeFile } from './helpers/handleRequestedWhiteboardData';
import { updateCurrentWhiteboardOfficeFileId } from '../../store/slices/whiteboard';

interface IManageFilesProps {
  currentPage: number;
  excalidrawAPI: ExcalidrawImperativeAPI;
}

const whiteboardUploadedOfficeFilesSelector = createSelector(
  (state: RootState) => state.whiteboard.whiteboardUploadedOfficeFiles,
  (whiteboardUploadedOfficeFiles) => whiteboardUploadedOfficeFiles,
);

const ManageFiles = ({ currentPage, excalidrawAPI }: IManageFilesProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const whiteboardUploadedOfficeFiles = useAppSelector(
    whiteboardUploadedOfficeFilesSelector,
  );
  const [refreshFileBrowser, setRefreshFileBrowser] = useState<number>(0);
  const [menuItems, setMenuItems] = useState<JSX.Element[]>([]);
  const [fileType, setFileType] = useState<Array<string>>([]);

  useEffect(() => {
    const elms = whiteboardUploadedOfficeFiles.map((f) => {
      return (
        <div
          role="none"
          className="border-b border-solid border-primaryColor/10 last:border-none"
          key={f.fileId}
        >
          <Menu.Item>
            <button
              className="!rounded !w-full flex items-center !px-3 !py-[0.4rem] !text-[10px] lg:!text-xs transition ease-in !bg-transparent hover:!bg-primaryColor hover:text-white text-gray-700"
              onClick={() => switchOfficeFile(f)}
            >
              {f.fileName}
            </button>
          </Menu.Item>
        </div>
      );
    });
    setMenuItems(elms);
    //eslint-disable-next-line
  }, [whiteboardUploadedOfficeFiles]);

  const openFileBrowser = (type) => {
    let fileType = ['jpg', 'jpeg', 'png', 'svg'];
    if (type === 'office') {
      // prettier-ignore
      fileType = ['pdf', 'docx', 'doc', 'odt', 'txt', 'rtf', 'xml', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp', 'vsd', 'odg', 'html']
    }
    setRefreshFileBrowser(refreshFileBrowser + 1);
    setFileType([...fileType]);
  };

  const switchOfficeFile = async (f: IWhiteboardOfficeFile) => {
    dispatch(updateCurrentWhiteboardOfficeFileId(f.fileId));
    await sleep(500);
    broadcastWhiteboardOfficeFile(f);
  };

  const render = () => {
    return (
      <>
        <button
          className="h-[30px] lg:h-[32px] max-w text-xs !px-2 rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] !mr-2 flex items-center justify-center cursor-pointer"
          onClick={() => openFileBrowser('image')}
        >
          <svg
            className="opacity-50 mr-1 w-3 h-3"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            viewBox="0 0 232.322 232.322"
          >
            <path
              d="M224.822,23.935H7.5c-4.142,0-7.5,3.357-7.5,7.5v169.451c0,4.143,3.358,7.5,7.5,7.5h217.322c4.142,0,7.5-3.357,7.5-7.5
              V31.435C232.322,27.293,228.964,23.935,224.822,23.935z M217.322,38.936v143.091l-59.995-63.799
              c-1.417-1.507-3.394-2.362-5.462-2.362c-0.001,0-0.001,0-0.001,0c-2.068,0-4.044,0.855-5.462,2.36l-25.62,27.227l-34.349-45.291
              c-1.418-1.87-3.629-2.968-5.976-2.968c-0.002,0-0.004,0-0.006,0c-2.349,0.002-4.561,1.104-5.977,2.978L15,178.861V38.936H217.322z
              M207.415,193.387H22.824l57.643-76.269l33.722,44.465c1.334,1.759,3.374,2.84,5.578,2.957c2.201,0.11,4.348-0.742,5.86-2.35
              l26.234-27.879L207.415,193.387z"
            />
            <path
              d="M155.237,101.682c13.597,0,24.658-11.061,24.658-24.656c0-13.597-11.061-24.658-24.658-24.658
              c-13.596,0-24.656,11.062-24.656,24.658C130.581,90.621,141.642,101.682,155.237,101.682z M155.237,67.367
              c5.326,0,9.658,4.333,9.658,9.658c0,5.324-4.332,9.656-9.658,9.656c-5.325,0-9.656-4.332-9.656-9.656
              C145.581,71.7,149.913,67.367,155.237,67.367z"
            />
          </svg>
          {t('whiteboard.upload-image')}
        </button>
        <div className="menu relative z-10">
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button className="manage-icon h-[30px] lg:h-[32px] max-w text-xs !px-2 rounded-full bg-[#F2F2F2] hover:bg-[#ECF4FF] flex items-center justify-center cursor-pointer">
                  <>
                    <i className="pnm-attachment primaryColor hover:secondaryColor text-[14px] opacity-50 mr-1" />
                    {t('whiteboard.manage-files')}
                  </>
                </Menu.Button>

                {/* Use the Transition component. */}
                <Transition
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  {/* Mark this component as `static` */}
                  <Menu.Items
                    static
                    className="origin-top-right z-10 absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none"
                  >
                    <div className="item-wrapper-uploaded-file overflow-x-hidden overflow-y-auto max-h-[170px] scrollBar scrollBar2">
                      {menuItems}
                    </div>
                    <div className="py-3 !border-t-2 border-solid !border-primaryColor !mt-2">
                      <Menu.Item>
                        <button
                          onClick={() => openFileBrowser('office')}
                          className="w-[100px] !m-auto text-xs h-7 flex items-center justify-center !bg-primaryColor hover:!bg-secondaryColor text-white"
                        >
                          <i className="pnm-attachment text-white text-[14px] opacity-50 mr-1" />
                          {t('whiteboard.upload-file')}
                        </button>
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </>
            )}
          </Menu>
        </div>
        <UploadFilesUI
          refreshFileBrowser={refreshFileBrowser}
          allowedFileTypes={fileType}
          currentPage={currentPage}
          excalidrawAPI={excalidrawAPI}
        />
      </>
    );
  };

  return render();
};

export default ManageFiles;
