/*
============================================================================
# mpv uosc 字幕文本浏览脚本
https://github.com/ewt45/mpv_view_sub_texts \
![ezgif-40eadd3fe9cb4f5d.avif](https://files.seeusercontent.com/2026/07/22/zMx8/ezgif-40eadd3fe9cb4f5d.avif) \
在 mpv 中使用 uosc 菜单列出字幕轨道，点击可显示全部文本，支持搜索，复制，保存文件和点击跳转。 
对于播放器设置的首选字幕轨道，显示其内容时会同步高亮当前行。
- 平台：Linux
- 界面语言：英文，中文。（根据环境变量 `LANG` 决定）
- 依赖：ffmpeg, uosc
- 支持字幕格式：srt, ass.

## 使用方式
1. 确保已安装并启用了 `uosc`。
2. 将 `view_sub_texts.js` 放到 mpv 的脚本目录。注意 flatpak 版在 `~/.var/app/io.mpv.Mpv`.
3. 快捷键绑定：在 `input.conf` 中  
   `Ctrl+S script-binding view_sub_texts/show_sub_tracks` (大写 S 表示 shift + s)

   uosc 底部按钮：在 `script-opts/uosc.conf` 的 `controls=` 中  
      `controls=....,gap,button:view_sub_texts,......`

4. 在 mpv 中播放视频后，点击按钮或快捷键即可弹出字幕轨道列表。

5. 出现问题时，可以从终端启动 mpv 查看日志。  
   `flatpak run io.mpv.Mpv --v 视频.mkv`
============================================================================
 */

/*
mpv 文档，单页面：https://mpv.io/manual/master
javascript 脚本（大部分参考上面 Lua 脚本）：https://mpv.io/manual/master/#javascript
几种字幕格式：https://www.quicklrc.com/subtitle-formats
ass 字幕格式规范：https://github.com/weizhenye/ASS/wiki/ASS-字幕格式规范


# 向外暴露自身
1. 向 mpv 范围内导出一个名称，可以通过 mpv 的 command 使用，或 input.conf 中绑定快捷键。
`mp.add_key_binding(null, SCRIPT_CMD_SHOW_SUBTITLE_TRACKS, showSubTracksMenu);`
在 input.conf 中绑定：`Ctrl+S script-binding 脚本名/命令名称`。注意大写 S 表示 shift + s.

2. 向 uosc 的底部控制条导出一个按钮名称，这样用户后续可以手动向 script-opts/usoc.conf 中添加按钮 `button:自定义名称` 而不用写一长串了。
https://github.com/tomasklaen/uosc/wiki#set-button-name-data_json
`mp.commandv('script-message-to', 'uosc', 'set-button', 'btn-name', JSON.stringify({配置});`

3. 在外部调用自身命令
`mp.commandv('script-message-to', 脚本名, '命令名称);`


# 从 mp 获取属性：
可以通过 mp.get_property_ 获取的属性：https://mpv.io/manual/master/#property-list 。
另外 options(https://mpv.io/manual/master/#options) 也可以作为属性获取，
但有一些区别： https://mpv.io/manual/master/#inconsistencies-between-options-and-properties

mp.observe_property 监听属性变化？

注意 track-list/N/id 和 track-list/N/src-id 有区别。前者是 mpv 分配的，后者是源文件里的，可能没有。


# 执行外部二进制文件
    r = mp.command_native({
        name: "subprocess",
        args: ["ffmpeg", "-help"],
        playback_only: true, // 没有视频在播放了就结束
        capture_stdout : true, // 如果设置为 true, 不会直接输出而是保存到 r.stdout 中。
        apture_stderr : true,

    })
    if (r) {
        // print("r.stdout: " + r.stdout) // 没管 stderr
    }

经过测试，flatpak 的 mpv 也可以获取到外部文件例如 ffmpeg. flathub 标注了这个程序可以获取全部文件。


# uosc 菜单的使用 https://github.com/tomasklaen/uosc/wiki/Menu-API#callback-mode
1. 使用 open-menu 显示菜单，传入 menu
    mp.commandv('script-message-to', 'uosc', 'open-menu', JSON.stringify(menu))
2. menu.callback 指定回调，然后注册菜单事件监听回调
    mp.register_script_message('menu-event', function (jsonStr) {...})
3. 显示按钮（action）
    menu.item_actions 指定所有 item 的按钮，或 item.actions 指定单个 item 的按钮。
    同样使用回调模式，回调中 event.action 为 item 中指定的 action.name.
    图标使用 https://fonts.google.com/icons 中的名称，小写 + 下划线连接。
4. 特殊图标： spinner. 可以用于显示‘加载中’占位项
5. 使用 update-menu 更新菜单内容。同样将 menu 转为 json 传入，注意保持 menu.type 一致。
6. 子菜单
    如果 menu.items 的项不是 Item 而是 Submenu，即指定 {.items} 而不是 {.value}，
    那么点击会在右侧显示子菜单，原菜单左移。
    但是这种方法点击子菜单时没有回调，所以没法用于点击子菜单后立即更新内容，只能点击子菜单再点击子菜单中的选项触发更新。
7. 多行文本
    单个 Item 高度固定，多行文字显示不全。可以拆分成多个 Item, 并设置最后一个 item.separator = true. 
    这样看起来像在一行。不过 action 还是按单个 Item 来的所以注意给每个 Item 设置相同的完整 value.



# 注意事项
- 出现意外情况时, throw new Error("")。 在最外层函数（一般是注册的回调）捕捉并调用 showError 输出 + 显示。
- mpv 使用 MuJS 引擎，只支持 ES5 标准。


# TODO
- 测试 srt,ass 以外的格式

- 图片字幕能否想办法加载图片(dvd_subtitle / hdmv_pgs_subtitle)。
    似乎有两个用于绘制图片或 ass，但没法通过 uosc 显示了 https://mpv.io/manual/master/#command-interface-overlay-add

- 加载速度优化？

- 初始时自动编辑 uosc.conf 加入 uosc 按钮？
- mpv user script 添加 'based on uosc',

- 字幕同步滚动：可能打乱用户操作，所以提供选项可以开启，默认关闭。
    实现方案：
    1. uosc.selectMenuItem() 仅支持键盘控制。 
    2. uosc.openMenu() + menu.selected_index. 相当于每次重新打开，还没试过


*/

