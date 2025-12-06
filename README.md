# VRML Viewer

A modern web-based VRML (Virtual Reality Modeling Language) vintage .wrl file viewer with interactive 3D visualization and export capabilities.

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=three.js)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=flat-square&logo=webgl)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)

## Features

- **Dynamic File Loading**: Browse and load VRML files from the `/vrml-files` folder
- **Drag & Drop Support**: Easily add local `.wrl` files to view
- **Interactive 3D Viewing**:
  - Orbit controls (left-drag to rotate, right-drag to pan, scroll to zoom)
  - Reset view with `R` key
  - Grid helper and lighting
- **Model Statistics**: Display mesh count, line count, and vertex information
- **Export to Modern 3D Formats**:
  - **glTF** (.gltf) - Text-based, widely supported format
  - **GLB** (.glb) - Binary glTF, single compact file
  - **OBJ** (.obj) - Universal 3D format

## Installation

### Prerequisites
- Node.js (for running a local web server)
- Modern web browser with WebGL support

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd vrml-viewer
```

2. Add your VRML files to the `vrml-files/` folder

3. Start a local web server:

**Using npx (recommended):**
```bash
npx serve .
```

**Using Python 3:**
```bash
python -m http.server 8080
```

**Using Python 2:**
```bash
python -m SimpleHTTPServer 8080
```

4. Open your browser and navigate to:
- `http://localhost:3000` (if using npx serve)
- `http://localhost:8080` (if using Python)

## Usage

### Loading Files

1. **From the file list**: Click any `.wrl` file in the "VRML Files" panel
2. **Drag & Drop**: Drag `.wrl` files directly onto the drop zone
3. **Browse**: Click the drop zone to open a file browser

### Navigation

| Control | Action |
|---------|--------|
| Left-click drag | Rotate view |
| Right-click drag | Pan view |
| Scroll wheel | Zoom in/out |
| `R` key | Reset camera |

### Exporting

Once a model is loaded, the Export panel appears with three options:

- **Export glTF**: Exports as separate `.gltf` (JSON) file with separate binary files
- **Export GLB**: Exports as single binary `.glb` file (most compatible)
- **Export OBJ**: Exports as `.obj` file (universal 3D format)

## Project Structure

```
vrml-viewer/
├── index.html           # Main application file
├── vrml-files/          # Directory for VRML files
│   └── ch.wrl          # Example VRML file
├── README.md           # This file
├── .gitignore          # Git ignore rules
└── vrml-viewer-poc.html # Original PoC (legacy)
```

## Technologies

- **Three.js**: 3D graphics library
- **VRMLLoader**: Three.js VRML parser
- **GLTFExporter**: Export to glTF format
- **OBJExporter**: Export to OBJ format
- **OrbitControls**: Interactive camera controls

## Browser Compatibility

- Chrome/Edge 60+
- Firefox 55+
- Safari 11+
- Opera 47+

Requires WebGL support and ES modules.

## Development

The application is built as a single-file ES module application. To modify:

1. Edit `index.html` directly
2. Changes are reflected on refresh (when using a dev server)

## Limitations

- VRML support depends on Three.js VRMLLoader capabilities
- Large models may impact performance on older hardware
- Some VRML 2.0 features may not be fully supported

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
