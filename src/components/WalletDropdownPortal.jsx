import { createPortal } from 'react-dom';

export default function WalletDropdownPortal({ children }) {
  // Render dropdown into a portal at the end of the document body
  return createPortal(children, document.body);
}