var SCRIPT_NAME = mp.get_script_name(); // "view_sub_texts"
var SCRIPT_CMD_SHOW_SUBTITLE_TRACKS = "show_sub_tracks";
var SCRIPT_CMD_SHOW_SUBTITLE_CONTENT = "show_sub_content";
var SCRIPT_UOSC_BTN_SHOW_SUBTITLE_TRACKS = "view_sub_texts"
var SCRIPT_UOSC_MENU_ID_SELECT_TRACK = "Select Track"
var SCRIPT_UOSC_MENU_ID_SUB_LINES = "Display Content"
var SCRIPT_UOSC_MENU_ID_GENERAL_DIALOG = "General Dialog"

/** 支持的字幕编码格式. 属性名为 codec, 对应的值为文件后缀 */
var SUPPORTED_CODECS = { subrip: '.srt', ass: '.ass' }

/** 是否为 flatpak 环境 */
var isFlatpak = mp.utils.getenv('FLATPAK_ID') // 'io.mpv.Mpv'

/** 
 * @type {{rawText: string, srtText: string, subLines: SubLine[]}} 
 * 用于存储字幕内容。rawText 为原始格式文本， srtText 为转为 srt 格式后的文本。lines 为每行字幕信息。
 */
var subText = { rawText: '', srtText: '', subLines: [] }

/** mp 内置函数。以及自己的扩展。 */
var mp = mp || {}

/** 用于 ffmpeg 相关操作。 */
var ffmpeg = ffmpeg || {}

/** 用于 uosc 相关操作。 */
var uosc = uosc || {}


// #region i18n 文本

/** 支持多语言的文本。 */
var istr = {
    finish: '完成',
    error: '错误',
    selectTrack: '选择一个字幕轨道以浏览其内容',
    ok: '确定',
    saveSubFile: '导出字幕文件到视频目录',
    copySubAllToClipboard: '复制全部字幕文本到剪切板',
    copyToClipboard: '复制内容到剪切板',
    openFileDir: '打开文件所在目录',
    seekTime: '跳转至当前时间',
    viewSubText: '浏览字幕文本',
    copied: '已复制到剪切板。',
    subprocessFailed: '子进程执行失败！',
    formatUnsupported: '不支持的编码格式: ',
    videoPathNotFound: '无法获取视频本地路径',
    subTrackNotFound: '无法获取该字幕轨道',
    savedToVideoDir: '已成功保存至视频同目录: ',
    noPermissionAndCopied: '由于没有文件写入权限，已将文本复制到剪切板。',
    noSubtrack: '没有字幕轨道。请尝试其他视频文件或添加外部字幕文件。',
    supportFormat: '支持编码格式: ',
    externalHint: '外部文件',
    unsupportedHint: '不支持此格式',
    typeToSearch: '(输入以进行搜索)',
    loading: '正在加载中...',
    noTextParsed: '解析失败：未能从该轨道提取出有效文本',
    fastScrollHint: '当行数较多时，可以用 PageUp/PageDown 快速滚动。',

}

var systemLang = mp.utils.getenv('LANG')
if (systemLang && systemLang.indexOf('zh') === 0) { }
else {
    istr.finish = 'Finished'
    istr.error = 'Error'
    istr.selectTrack = 'Select a track to view its content'
    istr.ok = 'Ok'
    istr.saveSubFile = 'Save as file'
    istr.copySubAllToClipboard = 'Copy all to clipboard'
    istr.copyToClipboard = 'Copy content to clipboard'
    istr.openFileDir = 'Open directory'
    istr.seekTime = 'Jump to the start time of this line'
    istr.viewSubText = 'View sub text'
    istr.copied = 'Copied to clipboard.'
    istr.subprocessFailed = 'Subprocess failed!'
    istr.formatUnsupported = 'Format unsupported: '
    istr.videoPathNotFound = 'Cannot find video local path'
    istr.subTrackNotFound = 'Cannot find the sub track'
    istr.savedToVideoDir = 'Saved to video dir: '
    istr.noPermissionAndCopied = 'There is no write permission, so content is copied to clipboard.'
    istr.noSubtrack = 'No subtitle track. Please try other videos or add external subtitle files.'
    istr.supportFormat = 'Supported format: '
    istr.externalHint = 'external'
    istr.unsupportedHint = 'unsupported'
    istr.typeToSearch = '(Type to search)'
    istr.loading = 'Loading...'
    istr.noTextParsed = 'Parsing failed. No valid text in this track.'
    istr.fastScrollHint = 'Press PageUp/PageDown to fast scroll if there are too many lines.'
}

