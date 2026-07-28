'use strict';

// Maps the FontAwesome-style semantic names used throughout the app (icon="edit", etc.)
// to Phosphor icon components. This is the only place that needs updating when a new
// icon name is introduced at a call site — see Icon in ./bootstrap-components.js.
//
// Each icon is imported from its own module (@phosphor-icons/react/dist/csr/<Name>)
// rather than the package's barrel export. The barrel re-exports all ~1500 icons from
// a single index.es.js, and webpack 4's dev-mode build (this app never runs webpack
// in production mode, see webpack.config.js) can't tree-shake that away — importing
// the barrel pulled the whole icon set into every entry chunk (+15MB each). Deep
// imports pull in only the handful of icons actually used.
import {ArrowClockwise} from '@phosphor-icons/react/dist/csr/ArrowClockwise.es.js';
import {ArrowsClockwise} from '@phosphor-icons/react/dist/csr/ArrowsClockwise.es.js';
import {ArrowsIn} from '@phosphor-icons/react/dist/csr/ArrowsIn.es.js';
import {ArrowsOut} from '@phosphor-icons/react/dist/csr/ArrowsOut.es.js';
import {At} from '@phosphor-icons/react/dist/csr/At.es.js';
import {Bell} from '@phosphor-icons/react/dist/csr/Bell.es.js';
import {Broadcast} from '@phosphor-icons/react/dist/csr/Broadcast.es.js';
import {Buildings} from '@phosphor-icons/react/dist/csr/Buildings.es.js';
import {Calendar} from '@phosphor-icons/react/dist/csr/Calendar.es.js';
import {CaretDown} from '@phosphor-icons/react/dist/csr/CaretDown.es.js';
import {CaretLeft} from '@phosphor-icons/react/dist/csr/CaretLeft.es.js';
import {CaretRight} from '@phosphor-icons/react/dist/csr/CaretRight.es.js';
import {CaretUp} from '@phosphor-icons/react/dist/csr/CaretUp.es.js';
import {ChartBar} from '@phosphor-icons/react/dist/csr/ChartBar.es.js';
import {ChartLine} from '@phosphor-icons/react/dist/csr/ChartLine.es.js';
import {Check} from '@phosphor-icons/react/dist/csr/Check.es.js';
import {CheckCircle} from '@phosphor-icons/react/dist/csr/CheckCircle.es.js';
import {ClipboardText} from '@phosphor-icons/react/dist/csr/ClipboardText.es.js';
import {Copy} from '@phosphor-icons/react/dist/csr/Copy.es.js';
import {DownloadSimple} from '@phosphor-icons/react/dist/csr/DownloadSimple.es.js';
import {Envelope} from '@phosphor-icons/react/dist/csr/Envelope.es.js';
import {Eye} from '@phosphor-icons/react/dist/csr/Eye.es.js';
import {EyeSlash} from '@phosphor-icons/react/dist/csr/EyeSlash.es.js';
import {FileArrowDown} from '@phosphor-icons/react/dist/csr/FileArrowDown.es.js';
import {FileCode} from '@phosphor-icons/react/dist/csr/FileCode.es.js';
import {FileCsv} from '@phosphor-icons/react/dist/csr/FileCsv.es.js';
import {FileText} from '@phosphor-icons/react/dist/csr/FileText.es.js';
import {FloppyDisk} from '@phosphor-icons/react/dist/csr/FloppyDisk.es.js';
import {Gear} from '@phosphor-icons/react/dist/csr/Gear.es.js';
import {HardDrive} from '@phosphor-icons/react/dist/csr/HardDrive.es.js';
import {Hourglass} from '@phosphor-icons/react/dist/csr/Hourglass.es.js';
import {LinkSimple} from '@phosphor-icons/react/dist/csr/LinkSimple.es.js';
import {List} from '@phosphor-icons/react/dist/csr/List.es.js';
import {MagnifyingGlassPlus} from '@phosphor-icons/react/dist/csr/MagnifyingGlassPlus.es.js';
import {Moon} from '@phosphor-icons/react/dist/csr/Moon.es.js';
import {Paperclip} from '@phosphor-icons/react/dist/csr/Paperclip.es.js';
import {PaperPlaneTilt} from '@phosphor-icons/react/dist/csr/PaperPlaneTilt.es.js';
import {Pause} from '@phosphor-icons/react/dist/csr/Pause.es.js';
import {PencilSimple} from '@phosphor-icons/react/dist/csr/PencilSimple.es.js';
import {Play} from '@phosphor-icons/react/dist/csr/Play.es.js';
import {Plus} from '@phosphor-icons/react/dist/csr/Plus.es.js';
import {Power} from '@phosphor-icons/react/dist/csr/Power.es.js';
import {Prohibit} from '@phosphor-icons/react/dist/csr/Prohibit.es.js';
import {RadioButton} from '@phosphor-icons/react/dist/csr/RadioButton.es.js';
import {Rows} from '@phosphor-icons/react/dist/csr/Rows.es.js';
import {ShareNetwork} from '@phosphor-icons/react/dist/csr/ShareNetwork.es.js';
import {SignOut} from '@phosphor-icons/react/dist/csr/SignOut.es.js';
import {SquaresFour} from '@phosphor-icons/react/dist/csr/SquaresFour.es.js';
import {Stop} from '@phosphor-icons/react/dist/csr/Stop.es.js';
import {Sun} from '@phosphor-icons/react/dist/csr/Sun.es.js';
import {Tag} from '@phosphor-icons/react/dist/csr/Tag.es.js';
import {ThumbsDown} from '@phosphor-icons/react/dist/csr/ThumbsDown.es.js';
import {Trash} from '@phosphor-icons/react/dist/csr/Trash.es.js';
import {TextAlignCenter} from '@phosphor-icons/react/dist/csr/TextAlignCenter.es.js';
import {Monitor} from '@phosphor-icons/react/dist/csr/Monitor.es.js';
import {Tray} from '@phosphor-icons/react/dist/csr/Tray.es.js';
import {UploadSimple} from '@phosphor-icons/react/dist/csr/UploadSimple.es.js';
import {User} from '@phosphor-icons/react/dist/csr/User.es.js';
import {X} from '@phosphor-icons/react/dist/csr/X.es.js';

