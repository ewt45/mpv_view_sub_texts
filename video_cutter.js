/*
// TODO 
- 获取当前转码进度：无法实现。mpv 脚本中不支持实时接收输出，-progress 可以指定文件但内容会不断拼接而非覆盖。除非 sh？

- ts react 库？ https://github.com/mpv-easy/mpv-easy
- 记忆窗口大小和位置？

- README
*/




// #region 独立于脚本的公共部分
// 公共部分放在一个 region 里。可以跨文件复制进行同步

var SCRIPT_NAME = mp.get_script_name();

/** mp 内置函数。以及自己的扩展。 */
var mp = mp || {}

/** 用于 ffmpeg 相关操作。 */
var ffmpeg = ffmpeg || {}

/** 用于 uosc 相关操作。 */
var uosc = uosc || {}


// #region i18n 文本

/** 支持多语言的文本。 */
var istr = {
    // 标题
    finish: '完成',
    error: '错误',
    selectTrack: '选择一个字幕轨道以浏览其内容',
    videoCut: '剪切视频片段',
    // 按钮
    ok: '确定',
    saveSubFile: '导出字幕文件到视频目录',
    copySubAllToClipboard: '复制全部字幕文本到剪切板',
    copyToClipboard: '复制内容到剪切板',
    openFileDir: '打开文件所在目录',
    seekTime: '跳转至当前时间',
    viewSubText: '浏览字幕文本',
    setCutTimes: ['设置剪切起点', '设置剪切终点'],
    resize: '缩放',
    beginCrop: '开始裁切画面',
    reset: '重置',
    exportAs: '导出为...',
    abort: '中止',
    // 文本
    copied: '已复制到剪切板。',
    subprocessFailed: '子进程执行失败！',
    formatUnsupported: '不支持的编码格式: ',
    videoPathNotFound: '无法获取视频本地路径',
    subTrackNotFound: '无法获取该字幕轨道',
    savedToVideoDir: '已成功保存至视频同目录: \n',
    noPermissionAndCopied: '由于没有文件写入权限，已将文本复制到剪切板。',
    noSubtrack: '没有字幕轨道。请尝试其他视频文件或添加外部字幕文件。',
    supportFormat: '支持编码格式: ',
    externalHint: '外部文件',
    unsupportedHint: '不支持此格式',
    typeToSearch: '(输入以进行搜索)',
    loading: '正在加载中...',
    noTextParsed: '解析失败：未能从该轨道提取出有效文本',
    fastScrollHint: '当行数较多时，可以用 PageUp/PageDown 快速滚动。',
    noCutTime: '未设置时间',
    setCutTimeFirst: '请先设置起始时间和结束时间',
    exporting: '正在导出，请耐心等待...\n',
    aborted: '操作已中止。',
    auto: '自动',
    editCrops: ['编辑裁切矩形左上角', '编辑裁切矩形右下角'],
    videoCutHint: '点击按钮 A/B 设置起点/终点，然后导出文件。',
    action: '操作',
    cannotCropOrResize: '不支持裁切和缩放',
    cropKeysInfo: '方向键←↑→↓: 移动裁切矩形的左上角。\nTAB: 切换为移动裁切矩形的右下角。\nESC: 退出裁切。',
    resizeHint: '输入格式: 宽度:高度。示例: ',
    sizeTitles: ['宽度: ', '  高度: '],
    inputFormatError: '输入格式错误。',
}