// #endregion



// #region 类型定义


/**
 * 
 * @typedef {Object}    SubTrackInfo    一个字幕轨道的信息
 * @property {number}   id          mpv 为其分配的轨道 id, 在一个类型（如字幕）中应该唯一。
 * @property {boolean}  selected    是否为当前显示的字幕轨道
 * @property {number}   ffIndex     通常用于 ffmpeg 的 stream index. 如果 demuxer 不是 libavformat 该值可能错误。mkv 一般正确。
 * @property {string}   title       标题
 * @property {string}   lang        语言
 * @property {boolean}  external    是否为外部文件
 * @property {string | undefined} externalFilename 外部文件名
 * @property {string}   codec       编码类型
 */


/**
 * @typedef {Object}    SubLine     字幕文件中的一条字幕
 * @property {number}   startTime   起始时间，单位秒
 * @property {number}   endTime     结束时间，单位秒
 * @property {string}   text        字幕文本
 * @property {number}   splitCount  （按行）拆分成了几个 item
 * @property {number}   [itemIndex] 在 menu.items 中的 index. 便于选中特定时间的那一行
 */

/**
 * @typedef {('copy' | 'ok' | 'open-dir')}  TextDialogButton 用于 uosc.showText 时显示的按钮类型
 */


// uosc 定义的

/**
 * @typedef {Object}                        MenuBase
 * @property {string}                       [title]
 * @property {Child[]}                      items
 * @property {number }                      [selected_index]
 * @property {boolean}                      [keep_open]
 * @property {string}                       [footnote]
 * @property {string}                       [id]  Default IDs look like `{root} > Submenu title`. You can overwrite it with this.
 * @property {'callback' 
 *              | string | string[]}        [on_search]
 * @property {'callback'
 *              | string | string[]}        [on_paste]
 * @property {'callback' 
 *              | string | string[]}        [on_move]
 * @property {'on_demand' 
 *              | 'palette' | 'disabled'}   [search_style]
 * @property {'submit' | number}            [search_debounce]
 * @property {string}                       [search_suggestion]
 * @property {boolean}                      [search_submenus]
 * @property {Action[]}                     [item_actions]
 * @property {'inside' | 'outside}          [item_actions_place]
 */

/**
 * @typedef {Object}                        MenuExt
 * @property {string}                       [type]
 * @property {boolean}                      [search_submit]
 * @property {'callback' 
 *              | string | string[]}        [on_close]
 * @property {string[]}                     [callback]
 * @property {string[]}                     [bind_keys] 
 */

/**
 * @typedef {Object}                        SubmenuExt
 * @property {string}                       [hint]
 * @property {boolean}                      [bold]
 * @property {boolean}                      [italic]
 * @property {'left' | 'center' | 'right'}  [align]
 * @property {boolean}                      [muted]
 * @property {boolean}                      [separator]
 */


/**
 * @typedef {Object}                        Item
 * @property {string}                       [title]
 * @property {string}                       [hint]
 * @property {string}                       [icon]
 * @property {string|string[]}              value
 * @property {number}                       [active]
 * @property {boolean}                      [selectable]    颜色不变，但不可点击
 * @property {boolean}                      [bold]
 * @property {boolean}                      [italic]
 * @property {'left'|'center'|'right'}      [align]
 * @property {boolean}                      [muted]         颜色变浅，但仍可点击
 * @property {boolean}                      [separator]     是否在自己底部显示分隔线
 * @property {boolean}                      [keep_open]
 * @property {Action[]}                     [actions]
 * @property {'inside'|'outside'}           [actions_place]
 */

/**
 * @typedef {Object}                        Action
 * @property {string}                       name
 * @property {string}                       icon
 * @property {string}                       [label]
 * @property {boolean}                      [filter_hidden]
 */

/** @typedef {MenuBase & MenuExt} Menu */

/** @typedef {MenuBase & SubmenuExt} Submenu */

/** @typedef {Item|Submenu} Child */


// mpv 定义的

/** 
 * @typedef {Object}    SubprocessResult   mp.command 执行 subprocess 的返回结果
 * @property {string}   error_string
 * @property {boolean}  killed_by_us
 * @property {number}   status
 * @property {string}   stderr
 * @property {string}   stdout
 */

/**
 * @callback    MpPropertyChangeCallback
 * @param {string}  name    属性名
 * @param {*}       value   当前的值，为 mp.get_property_<type> 取得
 */

/**
 * @typedef     {Object} MpProperty                 mp 的属性
 * @property    {MpPropertyChangeCallback} [_currentCallback]
 * @property    {(callback: MpPropertyChangeCallback) => void} startObserve 开始监听该属性。不能重复监听。
 * @property    {() => void}            stopObserve 停止监听该属性
 * @property    {(default: any) => any} get         获取该属性当前的值
 */

// #endregion



// #region 工具函数
// ----------------------------------------------------------------------------
// 工具函数
// ----------------------------------------------------------------------------


/** 创建一个 mp 属性.@returns {MpProperty} */
mp.createMpProperty = function (name) {
    return {
        _currentCallback: null,
        get: function (def) { return mp.get_property_native(name, def) },
        startObserve: function (callback) {
            if (this.currentCallback) { throw new Error("请先取消上一次的监听", this.currentCallback); }
            this.currentCallback = runCatchingFunc(callback)
            mp.observe_property(name, 'native', this.currentCallback)
        },
        stopObserve: function () {
            if (this.currentCallback) { mp.unobserve_property(this.currentCallback) }
            this.currentCallback = null
        },

    }
}


