using System;
using System.IO;
using System.Windows.Controls.Primitives;
using System.Windows.Media.Imaging;
using TagLibSharp2;
using TagLibSharp2.Core;
using TagLibSharp2.Mpeg;

namespace DesktopPet;

public class MusicLibrary
{
    //键值映射
    private static readonly Dictionary<string, string> AlbumCoverMap = new()
    {
        { "紅魔郷", "TH6cover.png" },
        { "妖々夢", "TH7cover.png" },
        { "永夜抄", "TH8cover.png" },
        { "花映塚", "TH9cover.png" },
        { "風神録", "TH10cover.png" },
        { "地霊殿", "TH11cover.png" },
        { "星蓮船", "TH12cover.png" },
        { "神霊廟", "TH13cover.png" },
        { "輝針城", "TH14cover.png" },
        { "紺珠伝", "TH15cover.png" },
        { "天空璋", "TH16cover.png" },
        { "鬼形獣", "TH17cover.png" },
        { "虹龍洞", "TH18cover.png" },
        { "獣王園", "TH19cover.png" },
        { "錦上京", "TH20cover.png" },
    };
    public class MusicAttribute
    {
        public Album? ParentAlbum { get; set; }
        public string Album { get; set; }
        public string Title{get;set;}
        public string Artist{get;set;}
        public TimeSpan? Duration { get; set; }
        public string songpath;

    }
    public class Album
    {
        public string Name { get; set; }
        public BitmapImage Cover { get; set; }
        public List<MusicAttribute> Songs { get; set; } = new();
    }
    public List<Album> Albums { get; set; }=new ();
    
    private string _musicfolder=>
    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "MusicPlaylist");

    private string coverFile = "";
    
    public MusicLibrary()
    {
        
    }

    public void LoadMusicList()
    {
        var files = Directory.GetFiles(_musicfolder);
        foreach (var file in files)
        {
            var readresult=Mp3File.ReadFromFile(file);
            var songtitle = readresult.File.Title;
            var songartist = readresult.File.Artist;
            var duration = readresult.File.Duration;
            var songAlbum = readresult.File.Album;
            var song = new MusicAttribute();
            song.Title = songtitle;
            song.songpath = file;
            song.Artist = songartist;
            song.Album = songAlbum;
            song.Duration = duration;
            bool found = false;
            foreach (var albums in Albums)
            {
                if (songAlbum == albums.Name)
                {
                    albums.Songs.Add(song);
                    song.ParentAlbum = albums;
                    found = true;
                    break;
                }
            }
            if (!found)
            {
                    var newalbum = new Album();
                    foreach (var pair in AlbumCoverMap)
                    {
                        if (songAlbum.Contains(pair.Key))
                        {
                            coverFile=pair.Value;
                        }
                        LoadAlbumsCover(newalbum);
                    }
                
                    newalbum.Name = songAlbum;
                    newalbum.Songs.Add(song);
                    song.ParentAlbum = newalbum;
                    Albums.Add(newalbum);
            }
            Console.WriteLine($"Album = [{songAlbum}]");

        }
    }

    public void LoadAlbumsCover(Album album)
    {
        if (coverFile != null)
        {
            try
            {
                var bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.UriSource = new Uri("pack://application:,,,/Coverimage/" + coverFile, UriKind.Absolute);
                bmp.CacheOption = BitmapCacheOption.OnLoad;
                bmp.EndInit();
                bmp.Freeze();
                
                album.Cover = bmp;
                
            }
            catch
            {
                // 图片加载失败就留空，显示占位符
            }
        }
    }
    
}