var systemLang = mp.utils.getenv('LANG')
if (systemLang && systemLang.indexOf('zh') === 0) { }
else {
    istr.finish = 'Finished'
    istr.error = 'Error'
    istr.selectTrack = 'Select a track to view its content'
    istr.videoCut = 'Video Cut'
    istr.ok = 'Ok'
    istr.saveSubFile = 'Save as file'
    istr.copySubAllToClipboard = 'Copy all to clipboard'
    istr.copyToClipboard = 'Copy content to clipboard'
    istr.openFileDir = 'Open directory'
    istr.seekTime = 'Jump to the start time of this line'
    istr.viewSubText = 'View sub text'
    istr.setCutTimes = ['Set cut start time', 'Set cut end time']
    istr.resize = 'Resize'
    istr.beginCrop = 'Begin cropping'
    istr.reset = 'Reset'
    istr.exportAs = 'Export as...'
    istr.abort = 'Abort'
    istr.copied = 'Copied to clipboard.'
    istr.subprocessFailed = 'Subprocess failed!'
    istr.formatUnsupported = 'Format unsupported: '
    istr.videoPathNotFound = 'Cannot find video local path'
    istr.subTrackNotFound = 'Cannot find the sub track'
    istr.savedToVideoDir = 'Saved to video dir: \n'
    istr.noPermissionAndCopied = 'There is no write permission, so content is copied to clipboard.'
    istr.noSubtrack = 'No subtitle track. Please try other videos or add external subtitle files.'
    istr.supportFormat = 'Supported format: '
    istr.externalHint = 'external'
    istr.unsupportedHint = 'unsupported'
    istr.typeToSearch = '(Type to search)'
    istr.loading = 'Loading...'
    istr.noTextParsed = 'Parsing failed. No valid text in this track.'
    istr.fastScrollHint = 'Press PageUp/PageDown to fast scroll if there are too many lines.'
    istr.noCutTime = 'time not set'
    istr.setCutTimeFirst = 'Please set start and end time first.'
    istr.exporting = 'Exporting. Please wait patiently...\n'
    istr.aborted = 'Aborted.'
    istr.auto = 'Auto'
    istr.editCrops = ['Editing top-left of the crop rect', 'Editing bottom-right of the crop rect']
    istr.videoCutHint = 'Click A/B button to set start/end time and then export file.'
    istr.action = 'Action'
    istr.cannotCropOrResize = 'Crop and resize not supported.'
    istr.cropKeysInfo = 'Arrow keys (←↑→↓): Move the top-left corner of the crop rectangle.\nTAB: Switch to moving the bottom-right corner.\nESC: Exit cropping.'
    istr.resizeHint = 'Input format: WIDTH:HEIGHT . Examples: '
    istr.sizeTitles = ['Width: ', '  Height: '],
    istr.inputFormatError = 'Wrong Input format.'
}

// #endregion



// #region 类型定义

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

/** @typedef {{type: 'activate', menu_id: string, index: number, value: any, action?: string, keep_open?: boolean, modifiers?: string, alt: boolean, ctrl: boolean, shift: boolean, is_pointer: boolean}} MenuEventActivate */
/** @typedef {{type: 'move', menu_id: string, from_index: number, to_index: number}} MenuEventMove */
/** @typedef {{type: 'key', menu_id: string, id: string, key: string, selected_item?: {index: number, value: any, action?: string}}} MenuEventKey */
/** @typedef {{type: 'search', menu_id: string, query: string}} MenuEventSearch */
/** @typedef {{type: 'close'}} MenuEventClose */

/** @typedef {MenuEventActivate | MenuEventKey | MenuEventMove | MenuEventSearch | MenuEventClose} MenuEvent */


// mpv 定义的

/** 
 * @typedef {Object}    SubprocessResult   mp.command 执行 subprocess 的返回结果
 * @property {string}   error_string    空字符串(正常结束) 或 killed(非正常结束) 或 init(未成功启动)
 * @property {boolean}  killed_by_us    进程是否由 mpv 杀死，例如播放停止 + playback_only, 或 abort_async_command.
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
 * @typedef  {Object}                            MpProperty      mp 的属性
 * @property {string}                            name            字符串名称
 * @property {MpPropertyChangeCallback | null}   _currentCallback
 * @property {(callback: MpPropertyChangeCallback) => void}  startObserve 开始监听该属性。不能重复监听。
 * @property {() => void}                        stopObserve     停止监听该属性
 * @property {(default: any) => any}             get             获取该属性当前的值
 */

// #endregion



// #region 工具函数
// ----------------------------------------------------------------------------
// 工具函数
// ----------------------------------------------------------------------------


