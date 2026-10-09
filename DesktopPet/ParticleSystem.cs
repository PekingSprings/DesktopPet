
using System.Windows.Controls;
using System.Windows.Media;
namespace DesktopPet;

public class ParticleSystem
{
    private readonly Canvas _canvas;
    public ParticleSystem(Canvas canvas)
    {
        _canvas = canvas;
    }

    private class Particle
    {
        public TextBlock EmojiText=new TextBlock();
        private int maxlife=60;
        private int life=60;
    }

    public void ShowParticle(double x, double y,string emoji)
    {
        Particle p = new Particle();
        _canvas.Children.Add(p.EmojiText);
        p.EmojiText.Text = emoji;
        Canvas.SetLeft(p.EmojiText,x);
        Canvas.SetTop(p.EmojiText, y);
    }
}