/** mp 属性 (number)，表示当前正在显示字幕的起始时间。若当前没有显示字幕为 null. */
mp.subStart = mp.createMpProperty('sub-start')
mp.userData = {}
mp.userData.uosc = {}
/** mp 属性 (string)，表示当前 uosc 正在显示的 menu.type, 没有则为 null. */
mp.userData.uosc.menuType = mp.createMpProperty('user-data/uosc/menu/type')
/** mp 属性 (string), 表示当前视频文件路径。 */
mp.path = mp.createMpProperty('path')
/** mp 属性 (sring), 文件名（不包含文件夹路径）*/
mp.filename = mp.createMpProperty('filename')
/** mp 属性 (string), 文件名去掉后缀 */
mp.filename.noExt = mp.createMpProperty('filename/no-ext')
/** mp 属性 (Object[]), 轨道列表 */
mp.trackList = mp.createMpProperty('track-list')
/** mp 属性 (number), 当前选中的字幕轨道 id */
mp.sid = mp.createMpProperty('sid')
/** mp 属性 (number)， 当前播放时间，单位：秒 */
mp.timePos = mp.createMpProperty('time-pos')

/** 
 * 复制文本到剪切板.
 * @param {boolean} [notify=true] 为 true 时显示菜单框提示已复制，会关闭当前菜单。默认为 true.
 */
mp.copyToClipboard = function (text, notify) {
    if (!text) return
    mp.set_property("clipboard/text", text);
    var notify = (notify === undefined) ? true : notify;
    if (notify) uosc.showText(istr.finish, istr.copied, ['ok']);
}

// 显示消息在 mpv 左上角
mp.showText = function (text, duration) { mp.commandv('show-text', text, (duration || 2000).toString()); }

/** 打印某个对象的内容 */
mp.dump = function () { dump(arguments) }

/** 
 * 启动子进程执行某个命令。执行失败时抛出异常。
 * @param {string[]} cmd 要执行的命令
 * @param {string} [stdin_data] 要作为新进程的 stdin 的内容。
 * @returns {SubprocessResult} 
 */
mp.commandSubprocess = function (cmd, stdin_data) {
    /** @type {SubprocessResult} */
    var mpCommand = {
        name: "subprocess",
        playback_only: true, // 没有视频在播放了就结束
        capture_stdout: true, // 如果设置为 true, 不会直接输出而是保存到 r.stdout 中。
        capture_stderr: true,
        // capture_size: 64 * 1024 * 1024, 返回的 stdout/stderr 上限大小，默认 64MB
        args: cmd,
    }
    if (stdin_data) mpCommand.stdin_data = stdin_data
    var res = mp.command_native(mpCommand);

    if (!res) throw new Error(istr.subprocessFailed + '\n' + cmd + '\n');
    if (res.status !== 0) throw new Error(istr.subprocessFailed + "\n" + cmd + "\n\nerror_string: " + res.error_string + "\n\nstderr: " + res.stderr);
    return res
}

/** 跳转至指定时间。@param {number} time 时间点，单位秒 */
mp.seekAbsolute = function (time) { mp.commandv("seek", time, "absolute"); }


/**
 * 显示一个菜单。
 * @param {Menu}    menu            菜单数据
 * @param {string}  [submenuId]     子菜单 id, 如 'Tools > Aspect ratio'
 */
uosc.openMenu = function (menu, submenuId) {
    if (submenuId) mp.commandv('script-message-to', 'uosc', 'open-menu', JSON.stringify(menu), submenuId);
    else mp.commandv('script-message-to', 'uosc', 'open-menu', JSON.stringify(menu));
}

/** 更新一个已显示的菜单. 注意确保 menu.type 一致。 */
uosc.updateMenu = function (menu) { mp.commandv('script-message-to', 'uosc', 'update-menu', JSON.stringify(menu)); }
uosc.closeMenu = function () { mp.commandv('script-message-to', 'uosc', 'close-menu') }

/** 选中 item 并滚动到其位置. 当使用鼠标而非键盘时无效果。 @param {number} itemIndex item 对应索引 + 1 */
uosc.selectMenuItem = function (menuType, itemIndex) { mp.commandv('script-message-to', 'uosc', 'select-menu-item', menuType, itemIndex) }

/** 设置 uosc 底部控制条的按钮。 */
uosc.setButton = function (btnName, btnData) { mp.commandv('script-message-to', 'uosc', 'set-button', btnName, JSON.stringify(btnData)); }

uosc.showInDirectory = function (filepath) { mp.commandv('script-message-to', 'uosc', 'show-in-directory', filepath); }

/** 向 mp 注册一个消息监听，作为 uosc 菜单的回调。自动为回调包裹 try-catch. */
uosc.registerMenuCallback = function (name, func) { mp.register_script_message(name, runCatchingFunc(func)) }

/** 向 mp 注册一个消息监听，当 uosc 初始化时接收 uosc 版本号。 */
uosc.registerOnInitialized = function (func) { mp.register_script_message('uosc-version', func) }

/** 
 * 显示一个 uosc 菜单，展示文字。用户无法再对原窗口继续操作。若文字有多行则显示到多个 item 上。第一个 item 为复制文本。
 * @param {string}  title       菜单标题
 * @param {string}  text        要显示的文字
 * @param {TextDialogButton[]} [button] 要显示的按钮. 复制到剪切板/确定/打开文件所在目录。
 * @param {string}  [filepath]  如果 button 包含 'open-dir', 该参数为对应的文件路径
 */
