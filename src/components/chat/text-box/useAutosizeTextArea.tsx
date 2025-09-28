import { useEffect } from 'react';

export const useAutosizeTextArea = (
  textAreaRef: HTMLTextAreaElement | null,
  value: string,
) => {
  useEffect(() => {
    if (textAreaRef) {
      // Get the computed style of the textarea
      const style = window.getComputedStyle(textAreaRef);
      const boxSizing = style.getPropertyValue('box-sizing');

      // We need to reset the height momentarily to get the correct scrollHeight for the textarea
      textAreaRef.style.height = '0px';
      const scrollHeight = textAreaRef.scrollHeight;

      // If border-box, we need to account for the border width
      const borderTop = parseInt(
        style.getPropertyValue('border-top-width'),
        10,
      );
      const borderBottom = parseInt(
        style.getPropertyValue('border-bottom-width'),
        10,
      );
      const newHeight =
        boxSizing === 'border-box'
          ? scrollHeight + borderTop + borderBottom
          : scrollHeight;

      // We then set the height directly, outside of the render loop
      // Trying to set this with state or a ref will produce an incorrect value.
      textAreaRef.style.height = newHeight + 'px';
    }
  }, [textAreaRef, value]);
};
