import { TbFolder } from 'react-icons/tb';
import { FaFileAlt } from 'react-icons/fa';
import BlocklyIcon from '@/components/icons/blockly-icon';
import MicropythonIcon from '@/components/icons/micropython-icon';
import { GoogleDriveFile } from '@/services/google-drive';
import { FOLDER_MIME_TYPE } from '@/services/local-drive';

/** The icon of a hidden item: folder, blocks, Python or another file. */
function ItemIcon({ item }: { item: GoogleDriveFile }) {
    if (item.mimeType === FOLDER_MIME_TYPE) return <TbFolder size={18} />;
    if (item.name.endsWith('.blocks')) return <BlocklyIcon width={18} height={18} />;
    if (item.name.endsWith('.py')) return <MicropythonIcon width={18} height={18} />;
    return <FaFileAlt size={16} />;
}

export default ItemIcon;
