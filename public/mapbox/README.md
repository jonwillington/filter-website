# Filter Brown Theme for Mapbox Standard

## Filter's Brown Color Palette

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Background | #FFFFFF | #1A1410 |
| Surface | #FAFAFA | #251C16 |
| Surface Warm | #FAF5F0 | #2A1F18 |
| Contrast Block | #2E1F17 | #FFFDFB |
| Accent | #8B6F47 | #B8956A |
| Secondary | #4A3B2E | #D4C4B0 |
| Border | #E8E8E8 | #3D2E25 |

## Creating a Custom LUT File

Mapbox Standard requires a properly formatted 3D LUT (.cube or .png). These are best created with color grading software:

### Option 1: DaVinci Resolve (Free)
1. Open DaVinci Resolve
2. Go to Color workspace
3. Create a new node and apply color adjustments:
   - **Lift** (shadows): Push toward warm brown (#2E1F17)
   - **Gamma** (midtones): Shift toward accent (#8B6F47)
   - **Gain** (highlights): Keep warm white (#FAF5F0)
   - Reduce blue channel slightly across all tones
4. Right-click the node → Generate LUT → 17-point cube

### Option 2: Photoshop / Lightroom
1. Create a color lookup adjustment layer
2. Edit the adjustment to warm the tones
3. Export as .cube file (17x17x17 or 33x33x33)

### Option 3: Online LUT Generators
- [LUTCalc](https://cameramanben.github.io/LUTCalc/) - Free browser-based LUT creator
- [Color.io](https://color.io/) - Professional LUT creation

### Recommended Settings for Warm Brown Look
- Reduce blue channel by 5-10%
- Boost red channel by 3-5%
- Shift green toward yellow by 2-3%
- Add slight sepia/warmth to shadows
- Keep highlights clean but warm

## Using with Mapbox Standard

### Via Mapbox Studio
1. Go to [Mapbox Studio](https://studio.mapbox.com/)
2. Edit your style → Components → Color theme
3. Upload your .cube file
4. Adjust intensity (50-80% recommended for subtlety)

### Via Code
```javascript
// After map loads
map.setConfigProperty('basemap', 'colorTheme', 'custom');
map.setConfigProperty('basemap', 'colorThemeLut', 'URL_TO_YOUR_LUT_FILE');
```

### Built-in Themes
Mapbox Standard also has built-in color themes that might work:
- `faded` - Desaturated, could complement brown UI
- `monochrome` - Grayscale, neutral base

```javascript
map.setConfigProperty('basemap', 'colorTheme', 'faded');
```

## Alternative: Style Configuration

Instead of a LUT, you can adjust individual Mapbox Standard properties:

```javascript
// Reduce saturation for a more muted look
map.setPaintProperty('land', 'background-color', '#F5F0EB');

// Or use configuration properties
map.setConfigProperty('basemap', 'lightPreset', 'day'); // day, dawn, dusk, night
```
