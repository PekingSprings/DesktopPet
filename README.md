<div align="center">

# ❤️ DesktopPet

**一个用 C# / WPF 写的 Windows 桌面宠物**

![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows)
![License](https://img.shields.io/badge/License-MIT-green)
![ModernWpf](https://img.shields.io/badge/ModernWpf-Win11%20Style-blue)

一个轻量、可爱的桌宠，支持多角色切换、差分表情、外部导入、拖拽删除。

</div>

---

## 📖 目录

- [✨ 功能](#-功能)
- [🚀 快速开始](#-快速开始)
- [🖼️ 图片素材规范](#️-图片素材规范)
- [📁 外部角色导入](#-外部角色导入)
- [🔤 角色罗马音对照表](#-角色罗马音对照表)
- [💾 数据存储](#-数据存储)
- [⚠️ 警告](#️-警告)
- [🛠️ 构建](#️-构建)
- [📜 许可证](#-许可证)

---

## ✨ 功能

| 功能 | 说明 |
| :--- | :--- |
| 🪟 透明窗口 | 无边框、浮于桌面、不占任务栏 |
| 🎨 现代菜单 | 基于 ModernWpf，Win11 风格右键菜单 |
| 👥 多角色 | 内置 TH6 / TH7 角色，支持外部导入 |
| 😊 差分表情 | 每个角色支持多张差分图，右键切换 |
| 📏 三种尺寸 | 中 / 大 / 超大，一键切换 |
| 🖱️ 拖动移动 | 鼠标拖动，自动限制在屏幕工作区 |
| 🔒 位置记忆 | 退出时自动保存位置、大小、角色 |
| 🚀 开机自启 | 一键开关，写注册表 |
| 📌 窗口置顶 | 可开关 |
| 🗑️ 拖拽删除 | 拖文件到宠物身上彻底删除，播放委屈差分 |
| ⚠️ 删除警告 | 默认开启，防止误删 |
| 📂 外部角色 | 放到 `ExternalChars` 文件夹即可自动识别 |

---

## 🚀 快速开始

1. 从 [Releases](../../releases) 下载最新的 `DesktopPet-vX.X-win64.zip`
2. 解压到任意目录（**避免放在 `Program Files` 等系统目录**）
3. 双击 `DesktopPet.exe` 启动
4. 右键宠物图片弹出菜单

> **无需安装 .NET 运行时**（自包含发布）

---

## 🖼️ 图片素材规范

> ⚠️ **重要：文件名和文件夹名请使用英文、数字、下划线。不要使用中文、空格、特殊符号。**
>
> C# / WPF 的 `pack://` 资源 URI 对中文支持不佳，中文路径可能导致加载失败或打包异常。

### 内置角色目录结构

```
ResImage/
├── TH6/
│   ├── Rumia/
│   │   ├── 1.png
│   │   ├── 2.png
│   │   ├── 3.png
│   │   ├── 4.png
│   │   └── 5.png
│   └── Cirno/
│       └── ...
└── TH7/
└── Youmu/
└── ...
```

### 差分图索引对照

| 索引 | 文件名 | 用途 |
| :---: | :---: | :--- |
| 0 | `1.png` | 默认 / 常服 |
| 1 | `2.png` | 生气 |
| 2 | `3.png` | 委屈（拖文件删除时显示） |
| 3 | `4.png` | 开心 |
| 4 | `5.png` | 不甘 |

### 命名规则

- 📛 文件夹名：角色英文名，例如 `Rumia`、`Cirno`
- 🔢 图片名：从 `1.png` 开始依次编号
- 🔤 大小写敏感：`Rumia` 和 `rumia` 会被视为不同文件夹

---

## 📁 外部角色导入

把自定义角色放到 exe 同目录下的 `ExternalChars` 文件夹，程序启动时会自动扫描。

### 目录结构

```
ExternalChars/
├── MyCharacter/         ← 文件夹名 = 菜单显示名
│   ├── 1.png
│   ├── 2.png
│   └── 3.png
└── AnotherOne/
├── 1.png
└── 2.png
```

### 规则

- ✅ **每个子文件夹 = 一个角色**
- ✅ **子文件夹名 = 右键菜单里显示的角色名**
- ✅ 图片数量不限，几张某读几张
- ✅ 按文件名排序加载，建议用 `1.png`、`2.png`、`3.png`……
- ❌ **不要用中文命名文件夹**，例如 `我的角色` 会加载失败

### 使用步骤

1. 启动程序一次，`ExternalChars` 文件夹会自动创建
2. 在 `ExternalChars` 里新建子文件夹（例如 `MyOC`）
3. 把 PNG 图片复制进去，命名为 `1.png`、`2.png`……
4. 重启程序
5. 右键 → 外部角色 → 选择你的角色

---

## 🔤 角色罗马音对照表

### 东方红魔乡（TH6）

| 中文 | 罗马音 |
| :--- | :--- |
| 露米娅 | `Rumia` |
| 大妖精 | `Daiyousei` |
| 琪露诺 | `Cirno` |
| 红美铃 | `Meiling` |
| 小恶魔 | `Koakuma` |
| 帕秋莉 | `Patchouli` |
| 十六夜咲夜 | `Sakuya` |
| 蕾米莉亚 | `Remilia` |
| 芙兰朵露 | `Flandre` |

### 东方妖妖梦（TH7）

| 中文 | 罗马音 |
| :--- | :--- |
| 蕾蒂 | `Letty` |
| 橙 | `Chen` |
| 爱丽丝 | `Alice` |
| 莉莉白 | `Lily` |
| 露娜萨 | `Lunasa` |
| 梅露兰 | `Merlin` |
| 莉莉卡 | `Lyrica` |
| 魂魄妖梦 | `Youmu` |
| 西行寺幽幽子 | `Yuyuko` |
| 八云蓝 | `Ran` |
| 八云紫 | `Yukari` |

---

## 💾 数据存储

窗口位置、大小、当前角色、警告开关等状态保存在 exe 旁的 `Data` 文件夹：

```
Data/
├── pos.dat     # 位置、大小、当前角色
└── warn.dat    # 删除警告开关
```

> 💡 删除 `Data` 文件夹即可重置所有设置。

---

## ⚠️ 警告

- 拖文件删除是 **彻底删除**，**不进回收站**
- 默认每次删除前会弹出确认框
- 可在右键菜单关闭警告，**关闭后请谨慎操作**
- 拖拽删除文件夹会**递归删除**其中所有内容

---

## 🛠️ 构建

### 环境要求

- [.NET SDK 10.0](https://dotnet.microsoft.com/download)
- Windows 10 / 11

### 编译

```bash
dotnet build -c Release
```

### 发布（单文件，自包含）

```bash
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

发布产物位于：

```
bin/Release/net10.0-windows/win-x64/publish/
```

### 依赖

| 包 | 用途 |
| :--- | :--- |
| `ModernWpfUI` | Win11 风格界面 |

---

## 📜 许可证

本项目采用 [MIT License](LICENSE)。

---

<div align="center">

**如果这个项目对你有帮助，欢迎点个 ⭐ Star！**

</div>
