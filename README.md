# DesktopPet

一个用 C# / WPF 写的 Windows 桌面宠物。

## 功能

- 透明无边框窗口，浮在桌面上，不占任务栏
- 右键菜单（ModernWpf，Win11 风格）
- 多张差分图，右键切换
- 三种窗口大小：中 / 大 / 超大
- 鼠标拖动，自动限制在屏幕范围内
- 开机自启开关
- 窗口置顶开关
- 退出时记忆窗口位置和大小，下次启动自动恢复
- 拖文件到宠物身上即可彻底删除，删除时播放 3 秒委屈差分
- 删除前警告开关（默认开启）

## 环境

- .NET 10
- Windows 10 / 11

## 依赖

- [ModernWpfUI](https://github.com/Kinnara/ModernWpf)（Win11 风格菜单）

## 构建

```bash
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