export const iconMap = {
    'align-center': TextAlignCenter,
    'at': At,
    'ban': Prohibit,
    'bell': Bell,
    'broadcast-tower': Broadcast,
    'building': Buildings,
    'calendar-alt': Calendar,
    'chart-bar': ChartBar,
    'chart-line': ChartLine,
    'check': Check,
    'check-circle': CheckCircle,
    'chevron-down': CaretDown,
    'chevron-left': CaretLeft,
    'chevron-right': CaretRight,
    'chevron-up': CaretUp,
    'clipboard-list': ClipboardText,
    'clone': Copy,
    'cog': Gear,
    'dot-circle': RadioButton,
    'download': DownloadSimple,
    'edit': PencilSimple,
    'envelope': Envelope,
    'eye': Eye,
    'eye-slash': EyeSlash,
    'file-alt': FileText,
    'file-code': FileCode,
    'file-csv': FileCsv,
    'file-download': FileArrowDown,
    'file-import': UploadSimple,
    'floppy-disk': FloppyDisk,
    'hdd': HardDrive,
    'hourglass': Hourglass,
    'inbox': Tray,
    'link': LinkSimple,
    'list': List,
    'moon': Moon,
    'paper-plane': PaperPlaneTilt,
    'paperclip': Paperclip,
    'pause': Pause,
    'play': Play,
    'plus': Plus,
    'power-off': Power,
    'redo': ArrowClockwise,
    'repeat': ArrowClockwise,
    'save': FloppyDisk,
    'search-plus': MagnifyingGlassPlus,
    'share': ShareNetwork,
    'share-square': ShareNetwork,
    'sign-out-alt': SignOut,
    'signal': ChartLine,
    'stop': Stop,
    'sun': Sun,
    'sync-alt': ArrowsClockwise,
    'tags': Tag,
    'th-large': SquaresFour,
    'th-list': Rows,
    'thumbs-down': ThumbsDown,
    'times': X,
    'trash-alt': Trash,
    'tv': Monitor,
    'user': User,
    'window-close': ArrowsIn,
    'window-maximize': ArrowsOut
};
