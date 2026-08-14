export const getUserColor = () => {
  let color = sessionStorage.getItem('shared-notepad-user-color');
  if (!color) {
    color = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0');
    sessionStorage.setItem('shared-notepad-user-color', color);
  }
  return `#${color}`;
};
