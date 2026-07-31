# mpv 视频片段剪切脚本
https://github.com/ewt45/mpv-scripts/video_cutter \
![video_cutter.avif](https://files.seeusercontent.com/2026/07/31/Wl8k/video_cutter.avif) \
剪切视频片段。支持缩放，裁切画面，导出 mkv/gif/avif 文件。界面借助 uosc 显示。
- 平台：Linux
- 界面语言：英文，中文。（根据环境变量 `LANG` 决定）
- 依赖：ffmpeg, uosc

## 使用方式
1. 下载 `video_cutter.js` 放到 mpv 的脚本目录。
2.  绑定快捷键。示例：在 `input.conf` 中  
   `c script-binding video_cutter/show_ui`
3. 播放视频时，按下快捷键显示操作菜单，设置起始和结束位置，并导出文件。


----

# mpv Video Clip Cutting Script
https://github.com/ewt45/mpv-scripts/video_cutter \
![video_cutter.avif](https://files.seeusercontent.com/2026/07/31/Wl8k/video_cutter.avif) \
Clip videos. Supports scaleing, cropping. Export mkv/gif/avif files. UI is based on uosc.
- Platform: Linux
- GUI language: en, zh. (decided by env `LANG`)
- Dependencies: ffmpeg, uosc

# Usage
1. Download `video_cutter.js` and place it inside mpv's scripts directory.
2. Key binding. e.g. in `input.conf`:
    `c script-binding video_cutter/show_ui`
3. Open a video file Press the hotkey to open the action menu. Set start and end time. Export the clip.
