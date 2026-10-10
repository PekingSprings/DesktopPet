using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using ModernWpf.Controls;
using System.Windows.Threading;
namespace DesktopPet;

public partial class MusicPlayer : Window
{
    private bool Paused = true;
    private MediaPlayer mediaPlayer=new MediaPlayer();

    public MusicPlayer()
    {
        InitializeComponent();
        var musicLibrary = new MusicLibrary();
        musicLibrary.LoadMusicList();
        AlbumTree.ItemsSource=musicLibrary.Albums;
        
        var _timetick=new DispatcherTimer();
        _timetick.Interval=TimeSpan.FromMilliseconds(500);
        _timetick.Tick += (s, e) => UpdateTime();
        _timetick.Start();
        
    }

    private string _musicPath = "";

    
    
    //播放按钮播放测试
    public void PlayButton_Click(object sender, RoutedEventArgs e)
    {
        if (Paused&&_musicPath!="")
        {
            Paused = false;
            PlayPauseButton.Content = "⏸";
            mediaPlayer.Play();
        }
        else if (!Paused && _musicPath!="")
        {
            PlayPauseButton.Content = "▶";
            Paused = true;
            mediaPlayer.Pause();
        }
    }
    

    public void ChangerSongsButton()
    {
        mediaPlayer.Close();
        mediaPlayer.Open(new Uri(_musicPath));
        mediaPlayer.Play();
        Paused = false;
        PlayPauseButton.Content = "⏸";
        
    }

    public void Songs_Click(object sender, RoutedEventArgs e)
    {
        var grid = (Grid)sender;
        var element = (MusicLibrary.MusicAttribute)grid.DataContext;
        _musicPath = element.songpath;
        ChangerSongsButton();
        LoadArtistandDurationandtitle(element.Artist, element.Title, element.Duration);

    }

    protected override void OnClosed(EventArgs e)
    {
        mediaPlayer?.Close();
        base.OnClosed(e);
    }

    public void LoadArtistandDurationandtitle(string artist, string title, TimeSpan? duration)
    {
        TitleText.Text = title;
        ArtistText.Text=artist;
        TotalTimeText.Text=duration?.ToString(@"m\:ss");
    }

    public void UpdateTime()
    {
        double currentTime=mediaPlayer.Position.TotalSeconds;
        CurrentTimeText.Text=mediaPlayer.Position.ToString(@"m\:ss");
        if (mediaPlayer.NaturalDuration.HasTimeSpan)
        {
            var time =mediaPlayer.NaturalDuration.TimeSpan;
            PositionSlider.Maximum=time.TotalSeconds;
            PositionSlider.Value=currentTime;
        }
       
    }
}