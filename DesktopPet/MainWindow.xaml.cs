using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Microsoft.Win32;

namespace DesktopPet;

//加载图片，拖拽，存储位置，警告信息，改变角色
public partial class MainWindow : Window
{
    private static readonly int[] SizeLevels = { 200, 320, 420 };
    private int _currentFrame;
    private string _currentPath = "";

    private BitmapImage[] _frames;

    private string _pastcurrentpath = "";

    private DispatcherTimer _sadTimer;
    private BubbleLogic bubb;

    public MainWindow()
    {
        InitializeComponent();
        WarnItem.IsChecked = LoadWarnFlag();
        //鼠标拖拽
        MouseLeftButtonDown += (s, e) => DragMove();
        //文件拖拽接受
        DragEnter += (s, e) =>
        {
            e.Effects = DragDropEffects.Copy;
            e.Handled = true;
        };

        Drop += (s, e) =>
        {
            var files = (string[])e.Data.GetData(DataFormats.FileDrop);
            if (files == null || files.Length == 0) return;

            // 第一次，弹警告
            if (WarnItem.IsChecked)
            {
                var result = MessageBox.Show(
                    $"即将彻底删除以下 {files.Length} 项，无法从回收站恢复：\n\n" +
                    string.Join("\n", files) +
                    "\n\n确定继续吗？",
                    "⚠️ 危险操作",
                    MessageBoxButton.OKCancel,
                    MessageBoxImage.Warning);

                if (result != MessageBoxResult.OK) return;
            }

            // 删文件
            foreach (var f in files)
                try
                {
                    if (Directory.Exists(f))
                        Directory.Delete(f, true);
                    else if (File.Exists(f))
                        File.Delete(f);
                }
                catch
                {
                }

            // 切到委屈（第 3 张，索引 2）
            _currentFrame = 2;
            PetImage.Source = _frames[_currentFrame];

            // 3 秒后切回原来的图
            _sadTimer?.Stop();
            _sadTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(3) };
            _sadTimer.Tick += (st, ev) =>
            {
                _sadTimer.Stop();
                _currentFrame = 0;
                PetImage.Source = _frames[0];
            };
            _sadTimer.Start();
        };


        //定位上一次桌宠位置，桌宠大小,桌宠样式
        if (LoadPosition(out var l, out var t, out var lv, out var ch))
        {
            Left = l;
            Top = t;
            _currentPath = ch;

            var size = SizeLevels[lv];
            Width = size;
            Height = size;
            PetImage.Width = size;
            PetImage.Height = size;
        }

        LoadImage();
        BuildMenu();
        //关闭时处方保存函数
        Closing += (s, e) => SavePosition();


        // Console.WriteLine(ch.GetType());
        Console.WriteLine(_currentPath);
    }

    private string _externalFolder =>
        Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ExternalChars");

    //警告信息
    private static string WarnFlagFile =>
        Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "Data", "warn.dat");

    //加载图片
    private void LoadImage()
    {
        if (string.IsNullOrEmpty(_currentPath))
            _currentPath = "internal:TH6/Rumia";

        string[] files =
        {
            "1.png",
            "2.png",
            "3.png",
            "4.png",
            "5.png"
        };

        _frames = new BitmapImage[files.Length];
        for (var i = 0; i < files.Length; i++)
            try
            {
                var bmp = new BitmapImage();
                bmp.BeginInit();
                var parts = _currentPath.Split(":");
                if (parts[0] == "external")
                    bmp.UriSource =
                        new Uri(
                            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ExternalChars", parts[1], files[i]),
                            UriKind.Absolute);
                else if (parts[0] == "internal")
                    bmp.UriSource = new Uri("pack://application:,,,/ResImage/" + parts[1] + "/" + files[i],
                        UriKind.Absolute);
                bmp.CacheOption = BitmapCacheOption.OnLoad;
                bmp.EndInit();
                bmp.Freeze();
                _frames[i] = bmp;
            }
            catch
            {
                _frames[i] = null;
            }

        if (_frames[0] != null)
        {
            PetImage.Source = _frames[0];
        }
        else
        {
            MessageBox.Show("找不到当前角色路径");
            if (!string.IsNullOrEmpty(_pastcurrentpath) && _currentPath != _pastcurrentpath)
            {
                _currentPath = _pastcurrentpath;
                LoadImage();
            }
        }
    }

