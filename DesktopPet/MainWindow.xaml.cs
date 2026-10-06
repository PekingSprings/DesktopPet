using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using Microsoft.Win32;
using System.Windows.Threading;

namespace DesktopPet
{
    //加载图片，拖拽，存储位置，警告信息，改变角色
    public partial class MainWindow : Window
    {
        private BitmapImage[] _frames;
        private static readonly int[] SizeLevels = { 200, 320, 420 };

        private string _pastcurrentpath = "";
        private string _currentPath = ""; 
        
        private string _externalFolder =>
            System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ExternalChars");
        
        private DispatcherTimer _sadTimer;
        private int _currentFrame = 0;

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
                string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
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
                foreach (string f in files)
                {
                    try
                    {
                        if (System.IO.Directory.Exists(f))
                            System.IO.Directory.Delete(f, recursive: true);
                        else if (System.IO.File.Exists(f))
                            System.IO.File.Delete(f);
                    }
                    catch { }
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
            if (LoadPosition(out double l, out double t, out int lv,out string ch))
            {
                Left = l;
                Top = t;
                _currentPath = ch;

                int size = SizeLevels[lv];
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
        //加载图片
        private void LoadImage()
        {
            if (string.IsNullOrEmpty((_currentPath)))
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
            for (int i = 0; i < files.Length; i++)
            {
                try
                {
                    var bmp = new BitmapImage();
                    bmp.BeginInit();
                    string[] parts = _currentPath.Split(":");
                    if (parts[0] == "external")
                    {
                        bmp.UriSource = new Uri(System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"ExternalChars",parts[1],files[i]),UriKind.Absolute);
                    }
                    else if (parts[0] == "internal")
                    {
                        bmp.UriSource = new Uri("pack://application:,,,/ResImage/" +parts[1]+"/" +files[i], UriKind.Absolute);
                    }
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.EndInit();
                    bmp.Freeze();
                    _frames[i] = bmp;
                }
                catch
                {
                    _frames[i] = null;
                }
               
            }

            if (_frames[0] !=null)
            {
                PetImage.Source = _frames[0];
            }
            else
            {
                MessageBox.Show("找不到当前角色路径");
                if (!string.IsNullOrEmpty(_pastcurrentpath)&&_currentPath!=_pastcurrentpath)
                {
                    _currentPath=_pastcurrentpath;
                    LoadImage();
                }
            }
        }
// 样式切换实现
        private void OnMenuItemClick(object sender, RoutedEventArgs e)
        {
            var item = (MenuItem)sender;
            int i = int.Parse((string)item.Tag);
            _currentFrame = i;
            if (_frames[i]==null)
            {
                MessageBox.Show("对应样式文件不存在");
            }
            else
            {
                PetImage.Source = _frames[i];
            }
        }
        
        private void OnSizeClick(object sender, RoutedEventArgs e)
        {
            var item = (MenuItem)sender;
            int size = int.Parse((string)item.Tag);

            Width = size;
            Height = size;
            PetImage.Width = size;
            PetImage.Height = size;
        }
        private void OnAutoStartToggle(object sender, RoutedEventArgs e)
        {
            string key = @"Software\Microsoft\Windows\CurrentVersion\Run";
            using var reg = Registry.CurrentUser.OpenSubKey(key, writable: true);
            if (reg == null) return;

            if (AutoStartItem.IsChecked)
                reg.SetValue("DesktopPet", Environment.ProcessPath??"");
            else
                reg.DeleteValue("DesktopPet", throwOnMissingValue: false);
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
            string charter = _currentPath;
            int level = Array.IndexOf(SizeLevels, (int)Width);
            if (level < 0) level = 1; // 保险：万一当前尺寸不在档位里，默认中

            string dir = System.IO.Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,
                "Data");
            System.IO.Directory.CreateDirectory(dir);

            string file = System.IO.Path.Combine(dir, "pos.dat");
            System.IO.File.WriteAllText(file, $"{Left},{Top},{level},{charter}");
        }
        private bool LoadPosition(out double left, out double top, out int level,out string charter)
        {
            left = 0; top = 0; level = 1;
            charter = "internal:Rumia/1.png";

            string file = System.IO.Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,"Data","pos.dat");

            if (!System.IO.File.Exists(file)) return false;

            string[] parts = System.IO.File.ReadAllText(file).Split(',');
            if (parts.Length != 4) return false;

            if (!double.TryParse(parts[0], out left)) return false;
            if (!double.TryParse(parts[1], out top))  return false;
            if (!int.TryParse(parts[2], out level))   return false;
            if(String.IsNullOrEmpty(parts[3])) return false;
            charter = parts[3];
            if (level < 0 || level >= SizeLevels.Length) level = 1;

            return true;
        }
        //警告信息
        private static string WarnFlagFile =>
            System.IO.Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,"Data", "warn.dat");

        private bool LoadWarnFlag()
        {
            if (!System.IO.File.Exists(WarnFlagFile)) return true; // 默认开
            return System.IO.File.ReadAllText(WarnFlagFile) == "1";
        }

        private void SaveWarnFlag(bool on)
        {
            string dir = System.IO.Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory, "Data");
            System.IO.Directory.CreateDirectory(dir);
            System.IO.File.WriteAllText(WarnFlagFile, on ? "1" : "0");
        }
        private void OnWarnToggle(object sender, RoutedEventArgs e)
        {
            SaveWarnFlag(WarnItem.IsChecked);
        }

      //角色切换实现
      private void ChangeCharaterClick(object sender,RoutedEventArgs e)
      {
          var item = (MenuItem)sender;
          string tag  = (string)item.Tag;
          string [] parts = tag.Split('-');
          _pastcurrentpath = _currentPath;
          _currentPath = $"internal:TH{parts[0]}/{parts[1]}";
          LoadImage();

      }
      
      //自定义导入图片实现
      private void BuildMenu()
      {
          ExternalMenu.Items.Clear();
          if (!System.IO.Directory.Exists(_externalFolder))
          {
              System.IO.Directory.CreateDirectory(_externalFolder);
          }

          foreach (string dir in System.IO.Directory.GetDirectories(_externalFolder))
          {
              string name = System.IO.Path.GetFileName(dir);
              var item = new MenuItem { Header = name, Tag = name };
              item.Click += OnExternalCharacterClick;
              ExternalMenu.Items.Add(item);
          }
          
      }
      //外部角色切换
      private void OnExternalCharacterClick(object sender, RoutedEventArgs e)
      {
          var item = (MenuItem)sender;
          string name = (string)item.Tag;

          // 用特殊前缀标记这是外部角色
          _currentPath = "external:" + name;
          LoadImage();
      }
    }
}