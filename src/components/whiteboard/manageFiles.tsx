import React, {
  useState,
  // useEffect,
  // ReactElement,
  useRef,
} from 'react';
import { Dialog, DialogPanel, Button, DialogTitle } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

// import { IWhiteboardOfficeFile } from '../../store/slices/interfaces/whiteboard';
import {
  // store,
  useAppDispatch,
  useAppSelector,
} from '../../store';
import {
  randomString,
  // sleep
} from '../../helpers/utils';
// import { broadcastWhiteboardOfficeFile } from './helpers/handleRequestedWhiteboardData';
import {
  addWhiteboardOtherImageFile,
  // updateCurrentWhiteboardOfficeFileId,
} from '../../store/slices/whiteboard';
// import { formatStorageKey } from './helpers/utils';
import { PopupCloseSVGIcon } from '../../assets/Icons/PopupCloseSVGIcon';
import { FileIconSVG } from '../../assets/Icons/FileIconSVG';
import { TrashSVG } from '../../assets/Icons/TrashSVG';

interface IManageFilesProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  // allowedFileTypes: Array<string>;
  // currentPage: number;
}

const ManageFiles = ({
  excalidrawAPI,
  // allowedFileTypes,
}: IManageFilesProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const currentPage = useAppSelector((state) => state.whiteboard.currentPage);
  // const whiteboardUploadedOfficeFiles = useAppSelector(
  //   (state) => state.whiteboard.whiteboardUploadedOfficeFiles,
  // );
  // const [refreshFileBrowser, setRefreshFileBrowser] = useState<number>(0);
  // const [menuItems, setMenuItems] = useState<ReactElement[]>([]);
  // const [fileType, setFileType] = useState<Array<string>>([]);
  const [isOpen, setIsOpen] = useState(false);

  const inputFile = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  // const [previews, setPreviews] = useState<string[]>([]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    setFiles(selectedFiles);

    // Generate previews for images
    // const imagePreviews = selectedFiles.map((file) => {
    //   if (file.type.startsWith('image/')) {
    //     return URL.createObjectURL(file);
    //   }
    //   return '';
    // });
    // setPreviews(imagePreviews);
  };

  const addToWhiteboard = () => {
    files.forEach((file) => {
      // Only handle images here, extend for office files if needed
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const filePath = ev.target?.result as string;
          const fileObj = {
            id: randomString(),
            currentPage,
            filePath,
            fileName: file.name,
            uploaderWhiteboardHeight: excalidrawAPI.getAppState().height,
            uploaderWhiteboardWidth: excalidrawAPI.getAppState().width,
            isOfficeFile: false,
          };
          dispatch(addWhiteboardOtherImageFile(fileObj));
        };
        reader.readAsDataURL(file);
      }
      // For office files, you can add conversion logic here
    });
    setFiles([]);
    // setPreviews([]);
  };

  // useEffect(() => {
  //   const elms = whiteboardUploadedOfficeFiles.map((f) => {
  //     return (
  //       <div
  //         role="none"
  //         className="border-b border-solid border-primary-color/10 last:border-none"
  //         key={f.fileId}
  //       >
  //         {/* <MenuItem> */}
  //         <button
  //           className="!rounded w-full! flex items-center px-3! py-[0.4rem]! text-[10px]! lg:text-xs! transition ease-in bg-transparent! hover:bg-primary-color! hover:text-white text-gray-700 dark:text-dark-text"
  //           onClick={() => switchOfficeFile(f)}
  //         >
  //           {f.fileName}
  //         </button>
  //         {/* </MenuItem> */}
  //       </div>
  //     );
  //   });
  //   setMenuItems(elms);
  //   //eslint-disable-next-line
  // }, [whiteboardUploadedOfficeFiles]);

  // const openFileBrowser = (type) => {
  //   let fileType = ['jpg', 'jpeg', 'png', 'svg'];
  //   if (type === 'office') {
  //     // prettier-ignore
  //     fileType = ['pdf', 'docx', 'doc', 'odt', 'txt', 'rtf', 'xml', 'xlsx', 'xls', 'ods', 'csv', 'pptx', 'ppt', 'odp', 'vsd', 'odg', 'html']
  //   }
  //   setRefreshFileBrowser(refreshFileBrowser + 1);
  //   setFileType([...fileType]);
  // };

  // const switchOfficeFile = async (f: IWhiteboardOfficeFile) => {
  //   await saveCurrentPageData();
  //   dispatch(updateCurrentWhiteboardOfficeFileId(f.fileId));
  //   await sleep(500);
  //   broadcastWhiteboardOfficeFile(f);
  // };

  // const saveCurrentPageData = async () => {
  //   if (!excalidrawAPI) {
  //     return;
  //   }
  //   const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
  //   if (elms.length) {
  //     const currentPageNumber = store.getState().whiteboard.currentPage;
  //     sessionStorage.setItem(
  //       formatStorageKey(currentPageNumber),
  //       JSON.stringify(elms),
  //     );
  //   }
  // };

  const render = () => {
    return (
      <>
        {/*<button
          className="h-[30px] lg:h-[32px] max-w text-xs px-2! rounded-lg border border-solid border-[#3d3d3d] text-[#3d3d3d] dark:text-[#b8b8b8] dark:bg-[#262627] dark:hover:bg-[#3d3d3d] hover:bg-[#3d3d3d] hover:text-[#b8b8b8] font-semibold flex items-center justify-center cursor-pointer"
          onClick={() => openFileBrowser('image')}
        >
          <i className="pnm-blank-img text-[14px] ltr:mr-1 rtl:ml-1" />
          {t('whiteboard.upload-image')}
        </button>*/}
        {/* <div className="menu relative z-10">
          <Menu>
            {({ open }) => ( 
              <div>
                <MenuButton className="manage-icon h-[30px] lg:h-[32px] max-w text-xs px-2! rounded-lg border border-solid border-[#3d3d3d] text-[#3d3d3d] dark:text-[#b8b8b8] dark:bg-[#262627] dark:hover:bg-[#3d3d3d] hover:bg-[#3d3d3d] hover:text-[#b8b8b8] font-semibold flex items-center justify-center cursor-pointer">
                  <>
                    <i className="pnm-attachment text-[14px] ltr:mr-1 rtl:ml-1" />
                    {t('whiteboard.manage-files')}
                  </>
                </MenuButton>
                <Transition
                  show={open}
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <MenuItems
                    static
                    className="origin-top-right z-10 absolute ltr:right-0 rtl:left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-dark-primary ring-1 ring-black dark:ring-secondary-color ring-opacity-5 divide-y divide-gray-100 dark:divide-secondary-color focus:outline-hidden"
                  >
                    <div className="item-wrapper-uploaded-file overflow-x-hidden overflow-y-auto max-h-[170px] scrollBar scrollBar2">
                      {menuItems}
                    </div>
                    <div className="py-3 border-t-2! border-solid border-primary-color! mt-2!">
                      <MenuItem>
                        <button
                          onClick={() => openFileBrowser('office')}
                          className="w-[100px] m-auto! text-xs h-7 flex items-center justify-center bg-primary-color! hover:bg-secondary-color! text-white"
                        >
                          <i className="pnm-attachment text-white text-[14px] opacity-50 ltr:mr-1 rtl:ml-1" />
                          {t('whiteboard.upload-file')}
                        </button>
                      </MenuItem>
                    </div>
                  </MenuItems>
                </Transition>
              </div>
            )}
          </Menu>
        </div> */}
        <div className="menu relative z-10">
          <Button
            onClick={() => setIsOpen(true)}
            className="manage-icon h-[30px] lg:h-[32px] max-w text-xs px-2! rounded-lg border border-solid border-[#3d3d3d] text-[#3d3d3d] dark:text-[#b8b8b8] dark:bg-[#262627] dark:hover:bg-[#3d3d3d] hover:bg-[#3d3d3d] hover:text-[#b8b8b8] font-semibold flex items-center justify-center cursor-pointer"
          >
            <i className="pnm-attachment text-[14px] ltr:mr-1 rtl:ml-1" />
            {t('whiteboard.manage-files')}
          </Button>
          <Dialog
            open={isOpen}
            as="div"
            className="relative z-10 focus:outline-hidden"
            onClose={() => setIsOpen(false)}
          >
            <div className="excalidrawUploadFiles fixed inset-0 w-screen overflow-y-auto z-10">
              <div className="flex min-h-full items-center justify-center py-4">
                <DialogPanel
                  transition
                  className="w-full max-w-lg bg-white border border-Gray-200 shadow-virtual-pOP rounded-xl overflow-hidden duration-300 ease-out data-closed:transform-[scale(95%)] data-closed:opacity-0"
                >
                  <DialogTitle
                    as="h3"
                    className="flex items-center justify-between text-base font-semibold leading-7 text-Gray-950 px-4 py-2 border-b border-Gray-100"
                  >
                    <span>Upload Files</span>
                    <Button
                      className="cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      <PopupCloseSVGIcon classes="text-Gray-600" />
                    </Button>
                  </DialogTitle>
                  <div className="wrap p-4 bg-Gray-25">
                    <div className="input-wrap relative rounded-xl border border-dashed border-Gray-200 py-8 px-6 cursor-pointer">
                      <input
                        type="file"
                        multiple
                        ref={inputFile}
                        onChange={onChange}
                        // accept={
                        //   ('pdf',
                        //   'docx',
                        //   'doc',
                        //   'odt',
                        //   'txt',
                        //   'rtf',
                        //   'xml',
                        //   'xlsx',
                        //   'xls',
                        //   'ods',
                        //   'csv',
                        //   'pptx',
                        //   'ppt',
                        //   'odp',
                        //   'vsd',
                        //   'odg',
                        //   'html')
                        // }
                        className="w-full h-full absolute top-0 left-0 opacity-0 cursor-pointer"
                      />
                      <div className="text-wrap text-sm font-medium text-center cursor-pointer">
                        <p className="text-Gray-950 font-semibold pb-1">
                          Drag and drop your files to upload
                        </p>
                        <p className="text-Gray-700">Max file size: 50 MB</p>
                        <div className="divider flex justify-center items-center gap-3 py-3">
                          <span className="line inline-block h-[1px] w-20 bg-Gray-200"></span>
                          <span className="text-Gray-600">OR</span>
                          <span className="line inline-block h-[1px] w-20 bg-Gray-200"></span>
                        </div>
                        <button className="h-9 w-auto m-auto px-4 flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow cursor-pointer">
                          <i className="pnm-attachment text-[14px] ltr:mr-1 rtl:ml-1" />
                          Select Files
                        </button>
                      </div>
                    </div>
                    <div className="file-preview-list grid gap-2 pt-4">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex gap-4 py-2 px-3 bg-Gray-50 w-full rounded-xl"
                        >
                          <div className="icon w-9 h-9 rounded-full bg-Gray-100 text-Blue2-800 relative inline-flex items-center justify-center">
                            <FileIconSVG />
                          </div>
                          <div className="text flex-1 text-Gray-800 text-sm">
                            <div className="top flex gap-3 justify-between">
                              <div className="left">
                                <p className="break-all">{file.name}</p>
                                <div className="bottom flex justify-between text-Gray-800 text-xs items-center pt-1">
                                  {file.size}KB
                                </div>
                              </div>
                              <div className="right">
                                <TrashSVG />
                              </div>
                            </div>
                            <div className="progress-bar flex gap-2 items-center">
                              <div className="bar h-2 w-full relative bg-Gray-25 rounded-full overflow-hidden">
                                <div
                                  className="inner gradient absolute w-full h-full top-0 left-0"
                                  style={{ width: `68%` }}
                                ></div>
                              </div>
                              <div className="count bg-Gray-25 border border-Gray-300 rounded-[7px] w-auto py-0.5 px-2">
                                68%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-4 border-t border-Gray-100">
                    <button
                      className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-Gray-950 bg-Gray-25 border border-Gray-300 transition-all duration-300 hover:bg-Gray-50 shadow-button-shadow cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      {t('close')}
                    </button>
                    <button
                      className="h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium 3xl:font-semibold text-white bg-Blue2-500 border border-Blue2-600 transition-all duration-300 hover:bg-Blue2-600  shadow-button-shadow cursor-pointer"
                      onClick={addToWhiteboard}
                      disabled={files.length === 0}
                    >
                      Add to Whiteboard
                    </button>
                  </div>
                </DialogPanel>
              </div>
            </div>
          </Dialog>
        </div>
        {/* <UploadFilesUI
          refreshFileBrowser={refreshFileBrowser}
          allowedFileTypes={fileType}
          currentPage={currentPage}
          excalidrawAPI={excalidrawAPI}
        /> */}
      </>
    );
  };

  return render();
};

export default ManageFiles;
