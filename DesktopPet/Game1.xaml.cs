using System;
using System.IO;
using System.Windows;

namespace DesktopPet
{
    public partial class GameWindow : Window
    {
        public GameWindow()
        {
            InitializeComponent();
            Loaded += async (s, e) =>
            {
                await WebView.EnsureCoreWebView2Async();

                string path = Path.Combine(
                    AppDomain.CurrentDomain.BaseDirectory,
                    "WebGame", "index.html");

                WebView.Source = new Uri(path);
                WebView.Focus();
            };
        }
    }
}