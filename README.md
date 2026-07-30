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
      `controls=....,gap,<has_sub>button:view_sub_texts,......`

4. 在 mpv 中播放视频后，点击按钮或快捷键即可弹出字幕轨道列表。

5. 出现问题时，可以从终端启动 mpv 查看日志。  
   `flatpak run io.mpv.Mpv --v 视频.mkv`
   
   
   
----
   
# mpv uosc Subtitle Text Browser Script

Lists subtitle tracks via the uosc menu in mpv. Click a track to display its full text, with support for search, copy, file saving and click-to-seek.
- Platform: Linux
- GUI language: en, zh. (decided by env `LANG`)
- Dependencies: ffmpeg, uosc
- Supported subtitle formats: srt, ass.

## Usage

1. Make sure `uosc` is installed and enabled.
2. Put `view_sub_texts.js` into mpv's scripts directory. 
3. Shortcut binding: in `input.conf`  
   `Ctrl+S script-binding view_sub_texts/show_sub_tracks`

   uosc bottom button: in `script-opts/uosc.conf`  
      `controls=....,gap,<has_sub>button:view_sub_texts,......`

4. After starting video playback in mpv, press the shortcut or click the button to open the subtitle track list.

5. If you run into issues, launch mpv from the terminal to check the log.