import { useEffect, useState } from 'react';
import { uploadResumableFile } from '../utils';

export interface IUseResumableFilesUpload {
  allowedFileTypes: Array<string>;
  maxFileSize: string | undefined;
  files: Array<File> | undefined;
}
export interface IUseResumableFilesUploadResult {
  filePath: string;
  fileName: string;
  fileExtension: string;
}

const useResumableFilesUpload = ({
  allowedFileTypes,
  maxFileSize,
  files,
}: IUseResumableFilesUpload) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<IUseResumableFilesUploadResult>();

  useEffect(() => {
    if (files && files.length) {
      uploadResumableFile(
        allowedFileTypes,
        maxFileSize,
        files,
        (result) => {
          setResult(result);
        },
        (uploading) => setIsUploading(uploading),
      );
    }
    //eslint-disable-next-line
  }, [files]);

  return {
    isUploading,
    result,
  };
};

export default useResumableFilesUpload;
