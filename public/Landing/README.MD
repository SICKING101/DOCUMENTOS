# Gestacks Landing Page - Vanilla HTML/CSS/JavaScript

A clean, semantic, and responsive landing page rebuilt from the React-based Gestacks homepage using only vanilla HTML, CSS, and JavaScript — zero frameworks, no dependencies, no external build tools.

## 📁 File Structure

```
landing-vanilla/
├── index.html        # Semantic HTML structure with comments
├── styles.css        # Organized CSS with custom properties and media queries
├── script.js         # Vanilla JavaScript for scroll animations and interactivity
└── README.md         # This file
```

## 🎯 Key Features

### Clean, Semantic HTML
- **Proper semantic tags** (`<section>`, `<h1>-<h6>`, `<p>`) for SEO and accessibility
- **Well-organized structure** with clear sections and comments
- **No unnecessary divs** or wrapper elements
- **Minimal, meaningful class names** for styling hooks

### Organized CSS
- **CSS Custom Properties** for consistent colors, spacing, and transitions
- **BEM-inspired naming** for clarity (`benefit-card`, `stat-item`, etc.)
- **Mobile-first responsive design** with media queries
- **No auto-generated classes** — all styles are readable and maintainable
- **Efficient animations** using CSS keyframes instead of JavaScript

### Vanilla JavaScript
- **Scroll-triggered animations** using Intersection Observer API (replaces Framer Motion)
- **Smooth scroll behavior** for anchor links
- **Optional parallax effect** on hero background
- **High performance** — no third-party dependencies or bundle overhead
- **Well-commented code** explaining each function

## 🎨 Color Palette

All colors are defined as CSS custom properties in `:root`:

| Color | Value | Usage |
|-------|-------|-------|
| Primary | `#3B82F6` | Buttons, stats, highlights |
| Primary Dark | `#2563EB` | Button hover state |
| Background | `#faf8f6` | Page background |
| Foreground | `#1a1410` | Text |
| Muted Background | `#f3f1ef` | Section backgrounds |
| Muted Text | `#6b6d70` | Secondary text |
| Border | `#d4d0cc` | Dividers |

## 📱 Responsive Design

The layout is fully responsive with breakpoints at:
- **Desktop:** Full width (1280px max container)
- **Tablet:** Adjusted padding and font sizes
- **Mobile (768px and below):** Single column layouts, stacked stats
- **Small Phone (480px and below):** Further optimized spacing and typography

## ✨ Sections

### 1. **Hero Section**
- Full-screen header with background image and overlay
- Main headline and supporting text
- Primary CTA button
- Fade-in animation on load

### 2. **About Section**
- Explains what Gestacks is and its value proposition
- Centered content with muted background

### 3. **Benefits Section**
- Grid of 4 benefit cards
- Hover effects with subtle lift animation
- Fade-in animation as cards scroll into view

### 4. **Stats Section**
- 4-column grid displaying key metrics
- Scale-in animation on scroll
- Responsive to 2-column on mobile

### 5. **Final CTA Section**
- Call-to-action to convert visitors
- Secondary headline and description
- Button to trigger conversion

## 🚀 Getting Started

### No Build Required
Simply open `index.html` in a browser — it works immediately without any installation, build process, or local server:

```bash
# Just open the file
open index.html

# Or use a local server (optional)
python -m http.server 8000
# Visit: http://localhost:8000
```

### Customization

#### Change Colors
Edit the CSS custom properties in `styles.css` (`:root` section):

```css
:root {
  --primary: #3B82F6;
  --foreground: #1a1410;
  /* ... etc */
}
```

#### Modify Content
Edit the text directly in `index.html` — all content is semantic and easy to find.

#### Adjust Animations
Modify timing in `styles.css`:

```css
--transition-fast: 0.2s ease;
--transition-normal: 0.3s ease;
--transition-slow: 0.5s ease;
```

Or disable scroll animations by not including `script.js`.

## 🔧 Browser Support

- **Modern browsers:** Full support (Chrome, Firefox, Safari, Edge)
- **CSS:** All styles use widely-supported properties
- **JavaScript:** Uses ES6+ syntax; Intersection Observer supported in all modern browsers
- **Fallback:** If JavaScript is disabled, page still renders with static content

## 📊 Performance Metrics

- **No build step** → instant load
- **No dependencies** → ~20KB total (HTML + CSS + JS)
- **Intersection Observer** → efficient scroll detection, minimal CPU usage
- **CSS animations** → GPU-accelerated, smooth 60fps
- **No external fonts** → DM Sans loaded from Google Fonts (single request)

## 📝 Code Comments

Every section is thoroughly commented:
- **HTML:** Section comments explain the purpose of each area
- **CSS:** Comments organize styles by component and functionality
- **JavaScript:** Detailed JSDoc comments explain each function

## 🎓 Learning Value

This codebase demonstrates:
- Semantic HTML5 best practices
- Modern CSS techniques (custom properties, grid, flexbox)
- Vanilla JavaScript without frameworks (Intersection Observer, event listeners)
- Responsive design patterns
- Accessibility considerations
- Clean code organization and commenting

## 📄 License

Free to use and modify as needed.

---

**Built with:** Pure HTML5, CSS3, and vanilla JavaScript — no frameworks, no bloat, just clean code.