uosc.showText = function (title, text, button, filepath) {
    /** @type {Menu} */
    var menu = {
        id: SCRIPT_UOSC_MENU_ID_GENERAL_DIALOG,
        title: title,
        callback: [SCRIPT_NAME, 'vst_text_dialog_menu_callback'],
        items: [],
    };

    var itemLines = text.split('\n')
    for (var i = 0; i < itemLines.length; i++) {
        menu.items.push({ title: itemLines[i], selectable: false })
    }

    if (itemLines.length > 0) menu.items[menu.items.length - 1].separator = true

    if (Array.isArray(button) && button.indexOf('copy') !== -1) {
        menu.items.push({ title: istr.copyToClipboard, value: JSON.stringify({ button: 'copy', value: text }), align: 'center', bold: true, italic: true, separator: true, });
    }
    if (Array.isArray(button) && button.indexOf('open-dir') !== -1) {
        if (!filepath) throw new Error('指定 open-dir 时请传入文件路径')
        menu.items.push({ title: istr.openFileDir, value: JSON.stringify({ button: 'open-dir', value: filepath }), align: 'center', bold: true, italic: true, separator: true, });
    }
    if (Array.isArray(button) && button.indexOf('ok') !== -1) {
        menu.items.push({ title: istr.ok, value: JSON.stringify({ button: 'ok', value: text }), align: 'center', bold: true, separator: true, });
    }

    if (menu.items.length > 0) menu.selected_index = menu.items.length

    uosc.openMenu(menu)
    uosc.registerMenuCallback('vst_text_dialog_menu_callback', function (jsonStr) {
        var event = parseJson(jsonStr);
        if (event && event.type == 'activate') {
            /** @type {{button: TextDialogButton, value: string}} */
            var data = parseJson(event.value);
            if (data.button === 'copy') {
                mp.copyToClipboard(data.value);
            } else if (data.button === 'open-dir') {
                uosc.showInDirectory(data.value)
            }
            uosc.closeMenu()
        }
    })
}

/** 
 * 显示一个新窗口显示报错信息。用户无法再对原窗口继续操作。
 * @param {Error} err 
 * @param {TextDialogButton[]} button 参考 uosc.showText
 */
uosc.showError = function (err, button) {
    var formatErrStr = err.stack ? err.stack : (err.name + ": " + err.message);
    print('showError:\n' + formatErrStr);
    uosc.showText(istr.error, formatErrStr, button);
}

/**
 * 提取指定视频文件中的字幕内容文本。
 * @param {string}  codec       字幕在原文件中的编码方式
 * @param {string}  filepath    视频文件路径
 * @param {number}  trackId     external = false 时，字幕对应的轨道
 * @returns {string}
 */
ffmpeg.extractSubTrackFromVideo = function (codec, filepath, trackId) {
    var outFormat = SUPPORTED_CODECS[codec]
    if (!outFormat) throw new Error(istr.formatUnsupported + codec)
    var res = mp.commandSubprocess(['ffmpeg', '-y', '-v', 'quiet', '-i', filepath, '-map', '0:' + trackId, '-f', outFormat.slice(1), '-'])
    return res.stdout
}

/** 将给定字幕文本转换为 srt 格式的字幕文本。@returns {string} */
ffmpeg.formatSubToSrt = function (subText) {
    var res = mp.commandSubprocess(['ffmpeg', '-y', '-v', 'quiet', '-i', 'pipe:', '-f', 'srt', '-'], subText)
    return res.stdout
}

/** 为函数包裹 try catch。@returns {() => any} 返回一个函数而非直接执行。需要手动调用执行。 */
function runCatchingFunc(func) {
    return function () {
        try { return func.apply(this, arguments) }
        catch (err) {
            uosc.showError(err, ['copy', 'ok'])
            return undefined
        }
    }
}

/** 返回当前时间对应正在或即将显示的 subLine @param {SubLine[]} subLines @param {number} currTimePos @returns {SubLine|null} */
function findSelectedSubLine(subLines, currTimePos) {
    for (var i = 0; i < subLines.length; i++) {
        if (subLines[i].endTime > currTimePos) { return subLines[i] }
    }
    return null
}


/** 包括 try catch 的 JSON.parse */
function parseJson(jsonStr) {
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        print("json.parse 时出现错误：" + e);
        return null;
    }
}

/** 
 * 补零工具函数 
 * @param {number} num 要补零的数字 
 * @param {number} len 目标字符串长度 
 * @returns {string} 
 */
function padZero(num, len) {
    var str = num.toString();
    while (str.length < len) { str = '0' + str; }
    return str;
}

