import os
from PIL import Image, ImageDraw

def create_quote_symbol(draw, center, size, color):
    """
    Draws a stylized quotation mark (") symbol at center with given size.
    """
    cx, cy = center
    # Scale of quotation marks
    r = size * 0.25 # radius of the circle part of the quote
    spacing = size * 0.4
    
    # Left quote
    l_cx = cx - spacing / 2
    l_cy = cy - r / 2
    draw.ellipse([l_cx - r, l_cy - r, l_cx + r, l_cy + r], fill=color)
    # Left tail: triangle/polygon extending down-left
    draw.polygon([
        (l_cx - r, l_cy),
        (l_cx, l_cy + r),
        (l_cx - r * 1.5, l_cy + r * 1.5)
    ], fill=color)

    # Right quote
    r_cx = cx + spacing / 2
    r_cy = cy - r / 2
    draw.ellipse([r_cx - r, r_cy - r, r_cx + r, r_cy + r], fill=color)
    # Right tail: triangle/polygon extending down-left
    draw.polygon([
        (r_cx - r, r_cy),
        (r_cx, r_cy + r),
        (r_cx - r * 1.5, r_cy + r * 1.5)
    ], fill=color)

def generate_assets():
    os.makedirs('assets', exist_ok=True)
    
    # 1. Main Icon (1024x1024)
    # Background: #0F0F1A (Splash/Dark theme background)
    # Centered rounded badge in #2BAE78 with white quote mark
    icon = Image.new("RGBA", (1024, 1024), (15, 15, 26, 255))
    draw = ImageDraw.Draw(icon)
    
    # Badge (rounded rect)
    badge_size = 640
    badge_x0 = (1024 - badge_size) // 2
    badge_y0 = (1024 - badge_size) // 2
    badge_x1 = badge_x0 + badge_size
    badge_y1 = badge_y0 + badge_size
    # Draw rounded rectangle badge in Primary Teal-Green (#2BAE78)
    draw.rounded_rectangle([badge_x0, badge_y0, badge_x1, badge_y1], radius=160, fill=(43, 174, 120, 255))
    
    # Draw quote symbol inside badge
    create_quote_symbol(draw, (512, 512), 320, (255, 255, 255, 255))
    
    icon.save("assets/icon.png", "PNG")
    print("Generated assets/icon.png")

    # 2. Adaptive Icon (1024x1024)
    # Background: Transparent, foreground is the logo badge (similar to above but centered on transparent bg)
    adaptive_icon = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw_ad = ImageDraw.Draw(adaptive_icon)
    
    # Badge in Primary Teal-Green (#2BAE78)
    draw_ad.rounded_rectangle([badge_x0, badge_y0, badge_x1, badge_y1], radius=160, fill=(43, 174, 120, 255))
    
    # Draw quote symbol inside badge
    create_quote_symbol(draw_ad, (512, 512), 320, (255, 255, 255, 255))
    
    adaptive_icon.save("assets/adaptive-icon.png", "PNG")
    print("Generated assets/adaptive-icon.png")

    # 3. Favicon (48x48)
    # Simple, high-contrast, scalable
    favicon = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    draw_fav = ImageDraw.Draw(favicon)
    
    # Draw a smaller badge
    draw_fav.rounded_rectangle([2, 2, 46, 46], radius=10, fill=(43, 174, 120, 255))
    # Draw smaller quote marks
    create_quote_symbol(draw_fav, (24, 24), 22, (255, 255, 255, 255))
    
    favicon.save("assets/favicon.png", "PNG")
    print("Generated assets/favicon.png")

if __name__ == "__main__":
    generate_assets()
