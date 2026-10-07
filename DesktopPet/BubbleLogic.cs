using System.IO;
using System.Windows;
using System.Windows.Threading;

namespace DesktopPet;

public class BubbleLogic
{
    private readonly Window _owner;
    private int cycletime = 0;//未来写滑条来改变随机时刻
    private List<string> _messages; // 消息列表
    private DispatcherTimer _timer=new DispatcherTimer();
    private Random _random=new Random();
    private BubbleWindows _currentbubble;

    public BubbleLogic(Window owner)
    {
        _owner = owner;
    }

    private string MessageFile => Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Text", "Allvoi.txt");

    public void StartStack(double x, double y)
    {
        LoadMessage();
        _timer.Interval = TimeSpan.FromMilliseconds(5000);
        _timer.Tick+=(s,e)=>
            ShowMessage(x,y);
        _timer.Start();
    }

    public void LoadMessage()
    {
        _messages = new List<string>();
        var lines = File.ReadAllLines(MessageFile);
        foreach (var line in lines)
        {
            _messages.Add(line);
        }
    }

    public void ShowMessage(double x, double y)
    {
        _currentbubble?.Close();
        string message=_messages[_random.Next(0, _messages.Count)];
        _currentbubble=new BubbleWindows(message);
        _currentbubble.ShowAt(x,y);
    }
}