/**
 * 将秒数 (float) 格式化为 HH:MM:SS.sss 字符串
 * @param {number} seconds 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTimeFloat(seconds) {
    // 四舍五入到毫秒，避免浮点数精度误差导致进位错误
    var totalMs = Math.round(seconds * 1000);
    if (isNaN(totalMs) || totalMs < 0) totalMs = 0;

    var ms = totalMs % 1000;
    var totalSecs = Math.floor(totalMs / 1000);
    var secs = totalSecs % 60;
    var totalMins = Math.floor(totalSecs / 60);
    var mins = totalMins % 60;
    var hours = Math.floor(totalMins / 60);

    return padZero(hours, 2) + ':' +
        padZero(mins, 2) + ':' +
        padZero(secs, 2) + '.' +
        padZero(ms, 3);
}

// 解析时间戳（支持 HH:MM:SS,mmm 和 MM:SS.mmm 等格式）
function parseTimeStr(time_str) {
    var match = time_str.match(/^(\d+):(\d+):(\d+)[,.](\d+)/);
    if (match) return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10) + parseFloat('0.' + match[4]);

    match = time_str.match(/^(\d+):(\d+)[,.](\d+)/);
    if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10) + parseFloat('0.' + match[3]);

    return null;
}

// 清理字幕中的 HTML 标签和 ASS 样式特效代码
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\\[Nn]/g, '\n') // ass 中换行
        .replace(/<[^>]*>|\{[^}]*\}/g, '') // 移除 <xxx> 标签和 {\xxx} 样式
        .replace(/\r/g, '')
        .trim();
}

/** 安全读取本地文本文件。 @returns {string | null} */
function readFile(path) {
    try { return mp.utils.read_file(path); }
    catch (e) {
        print(e)
        return null;
    }
}

/**
 * 将字幕原始文本内容保存到当前视频同目录下。命名：视频名称.语言.字幕格式后缀
 * @param {string} contentToSave 要保存的字符串内容
 * @param {SubTrackInfo} track 字幕轨道信息
 */
