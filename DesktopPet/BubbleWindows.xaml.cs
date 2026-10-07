using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Threading;

namespace DesktopPet;


public partial class BubbleWindows : Window
{
    public BubbleWindows(string message)
    {
        InitializeComponent();
        MessageText.Text = message;
    }


    public void ShowAt(double x, double y, int durationMs = 3000)
    {
        Left = x-100;
        Top = y;
        Show();

        var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(durationMs) };
        timer.Tick += (s, e) =>
        {
            timer.Stop();
        };
        
    }
    [DllImport("user32.dll")]
    private static extern int SetWindowCompositionAttribute(IntPtr hwnd, ref WindowCompositionAttributeData data);

    [StructLayout(LayoutKind.Sequential)]
    private struct WindowCompositionAttributeData
    {
        public int Attribute;
        public IntPtr Data;
        public int SizeOfData;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct AccentPolicy
    {
        public int AccentState;
        public int AccentFlags;
        public int GradientColor;
        public int AnimationId;
    }

    private void EnableAcrylic()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero) return;

        // 4 = ACCENT_ENABLE_ACRYLICBLURBEHIND
        // 3 = ACCENT_ENABLE_BLURBEHIND（Win10 1803 之前）
        int accentState = 4;

        var accent = new AccentPolicy
        {
            AccentState = accentState,
            AccentFlags = 2,
            // AABBGGRR 格式，这里是很淡的白色
            GradientColor = unchecked((int)0x80FFFFFF)
        };

        int size = Marshal.SizeOf(accent);
        IntPtr accentPtr = Marshal.AllocHGlobal(size);
        Marshal.StructureToPtr(accent, accentPtr, false);

        var data = new WindowCompositionAttributeData
        {
            Attribute = 19, // WCA_ACCENT_POLICY
            Data = accentPtr,
            SizeOfData = size
        };

        SetWindowCompositionAttribute(hwnd, ref data);
        Marshal.FreeHGlobal(accentPtr);
    }
    
}