// 样式切换实现
    private void OnMenuItemClick(object sender, RoutedEventArgs e)
    {
        var item = (MenuItem)sender;
        var i = int.Parse((string)item.Tag);
        _currentFrame = i;
        if (_frames[i] == null)
            MessageBox.Show("对应样式文件不存在");
        else
            PetImage.Source = _frames[i];
    }

    private void OnSizeClick(object sender, RoutedEventArgs e)
    {
        var item = (MenuItem)sender;
        var size = int.Parse((string)item.Tag);

        Width = size;
        Height = size;
        PetImage.Width = size;
        PetImage.Height = size;
    }

    private void OnAutoStartToggle(object sender, RoutedEventArgs e)
    {
        var key = @"Software\Microsoft\Windows\CurrentVersion\Run";
        using var reg = Registry.CurrentUser.OpenSubKey(key, true);
        if (reg == null) return;

        if (AutoStartItem.IsChecked)
            reg.SetValue("DesktopPet", Environment.ProcessPath ?? "");
        else
            reg.DeleteValue("DesktopPet", false);
    }

    private void OnTopmostToggle(object sender, RoutedEventArgs e)
    {
        Topmost = TopmostItem.IsChecked;
    }

    private void OnExitClick(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void SavePosition()
    {
        var charter = _currentPath;
        var level = Array.IndexOf(SizeLevels, (int)Width);
        if (level < 0) level = 1; // 保险：万一当前尺寸不在档位里，默认中

        var dir = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory,
            "Data");
        Directory.CreateDirectory(dir);

        var file = Path.Combine(dir, "pos.dat");
        File.WriteAllText(file, $"{Left},{Top},{level},{charter}");
    }

    private bool LoadPosition(out double left, out double top, out int level, out string charter)
    {
        left = 0;
        top = 0;
        level = 1;
        charter = "internal:Rumia/1.png";

        var file = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "Data", "pos.dat");

        if (!File.Exists(file)) return false;

        var parts = File.ReadAllText(file).Split(',');
        if (parts.Length != 4) return false;

        if (!double.TryParse(parts[0], out left)) return false;
        if (!double.TryParse(parts[1], out top)) return false;
        if (!int.TryParse(parts[2], out level)) return false;
        if (string.IsNullOrEmpty(parts[3])) return false;
        charter = parts[3];
        if (level < 0 || level >= SizeLevels.Length) level = 1;

        return true;
    }

    private bool LoadWarnFlag()
    {
        if (!File.Exists(WarnFlagFile)) return true; // 默认开
        return File.ReadAllText(WarnFlagFile) == "1";
    }

    private void SaveWarnFlag(bool on)
    {
        var dir = Path.Combine(
            AppDomain.CurrentDomain.BaseDirectory, "Data");
        Directory.CreateDirectory(dir);
        File.WriteAllText(WarnFlagFile, on ? "1" : "0");
    }

    private void OnWarnToggle(object sender, RoutedEventArgs e)
    {
        SaveWarnFlag(WarnItem.IsChecked);
    }

    //角色切换实现
    private void ChangeCharaterClick(object sender, RoutedEventArgs e)
    {
        var item = (MenuItem)sender;
        var tag = (string)item.Tag;
        var parts = tag.Split('-');
        _pastcurrentpath = _currentPath;
        _currentPath = $"internal:TH{parts[0]}/{parts[1]}";
        LoadImage();
    }

    //自定义导入图片实现
    private void BuildMenu()
    {
        ExternalMenu.Items.Clear();
        if (!Directory.Exists(_externalFolder)) Directory.CreateDirectory(_externalFolder);

        foreach (var dir in Directory.GetDirectories(_externalFolder))
        {
            var name = Path.GetFileName(dir);
            var item = new MenuItem { Header = name, Tag = name };
            item.Click += OnExternalCharacterClick;
            ExternalMenu.Items.Add(item);
        }
    }

    //外部角色切换
    private void OnExternalCharacterClick(object sender, RoutedEventArgs e)
    {
        var item = (MenuItem)sender;
        var name = (string)item.Tag;

        // 用特殊前缀标记这是外部角色
        _currentPath = "external:" + name;
        LoadImage();
    }

    //Debug 气泡
    private void OnAboutClick(object sender, RoutedEventArgs e)
    {
        bubb = new BubbleLogic(this);
        bubb.StartStack(Left, Top);
    }
}