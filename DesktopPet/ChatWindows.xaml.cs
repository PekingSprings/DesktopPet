using System.Windows;
using System.IO;

namespace DesktopPet;

public partial class ChatWindows : Window
{
    private readonly string _charName;
    public ChatWindows(string charName)
    {
        InitializeComponent();
        _charName = charName;

        Loaded += async (s, e) =>
        {
            await AIWebview.EnsureCoreWebView2Async();
            System.Diagnostics.Debug.WriteLine($"charName = [{_charName}]");
            string path = Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory,
                "AIWeb","index.html");

            string url = new Uri(path).AbsoluteUri + "?name=" + Uri.EscapeDataString(_charName);
            AIWebview.Source = new Uri(url);
            AIWebview.Focus();
        };
    }
}