/** 创建一个 mp 属性. @returns {MpProperty} */
mp.createMpProperty = function (name) {
    return {
        name: name,
        _currentCallback: null,
        get: function (def) { return mp.get_property_native(name, def) },
        set: function (value) { mp.set_property_native(name, value) },
        startObserve: function (callback) {
            if (this._currentCallback) { throw new Error("请先取消上一次的监听", this._currentCallback); }
            this._currentCallback = function (name, value) { runCatching(callback, name, value) }
            mp.observe_property(name, 'native', this._currentCallback)
        },
        stopObserve: function () {
            if (this._currentCallback) { mp.unobserve_property(this._currentCallback) }
            this._currentCallback = null
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
mp.abLoopA = mp.createMpProperty('ab-loop-a')
mp.abLoopB = mp.createMpProperty('ab-loop-b')
/** mp 属性 (string), 画面裁切。"WxH+x+y" 从 x,y 偏移 W, H. "" 为不裁切。"0x0+0+0" 为不裁切且仅用 container crop (不知道是啥). */
mp.videoCrop = mp.createMpProperty('video-crop')
mp.width = mp.createMpProperty('width')
mp.height = mp.createMpProperty('height')

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
mp.showText = function (text, duration) { mp.commandv('show-text', text, (duration || 3500).toString()); }

/** 打印某个对象的内容 */
mp.dump = function () { dump(arguments) }

/** 
 * 启动子进程执行某个命令。执行失败时抛出异常。
 * @param {string[]} cmd 要执行的命令
 * @param {string} [stdin_data] 要作为新进程的 stdin 的内容。
 * @returns {SubprocessResult} 执行成功时返回结果
 */
mp.commandSubprocess = function (cmd, stdin_data) {
    var mpCommand = {
        name: "subprocess",
        playback_only: true, // 没有视频在播放了就结束
        capture_stdout: true, // 如果设置为 true, 不会直接输出而是保存到 r.stdout 中。
        capture_stderr: true,
        // capture_size: 64 * 1024 * 1024, 返回的 stdout/stderr 上限大小，默认 64MB
        args: cmd,
    }
    if (stdin_data) mpCommand.stdin_data = stdin_data
    /** @type {SubprocessResult} */
    var res = mp.command_native(mpCommand);
    if (!res) throw new Error(istr.subprocessFailed + '\ncmd: ' + cmd.join(' '))
    else if (res.status !== 0) throw new Error(istr.subprocessFailed + '\ncmd: ' + cmd.join(' ')
        + (res.killed_by_us ? '\n进程被 mpv 或用户主动杀死。' : '')
        + '\nerror_string: ' + (res.error_string ? res.error_string : 'N/A')
        + '\nstderr: ' + (res.stderr ? res.stderr : 'N/A'))
    else return res
}

/** 
 * mp.commandSubprocess 的异步版本。需要传入回调函数. 
 * @param {(res: SubprocessResult) => void} func 命令执行成功时调用。
 * @returns {*} 返回一个对象用于终止该命令。
 */
mp.commandAsyncSubprocess = function (cmd, func, stdin_data) {
    var mpCommand = { name: "subprocess", playback_only: true, capture_stdout: true, capture_stderr: true, args: cmd, }
    if (stdin_data) mpCommand.stdin_data = stdin_data
    return mp.command_native_async(mpCommand, function (sucess, res, error) {
        runCatching(function () {
            if (!sucess) throw new Error(istr.subprocessFailed + '\ncmd: ' + cmd.join(' ') + '\n');
            else if (res.status !== 0) throw new Error(istr.subprocessFailed + '\ncmd: ' + cmd.join(' ')
                + (res.killed_by_us ? '\n进程被 mpv 或用户主动杀死。' : '')
                + '\nerror_string: ' + (res.error_string ? res.error_string : 'N/A')
                + '\nstderr: ' + (res.stderr ? res.stderr : 'N/A'))
            else func(res)
        })
    });
}

/** 停止异步命令 */
mp.abortAsyncCommand = function (cmdId) { mp.abort_async_command(cmdId) }

/** 跳转至指定时间。@param {number} time 时间点，单位秒 */
mp.seekAbsolute = function (time) { mp.commandv("seek", time, "absolute"); }

/**
 * 定义某个命令，并注册快捷键。如果有匿名回调，本次快捷键不会覆盖。
 * 例如对于 mpv 内置命令，默认快捷键会被覆盖，但在 input.conf 中手动指定的不会被覆盖。
 * @param {string | null}   key     快捷键，可以为 null
 * @param {string}          name    命令名称.
 * @param {()=>void}        func    回调
 * @param {{repeatable?: boolean, scalable?: boolean, complex?: boolean}}  flags   repeatable 持续的按下会触发回调。complex 会给回调传入更多数据
 */
mp.addKeyBinding = function (key, name, func, flags) { mp.add_key_binding(key, name, func, flags) }

/**
 * 同 mp.addKeyBinding 但强制注册快捷键。
 * @param {string | null}   key     快捷键，可以为 null
 * @param {string}          name    命令名称.
 * @param {()=>void}        func    回调
 * @param {{repeatable?: boolean, scalable?: boolean, complex?: boolean}}  flags   repeatable 持续的按下会触发回调。complex 会给回调传入更多数据
 */
mp.addForcedKeyBinding = function (key, name, func, flags) { mp.add_forced_key_binding(key, name, func, flags) }

mp.removeKeyBinding = function (name) { mp.remove_key_binding(name) }


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

/** 向 mp 注册一个消息监听，作为 uosc 菜单的回调。自动为回调包裹 try-catch. @param {(event:MenuEvent) => void} func */
uosc.registerMenuCallback = function (name, func) {
    mp.register_script_message(name, function (jsonStr) {
        var event = parseJson(jsonStr);
        if (event) { runCatching(func, event) };
    })
}

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
    uosc.registerMenuCallback('vst_text_dialog_menu_callback', function (event) {
        if (event.type == 'activate') {
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
    var formatErrStr = err.name + ": " + err.message;
    mp.msg.info('捕捉到异常', err, err.stack)
    uosc.showText(istr.error, formatErrStr, button);
}

/** 使用传入的参数执行 ffmpeg. 返回 stdout @param {string[]} args @returns {string} */
ffmpeg.command = function (args, stdin_data) {
    mp.msg.verbose('执行 ffmpeg', args.join(' '))
    return mp.commandSubprocess(['ffmpeg'].concat(args), stdin_data).stdout
}

/** ffmpeg.command 的异步版本。 @param {(SubprocessResult) => void} func 执行成功后回调。@returns {*} 用于终止命令的对象 */
ffmpeg.commandAsync = function (args, func, stdin_data) {
    mp.msg.verbose('执行（异步） ffmpeg', args.join(' '))
    return mp.commandAsyncSubprocess(['ffmpeg'].concat(args), func, stdin_data)
}

/**
 * 提取指定视频文件中的字幕内容文本。
 * @param {string}  outFormat   字幕在原文件中的编码方式
 * @param {string}  filepath    视频文件路径
 * @param {number}  trackId     external = false 时，字幕对应的轨道
 * @returns {string}
 */
ffmpeg.extractSubTrackFromVideo = function (outFormat, filepath, trackId) {
    return ffmpeg.command(['-y', '-v', 'quiet', '-i', filepath, '-map', '0:' + trackId, '-f', outFormat, '-'])
}

/** 将给定字幕文本转换为 srt 格式的字幕文本。@returns {string} */
ffmpeg.formatSubToSrt = function (subText) { return ffmpeg.command(['-y', '-v', 'quiet', '-i', 'pipe:', '-f', 'srt', '-'], subText) }

/** 为函数包裹 try catch 并执行。第二个往后的参数会传入 func. */
function runCatching(func) {
    var args = []
    for (var i = 1; i < arguments.length; i++) { args.push(arguments[i]) }
    try { return func.apply(this, args) }
    catch (err) {
        uosc.showError(err, ['copy', 'ok'])
        return undefined
    }
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

/** 将数值限制在 [min, max] 区间 */
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

/** 安全读取本地文本文件。 @returns {string | null} */
function readFile(path) {
    try { return mp.utils.read_file(path); }
    catch (e) {
        print(e)
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


// #endregion


// #endregion



// #region 当前脚本的公共部分

var SCRIPT_CMD_SHOW_BUTTON = "show_ui"
var SCRIPT_CMD_ACTION = "action"
var SCRIPT_CMD_EXPORT = "export"
var WIDTH_MAX = 600

/** 生成当前 abloop 的时间始末、裁切矩形。@returns {string} */
function generateDataString() {
    var dataStr = ''
    var a = mp.abLoopA.get()
    var b = mp.abLoopB.get()
    var aStr = (typeof a === 'number') ? formatTimeFloat(a) : istr.noCutTime
    var bStr = (typeof b === 'number') ? formatTimeFloat(b) : istr.noCutTime
    dataStr += '🎬 ' + aStr + ' --> ' + bStr

    if (outputSize.width > 0 || outputSize.height > 0) {
        var outWidthStr = outputSize.width <= 0 ? istr.auto : outputSize.width
        var outHeightStr = outputSize.height <= 0 ? istr.auto : outputSize.height
        dataStr += ',\u3000 📐 ' + outWidthStr + ':' + outHeightStr
    }

    var cropStr = mp.videoCrop.get()
    if (cropStr) dataStr += ',\u3000 ✂️ ' + cropStr
    return dataStr
}


/** 使用 ffmpeg 剪切视频导出文件。 */
function cutToFile(format) {
    var a = mp.abLoopA.get();
    var b = mp.abLoopB.get();
    var inPath = mp.path.get();

    if (typeof a !== 'number' || typeof b !== 'number') throw new Error(istr.setCutTimeFirst)
    if (a >= b) { a = mp.abLoopB.get(); b = mp.abLoopA.get(); }
    if (!inPath || inPath.indexOf("http") === 0) throw new Error(istr.videoPathNotFound)

    var outPath = mp.utils.split_path(inPath)[0] + mp.filename.noExt.get() + '_cut.' + format
    var cropRect = getCurrentCropRect(mp.width.get(), mp.height.get())
    var crop = { w: cropRect.right - cropRect.left, h: cropRect.bottom - cropRect.top, x: cropRect.left, y: cropRect.top }

    // 注意 -ss 时间放在输入前，否则会从头开始读取每帧非常慢
    var ffArgs = ['-y', '-v', 'quiet', '-ss', a.toString(), '-to', b.toString(), '-i', inPath,];
    var vfArgs = ["crop=" + [crop.w, crop.h, crop.x, crop.y].join(':')]
    if (outputSize !== null && (outputSize.width <= mp.width.get() && outputSize.height <= mp.height.get()) && !(outputSize.width <= 0 && outputSize.height <= 0)) {
        vfArgs.push("scale=" + [outputSize.width, outputSize.height, "flags=lanczos"].join(":"))
    }
    // MKV: 无损复制所有轨道
    if (format === 'mkv') { ffArgs = ffArgs.concat(['-map', '0', '-c', 'copy', outPath]); }
    // GIF: 生成高质量调色板并重编码
    else if (format === 'gif') { ffArgs = ffArgs.concat(['-vf', vfArgs.concat(["split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a"]).join(','), outPath]); }
    // AVIF: 使用 libaom-av1 编码 (去除音频) -cpu-used 6 还挺快的
    else if (format === 'avif') { ffArgs = ffArgs.concat(['-vf', vfArgs.join(','), '-c:v', 'libaom-av1', '-cpu-used', '6', '-crf', '30', '-b:v', '0', '-an', '-pix_fmt', 'yuv420p', outPath]); }

    ffmpegCmdId = ffmpeg.commandAsync(ffArgs, function (result) {
        uosc.showText(istr.videoCut, istr.savedToVideoDir + outPath, ['open-dir', 'ok'], outPath);
        ffmpegCmdId = null
    })

    menuProcessing.items[0].title = istr.exporting + outPath
    uosc.openMenu(menuProcessing)
    uosc.registerMenuCallback('vc_process_menu_callback', function (event) {
        if (event.action === 'stop') {
            if (ffmpegCmdId != null) { mp.abortAsyncCommand(ffmpegCmdId) }
            ffmpegCmdId = null
            uosc.showText(istr.finish, istr.aborted, ['ok'])
        }
    })
}

/** 获取当前裁切矩形 @param {number} maxWidth @param {number} maxHeight @returns {{left:number, top:number, right:number, bottom:number}} */
function getCurrentCropRect(maxWidth, maxHeight) {
    var match = mp.videoCrop.get().match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
    var oldCrop = { w: maxWidth, h: maxHeight, x: 0, y: 0 }
    if (match) oldCrop = { w: parseInt(match[1], 10), h: parseInt(match[2], 10), x: parseInt(match[3], 10), y: parseInt(match[4], 10) };
    return { left: oldCrop.x, top: oldCrop.y, right: oldCrop.x + oldCrop.w, bottom: oldCrop.y + oldCrop.h }
}

/** 更新裁切矩形。参数为变化的像素值，isLeftTop 代表修改左上还是右下。 @param {number} dx @param {number} dy @param {boolean} isLeftTop   */
function updateVideoCrop(dx, dy, isLeftTop) {
    var maxWidth = mp.width.get()
    var maxHeight = mp.height.get()
    var fullscreenCropStr = maxWidth + 'x' + maxHeight + '+0+0'

    var rect = getCurrentCropRect(maxWidth, maxHeight)
    // 移动一角时，另一角固定不动
    if (isLeftTop) {
        rect.left = clamp(rect.left + dx, 0, maxWidth - 1)
        rect.top = clamp(rect.top + dy, 0, maxHeight - 1)
        mp.showText(istr.editCrops[0] + ': ' + rect.left + ',' + rect.top)
    } else {
        rect.right = clamp(rect.right + dx, 1, maxWidth)
        rect.bottom = clamp(rect.bottom + dy, 1, maxHeight)
        mp.showText(istr.editCrops[1] + ': ' + (rect.right - maxWidth) + ',' + (rect.bottom - maxHeight))
    }

    cropStr = (rect.right - rect.left) + 'x' + (rect.bottom - rect.top) + '+' + rect.left + '+' + rect.top
    if (cropStr === '0x0+0+0' || cropStr === fullscreenCropStr) cropStr = ''
    mp.videoCrop.set(cropStr)
    mp.msg.verbose('更新裁切矩形:', cropStr, maxWidth, maxHeight)
}

/** 读取输入宽高的字符串。格式：`w:h`。 @param {string} str @returns {{width:number, height:number}} */
function parseSizeInputStr(str) {
    var split = str.split(':')
    var size = { width: -1, height: -1 }
    try { size = { width: clamp(parseInt(split[0], 10), -1, mp.width.get()), height: clamp(parseInt(split[1], 10), -1, mp.height.get()) } } catch (err) { }
    if (isNaN(size.width)) size.width = -1
    if (isNaN(size.height)) size.height = -1
    return size
}

// #endregion



/** @type {Menu} */
var menuMain = {
    title: istr.videoCut,
    footnote: istr.videoCutHint,
    type: ' vc_buttons_menu_type',
    callback: [SCRIPT_NAME, 'vc_buttons_menu_callback'],
    keep_open: true,
    items: [
        { title: '', selectable: false },
        {
            title: istr.action, value: 'button-action', actions: [
                { name: 'a', icon: 'A', label: istr.setCutTimes[0] },
                { name: 'b', icon: 'B', label: istr.setCutTimes[1] },
                { name: 'resize', icon: 'aspect_ratio', label: istr.resize },
                { name: 'crop', icon: 'crop', label: istr.beginCrop },
                { name: 'clear', icon: 'backspace', label: istr.reset },
            ]
        },
        {
            callback: [SCRIPT_NAME, 'vc_buttons_menu_callback'],
            title: istr.exportAs, items: [
                { title: 'mkv', value: 'export-mkv', hint: istr.cannotCropOrResize },
                { title: 'gif', value: 'export-gif' },
                { title: 'avif', value: 'export-avif' },
            ],
        },
    ],
}

/** @type {Menu} */
var menuProcessing = {
    title: istr.videoCut,
    keep_open: true,
    type: ' vc_process_menu_type',
    callback: [SCRIPT_NAME, 'vc_process_menu_callback'],
    items: [{ title: '', icon: 'spinner', actions: [{ name: 'stop', icon: 'stop_circle', label: istr.abort }] },],
}

/** 启动 ffmpeg 后设置此属性。不为 null 时代表 ffmpeg 正在执行中。 */
var ffmpegCmdId = null

/** 是否正在裁切画面。若为 true 则应阻止显示主菜单。 */
var isCropping = false

/**  输出视频的宽高。字符串格式 w:h */
var outputSize = { width: -1, height: -1 }

/** 显示操作界面 */
function showButtons() {
    if (ffmpegCmdId != null) {
        uosc.openMenu(menuProcessing)
        return
    }
    if (isCropping) {
        uosc.showText(istr.videoCut, istr.cropKeysInfo, ['ok'])
        return
    }

    uosc.openMenu(menuMain)
    uosc.registerMenuCallback('vc_buttons_menu_callback', function (event) {
        if (event.type === 'activate') {
            if (event.value === 'button-action') { buttonAction(event.action) }
            else if (event.value.indexOf('export-') === 0) { cutToFile(event.value.replace('export-', '')) }
        } else if (event.type === 'close') {
            mp.abLoopA.stopObserve()
            mp.abLoopB.stopObserve()
            mp.videoCrop.stopObserve()
        }
    })

    // 监听可以设置的属性
    var propObserver = function (name, value) {
        // if (name === mp.abLoopA._currentCallback) { }
        menuMain.items[0].title = generateDataString()
        uosc.updateMenu(menuMain)
    }
    mp.abLoopA.startObserve(propObserver)
    mp.abLoopB.startObserve(propObserver)
    mp.videoCrop.startObserve(propObserver)
}

/** 按钮操作：设置起点和终点,宽高，裁切画面，清除。 */
function buttonAction(action) {
    if (action === 'a') { mp.abLoopA.set(mp.timePos.get()) }
    else if (action === 'b') { mp.abLoopB.set(mp.timePos.get()) }
    else if (action === 'clear') { mp.abLoopA.set('no'); mp.abLoopB.set('no'); mp.videoCrop.set(''); }
    else if (action === 'resize') {
        var oriSize = { width: mp.width.get(), height: mp.height.get() }
        /** @type {Menu} */
        var menuInput = {
            type: 'size_input_menu_type',
            search_style: 'palette',
            search_suggestion: outputSize ? (outputSize.width + ':' + outputSize.height) : '',
            on_search: 'callback',
            callback: [SCRIPT_NAME, 'size_input_menu_callback'],
            items: [{ title: '', selectable: false }, { title: istr.resizeHint + oriSize.width + ':' + oriSize.height + '\u3000 600:-1', selectable: false, muted: true }, { title: istr.ok, value: 'ok', align: 'center' }],
        }
        uosc.openMenu(menuInput)
        uosc.registerMenuCallback('size_input_menu_callback', function (event) {
            if (event.type === 'search') {
                outputSize = parseSizeInputStr(event.query)
                if (outputSize) { menuInput.items[0].title = istr.sizeTitles[0] + (outputSize.width === -1 ? istr.auto : outputSize.width) + istr.sizeTitles[1] + (outputSize.height === -1 ? istr.auto : outputSize.height) }
                else { menuInput.items[0].title = istr.inputFormatError }
                uosc.updateMenu(menuInput)
            }
            else if (event.type === 'activate' && event.value === 'ok') { uosc.closeMenu() }
            else if (event.type === 'close') { showButtons() }
        })
    }
    else if (action === 'crop') {
        uosc.showText(istr.videoCut, istr.cropKeysInfo, ['ok'])
        // 代表当前操作左上还是右下的坐标
        var isLeftTop = true
        mp.showText(isLeftTop ? istr.editCrops[0] : istr.editCrops[1]);

        // 注册快捷键。退出时取消注册
        isCropping = true
        mp.addForcedKeyBinding('LEFT', 'cropping-move-left', function () { updateVideoCrop(-4, 0, isLeftTop) }, { repeatable: true })
        mp.addForcedKeyBinding('RIGHT', 'cropping-move-right', function () { updateVideoCrop(4, 0, isLeftTop) }, { repeatable: true })
        mp.addForcedKeyBinding('UP', 'cropping-move-up', function () { updateVideoCrop(0, -4, isLeftTop) }, { repeatable: true })
        mp.addForcedKeyBinding('DOWN', 'cropping-move-down', function () { updateVideoCrop(0, 4, isLeftTop) }, { repeatable: true })
        mp.addForcedKeyBinding('TAB', 'cropping-switch', function () { isLeftTop = !isLeftTop; mp.showText(isLeftTop ? istr.editCrops[0] : istr.editCrops[1]); })
        mp.addForcedKeyBinding('ESC', 'cropping-exit', removeCropKeyBinding)
    }
}

/** 删除裁切画面时的快捷键并显示主菜单。 */
function removeCropKeyBinding() {
    mp.removeKeyBinding('cropping-move-left')
    mp.removeKeyBinding('cropping-move-right')
    mp.removeKeyBinding('cropping-move-up')
    mp.removeKeyBinding('cropping-move-down')
    mp.removeKeyBinding('cropping-switch')
    mp.removeKeyBinding('cropping-exit')
    isCropping = false
    showButtons()
}


mp.addKeyBinding(null, SCRIPT_CMD_SHOW_BUTTON, showButtons);