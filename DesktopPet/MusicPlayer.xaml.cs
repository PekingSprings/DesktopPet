using System.IO;
using System.Windows;
using System.Windows.Media;

namespace DesktopPet;

public partial class MusicPlayer : Window
{
    MediaPlayer mediaPlayer;
    private bool Paused = true;
    private string _musicPath=>
        Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "MusicPlaylist","test.mp3");
    public MusicPlayer()
    {
        InitializeComponent();
        
    }

    public void PlayButton_Click(object sender, RoutedEventArgs e)
    {
        if (Paused)
        {
            Paused = false;
            PlayPauseButton.Content = "⏸";
            mediaPlayer = new MediaPlayer();
            mediaPlayer.Open(new Uri(_musicPath));
            mediaPlayer.Play();
        }
        else
        {
            PlayPauseButton.Content = "▶";
            Paused=true;
            mediaPlayer.Pause();
        }
        
    }
    
    protected override void OnClosed(EventArgs e)
    {
        mediaPlayer?.Close();
        base.OnClosed(e);
    }
    
}