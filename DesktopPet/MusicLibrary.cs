using System;
using System.IO;
using System.Windows.Controls.Primitives;
using TagLibSharp2;
using TagLibSharp2.Core;
using TagLibSharp2.Mpeg;

namespace DesktopPet;

public class MusicLibrary
{
    public class MusicAttribute
    {
        public string Album { get; set; }
        public string Title{get;set;}
        public string Artist{get;set;}
        public TimeSpan? Duration { get; set; }
        public string songpath;

    }
    public class Album
    {
        public string Name { get; set; }
        public List<MusicAttribute> Songs { get; set; } = new();
    }
    public List<Album> Albums { get; set; }=new ();
    
    private string _musicfolder=>
    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "MusicPlaylist");
    
    
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
                    found = true;
                    break;
                }
            }
            if (!found)
            {
                    var newalbum = new Album();
                    newalbum.Name = songAlbum;
                    newalbum.Songs.Add(song);
                    Albums.Add(newalbum);
            }

        }
    }
}