function saveSubToVideoDir(contentToSave, track) {
    var suffix = SUPPORTED_CODECS[track.codec]
    if (!suffix) throw new Error(istr.formatUnsupported + track.codec);

    // 获取当前视频路径
    var videoPath = mp.path.get()
    if (!videoPath || /^https?:\/\//i.test(videoPath) || videoPath.indexOf("bdmv://") === 0) throw new Error(istr.videoPathNotFound);

    // 去掉视频后缀
    var filename = mp.filename.get();
    var filenameNoExt = mp.filename.noExt.get();
    if (filename && filenameNoExt) {
        videoPath = videoPath.slice(0, filenameNoExt.length - filename.length);
    }

    // 写入文件（mpv 要求本地路径必须加 file:// 前缀）
    var targetFilePath = videoPath + '.' + track.lang + suffix;
    try {
        mp.utils.write_file("file://" + targetFilePath, contentToSave);
        uosc.showText(istr.finish, istr.savedToVideoDir + '\n' + targetFilePath, ['open-dir', 'ok'], targetFilePath);
    } catch (error) {
        // flatpak 限制了可写入的目录。没权限会报错 Cannot open (write) file。在这里改为复制到剪切板
        if (error.message.indexOf('Cannot open (write) file') !== -1) {
            mp.copyToClipboard(contentToSave);
            uosc.showText(istr.finish, istr.noPermissionAndCopied, ['ok']);
        } else {
            throw error;
        }
    }
}

/**
 * 提取出对应字幕轨道的文本内容。如果字幕为外部文件，则读取文件内容。如果字幕为内封流，则使用 ffmpeg 提取流内容。
 * @param {SubTrackInfo} track
 * @returns {string} 返回原始字幕文本
 */
function getRawTextOfSubTrack(track) {
    // 自带的 mp.read_file 只支持 utf-8, 导致带 bom 的 utf-16 无法正常读取。只能借助 ffmpeg 了。
    var filepath = !track.external ? mp.path.get() : track.externalFilename
    var ffIndex = !track.external ? track.ffIndex : 0
    if (!filepath) throw new Error(istr.videoPathNotFound);
    return ffmpeg.extractSubTrackFromVideo(track.codec, filepath, ffIndex)
}

/**
 * SRT / VTT 简易高效解析器
 * @param {string} rawText      字幕原始文本
 * @returns {SubLine[]}
 */
function parseSubripText(rawText) {
    if (!rawText) return [];
    /** @type {SubLine[]} */
    var lines = [];
    var rawLines = rawText.split(/\r?\n/);
    var currentStartTime = null;
    var currentEndTime = null;
    var currentTextLines = [];

    function flush() {
        if (currentStartTime !== null && currentEndTime !== null && currentTextLines.length > 0) {
            var text = currentTextLines.join("\n");
            text = cleanText(text);
            if (text !== "") {
                lines.push({ startTime: currentStartTime, endTime: currentEndTime, text: text });
            }
        }
        currentStartTime = null;
        currentEndTime = null;
        currentTextLines = [];
    }

    for (var i = 0; i < rawLines.length; i++) {
        var trimmed = rawLines[i].trim();

        // 匹配时间轴标志 -->
        var arrowIdx = trimmed.indexOf("-->");
        if (arrowIdx !== -1) {
            flush(); // 先提交上一个区块
            var startPart = trimmed.substring(0, arrowIdx).trim();
            var endPart = trimmed.substring(arrowIdx + 3).trim();
            var startSeconds = parseTimeStr(startPart);
            var endSeconds = parseTimeStr(endPart);
            if (startSeconds !== null && endSeconds !== null) {
                currentStartTime = startSeconds;
                currentEndTime = endSeconds;
            }
        } else if (trimmed === "") {
            flush(); // 空行意味着区块结束
        } else {
            // 过滤纯数字索引行，其余记为字幕文本
            if (currentStartTime !== null && !/^\d+$/.test(trimmed)) {
                currentTextLines.push(trimmed);
            }
        }
    }
    flush(); // 提交最后一个区块

    // 优化： ass 的特效字幕会导致多行相同内容不断重复。在这里合并。注意合并后修改 time_str
    var i = 0;
    while (i < lines.length - 1) {
        var nextLineIdx = i + 1
        var line = lines[i]
        var nextLine = lines[nextLineIdx]

        // 如果下一行与本行的起始结束时间、文本全部相同，直接删除下一行
        if (line.startTime === nextLine.startTime && line.endTime === nextLine.endTime && line.text === nextLine.text) {
            lines.splice(nextLineIdx, 1)
            continue
        }

        // 找到最近的下一行，满足 curr.end <== next.start. 如果 === 且文字也相等，则合并二者时间
        var laterLine = null
        for (; nextLineIdx < lines.length; nextLineIdx++) {
            var cand = lines[nextLineIdx]
            if (cand.startTime > line.endTime) { break; }
            if (cand.startTime === line.endTime && cand.text === line.text) { laterLine = cand; break; }
        }
        if (laterLine) {
            line.endTime = laterLine.endTime
            lines.splice(nextLineIdx, 1)
            continue
        }

        // 本行没有要合并的，处理下一行
        i++;
    }
    return lines;
}

/**
 * 获取当前视频的所有字幕轨道
 * @returns {SubTrackInfo[]}
 */
function getSubTracks() {
    var trackList = mp.trackList.get();
    var currentSubId = mp.sid.get(-1);
    /** @type {SubTrackInfo[]} */
    var subTracks = [];
    if (!trackList) return subTracks;

    for (var i = 0; i < trackList.length; i++) {
        var track = trackList[i];
        if (track.type === "sub") {
            subTracks.push({
                id: track.id,
                selected: track.id == currentSubId,
                ffIndex: track["ff-index"],
                title: track.title || ("Track " + track.id),
                lang: track.lang || "unknown",
                external: track.external,
                externalFilename: track["external-filename"],
                codec: track.codec
            });
        }
    }

    return subTracks;
}

// 根据 ID 寻找字幕轨道
function findTrackById(trackId) {
    var tracks = getSubTracks();
    for (var i = 0; i < tracks.length; i++) {
        if (tracks[i].id === trackId) {
            return tracks[i];
        }
    }
    return null;
}

// #endregion



// #region UI 交互与菜单展示
// ----------------------------------------------------------------------------
// UI 交互与菜单展示
// ----------------------------------------------------------------------------

// 第一步：展示字幕轨道列表菜单
function showSubTracksMenu() {
    runCatchingFunc(function () {
        var tracks = getSubTracks();
        if (tracks.length === 0) {
            uosc.showText('', istr.noSubtrack, ['ok']);
            return;
        }

        /** @type {Menu} 菜单。显示字幕轨道让用户选择。 */
        var menu = {
            id: SCRIPT_UOSC_MENU_ID_SELECT_TRACK,
            type: "sub_tracks_menu_type", // 用于 update-menu
            title: istr.selectTrack,
            footnote: istr.supportFormat + "subrip(.srt), ass",
            callback: [SCRIPT_NAME, 'vst_sub_tracks_menu_callback'],
            items: [],
        }

        for (var i = 0; i < tracks.length; i++) {
            var track = tracks[i];
            var supported = SUPPORTED_CODECS[track.codec] ? true : false;
            var hint = track.lang + ', ' + track.codec;
            if (track.external) hint += ', ' + istr.externalHint;
            if (!supported) hint += ', ' + istr.unsupportedHint;
            // 不支持的格式不让点击
            menu.items.push({ title: track.title, hint: hint, value: JSON.stringify(track), active: track.selected, selectable: supported, muted: !supported, });
        }

        uosc.openMenu(menu)
        uosc.registerMenuCallback('vst_sub_tracks_menu_callback', function (jsonStr) {
            var event = parseJson(jsonStr);
            if (event && event.type == 'activate') {
                /** @type {SubTrackInfo} */
                var data = parseJson(event.value)
                showSubtitleLines(data);
            }
        })
    })()
}

// 第二步：加载字幕，并显示文本行列表菜单
/** @param {SubTrackInfo} track */
function showSubtitleLines(track) {
    if (!track.codec || !SUPPORTED_CODECS[track.codec]) throw new Error(istr.formatUnsupported + track.codec);

    // 先显示加载中，稍后展现全部字幕
    var loadingMenuType = 'sub_lines_loading_menu_type_' + track.id
    uosc.openMenu({
        type: loadingMenuType,
        keep_open: true,
        callback: [SCRIPT_NAME, 'vst_sub_lines_loading_menu_callback'],
        items: [{ title: istr.loading, value: '', selectable: false, icon: 'spinner' }],
    })

    /** @type {Menu} 显示全部字幕文本的菜单 */
    var menu = {
        id: SCRIPT_UOSC_MENU_ID_SUB_LINES,
        type: "sub_lines_menu_type", // 用于 update-menu
        title: track.title + ' ' + istr.typeToSearch,
        footnote: istr.fastScrollHint,
        keep_open: true,
        callback: [SCRIPT_NAME, 'vst_sub_lines_menu_callback'],
        items: [{ title: istr.loading, value: 'cancel-loading', selectable: false, icon: 'spinner' }],
        item_actions: [
            { name: 'seek_timestamp', icon: 'arrow_forward', label: istr.seekTime },
            { name: 'copy_text', icon: 'content_copy', label: istr.copyToClipboard },
        ],
        item_actions_place: 'outside',
    };

    // 开始获取字幕内容。可能耗时较长。虽然转换为 srt 用于显示，但导出时仍应使用原始格式文本
    var rawText = getRawTextOfSubTrack(track)
    var srtText = ffmpeg.formatSubToSrt(rawText)
    var subLines = parseSubripText(srtText)
    // print('subLines: \n' + subLines + '\n subLines end')
    if (!srtText || subLines.length === 0) throw new Error(istr.noTextParsed);

    // 如果当前没有显示加载中的菜单，认为是取消加载
    if (mp.userData.uosc.menuType.get() !== loadingMenuType) {
        print('取消加载')
        return
    }

    // 更新显示
    menu.items = [
        { title: istr.saveSubFile, value: JSON.stringify({ button: 'file' }), actions: [], align: 'center', bold: true, italic: true, separator: true, },
        { title: istr.copySubAllToClipboard, value: JSON.stringify({ button: 'copy' }), actions: [], align: 'center', bold: true, italic: true, separator: true, },
    ];
    for (var i = 0; i < subLines.length; i++) {
        // 如果一条字幕有多行，拆分显示。
        var subLine = subLines[i]
        var singleLines = subLine.text.split('\n');
        for (var j = 0; j < singleLines.length; j++) {
            var itemTitle = singleLines[j];
            if (j !== singleLines.length - 1) itemTitle += '  ↵'
            menu.items.push({ title: itemTitle, value: JSON.stringify({ index: i }), separator: false, });
        }
        subLine.splitCount = singleLines.length
        if (singleLines.length > 0) {
            var lastItemIndex = menu.items.length - 1
            subLine.itemIndex = lastItemIndex
            menu.items[lastItemIndex].separator = true
            menu.items[lastItemIndex].hint = formatTimeFloat(subLine.startTime) + ' -- > ' + formatTimeFloat(subLine.endTime);
        }
    }

    var subLine = findSelectedSubLine(subLines, mp.timePos.get(-1))
    if (subLine) menu.selected_index = subLine.itemIndex + 1

    // 不用 updateMenu 而用 openMenu, 以便 selected_index 生效
    uosc.openMenu(menu);
    uosc.registerMenuCallback('vst_sub_lines_menu_callback', function (jsonStr) {
        var event = parseJson(jsonStr);
        if (!event) return;
        if (event.type == 'activate') {
            /** @type {{index: number} | {button: ('file'|'copy')}} */
            var data = parseJson(event.value);
            if (event.action === 'seek_timestamp') {
                mp.seekAbsolute(subLines[data.index].startTime); // 跳转至字幕起始时间
            } else if (event.action == 'copy_text') {
                mp.copyToClipboard(subLines[data.index].text, false); // 复制文本到剪切板。可能需要 update-clipboard https://mpv.io/manual/master/#command-interface-update-clipboard
            } else if (data.button === 'file') {
                saveSubToVideoDir(rawText, track); // 保存字幕文件到视频目录
            } else if (data.button === 'copy') {
                mp.copyToClipboard(rawText); // 复制全部内容到剪切板
            }
        } else if (event.type === 'close') {
            mp.subStart.stopObserve()
            // 关闭时退到上一界面 -- 字幕轨道选择。左右二级菜单那种因为没法监听子菜单进入，所以没法实现。
            // 不行如果显示错误等文字菜单的话就会把那个菜单顶掉。。。
            // showSubTracksMenu()
        }
    })

    /** @type {SubLine} 记录当前 active 的 subLine. 用于 item 变化时取消旧 item.active。 */
    var activeSubLine = null
    // 自动同步选中当前正在播放的字幕行
    mp.subStart.startObserve(function (name, value) {
        if (!track.selected) return //仅对当前显示的字幕轨道生效
        // 字幕结束时取消 active 也行，但 selected 很容易变化，这样就不好定位下一条了，留着吧。
        if (!value) return;
        // 取消旧的 active
        if (activeSubLine) {
            var itemIndex = activeSubLine.itemIndex
            for (var i = itemIndex; i >= 0 && menu.items[i].active; i--) { menu.items[i].active = false }
            activeSubLine = null
        }
        // 激活新的 active
        activeSubLine = findSelectedSubLine(subLines, value)
        if (activeSubLine) {
            for (var i = 0; i < activeSubLine.splitCount; i++) { menu.items[activeSubLine.itemIndex - i].active = true }
        }
        uosc.updateMenu(menu)
    })
}


// #endregion



var CONTROL_BAR_BUTTON = {
    icon: 'subtitles',
    active: false,
    badge: 'T',
    tooltip: istr.viewSubText,
    command: ['script-message-to', SCRIPT_NAME, SCRIPT_CMD_SHOW_SUBTITLE_TRACKS],
}

// 注册供 input.conf 调用的绑定名称
mp.add_key_binding(null, SCRIPT_CMD_SHOW_SUBTITLE_TRACKS, showSubTracksMenu);

// 注册 uosc 底部控制条的按钮，用户可以在  script-opts/uosc.conf 中的 controls= 中添加 button:SCRIPT_UOSC_BTN_SHOW_SUBTITLE_TRACKS
uosc.setButton(SCRIPT_UOSC_BTN_SHOW_SUBTITLE_TRACKS, CONTROL_BAR_BUTTON)

// 注册属性监听，在没有字幕轨道时隐藏底部控制条的按钮。
mp.observe_property("track-list", "native", function (name, value) {
    CONTROL_BAR_BUTTON.hide = getSubTracks().length === 0
    uosc.setButton(SCRIPT_UOSC_BTN_SHOW_SUBTITLE_TRACKS, CONTROL_BAR_BUTTON)
});

