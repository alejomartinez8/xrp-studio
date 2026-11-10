// Copyright (c) Experiential Inc. and other XRP contributors.
// Open Source Software; you can modify and share it under the terms of the
// GNU General Public License v.3.
// See https://www.gnu.org/licenses/
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the GNU General Public License for more details.
export class Constants {
    static readonly APP_VERSION = '2.1.0';
    static readonly EDITOR_TABSET_ID = 'editorTabSetId';
    static readonly SHELL_TABSET_ID = 'shellTabSetId';
    static readonly SHELL_TAB_ID = 'shellTabId';
    static readonly FOLDER_TAB_ID = 'folderTabId';
    static readonly AI_CHAT_TAB_ID = 'aiChatTabId';
    static readonly DASHBOARD_TAB_ID = 'dashboardTabId';
    static readonly DEFAULT_FONTSIZE = 14;
    static readonly TRASH_FOLDER = '/trash';
    static readonly SHOW_CHANGELOG = 'show-changelog';
    static readonly SHOW_PROGRESS = 'show-progress';
    static readonly ADMIN_FILE = 'admin.json';
    static readonly GUSERS_FOLDER = '/gusers/';
    static readonly XRPCODE = 'XRPCode';
    static readonly XRPCODE_BACKUP = 'XRPCodeBackup';
    static readonly LIBDIR = '/lib/';
    static readonly CONNECTED = "Connected";
    static readonly DISCONNECTED = "Disconnected";
    static readonly REGEX_FILENAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9 ._-]*[a-zA-Z0-9])?\.[a-zA-Z0-9_-]+$/;
    static readonly REGEX_DIRNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9 _-]*[a-zA-Z0-9])?$/;
    static readonly XRP_PROCESSOR_BETA = "RPI-RP2"
    static readonly LASTSAVETIME_CONFG = '1';
    static readonly XRP_ROOT_FOLDER = '/';
}

export class FlowBiteConstants {
    static readonly DropdownTheme = {
        // Default Tailwind white/gray utilities are not in this project's palette,
        // so Flowbite's stock menu background never applies and the list is see-through.
        floating: {
            base: 'z-2000 w-fit rounded-lg border border-mountain-mist-200 bg-mountain-mist-50 shadow-lg focus:outline-hidden dark:border-shark-600 dark:bg-shark-900',
            style: {
                dark: 'bg-shark-900 text-shark-50',
                light: 'border border-mountain-mist-200 bg-mountain-mist-50 text-shark-900',
                auto: 'border border-mountain-mist-200 bg-mountain-mist-50 text-shark-900 dark:border-shark-600 dark:bg-shark-900 dark:text-shark-50',
            },
            item: {
                base: 'flex w-full cursor-pointer items-center justify-start bg-mountain-mist-50 px-4 py-2 text-sm text-shark-800 hover:bg-mountain-mist-200 focus:bg-mountain-mist-200 focus:outline-hidden dark:bg-shark-900 dark:text-shark-50 dark:hover:bg-shark-700 dark:focus:bg-shark-700',
            },
        },
        inlineWrapper: 'text-white bg-shark-200 hover:bg-curious-blue-300 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-shark-600 dark:hover:bg-shark-500 dark:focus:ring-blue-800',
  };
}